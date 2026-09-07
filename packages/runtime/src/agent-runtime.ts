import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { AIMessageChunk, HumanMessage, type BaseMessage } from "@langchain/core/messages";
import { ChatGenerationChunk, type ChatResult } from "@langchain/core/outputs";
import { createParser } from "eventsource-parser";
import { providerObjectSchema, type ProviderObject } from "@curator/shared";
import type { OpenRouterConfiguration } from "./configuration.js";

export interface ProviderCheckpoint {
  message: ProviderObject;
  text: string;
  usage: ProviderObject | null;
}

/**
 * Application-owned OpenRouter adaptation inside LangChain. The native message
 * travels in additional_kwargs; LangChain's display chunks are never used to
 * reconstruct continuation. Each decoded payload is retained before conversion.
 */
class OpenRouterChatModel extends BaseChatModel {
  readonly #configuration: OpenRouterConfiguration;
  readonly #record: (frame: unknown) => void;
  readonly #checkpoint: (state: ProviderCheckpoint) => void;

  constructor(configuration: OpenRouterConfiguration, record: (frame: unknown) => void,
    checkpoint: (state: ProviderCheckpoint) => void) {
    super({ maxRetries: 0, cache: false });
    this.#configuration = configuration;
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
        messages: messages.map((message) => providerObjectSchema.parse(message.additional_kwargs.providerMessage)),
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
      if (finishReason !== "stop") {
        throw new Error(`OpenRouter ended the response with ${finishReason ?? "no finish reason"}. Retained content is unfinished.`);
      }
      if (Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
        throw new Error("The provider requested tools, but Repository tools are not available in this version.");
      }
    } finally {
      // Settlement includes closing the stream, even when Stop races a chunk.
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  }
}

export async function runAgentChat(configuration: OpenRouterConfiguration, messages: ProviderObject[],
  signal: AbortSignal, record: (frame: unknown) => void,
  checkpoint: (state: ProviderCheckpoint) => void): Promise<void> {
  const model = new OpenRouterChatModel(configuration, record, checkpoint);
  // The wrapper is just a LangChain carrier. The adapter submits the exact
  // native role and fields, including opaque reasoning, from providerMessage.
  const context = messages.map((providerMessage) => new HumanMessage({
    content: "", additional_kwargs: { providerMessage },
  }));
  const stream = await model.stream(context, { signal });
  for await (const _chunk of stream) {
    // Persistence and publication already happened before normalization/yield.
  }
}

function isObject(value: unknown): value is ProviderObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
