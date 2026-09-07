/** A short, human reading of when a Workspace was last opened. */
export function describeWhen(timestamp: string): string {
  const moment = new Date(timestamp).getTime();
  if (Number.isNaN(moment)) {
    return "";
  }
  const minutes = Math.round((Date.now() - moment) / 60_000);
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.round(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }
  return new Date(moment).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function describeMoment(timestamp: string): string {
  const moment = new Date(timestamp);
  return Number.isNaN(moment.getTime()) ? "" : moment.toLocaleString();
}
