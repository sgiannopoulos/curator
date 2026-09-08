import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import type { Dirent } from "node:fs";
import { accessSync, constants, statSync } from "node:fs";
import { readdir, lstat, mkdir, readFile, realpath, stat, writeFile, appendFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { z } from "zod";
import { tool } from "@langchain/core/tools";
import type { StructuredToolInterface } from "@langchain/core/tools";
import type { ActivityReport } from "./file-activity-log.js";
import { CuratorError, type CitationDraft, type CitationFreshness, type RepositoryAvailability } from "@curator/shared";

/** Source access can disappear independently of the Workspace's stored data. */
export function repositoryAvailability(repositoryLocator: string): RepositoryAvailability {
  try {
    if (!statSync(repositoryLocator).isDirectory()) throw new Error("not a directory");
    accessSync(repositoryLocator, constants.R_OK | constants.X_OK);
    return { repositoryLocator, problem: null };
  } catch {
    return { repositoryLocator,
      problem: `The Repository at ${repositoryLocator} is unavailable. Restore access or Relink it in Workspace options before starting Agent Chat or a Scan.` };
  }
}

export type CitationEvidence = CitationDraft & { contentFingerprint: string };

/** A citation already in the catalog, with the fingerprint display omits. */
export interface AcceptedCitation {
  id: string;
  path: string;
  startLine: number;
  endLine: number;
  contentFingerprint: string;
}

/**
 * Sizes the tools state in their own output rather than trimming quietly. They
 * are working limits of one call, not ceilings on an Agent Execution: the agent
 * may narrow a path, ask for a line range, or call again as often as it needs.
 */
const LISTING_ENTRIES = 2000;
const READ_LINES = 1200;
const READABLE_BYTES = 4_000_000;
const SEARCHABLE_BYTES = 1_000_000;
const SEARCHED_FILES = 20_000;
const MATCHED_LINE_CHARACTERS = 400;
const SHELL_OUTPUT_CHARACTERS = 200_000;
const BINARY_SAMPLE_BYTES = 8192;

/**
 * The agent's view of the filesystem: generic listing, search, read, working
 * writes, and shell inspection, plus the file activity each call observed.
 *
 * What the agent may look at is governed by its prompt, not by these tools.
 * They do not confine paths, filter secrets, enforce ignore files, or sandbox
 * the shell, and the activity they report is what was observed rather than a
 * complete account of everything the agent touched. `write_working_file` writes
 * application-owned working data because that is the tool's purpose; it is not
 * a guarantee that the Repository cannot be written, since the shell can.
 */
export class RepositoryAccess {
  constructor(
    private readonly repositoryLocator: string,
    private readonly workingDirectory: string,
    private readonly report: (reports: ActivityReport[]) => void,
  ) {}

  /** The tools one Agent Execution owns; every one of them ends when it does. */
  tools(signal: AbortSignal): StructuredToolInterface[] {
    return [
      this.#listDirectory(signal),
      this.#readFile(signal),
      this.#searchRepository(signal),
      this.#runShell(signal),
      this.#writeWorkingFile(signal),
      this.#reportExcludedPaths(),
    ] as StructuredToolInterface[];
  }

  /**
   * Result integrity, independent of the tools' prompt-governed access policy.
   * Read the evidence before the acceptance transaction. The whole-file hash
   * records exactly which content was checked, for later freshness inspection.
   */
  async inspectCitations(citations: CitationDraft[], signal: AbortSignal): Promise<CitationEvidence[]> {
    const evidence: CitationEvidence[] = [];
    const root = await realpath(this.repositoryLocator).catch(() => {
      throw new CuratorError("invalid_result", "The Repository is unavailable; citations cannot be accepted.");
    });
    for (const [index, citation] of citations.entries()) {
      signal.throwIfAborted();
      const reject = (reason: string): never => {
        throw new CuratorError("invalid_result", `citations[${index}] (${citation.path}): ${reason}`);
      };
      const source = await readCitedSource(root, citation.path, signal);
      if ("problem" in source) return reject(source.detail);
      if (!rangeIsInside(citation, source)) {
        reject(`line range ${citation.startLine}-${citation.endLine} is invalid; source has ${source.lines} lines.`);
      }
      evidence.push({ ...citation, contentFingerprint: fingerprint(source.contents) });
    }
    signal.throwIfAborted();
    return evidence;
  }

  #listDirectory(signal: AbortSignal) {
    return tool(async ({ path, depth }) => {
      const start = this.#locate(path ?? ".");
      const levels = depth ?? 1;
      const reports: ActivityReport[] = [];
      const lines: string[] = [];
      const walk = this.#walk(start.absolute, levels, signal, reports);
      let stopped = false;
      for await (const found of walk) {
        if (lines.length >= LISTING_ENTRIES) {
          stopped = true;
          await walk.return(undefined);
          break;
        }
        reports.push({ path: found.display, kind: "considered" });
        lines.push(found.entry.isDirectory() ? `${found.display}/`
          : found.entry.isFile() ? `${found.display} (${await describeSize(found.absolute)})`
            : `${found.display} — not a regular file`);
      }
      this.report(reports);
      const header = `${lines.length} entries under ${start.display} to depth ${levels}` +
        (stopped ? `, listed up to this call's limit of ${LISTING_ENTRIES}. More entries exist; list a narrower path or a smaller depth to see them.` : ".");
      return [header, ...lines].join("\n");
    }, {
      name: "list_directory",
      description: "List the entries of a directory in the Repository. Paths are Repository-relative unless absolute. Symbolic links are reported as skipped rather than followed.",
      schema: z.object({
        path: z.string().optional().describe("Directory to list, Repository-relative. Defaults to the Repository root."),
        depth: z.number().int().min(1).max(6).optional().describe("How many directory levels to include. Defaults to one."),
      }),
    });
  }

  #readFile(signal: AbortSignal) {
    return tool(async ({ path, startLine, endLine }) => {
      signal.throwIfAborted();
      const target = this.#locate(path);
      const size = (await stat(target.absolute)).size;
      if (size > READABLE_BYTES) {
        this.report([{ path: target.display, kind: "excluded", reason: `${size} bytes, larger than this tool reads in one call` }]);
        return `${target.display} is ${size} bytes, larger than the ${READABLE_BYTES} bytes this tool reads at once. Search it, or inspect part of it with a shell command.`;
      }
      const contents = await readFile(target.absolute);
      if (looksBinary(contents)) {
        this.report([{ path: target.display, kind: "excluded", reason: "binary content" }]);
        return `${target.display} holds binary content, so there are no lines to read.`;
      }
      const lines = contents.toString("utf8").split("\n");
      const from = Math.max(1, startLine ?? 1);
      const requested = Math.min(endLine ?? lines.length, lines.length);
      const to = Math.min(requested, from + READ_LINES - 1);
      this.report([{ path: target.display, kind: "read" }]);
      const numbered = lines.slice(from - 1, to).map((line, offset) => `${from + offset}\t${line}`);
      const header = `${target.display}, lines ${from}-${to} of ${lines.length}` +
        (to < requested ? `, cut at this call's limit of ${READ_LINES} lines. Ask for the next range to continue.` : ".");
      return [header, ...numbered].join("\n");
    }, {
      name: "read_file",
      description: "Read a text file's lines, numbered from one. Cite these one-based line numbers.",
      schema: z.object({
        path: z.string().describe("File to read, Repository-relative."),
        startLine: z.number().int().min(1).optional().describe("First line to return, one-based."),
        endLine: z.number().int().min(1).optional().describe("Last line to return, one-based."),
      }),
    });
  }

  #searchRepository(signal: AbortSignal) {
    return tool(async ({ pattern, path, maxMatches, caseSensitive }) => {
      const start = this.#locate(path ?? ".");
      const wanted = maxMatches ?? 100;
      let expression: RegExp;
      try {
        expression = new RegExp(pattern, caseSensitive === true ? "" : "i");
      } catch (cause) {
        return `That is not a valid regular expression: ${cause instanceof Error ? cause.message : String(cause)}`;
      }
      const reports: ActivityReport[] = [];
      const matches: string[] = [];
      const walk = this.#walk(start.absolute, Number.POSITIVE_INFINITY, signal, reports);
      let searched = 0;
      let more = false;
      for await (const { absolute, display, entry } of walk) {
        if (!entry.isFile()) continue;
        if (searched >= SEARCHED_FILES || matches.length >= wanted) {
          more = true;
          continue;
        }
        searched += 1;
        const contents = await this.#textOf(absolute, display, reports);
        if (contents === null) continue;
        reports.push({ path: display, kind: "considered" });
        let matched = false;
        for (const [offset, line] of contents.split("\n").entries()) {
          if (!expression.test(line)) continue;
          if (matches.length >= wanted) {
            more = true;
            break;
          }
          matched = true;
          const shown = line.length > MATCHED_LINE_CHARACTERS
            ? `${line.slice(0, MATCHED_LINE_CHARACTERS)}… (line shortened)`
            : line;
          matches.push(`${display}:${offset + 1}: ${shown}`);
        }
        if (matched) reports.push({ path: display, kind: "read" });
      }
      this.report(reports);
      const header = `${matches.length} matching lines for /${pattern}/ under ${start.display}, from ${searched} files searched` +
        (more ? `, stopped at this call's limits. Narrow the path or the pattern to see the rest.` : ".");
      return [header, ...matches].join("\n");
    }, {
      name: "search_repository",
      description: "Search text files under a Repository path for a JavaScript regular expression, returning path, one-based line number, and the matching line.",
      schema: z.object({
        pattern: z.string().min(1).describe("JavaScript regular expression."),
        path: z.string().optional().describe("Directory to search, Repository-relative. Defaults to the Repository root."),
        maxMatches: z.number().int().min(1).max(500).optional().describe("How many matching lines to return. Defaults to 100."),
        caseSensitive: z.boolean().optional().describe("Match case exactly. Defaults to case-insensitive."),
      }),
    });
  }

  #runShell(signal: AbortSignal) {
    return tool(async ({ command, directory, timeoutSeconds }) => {
      signal.throwIfAborted();
      const cwd = directory === "working" ? await this.#workingDirectory() : this.repositoryLocator;
      return await runShellCommand(command, cwd, signal, timeoutSeconds);
    }, {
      name: "run_shell",
      description: "Run one read-only shell command to inspect the Repository. Never use it to modify files, run the Repository's code, package managers, builds or tests, or reach the network.",
      schema: z.object({
        command: z.string().min(1).describe("Command line, run with /bin/zsh -c."),
        directory: z.enum(["repository", "working"]).optional()
          .describe("Run in the Repository, the default, or in Curator's own working directory."),
        timeoutSeconds: z.number().int().min(1).optional()
          .describe("Optional limit you choose for a command that may not end on its own."),
      }),
    });
  }

  #writeWorkingFile(signal: AbortSignal) {
    return tool(async ({ path, content, mode }) => {
      signal.throwIfAborted();
      const root = await this.#workingDirectory();
      const absolute = resolve(root, path);
      if (absolute !== root && !absolute.startsWith(`${root}/`)) {
        return `This tool writes only Curator's own working data under ${root}. ${path} is outside it, and the Repository is never written.`;
      }
      await mkdir(resolve(absolute, ".."), { recursive: true });
      if (mode === "append") await appendFile(absolute, content, "utf8");
      else await writeFile(absolute, content, "utf8");
      return `${mode === "append" ? "Appended to" : "Wrote"} ${absolute}.`;
    }, {
      name: "write_working_file",
      description: "Write notes or intermediate work into Curator's own working directory for this Agent Execution. The analyzed Repository is never a destination.",
      schema: z.object({
        path: z.string().min(1).describe("Path inside the working directory."),
        content: z.string().describe("Text to write."),
        mode: z.enum(["replace", "append"]).optional().describe("Replace the file, the default, or append to it."),
      }),
    });
  }

  #reportExcludedPaths() {
    return tool(async ({ exclusions }) => {
      this.report(exclusions.map((exclusion) => ({
        path: exclusion.path,
        kind: "excluded" as const,
        reason: exclusion.reason,
        ...(exclusion.approximateCount === undefined ? {} : { count: exclusion.approximateCount }),
      })));
      return `Recorded ${exclusions.length} exclusions in this attempt's reported activity.`;
    }, {
      name: "report_excluded_paths",
      description: "Record paths or directories you decided to skip, with the reason. Use it for ignored, generated, dependency, binary, or irrelevant content so the person reading this attempt can see what you passed over.",
      schema: z.object({
        exclusions: z.array(z.object({
          path: z.string().min(1).describe("A file, or a directory standing for everything under it."),
          reason: z.string().min(1).describe("Why it was skipped."),
          approximateCount: z.number().int().min(1).optional()
            .describe("How many files it stands for, if you know."),
        })).min(1),
      }),
    });
  }

  /**
   * One traversal policy for every tool that goes looking: entries in name
   * order, breadth first, and symbolic links reported rather than walked, so a
   * link loop cannot trap a listing or a search. The agent can still read a
   * link's target directly; not following one here is this walk's behavior,
   * not a boundary around the agent.
   */
  async *#walk(start: string, depth: number, signal: AbortSignal, reports: ActivityReport[],
  ): AsyncGenerator<{ absolute: string; display: string; entry: Dirent }> {
    const queue: { directory: string; level: number }[] = [{ directory: start, level: 1 }];
    while (queue.length > 0) {
      signal.throwIfAborted();
      const next = queue.shift();
      if (next === undefined) return;
      const entries = await readdir(next.directory, { withFileTypes: true });
      for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
        const absolute = join(next.directory, entry.name);
        const display = this.#display(absolute);
        if (entry.isSymbolicLink()) {
          reports.push({ path: display, kind: "excluded", reason: "symbolic link; Curator does not follow it" });
          continue;
        }
        if (entry.isDirectory() && next.level < depth) {
          queue.push({ directory: absolute, level: next.level + 1 });
        }
        yield { absolute, display, entry };
      }
    }
  }

  /** A file's text, or nothing plus the recorded reason there is none. */
  async #textOf(absolute: string, display: string, reports: ActivityReport[]): Promise<string | null> {
    const size = await stat(absolute).then((info) => info.size).catch(() => SEARCHABLE_BYTES + 1);
    if (size > SEARCHABLE_BYTES) {
      reports.push({ path: display, kind: "excluded", reason: `${size} bytes, larger than this tool searches` });
      return null;
    }
    const contents = await readFile(absolute).catch(() => null);
    if (contents === null) {
      reports.push({ path: display, kind: "excluded", reason: "could not be read" });
      return null;
    }
    if (looksBinary(contents)) {
      reports.push({ path: display, kind: "excluded", reason: "binary content" });
      return null;
    }
    return contents.toString("utf8");
  }

  /** Repository-relative unless the path leaves the Repository, then absolute. */
  #locate(path: string): { absolute: string; display: string } {
    const absolute = isAbsolute(path) ? resolve(path) : resolve(this.repositoryLocator, path);
    return { absolute, display: this.#display(absolute) };
  }

  #display(absolute: string): string {
    const inside = relative(this.repositoryLocator, absolute);
    return inside === "" ? "." : inside.startsWith("..") ? absolute : inside;
  }

  async #workingDirectory(): Promise<string> {
    await mkdir(this.workingDirectory, { recursive: true });
    return this.workingDirectory;
  }
}

