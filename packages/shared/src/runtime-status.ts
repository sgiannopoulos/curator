import { z } from "zod";
import { applicationErrorSchema } from "./errors.js";
import { runtimeDescriptionSchema } from "./protocol.js";

/**
 * What the desktop host knows about its supervised runtime. The interface reads
 * this on load instead of assuming it saw the startup events, so a reloaded
 * window recovers the same state. `unavailable` covers both a storage problem
 * the runtime reported while staying alive and a runtime that stopped, which
 * the error code distinguishes.
 */
export const runtimeStatusSchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("starting") }),
  z.object({ state: z.literal("ready"), description: runtimeDescriptionSchema }),
  z.object({ state: z.literal("unavailable"), error: applicationErrorSchema }),
]);

export type RuntimeStatus = z.infer<typeof runtimeStatusSchema>;
