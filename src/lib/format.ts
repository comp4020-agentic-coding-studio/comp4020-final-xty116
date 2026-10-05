export function formatTimestamp(value: string): string {
  const date = new Date(`${value.replace(" ", "T")}Z`);
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Australia/Sydney",
  }).format(date);
}

export function excerpt(value: string, length = 170): string {
  return value.length <= length ? value : `${value.slice(0, length).trimEnd()}...`;
}
