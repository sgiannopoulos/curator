import { z } from "zod";

export const providerObjectSchema = z.record(z.string(), z.json());
export const executionStatusSchema = z.enum([
  "running", "completed", "cancelled", "failed", "interrupted",
]);
export const agentExecutionSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  kind: z.literal("ordinary-chat"),
  requestId: z.string(),
  model: z.string(),
  status: executionStatusSchema,
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  cancellationRequestedAt: z.string().nullable(),
  reason: z.string().nullable(),
  usage: providerObjectSchema.nullable(),
  usageComplete: z.boolean(),
});
export const chatEntrySchema = z.object({
  sequence: z.number().int().positive(),
  workspaceId: z.string(),
  executionId: z.string(),
  kind: z.enum(["user", "assistant", "lifecycle"]),
  createdAt: z.string(),
  text: z.string(),
  unfinished: z.boolean(),
  // The continuation message is provider-native, independent of display text.
  providerMessage: providerObjectSchema.nullable(),
});
export const chatSnapshotSchema = z.object({
  entries: z.array(chatEntrySchema),
  executions: z.array(agentExecutionSchema),
  blockedReason: z.string().nullable(),
});

export type ProviderObject = z.infer<typeof providerObjectSchema>;
export type AgentExecution = z.infer<typeof agentExecutionSchema>;
export type ChatEntry = z.infer<typeof chatEntrySchema>;
export type ChatSnapshot = z.infer<typeof chatSnapshotSchema>;
