import { z } from "zod";
import { agentExecutionSchema, chatSnapshotSchema, fileActivitySchema } from "./chat.js";
import { applicationErrorSchema } from "./errors.js";
import { userFlowDraftSchema, userFlowSchema } from "./user-flow.js";
import { workspaceOpenSchema, workspaceSchema } from "./workspace.js";

/**
 * The frontend never reaches persistence directly. It sends typed commands
 * across the Tauri bridge to the supervised Node runtime, which replies to the
 * correlated request and publishes ordered events describing new state. Both
 * sides validate every message with the schemas below.
 */
export const PROTOCOL_VERSION = 6;

const emptyPayloadSchema = z.object({}).strict();

export const requestEnvelopeSchema = z.object({
  kind: z.literal("request"),
  id: z.string().min(1),
  command: z.string().min(1),
  payload: z.unknown(),
});

export const responseEnvelopeSchema = z.discriminatedUnion("ok", [
  z.object({
    kind: z.literal("response"),
    id: z.string().min(1),
    ok: z.literal(true),
    result: z.unknown(),
  }),
  z.object({
    kind: z.literal("response"),
    id: z.string().min(1),
    ok: z.literal(false),
    error: applicationErrorSchema,
  }),
]);

export const eventEnvelopeSchema = z.object({
  kind: z.literal("event"),
  seq: z.number().int().nonnegative(),
  name: z.string().min(1),
  payload: z.unknown(),
});

/**
 * Where the runtime keeps application-owned data and which schema version it
 * opened. Reported once the store is readable so the interface can name the
 * exact location in a storage failure.
 */
export const storageDescriptionSchema = z.object({
  databasePath: z.string(),
  schemaVersion: z.number().int().positive(),
});

export const runtimeDescriptionSchema = z.object({
  protocolVersion: z.number().int().positive(),
  nodeVersion: z.string(),
  storage: storageDescriptionSchema,
});

export type RuntimeDescription = z.infer<typeof runtimeDescriptionSchema>;

/** Every command the frontend may send, with the payload and result contract. */
export const commandContracts = {
  "chat.read": {
    payload: z.object({ workspaceId: z.string().min(1) }).strict(),
    result: chatSnapshotSchema,
  },
  "chat.send": {
    payload: z.object({ workspaceId: z.string().min(1), text: z.string().trim().min(1) }).strict(),
    result: agentExecutionSchema,
  },
  "chat.stop": {
    payload: z.object({ workspaceId: z.string().min(1), executionId: z.string().min(1) }).strict(),
    result: agentExecutionSchema,
  },
  "chat.retry": {
    payload: z.object({ workspaceId: z.string().min(1), executionId: z.string().min(1) }).strict(),
    result: agentExecutionSchema,
  },
  "chat.provider": {
    payload: z.object({ workspaceId: z.string().min(1), executionId: z.string().min(1) }).strict(),
    result: z.object({ frames: z.array(z.json()) }),
  },
  "chat.activity": {
    payload: z.object({ workspaceId: z.string().min(1), executionId: z.string().min(1) }).strict(),
    result: z.object({ paths: z.array(fileActivitySchema) }),
  },
  "workspace.list": {
    payload: emptyPayloadSchema,
    result: z.object({ workspaces: z.array(workspaceSchema) }),
  },
  "workspace.open": {
    payload: z.object({ repositoryLocator: z.string().min(1) }).strict(),
    result: workspaceOpenSchema,
  },
  "workspace.reopen": {
    payload: z.object({ workspaceId: z.string().min(1) }).strict(),
    result: workspaceSchema,
  },
  "catalog.list": {
    payload: z.object({ workspaceId: z.string().min(1) }).strict(),
    result: z.object({ flows: z.array(userFlowSchema) }),
  },
  "catalog.add": {
    payload: z
      .object({ workspaceId: z.string().min(1), draft: userFlowDraftSchema })
      .strict(),
    result: userFlowSchema,
  },
  "catalog.save": {
    payload: z
      .object({
        workspaceId: z.string().min(1),
        flowId: z.string().min(1),
        draft: userFlowDraftSchema,
      })
      .strict(),
    result: userFlowSchema,
  },
  "catalog.reactivate": {
    payload: z
      .object({ workspaceId: z.string().min(1), flowId: z.string().min(1) })
      .strict(),
    result: userFlowSchema,
  },
  "catalog.remove": {
    payload: z
      .object({ workspaceId: z.string().min(1), flowId: z.string().min(1) })
      .strict(),
    result: z.object({ flowId: z.string().min(1) }),
  },
} as const;

export type CommandName = keyof typeof commandContracts;

export type CommandPayload<Name extends CommandName> = z.infer<
  (typeof commandContracts)[Name]["payload"]
>;

export type CommandResult<Name extends CommandName> = z.infer<
  (typeof commandContracts)[Name]["result"]
>;

export const commandNames = Object.keys(commandContracts) as CommandName[];

export function isCommandName(value: string): value is CommandName {
  return Object.prototype.hasOwnProperty.call(commandContracts, value);
}

/**
 * Ordered notifications. `runtime.ready` and `runtime.failed` describe the
 * runtime's own startup outcome; the rest describe persisted state that
 * changed. A reloaded interface catches up by reading state again rather than
 * assuming it observed every event.
 */
export const eventContracts = {
  "chat.changed": z.object({ workspaceId: z.string().min(1) }),
  "runtime.ready": runtimeDescriptionSchema,
  "runtime.failed": z.object({ error: applicationErrorSchema }),
  "workspaces.changed": z.object({ workspaces: z.array(workspaceSchema) }),
  "catalog.changed": z.object({
    workspaceId: z.string().min(1),
    flows: z.array(userFlowSchema),
  }),
} as const;

export type EventName = keyof typeof eventContracts;

export type EventPayload<Name extends EventName> = z.infer<
  (typeof eventContracts)[Name]
>;

export function isEventName(value: string): value is EventName {
  return Object.prototype.hasOwnProperty.call(eventContracts, value);
}

/** The Tauri event channel carrying every ordered runtime event to the frontend. */
export const RUNTIME_EVENT_CHANNEL = "curator://runtime-event";

/**
 * The desktop host's own supervision updates. They describe whether the runtime
 * is usable, so they are separate from the runtime's ordered event stream.
 */
export const RUNTIME_STATUS_CHANNEL = "curator://runtime-status";
