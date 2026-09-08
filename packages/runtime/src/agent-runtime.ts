import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { ToolDefinition } from "@langchain/core/language_models/base";
import { AIMessageChunk, HumanMessage, type BaseMessage } from "@langchain/core/messages";
import { ChatGenerationChunk, type ChatResult } from "@langchain/core/outputs";
import type { StructuredToolInterface } from "@langchain/core/tools";
import { convertToOpenAITool } from "@langchain/core/utils/function_calling";
import { createParser } from "eventsource-parser";
import { CuratorError, providerObjectSchema, type ProviderObject, type ToolInvocation } from "@curator/shared";
import type { OpenRouterConfiguration } from "./configuration.js";
import {
  INPUT_BUDGET_TOKENS, assembleRequest, compactionBatch, compactionOf, estimateTokens,
  summaryRequest, type Compaction, type WorkingContext,
} from "./working-context.js";

/** A call the provider asked for, before Curator knows how it went. */
type ToolRequest = Omit<ToolInvocation, "failed">;

export interface ProviderCheckpoint {
  message: ProviderObject;
  text: string;
  usage: ProviderObject | null;
}

/**
 * What the agent loop needs from the Workspace it is working in. Every step is
 * persisted through this before the next one starts, so a conversation that
 * ends at any moment is the conversation that was actually held.
 */
export interface AgentSession {
  /** Rebuilt each turn, so tool results and current catalog state are in it. */
  context(): WorkingContext;
  beginTurn(): number;
  record(frame: unknown): void;
  checkpoint(turn: number, state: ProviderCheckpoint): void;
  completeTurn(turn: number): void;
  toolResult(tool: ToolInvocation, output: string): void;
  beginCompaction(): number;
  compact(turn: number, compaction: Compaction): void;
}

/**
 * Application-owned OpenRouter adaptation inside LangChain. The native message
 * travels in additional_kwargs; LangChain's display chunks are never used to
 * reconstruct continuation. Each decoded payload is retained before conversion.
 */
class OpenRouterChatModel extends BaseChatModel {
  readonly #configuration: OpenRouterConfiguration;
  readonly #tools: ToolDefinition[];
  readonly #record: (frame: unknown) => void;
  readonly #checkpoint: (state: ProviderCheckpoint) => void;

  constructor(configuration: OpenRouterConfiguration, tools: ToolDefinition[],
    record: (frame: unknown) => void, checkpoint: (state: ProviderCheckpoint) => void) {
    super({ maxRetries: 0, cache: false });
    this.#configuration = configuration;
    this.#tools = tools;
    this.#record = record;
    this.#checkpoint = checkpoint;
  }

  _llmType(): string { return "curator-openrouter"; }

  async _generate(messages: BaseMessage[], options: this["ParsedCallOptions"]): Promise<ChatResult> {
    let result: ChatGenerationChunk | undefined;
    for await (const chunk of this._streamResponseChunks(messages, options)) {
      result = result ? result.concat(chunk) : chunk;
    }
    if (!result) throw new Error("OpenRouter returned no response.");
    return { generations: [result] };
  }

