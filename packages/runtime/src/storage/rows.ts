import type { SQLOutputValue } from "node:sqlite";
import { CuratorError } from "@curator/shared";

export type StoredRow = Record<string, SQLOutputValue>;

export function readText(row: StoredRow, column: string): string {
  const value = row[column];
  if (typeof value !== "string") {
    throw unreadable(column, "text");
  }
  return value;
}

/** A column the schema leaves nullable, read without inventing a value for it. */
export function readOptionalText(row: StoredRow, column: string): string | null {
  return row[column] === null || row[column] === undefined ? null : readText(row, column);
}

export function readOptionalInteger(row: StoredRow, column: string): number | null {
  return row[column] === null || row[column] === undefined ? null : readInteger(row, column);
}

export function readInteger(row: StoredRow, column: string): number {
  const value = row[column];
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  throw unreadable(column, "a number");
}

function unreadable(column: string, expected: string): CuratorError {
  return new CuratorError(
    "storage_unreadable",
    "Curator read a record it could not interpret.",
    `Column ${column} did not hold ${expected}.`,
  );
}
