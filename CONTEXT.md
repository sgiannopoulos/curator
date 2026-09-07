# QA Assist

QA Assist describes how people use a software product by deriving and curating user-facing behavior from its source repository.

## Language

**Workspace**:
A persistent association between one Repository, its ongoing Agent Chat, its Scan history, and its curated User Flows.
_Avoid_: Project

**Repository**:
The local source tree selected as the subject of a Scan.
_Avoid_: Workspace, project

**Repository Locator**:
The normalized absolute path a Workspace currently uses to find its Repository. It is a replaceable locator rather than the Repository's durable identity, and changing it requires an explicit user relink.
_Avoid_: Repository identity

**Relink**:
An explicit user-confirmed replacement of a Workspace's Repository Locator with another location for the same Repository. The Workspace retains its User Flows and Scan history.
_Avoid_: Repository import, Workspace merge

**Scan**:
One attempt to infer source-grounded User Flows from a Repository at a chosen Scanning Effort. It treats the Repository as a read-only source while it may create User Flows in the Workspace.
_Avoid_: Crawl, import

**Scan Record**:
The retained historical record of one Scan, including its execution metadata, accepted results, associated Agent Chat entries, and terminal outcome. It may mention a later-deleted User Flow, but it cannot restore that flow or act as User Flow revision history.
_Avoid_: Scan log, User Flow history

**Interrupted Scan**:
A terminal Scan whose execution ended when the application process exited before completion, cancellation, or failure was recorded. Its committed partial results remain, but its execution cannot resume.
_Avoid_: Paused Scan, resumable Scan

**Review Pass**:
The first part of a Scan. It evaluates every existing Active and Outdated User Flow as Supported, Contradicted, or Indeterminate before discovery begins, and each accepted result takes effect immediately. If no User Flows exist, the Scan skips this pass.
_Avoid_: Rescan

**Discovery Pass**:
The part of a Scan that discovers additional source-grounded User Flows after the Review Pass, or begins immediately when no User Flows exist. Evidence found during discovery may revise an earlier review result instead of creating a duplicate User Flow.
_Avoid_: Initial scan

**Agent Chat**:
The single ongoing conversation belonging to a Workspace, where the user asks questions, requests changes to User Flows, and observes Scans. Its history persists across application restarts and includes user messages, observable agent responses, tool activity, and application-generated events.
_Avoid_: Curation Task, Scan-only transcript, hidden chain of thought, activity summary

**Agent Execution**:
One attempt to carry out an explicitly submitted Scan or ordinary Agent Chat request within a Workspace, retaining its identity across internal agent turns and context compaction until it reaches a terminal outcome. A retry is a new Agent Execution; a Scan execution also has an associated Scan Record.
_Avoid_: Agent Chat, model request, resumable task

**Working Context**:
What one model request carries: the standing rules, current state, and as much of the Agent Chat as fits. It is rebuilt for every request and is not the conversation, which is retained in full regardless of what any request contained.
_Avoid_: Agent Chat, conversation history

**Compaction**:
Replacing the oldest exchanges in a Working Context with a model-written summary of them, so an Agent Execution can continue as that context fills. It is recorded as an Agent Chat event and never rewrites, replaces, or removes the entries it summarizes.
_Avoid_: Truncation, trimming, forgetting

**Scanning Effort**:
The user-selected prompt preset for a Scan: Quick, Standard, or Maximum. Higher effort asks the agent to produce progressively more detailed User Flows, without changing the Scan machinery or promising complete coverage.
_Avoid_: Confidence, completeness

**OpenRouter Configuration**:
The application-wide OpenRouter API credential and exact model identifier used by every hosted agent task. It does not belong to a Workspace and cannot vary by Scan.
_Avoid_: Workspace credential, Workspace model, Scan model

**User Flow**:
A free-text scenario describing actions an intended human user takes through a software product's interface and the outcomes they expect. An interface may be graphical, web-based, command-line, or another human-operated product surface.
_Avoid_: Test case, code path, workflow

**Source Citation**:
A Repository-relative file location and explanation recording evidence for an agent's judgment about a User Flow, with a one-based line or tight line range and no copied source excerpt. It remains attached after manual or wording-only agent edits and does not certify that manually edited text has been reviewed.
_Avoid_: Confidence score, source excerpt

**Stale Source Citation**:
A Source Citation whose referenced file has changed since its evidence was accepted. Staleness alone does not make the associated User Flow Outdated.
_Avoid_: Outdated User Flow, contradicted evidence

**Unavailable Source Citation**:
A Source Citation whose referenced source location cannot currently be read, including a missing Repository, missing file, or invalid line range. Unavailability alone does not change the associated User Flow's status.
_Avoid_: Deleted citation, Outdated User Flow

**Active User Flow**:
A User Flow currently treated as describing behavior that is possible and current.
_Avoid_: Current flow

**Outdated User Flow**:
A User Flow retained in a Workspace after positive evidence indicates that the described behavior is no longer possible or current. It may become Active again if the user or a later Scan result positively confirms the behavior.
_Avoid_: Deleted flow, invalid flow