/**
 * Every command this runtime started and has not yet reaped, by the process
 * group it leads. Stop and a settled execution end them one at a time; this
 * registry is what ends the rest when the runtime itself goes away, whether it
 * was asked to stop or lost its parent.
 */
const commandGroups = new Set<number>();
let reaping = false;

function reapCommandsOnExit(): void {
  if (reaping) return;
  reaping = true;
  process.on("exit", () => {
    for (const group of commandGroups) {
      try {
        process.kill(-group, "SIGKILL");
      } catch {
        // The command already ended, or its group is gone with it.
      }
    }
  });
}

/**
 * Runs a command in its own process group so Stop, an ending execution, and a
 * lost parent take the whole command down rather than leaving work behind.
 */
async function runShellCommand(command: string, cwd: string, signal: AbortSignal,
  timeoutSeconds: number | undefined): Promise<string> {
  reapCommandsOnExit();
  return await new Promise<string>((settle, fail) => {
    const child = spawn("/bin/zsh", ["-c", command], {
      cwd,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
      // A shell command never needs the parent's environment, and Curator's own
      // configuration must not reach one through it.
      env: {
        PATH: process.env["PATH"] ?? "/usr/bin:/bin:/usr/sbin:/sbin",
        HOME: process.env["HOME"] ?? cwd,
        LANG: process.env["LANG"] ?? "en_US.UTF-8",
        TMPDIR: process.env["TMPDIR"] ?? "/tmp",
      },
    });

    if (child.pid !== undefined) commandGroups.add(child.pid);

    let output = "";
    let dropped = 0;
    const collect = (chunk: Buffer): void => {
      const text = chunk.toString("utf8");
      const room = SHELL_OUTPUT_CHARACTERS - output.length;
      if (room > 0) output += text.slice(0, room);
      dropped += Math.max(0, text.length - Math.max(0, room));
    };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);

    let ended: string | null = null;
    const end = (reason: string, hard: boolean): void => {
      ended ??= reason;
      if (child.pid === undefined) return;
      try {
        process.kill(-child.pid, hard ? "SIGKILL" : "SIGTERM");
      } catch {
        // The command already ended, or its group is gone with it.
      }
    };
    const stop = (): void => {
      end("Stopped with this Agent Execution.", false);
      setTimeout(() => end("Stopped with this Agent Execution.", true), 2000).unref();
    };
    signal.addEventListener("abort", stop, { once: true });
    const timer = timeoutSeconds === undefined ? undefined : setTimeout(() => {
      end(`Ended after the ${timeoutSeconds}s limit you set.`, false);
      setTimeout(() => end("", true), 2000).unref();
    }, timeoutSeconds * 1000);

    child.on("error", (cause) => {
      signal.removeEventListener("abort", stop);
      clearTimeout(timer);
      if (child.pid !== undefined) commandGroups.delete(child.pid);
      fail(cause);
    });
    child.on("close", (code, terminatedBy) => {
      signal.removeEventListener("abort", stop);
      clearTimeout(timer);
      if (child.pid !== undefined) commandGroups.delete(child.pid);
      if (signal.aborted) {
        fail(signal.reason instanceof Error ? signal.reason : new Error("This Agent Execution was stopped."));
        return;
      }
      const status = terminatedBy === null ? `exit ${code ?? "unknown"}` : `ended by ${terminatedBy}`;
      const notes = [
        `${status} in ${cwd}`,
        ...(ended === null ? [] : [ended]),
        ...(dropped === 0 ? [] : [`${dropped} further characters of output were not kept; this call keeps ${SHELL_OUTPUT_CHARACTERS}.`]),
      ];
      settle([notes.join(" · "), output].join("\n"));
    });
  });
}

