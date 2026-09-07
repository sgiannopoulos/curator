import { z } from "zod";

/**
 * A Workspace's persisted identity. The Repository Locator is a normalized
 * absolute path used to recognize the association again; it is not the
 * Repository's durable identity, and the display name is derived from its
 * directory rather than chosen by the user.
 */
export const workspaceSchema = z.object({
  id: z.string().min(1),
  repositoryLocator: z.string().min(1),
  displayName: z.string().min(1),
  createdAt: z.string().min(1),
  lastOpenedAt: z.string().min(1),
});

export type Workspace = z.infer<typeof workspaceSchema>;

/** Whether opening the locator recognized an existing Workspace or created one. */
export const workspaceOpenSchema = z.object({
  workspace: workspaceSchema,
  recognized: z.boolean(),
});

export type WorkspaceOpen = z.infer<typeof workspaceOpenSchema>;
