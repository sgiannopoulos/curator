import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import {
  CuratorError,
  RUNTIME_EVENT_CHANNEL,
  RUNTIME_STATUS_CHANNEL,
  applicationErrorSchema,
  commandContracts,
  eventContracts,
  eventEnvelopeSchema,
  isEventName,
  runtimeStatusSchema,
  type CommandName,
  type CommandPayload,
  type CommandResult,
  type EventName,
  type EventPayload,
  type RuntimeStatus,
} from "@curator/shared";

/**
 * The interface's only route to application state. Every command and every
 * event crosses the desktop host to the supervised runtime and is validated
 * against the shared contract on the way in and out, so the interface stays a
 * projection of persisted state rather than a second authority over it.
 */
export async function sendCommand<Name extends CommandName>(
  name: Name,
  payload: CommandPayload<Name>,
): Promise<CommandResult<Name>> {
  const contract = commandContracts[name];
  try {
    const reply = await invoke("runtime_request", {
      command: name,
      payload: contract.payload.parse(payload),
    });
    return contract.result.parse(reply) as CommandResult<Name>;
  } catch (cause) {
    throw asCuratorError(cause);
  }
}

export async function readRuntimeStatus(): Promise<RuntimeStatus> {
  return runtimeStatusSchema.parse(await invoke("runtime_status"));
}

/**
 * Opens the native folder chooser. Resolves to null when the user cancels; a
 * chooser that fails raises instead, so nothing silently does nothing.
 */
export async function chooseRepositoryDirectory(): Promise<string | null> {
  try {
    const chosen = await invoke("select_repository_directory");
    return typeof chosen === "string" && chosen.length > 0 ? chosen : null;
  } catch (cause) {
    throw asCuratorError(cause);
  }
}

export function onRuntimeStatus(
  handle: (status: RuntimeStatus) => void,
): Promise<UnlistenFn> {
  return listen(RUNTIME_STATUS_CHANNEL, (event) => {
    handle(runtimeStatusSchema.parse(event.payload));
  });
}

/**
 * Ordered runtime events. The sequence number lets a listener notice it missed
 * something; a window that reloads reads current state instead of replaying.
 */
export function onRuntimeEvent(
  handle: (name: EventName, payload: unknown, sequence: number) => void,
): Promise<UnlistenFn> {
  return listen(RUNTIME_EVENT_CHANNEL, (event) => {
    const envelope = eventEnvelopeSchema.safeParse(event.payload);
    if (!envelope.success || !isEventName(envelope.data.name)) {
      return;
    }
    const { name, payload, seq } = envelope.data;
    const validated = eventContracts[name].safeParse(payload);
    if (validated.success) {
      handle(name, validated.data, seq);
    }
  });
}

export function asCuratorError(cause: unknown): CuratorError {
  const known = applicationErrorSchema.safeParse(cause);
  if (known.success) {
    return new CuratorError(known.data.code, known.data.message, known.data.detail);
  }
  return new CuratorError(
    "internal",
    "Curator could not complete that request.",
    cause instanceof Error ? cause.message : String(cause),
  );
}