/**
 * Reads a Source Citation's referenced location again and reports how it
 * compares with the file content recorded when the evidence was accepted.
 *
 * This is a reading of the source, never of the catalog: nothing here writes,
 * and the answer is recomputed from the current Repository Locator every time,
 * so a location that becomes readable again simply reads as unchanged again. A
 * Stale or Unavailable citation keeps its record, its accepted fingerprint, and
 * the status of the User Flow it supports.
 */
export async function inspectCitationFreshness(
  repositoryLocator: string,
  citations: AcceptedCitation[],
): Promise<{ repositoryAvailable: boolean; citations: CitationFreshness[] }> {
  const root = repositoryAvailability(repositoryLocator).problem === null
    ? await realpath(repositoryLocator).catch(() => null) : null;
  if (root === null) {
    return {
      repositoryAvailable: false,
      citations: citations.map((citation) => ({
        citationId: citation.id,
        state: "unavailable" as const,
        detail: `The Repository is not readable at ${repositoryLocator}, so this location cannot be checked.`,
      })),
    };
  }

  const reports: CitationFreshness[] = [];
  for (const citation of citations) {
    const source = await readCitedSource(root, citation.path);
    if ("problem" in source) {
      reports.push({ citationId: citation.id, state: "unavailable", detail: unreadableSource[source.problem] });
      continue;
    }
    if (!rangeIsInside(citation, source)) {
      reports.push({
        citationId: citation.id,
        state: "unavailable",
        detail: `Lines ${citation.startLine}-${citation.endLine} are no longer in this file, which now has ${source.lines} lines.`,
      });
      continue;
    }
    reports.push(fingerprint(source.contents) === citation.contentFingerprint
      ? { citationId: citation.id, state: "unchanged", detail: "This file is unchanged since this evidence was accepted." }
      : { citationId: citation.id, state: "stale", detail: "This file has changed since this evidence was accepted, so the cited lines may no longer say what was reviewed." });
  }
  return { repositoryAvailable: true, citations: reports };
}