  override async *_streamResponseChunks(messages: BaseMessage[], options: this["ParsedCallOptions"]): AsyncGenerator<ChatGenerationChunk> {
    options.signal?.throwIfAborted();
    // Native fetch is invoked exactly once. No SDK retry, fallback, or preflight.
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.#configuration.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.#configuration.model,
        messages: messages.map((message) =>
          forRequest(providerObjectSchema.parse(message.additional_kwargs.providerMessage))),
        ...(this.#tools.length > 0 ? { tools: this.#tools } : {}),
        stream: true,
        stream_options: { include_usage: true },
      }),
      ...(options.signal ? { signal: options.signal } : {}),
    });
    if (!response.ok) {
      const body = await response.text();
      this.#record({ httpStatus: response.status, body });
      throw new Error(`OpenRouter HTTP ${response.status}: ${body}`);
    }
    if (!response.body) throw new Error("OpenRouter returned no response stream.");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const queue: string[] = [];
    const parser = createParser({
      onEvent: (event) => queue.push(event.data),
      onError: (error) => { throw error; },
    });
    let message: ProviderObject = { role: "assistant", content: "" };
    let usage: ProviderObject | null = null;
    let finishReason: string | null = null;
    let done = false;
    try {
      while (!done) {
        options.signal?.throwIfAborted();
        const chunk = await reader.read();
        if (chunk.done) {
          parser.feed(decoder.decode());
          if (queue.length === 0) throw new Error("OpenRouter disconnected before completing the response. Retained content is unfinished.");
        } else {
          parser.feed(decoder.decode(chunk.value, { stream: true }));
        }
        for (const data of queue.splice(0)) {
          if (data === "[DONE]") { done = true; continue; }
          // Store even malformed payloads, so a normalization failure loses nothing.
          let raw: unknown;
          try { raw = JSON.parse(data); } catch {
            this.#record({ malformedEvent: data });
            throw new Error("OpenRouter returned malformed streaming JSON.");
          }
          this.#record(raw);
          const frame = providerObjectSchema.parse(raw);
          if (isObject(frame.usage)) usage = frame.usage;
          const choices = Array.isArray(frame.choices) ? frame.choices : [];
          let textDelta = "";
          for (const choice of choices) {
            if (!isObject(choice)) throw new Error("OpenRouter returned an invalid choice.");
            if (choice.index !== undefined && choice.index !== 0) throw new Error("OpenRouter returned an unexpected additional response choice.");
            if (isObject(choice.message)) message = structuredClone(choice.message);
            if (isObject(choice.delta)) {
              textDelta += typeof choice.delta.content === "string" ? choice.delta.content : "";
              message = mergeDelta(message, choice.delta);
            }
            if (typeof choice.finish_reason === "string") finishReason = choice.finish_reason;
          }
          this.#checkpoint({ message, text: visibleText(message.content), usage });
          if (frame.error) throw new Error(`OpenRouter: ${JSON.stringify(frame.error)}`);
          yield new ChatGenerationChunk({ text: textDelta, message: new AIMessageChunk(textDelta) });
        }
        if (chunk.done && !done) throw new Error("OpenRouter disconnected before the end of its response.");
      }
      // A turn that asked for tools ends on `tool_calls`, and some providers
      // label the same turn `stop`. Every other ending — a truncated response,
      // a filtered one, none at all — leaves content and tool arguments
      // half-written, so it is a failure rather than a turn to continue from.
      const ending = readToolCalls(message).length > 0 ? ["tool_calls", "stop"] : ["stop"];
      if (finishReason === null || !ending.includes(finishReason)) {
        throw new Error(`OpenRouter ended the response with ${finishReason ?? "no finish reason"}. Retained content is unfinished.`);
      }
    } finally {
      // Settlement includes closing the stream, even when Stop races a chunk.
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  }
}

/**
 * The agent loop. LangChain supplies the model streaming and tool interfaces;
 * the loop over them is the application's, because the accepted provider
 * contract sends each turn's exact native message back — including opaque
 * reasoning and tool blocks — and a prebuilt agent graph rebuilds its requests
 * from normalized messages instead. Owning the loop also means there is no
 * recursion limit to configure: nothing here counts turns, tool calls, time, or
 * tokens, and only a terminal outcome or Stop ends it.
 */
export async function runAgentChat(configuration: OpenRouterConfiguration,
  tools: StructuredToolInterface[], session: AgentSession, signal: AbortSignal): Promise<void> {
  const byName = new Map(tools.map((tool) => [tool.name, tool]));
  const definitions = tools.map((tool) => convertToOpenAITool(tool));

  for (;;) {
    signal.throwIfAborted();
    // Fitting the request can itself take a request, and it happens between
    // turns, where no tool exchange is waiting to be answered.
    const messages = await fitWorkingContext(configuration, session, definitions, signal);
    const turn = session.beginTurn();
    let latest: ProviderObject = { role: "assistant", content: "" };
    const state = await runRequest(configuration, definitions, messages, signal,
      (frame) => session.record(frame),
      (checkpoint) => { latest = checkpoint.message; session.checkpoint(turn, checkpoint); });
    latest = state.message;
    session.completeTurn(turn);

    const calls = readToolCalls(latest);
    if (calls.length === 0) return;
    for (const call of calls) {
      signal.throwIfAborted();
      const { output, failed } = await runTool(byName, call, signal);
      session.toolResult({ ...call, failed }, output);
    }
  }
}

