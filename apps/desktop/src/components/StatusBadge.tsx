import { describeStatus, type UserFlowStatus } from "@curator/shared";

export function StatusBadge({ status }: { status: UserFlowStatus }) {
  return (
    <span className={`badge ${status}`}>
      <i className={`dot ${status}`} />
      {describeStatus(status)}
    </span>
  );
}