/**
 * What an unreadable location means to the person reading the evidence, as
 * opposed to the correction `inspectCitations` hands the agent for the same
 * problem. A file that holds no text has no citable lines to read, which is
 * why it reads as unavailable rather than as changed content.
 */
const unreadableSource: Record<SourceProblem, string> = {
  "invalid-path": "This citation's recorded path cannot be resolved in the Repository.",
  missing: "This file is no longer in the Repository.",
  outside: "This path now leads outside the Repository.",
  "not-a-file": "This path is no longer a regular file.",
  unreadable: "This file could not be read.",
  binary: "This file no longer holds text lines to cite.",
};

function rangeIsInside(citation: { startLine: number; endLine: number }, source: CitedSource): boolean {
  return citation.startLine >= 1 && citation.endLine >= citation.startLine && citation.endLine <= source.lines;
}

type CitedSource = { contents: Buffer; lines: number };

/** Why a cited location could not be read, named so each caller can word it. */
type SourceProblem = "invalid-path" | "missing" | "outside" | "not-a-file" | "unreadable" | "binary";

/** `detail` is worded for the agent, which has to correct the citation. */
type UnreadableSource = { problem: SourceProblem; detail: string };

/**
 * The text a Repository-relative citation path names, or the reason there is
 * none. Every reader of a cited location goes through here, so accepting
 * evidence and checking its freshness later resolve the same path the same way.
 */