/**
 * One provider request, start to finish, returning what it finally said. The
 * carrier is just LangChain's message wrapper: the adapter submits the exact
 * native role and fields, including opaque reasoning, from providerMessage.
 */
async function runRequest(configuration: OpenRouterConfiguration, tools: ToolDefinition[],
  messages: ProviderObject[], signal: AbortSignal, record: (frame: unknown) => void,
  checkpoint: (state: ProviderCheckpoint) => void): Promise<ProviderCheckpoint> {
  let latest: ProviderCheckpoint = { message: { role: "assistant", content: "" }, text: "", usage: null };
  const model = new OpenRouterChatModel(configuration, tools, record, (state) => {
    latest = state;
    checkpoint(state);
  });
  const stream = await model.stream(messages.map((providerMessage) => new HumanMessage({
    content: "", additional_kwargs: { providerMessage },
  })), { signal });
  for await (const _chunk of stream) {
    // Persistence and publication already happened before normalization/yield.
  }
  return latest;
}

/**
 * Makes the next request fit, by summarizing the oldest exchanges into an event
 * of their own until it does. Working context is replaced only once a summary
 * has actually been written, so a failed summary leaves the conversation whole
 * and ends the attempt with the provider's own error. Nothing is silently
 * dropped: what cannot be made smaller is reported as exactly that.
 */
async function fitWorkingContext(configuration: OpenRouterConfiguration, session: AgentSession,
  tools: ToolDefinition[], signal: AbortSignal): Promise<ProviderObject[]> {
  let context = session.context();
  // Every request also carries the tool definitions, so they are part of what
  // has to fit. Measured once per round: the request being sized is the whole
  // conversation, and serializing it again for each question is not free.
  const carried = estimateTokens(tools as unknown as ProviderObject[]);
  let estimate = carried + estimateTokens(assembleRequest(context));
  while (estimate > INPUT_BUDGET_TOKENS) {
    signal.throwIfAborted();
    const batch = compactionBatch(context, estimate);
    if (batch.length === 0) {
      throw new Error("This request does not fit the model's working context, and no earlier exchange can be summarized to make room. The conversation is retained; start a new message so this attempt begins from current state.");
    }
    const turn = session.beginCompaction();
    const summary = await runRequest(configuration, [], summaryRequest(batch), signal,
      (frame) => session.record(frame), (checkpoint) => session.checkpoint(turn, checkpoint));
    if (summary.text.trim() === "") {
      throw new Error("The model returned an empty summary while compacting this conversation, so nothing was replaced.");
    }
    session.compact(turn, compactionOf(batch, summary.text, summary.usage));
    // Stop ends this attempt; any checkpointed summary response and usage
    // remain in chat even when working context was not replaced.
    signal.throwIfAborted();

    context = session.context();
    const next = carried + estimateTokens(assembleRequest(context));
    if (next >= estimate) {
      throw new Error("Compacting this conversation did not make the next request smaller, so it would repeat without end. The conversation is retained; start a new message so this attempt begins from current state.");
    }
    estimate = next;
  }
  return assembleRequest(context);
}

/**
 * A tool that fails answers the agent instead of ending the attempt: bad
 * arguments and unreadable paths are things it can correct on the next turn.
 * Stop is not one of those, and travels out to end the execution.
 */
