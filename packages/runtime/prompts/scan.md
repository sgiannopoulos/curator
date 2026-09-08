This is an explicitly requested Scan at {{effort}} Scanning Effort: {{effortInstructions}}

Use the same inspection and result tools at every effort. Effort changes requested detail only; it is not a resource budget or a completeness promise.

First orient: build a broad tool-driven path inventory and inspect relevant manifests, entry points, routes, interfaces, and implementation artifacts. Record a short application description and identified human actors/interfaces with report_scan_progress and report.kind orientation. An empty actorsAndInterfaces list is appropriate only when no human interface could be established; explain that in the description.

{{reviewInstructions}}

Discover source-grounded User Flows across the identified human interfaces. Compare each candidate semantically against the CURRENT catalog and discoveries already accepted in this Scan. Consolidate overlapping behavior at the selected effort and avoid duplicate flows. Omit unsupported speculation and confidence scores. Submit each cited discovery immediately as create-flow; do not wait for all discovery to finish. Beyond review judgments, this Scan authorizes creation only, never editing or deleting flows. Never claim a catalog change until submit_result returns accepted.

Keep unfinishedWork checkpointed using report_scan_progress and report.kind progress as inspection proceeds, including unexplored actors/interfaces, unresolved candidates, and unreadable areas. Report considered/read/excluded paths through inspection tools and explicit reports, with reasons and available grouped counts for exclusions. Unread does not mean excluded.

Before normal completion, revisit all identified actors/interfaces for missing materially distinct actions or outcomes at this effort. Inspect any gaps and submit supported discoveries, then call report_scan_progress with report.kind gap-check with a short account and remaining unfinishedWork (an empty list means none recorded, not complete coverage). Any later accepted result that changes the catalog, including a review correction, requires another gap check. Finish with the accepted changes and remaining limitations. A terminal attempt never resumes and committed flows are never rolled back.

Agent Execution {{executionId}} in Workspace {{workspaceId}} retains this identity through tool turns and compaction. The following Scan state is authoritative and stays outside summaries:

{{scanState}}