async function readCitedSource(
  root: string, path: string, signal?: AbortSignal,
): Promise<CitedSource | UnreadableSource> {
  const unreadable = (problem: SourceProblem, detail: string): UnreadableSource => ({ problem, detail });
  if (isAbsolute(path) || path.includes("\\") || path.includes("\0") ||
    path.split("/").some((part) => part === ".." || part === "." || part === "")) {
    return unreadable("invalid-path", "path must be a Repository-relative file path without empty, '.' or '..' segments.");
  }
  const absolute = await realpath(resolve(root, path)).catch(() => null);
  if (absolute === null) return unreadable("missing", "source file does not exist or cannot be read.");
  const inside = relative(root, absolute);
  if (inside === "" || inside === ".." || inside.startsWith("../") || isAbsolute(inside)) {
    return unreadable("outside", "source must resolve to a file inside this Repository.");
  }
  const info = await stat(absolute).catch(() => null);
  if (info === null) return unreadable("unreadable", "source file cannot be read.");
  if (!info.isFile()) return unreadable("not-a-file", "source must be a regular file.");
  const contents = await readFile(absolute, signal === undefined ? {} : { signal })
    .catch((cause: unknown) => {
      signal?.throwIfAborted();
      return unreadable("unreadable", `source cannot be read: ${cause instanceof Error ? cause.message : String(cause)}`);
    });
  if (!Buffer.isBuffer(contents)) return contents;
  if (looksBinary(contents)) return unreadable("binary", "source is binary, so it has no citable text lines.");
  const text = contents.toString("utf8");
  return {
    contents,
    lines: text.length === 0 ? 0 : text.split("\n").length - (text.endsWith("\n") ? 1 : 0),
  };
}

/** Whole-file content, so a later reading can tell that the file changed. */
function fingerprint(contents: Buffer): string {
  return createHash("sha256").update(contents).digest("hex");
}

async function describeSize(absolute: string): Promise<string> {
  const info = await lstat(absolute).catch(() => null);
  return info === null ? "size unavailable" : `${info.size} bytes`;
}

/** A NUL byte early in a file means there are no text lines to show. */
function looksBinary(contents: Buffer): boolean {
  return contents.subarray(0, BINARY_SAMPLE_BYTES).includes(0);
}
