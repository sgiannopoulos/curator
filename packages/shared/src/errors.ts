import { z } from "zod";

/**
 * Failures the application reports to the user. Each code names a condition the
 * interface explains rather than a transport detail: storage problems are
 * reported without resetting anything, and a lost runtime asks for a restart.
 */
export const applicationErrorCodes = [
  "invalid_request",
  "invalid_result",
  "unknown_command",
  "repository_not_a_directory",
  "workspace_not_found",
  "user_flow_not_found",
  "workspace_busy",
  "execution_not_found",
  "agent_unavailable",
  "protocol_mismatch",
  "storage_unsupported",
  "storage_unreadable",
  "runtime_unavailable",
  "runtime_lost",
  "internal",
] as const;

export const applicationErrorCodeSchema = z.enum(applicationErrorCodes);

export const applicationErrorSchema = z.object({
  code: applicationErrorCodeSchema,
  message: z.string(),
  detail: z.string().optional(),
});

export type ApplicationErrorCode = z.infer<typeof applicationErrorCodeSchema>;
export type ApplicationError = z.infer<typeof applicationErrorSchema>;

/** An error carrying the code and user-facing message reported across the bridge. */
export class CuratorError extends Error {
  readonly code: ApplicationErrorCode;
  readonly detail: string | undefined;

  constructor(code: ApplicationErrorCode, message: string, detail?: string) {
    super(message);
    this.name = "CuratorError";
    this.code = code;
    this.detail = detail;
  }

  toApplicationError(): ApplicationError {
    return this.detail === undefined
      ? { code: this.code, message: this.message }
      : { code: this.code, message: this.message, detail: this.detail };
  }
}
