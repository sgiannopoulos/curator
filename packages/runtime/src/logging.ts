/**
 * Process logs go to stderr so stdout carries only protocol messages. The
 * desktop host forwards these lines to the terminal that launched it.
 */
export function log(message: string): void {
  process.stderr.write(`[curator-runtime] ${new Date().toISOString()} ${message}\n`);
}

export function describeCause(cause: unknown): string {
  if (cause instanceof Error) {
    return cause.message;
  }
  return String(cause);
}
