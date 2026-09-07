import type { ApplicationError } from "@curator/shared";

/**
 * Reports a failure in place, with the detail the user needs to act on it. A
 * lost runtime asks for a restart; a storage problem names its file and says
 * that nothing was changed.
 */
export function Notice({
  error,
  onDismiss,
}: {
  error: ApplicationError;
  onDismiss?: (() => void) | undefined;
}) {
  return (
    <div className="notice" role="status">
      <div className="grow">
        <strong>{error.message}</strong>
        {error.detail !== undefined && <p className="small">{error.detail}</p>}
      </div>
      {onDismiss && (
        <button className="plain" onClick={onDismiss} aria-label="Dismiss notice">
          ×
        </button>
      )}
    </div>
  );
}
