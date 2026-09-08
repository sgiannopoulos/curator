import type { AgentExecution } from "@curator/shared";

/**
 * What the provider reported for one attempt, shown once. An attempt that
 * calls tools spans several requests, so these are their sum; a request that
 * reported nothing leaves the total incomplete rather than counting as zero,
 * and nothing here asks the provider again to fill a gap.
 *
 * Renders definition pairs, so a caller places them in its own list.
 */
export function ExecutionUsage({ execution }: { execution: AgentExecution }) {
  return (
    <>
      <dt>Provider requests</dt>
      <dd>{execution.usageRequests === 0 ? "None reported usage" : `${execution.usageRequests} reported usage`}</dd>
      <dt>Usage and cost</dt>
      <dd>
        {execution.usage === null ? "Unavailable"
          : execution.usageComplete ? "Provider-reported numbers, added across this attempt's requests"
            : "Incomplete provider totals"}
        {execution.usage !== null && <>
          <pre>{JSON.stringify(execution.usage, null, 2)}</pre>
          <p className="small muted">Only numeric fields add up. What each request reported on its own is in its complete payloads.</p>
        </>}
      </dd>
    </>
  );
}
