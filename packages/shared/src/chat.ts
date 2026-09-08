import { z } from "zod";
import { scanProgressSchema } from "./scan.js";
import { acceptedResultSchema } from "./result.js";

export const providerObjectSchema = z.record(z.string(), z.json());
export const executionStatusSchema = z.enum([
  "running", "completed", "cancelled", "failed", "interrupted",
]);
export const agentExecutionSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  kind: z.enum(["ordinary-chat", "scan"]),
  scan: scanProgressSchema.nullable(),
  requestId: z.string(),
  model: z.string(),
  status: executionStatusSchema,
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  cancellationRequestedAt: z.string().nullable(),
  reason: z.string().nullable(),
  // One execution spans several provider requests once it calls tools, so the
  // totals here are the sum of the requests that reported one, never a reading
  // of the last request alone.
  usage: providerObjectSchema.nullable(),
  usageRequests: z.number().int().nonnegative(),
  usageComplete: z.boolean(),
});

/**
 * A tool call exactly as the provider asked for it, kept beside the output it
 * produced so the conversation shows what ran and what came back.
 */
export const toolInvocationSchema = z.object({
  callId: z.string(),
  name: z.string(),
  arguments: z.string(),
  failed: z.boolean(),
});

/**
 * What one compaction event stands for. The summary replaces those entries in
 * the model's working context only; they stay in Agent Chat, in order, exactly
 * as they were written.
 */
export const compactionRecordSchema = z.object({
  throughSequence: z.number().int().positive(),
  replaced: z.number().int().positive(),
});

export const chatEntrySchema = z.object({
  sequence: z.number().int().positive(),
  workspaceId: z.string(),
  executionId: z.string(),
  kind: z.enum(["user", "assistant", "tool", "lifecycle", "compaction", "result", "validation"]),
  createdAt: z.string(),
  text: z.string(),
  unfinished: z.boolean(),
  // The continuation message is provider-native, independent of display text.
  providerMessage: providerObjectSchema.nullable(),
  /** Present on tool entries: which call this output answers. */
  tool: toolInvocationSchema.nullable(),
  /** Present on assistant and compaction entries: what that request reported. */
  usage: providerObjectSchema.nullable(),
  /**
   * Present on compaction entries. Entries written before compaction existed
   * carry no such record, and read back as none rather than as unreadable.
   */
  compaction: compactionRecordSchema.nullable().default(null),
  result: acceptedResultSchema.nullable().default(null),
});

/**
 * What an Agent Execution was observed to do with Repository files.
 * Considered means a path was surfaced and evaluated for relevance, Read means
 * some of its contents reached the agent, and Excluded means it was explicitly
 * skipped with a reason. A path nobody looked at is none of the three: this is
 * observed activity, not a coverage measure or a safety guarantee.
 */
export const fileActivityKinds = ["considered", "read", "excluded"] as const;
export const fileActivityKindSchema = z.enum(fileActivityKinds);
export const fileActivitySchema = z.object({
  path: z.string().min(1),
  kind: fileActivityKindSchema,
  reason: z.string().nullable(),
  /** How many paths a grouped record stands for, where that is known. */
  count: z.number().int().positive().nullable(),
});

export const executionActivitySchema = z.object({
  executionId: z.string(),
  considered: z.number().int().nonnegative(),
  read: z.number().int().nonnegative(),
  excluded: z.number().int().nonnegative(),
  /** Exclusions carry their reasons inline; they are few and worth reading. */
  exclusions: z.array(fileActivitySchema),
});

/**
 * One retained Scan attempt, assembled from the records that already own its
 * parts: the durable Agent Execution carrying its Scan progress, the results it
 * accepted, the file activity it reported, and how many entries it wrote into
 * the Workspace's one ongoing conversation.
 *
 * A Scan Record is inspectable history. It may mention a User Flow that has
 * since been deleted or re-cited, and it can neither restore that flow nor
 * rebuild the catalog from what it remembers.
 */
export const scanRecordSchema = z.object({
  execution: agentExecutionSchema,
  results: z.array(acceptedResultSchema),
  activity: executionActivitySchema,
  entryCount: z.number().int().nonnegative(),
});

export const chatSnapshotSchema = z.object({
  entries: z.array(chatEntrySchema),
  executions: z.array(agentExecutionSchema),
  activity: z.array(executionActivitySchema),
  blockedReason: z.string().nullable(),
});

export type ProviderObject = z.infer<typeof providerObjectSchema>;
export type AgentExecution = z.infer<typeof agentExecutionSchema>;
export type ToolInvocation = z.infer<typeof toolInvocationSchema>;
export type CompactionRecord = z.infer<typeof compactionRecordSchema>;
export type ChatEntry = z.infer<typeof chatEntrySchema>;
export type FileActivityKind = z.infer<typeof fileActivityKindSchema>;
export type FileActivity = z.infer<typeof fileActivitySchema>;
export type ExecutionActivity = z.infer<typeof executionActivitySchema>;
export type ScanRecord = z.infer<typeof scanRecordSchema>;
export type ChatSnapshot = z.infer<typeof chatSnapshotSchema>;
