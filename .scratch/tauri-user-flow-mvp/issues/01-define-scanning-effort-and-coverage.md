Type: grilling
Status: resolved
Blocked by:

## Question

What Scanning Effort levels should the MVP expose, what changes between those levels, and what coverage promise and stopping conditions can each level make for repositories of arbitrary language, architecture, and size?

## Answer

The MVP exposes three per-Scan prompt presets: **Quick**, **Standard**, and **Maximum**, with Standard selected by default. Scanning Effort changes only the instructions given to the agent; it does not select a different model, traversal implementation, or application-enforced resource budget. A higher setting may naturally cause the agent to inspect more Repository content as it follows the more demanding prompt.

- **Quick** asks for the principal user goals and happy paths and combines minor variants.
- **Standard** asks for Quick's coverage plus meaningful alternatives, validation failures, permission-dependent behavior, and state changes.
- **Maximum** asks for Standard's coverage plus uncommon paths, edge cases, recovery behavior, and separate User Flows wherever variants have materially different actions or outcomes.

Scanning Effort is a relative request for detail, not a completeness or coverage claim. Every Scan inventories all eligible files through the same machinery, but the agent may prioritize which contents it reads. No level promises to discover every User Flow, Maximum does not mean exhaustive, and the UI must not show a coverage percentage.

The application imposes no default time, token, cost, file, or tool-call ceiling. If the separate model-and-cost decision introduces an optional user-configured budget, reaching that budget is a stopping condition only when the user explicitly enabled it.

A Scan normally ends when the agent determines, under the selected prompt, that it has no more distinct User Flows to report. Searching until no new evidence emerges is agent guidance rather than application-enforced convergence logic. Other terminal reasons are user cancellation, an explicitly configured budget, or an external failure such as an unavailable model or unrecoverable context limitation. Valid partial results are retained when possible.

For transparency rather than a coverage claim, the Scan reports the files considered, read, and excluded, together with its terminal reason.
