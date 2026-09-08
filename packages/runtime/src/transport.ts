import { createInterface } from "node:readline";
import {
  CuratorError,
  commandContracts,
  eventContracts,
  isCommandName,
  requestEnvelopeSchema,
  responseEnvelopeSchema,
  type ApplicationError,
  type CommandName,
  type CommandPayload,
  type CommandResult,
  type EventName,
  type EventPayload,
} from "@curator/shared";
import { describeCause, log } from "./logging.js";

type Handler<Name extends CommandName> = (
  payload: CommandPayload<Name>,
) => CommandResult<Name> | Promise<CommandResult<Name>>;

/**
 * Newline-delimited JSON over stdin and stdout. Every request is correlated by
 * id and answered exactly once; every event carries a monotonic sequence number
 * so the interface can tell ordered updates from a gap it needs to read past.
 * Nothing but protocol messages is written to stdout.
 *
 * A handler may answer asynchronously — reading the Repository is not a store
 * operation and must not hold the event loop against streaming work. Replies
 * are correlated by id, so one settling later than another is ordinary.
 */
export class Transport {
  readonly #handlers = new Map<CommandName, Handler<CommandName>>();
  #sequence = 0;

  handle<Name extends CommandName>(name: Name, handler: Handler<Name>): void {
    this.#handlers.set(name, handler as Handler<CommandName>);
  }

  publish<Name extends EventName>(name: Name, payload: EventPayload<Name>): void {
    const validated = eventContracts[name].parse(payload);
    this.#sequence += 1;
    this.#write({ kind: "event", seq: this.#sequence, name, payload: validated });
  }

  /** Serves requests until the host closes stdin, then runs `onDisconnect`. */
  listen(onDisconnect: () => void): void {
    const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
    lines.on("line", (line) => {
      const trimmed = line.trim();
      if (trimmed.length > 0) {
        void this.#serve(trimmed);
      }
    });
    lines.on("close", onDisconnect);
  }

  /** One request, answered exactly once whether it settles now or later. */
  async #serve(line: string): Promise<void> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch (cause) {
      log(`discarded an unparsable message: ${describeCause(cause)}`);
      return;
    }

    const envelope = requestEnvelopeSchema.safeParse(parsed);
    if (!envelope.success) {
      const id = correlationIdOf(parsed);
      if (id === undefined) {
        log(`discarded a message that is not a request: ${envelope.error.message}`);
        return;
      }
      this.#fail(id, {
        code: "invalid_request",
        message: "Curator received a request it could not read.",
        detail: envelope.error.message,
      });
      return;
    }

    const { id, command, payload } = envelope.data;
    if (!isCommandName(command)) {
      this.#fail(id, {
        code: "unknown_command",
        message: `Curator does not support the command ${command}.`,
      });
      return;
    }

    const contract = commandContracts[command];
    const validPayload = contract.payload.safeParse(payload);
    if (!validPayload.success) {
      this.#fail(id, {
        code: "invalid_request",
        message: `Curator could not read the payload for ${command}.`,
        detail: validPayload.error.message,
      });
      return;
    }

    const handler = this.#handlers.get(command);
    if (!handler) {
      this.#fail(id, {
        code: "unknown_command",
        message: `Curator has no handler registered for ${command}.`,
      });
      return;
    }

    try {
      const result = contract.result.parse(await handler(validPayload.data as never));
      this.#write(responseEnvelopeSchema.parse({ kind: "response", id, ok: true, result }));
    } catch (cause) {
      if (cause instanceof CuratorError) {
        this.#fail(id, cause.toApplicationError());
        return;
      }
      log(`command ${command} failed: ${describeCause(cause)}`);
      this.#fail(id, {
        code: "internal",
        message: `Curator could not complete ${command}.`,
        detail: describeCause(cause),
      });
    }
  }

  #fail(id: string, error: ApplicationError): void {
    this.#write(responseEnvelopeSchema.parse({ kind: "response", id, ok: false, error }));
  }

  #write(message: unknown): void {
    process.stdout.write(`${JSON.stringify(message)}\n`);
  }
}

function correlationIdOf(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  const id = (value as { id?: unknown }).id;
  return typeof id === "string" && id.length > 0 ? id : undefined;
}
