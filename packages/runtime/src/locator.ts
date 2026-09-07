import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";

/**
 * A Repository Locator is compared by exact equality, so every path reaches
 * storage in one form: absolute, with `.` and `..` resolved, no trailing
 * separator, and composed Unicode. macOS hands back decomposed filenames in
 * some paths, which would otherwise look like a different Repository.
 */
export function normalizeRepositoryLocator(input: string): string {
  const expanded = input === "~" || input.startsWith("~/")
    ? join(homedir(), input.slice(1))
    : input;
  return resolve(expanded).normalize("NFC");
}

/** A Workspace's display name is the Repository's directory name. */
export function deriveDisplayName(repositoryLocator: string): string {
  const directory = basename(repositoryLocator);
  return directory.length > 0 ? directory : repositoryLocator;
}
