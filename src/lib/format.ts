export function initials(name: string): string {
  const parts = name
    .replace(/[^\p{L}\p{N} _-]/gu, "")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "IK";
  }

  return parts.map((part) => part[0]!.toUpperCase()).join("");
}

export function relativeTime(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return "";
  }

  const minutes = Math.max(0, Math.round((now - then) / 60_000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

const compact = new Intl.NumberFormat(undefined, {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function compactNumber(value: number): string {
  return compact.format(value);
}