async function runTool(tools: Map<string, StructuredToolInterface>, call: ToolRequest,
  signal: AbortSignal): Promise<{ output: string; failed: boolean }> {
  const tool = tools.get(call.name);
  if (!tool) {
    return { output: `There is no tool named ${call.name}. Available tools: ${[...tools.keys()].join(", ")}.`, failed: true };
  }
  let input: unknown;
  try {
    input = call.arguments.trim() === "" ? {} : JSON.parse(call.arguments);
  } catch (cause) {
    return { output: `Those arguments are not valid JSON: ${describeAgentFailure(cause)}`, failed: true };
  }
  try {
    const output: unknown = await tool.invoke(input as never, { signal });
    return { output: typeof output === "string" ? output : JSON.stringify(output), failed: false };
  } catch (cause) {
    if (signal.aborted) throw cause;
    // A failed commit is not a model-repairable result validation error.
    if (cause instanceof CuratorError && cause.code === "storage_unreadable") throw cause;
    return { output: `${call.name} failed: ${describeAgentFailure(cause)}`, failed: true };
  }
}

/** The calls a provider message asks for, in the order it asked for them. */
function readToolCalls(message: ProviderObject): ToolRequest[] {
  if (!Array.isArray(message.tool_calls)) return [];
  return message.tool_calls.map((call) => {
    const details = isObject(call) && isObject(call.function) ? call.function : undefined;
    if (!isObject(call) || typeof call.id !== "string" || details === undefined ||
      typeof details.name !== "string") {
      throw new Error(`OpenRouter requested a tool call Curator could not read: ${JSON.stringify(call)}`);
    }
    return {
      callId: call.id,
      name: details.name,
      arguments: typeof details.arguments === "string" ? details.arguments : "",
    };
  });
}

function isObject(value: unknown): value is ProviderObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Streaming carries a positional `index` inside each tool call so its pieces can
 * be reassembled. It belongs to the transport, not to the message, so the
 * retained payload keeps it and the request Curator sends does not.
 */
function forRequest(message: ProviderObject): ProviderObject {
  if (!Array.isArray(message.tool_calls)) return message;
  return {
    ...message,
    tool_calls: message.tool_calls.map((call) => {
      if (!isObject(call)) return call;
      const { index: _index, ...rest } = call;
      return rest;
    }),
  };
}

/** Only streamed content fields concatenate; identity/metadata fields do not. */
function mergeDelta(previous: ProviderObject, delta: ProviderObject): ProviderObject {
  const result = structuredClone(previous);
  for (const [key, value] of Object.entries(delta)) {
    const old = result[key];
    if (typeof value === "string" && ["content", "reasoning", "reasoning_content", "text", "summary", "data", "arguments", "refusal", "signature"].includes(key)) {
      result[key] = (typeof old === "string" ? old : "") + value;
    } else if (Array.isArray(value)) {
      const blocks = Array.isArray(old) ? structuredClone(old) : [];
      for (const block of value) {
        const index = isObject(block) ? blocks.findIndex((candidate) => isObject(candidate) && (
          typeof block.index === "number" ? candidate.index === block.index :
            typeof block.id === "string" && candidate.id === block.id
        )) : -1;
        const existing = blocks[index];
        if (index >= 0 && isObject(existing) && isObject(block)) blocks[index] = mergeDelta(existing, block);
        else blocks.push(structuredClone(block));
      }
      result[key] = blocks;
    } else if (isObject(value)) {
      result[key] = mergeDelta(isObject(old) ? old : {}, value);
    } else if (value !== null || old === undefined) {
      result[key] = value;
    }
  }
  return result;
}

function visibleText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((block) =>
    isObject(block) && typeof block.text === "string" ? block.text : "",
  ).join("");
  return "";
}

/** Retain transport causes (DNS/TLS/etc.), never arbitrary request properties. */
export function describeAgentFailure(cause: unknown): string {
  const seen = new Set<Error>();
  const describe = (value: unknown): string => {
    if (!(value instanceof Error)) return String(value);
    if (seen.has(value)) return "";
    seen.add(value);
    const code = "code" in value && typeof value.code === "string" ? ` (${value.code})` : "";
    const parts = [`${value.message}${code}`];
    if (value.cause !== undefined) parts.push(describe(value.cause));
    if (value instanceof AggregateError) parts.push(...value.errors.map(describe));
    return parts.filter(Boolean).join(": ");
  };
  return describe(cause);
}
