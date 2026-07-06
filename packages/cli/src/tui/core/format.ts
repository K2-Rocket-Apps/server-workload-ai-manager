import { stripAnsi } from "./ansi.js";

const UNITS = ["B", "KB", "MB", "GB", "TB", "PB"] as const;

/**
 * Format byte count as human-readable string (base 1024).
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes)) return "—";
  if (bytes === 0) return "0 B";
  const sign = bytes < 0 ? "-" : "";
  const abs = Math.abs(bytes);
  const tier = Math.min(Math.floor(Math.log(abs) / Math.log(1024)), UNITS.length - 1);
  const value = abs / 1024 ** tier;
  const formatted = tier === 0 ? String(Math.round(value)) : value.toFixed(decimals);
  return `${sign}${formatted} ${UNITS[tier]}`;
}

/**
 * Format seconds as uptime string (e.g. "2d 3h 15m").
 */
export function formatUptime(seconds: number, compact = false): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const s = Math.floor(seconds);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  if (compact) {
    if (days > 0) return `${days}d${hours}h`;
    if (hours > 0) return `${hours}h${minutes}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${secs}s`;
  }

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (parts.length === 0 || secs > 0) parts.push(`${secs}s`);
  return parts.join(" ");
}

/**
 * Relative time from epoch ms (e.g. "3m ago", "in 2h").
 */
export function formatRelativeTime(timestampMs: number, nowMs = Date.now()): string {
  if (!Number.isFinite(timestampMs)) return "—";
  const deltaSec = Math.round((timestampMs - nowMs) / 1000);
  const abs = Math.abs(deltaSec);
  const suffix = deltaSec < 0 ? " ago" : deltaSec > 0 ? "" : "";
  const prefix = deltaSec > 0 ? "in " : "";

  if (abs < 5) return "just now";
  if (abs < 60) return `${prefix}${abs}s${suffix}`;
  if (abs < 3600) return `${prefix}${Math.floor(abs / 60)}m${suffix}`;
  if (abs < 86400) return `${prefix}${Math.floor(abs / 3600)}h${suffix}`;
  if (abs < 604800) return `${prefix}${Math.floor(abs / 86400)}d${suffix}`;
  return new Date(timestampMs).toLocaleDateString();
}

/**
 * Format ratio as percentage string.
 */
export function formatPercent(value: number, total?: number, decimals = 0): string {
  if (total !== undefined && total > 0) {
    return `${((value / total) * 100).toFixed(decimals)}%`;
  }
  if (!Number.isFinite(value)) return "—";
  const pct = value <= 1 && value >= 0 ? value * 100 : value;
  return `${pct.toFixed(decimals)}%`;
}

/** Format load average values (pvesh may return strings). */
export function formatLoadAvg(loadavg: readonly unknown[]): string {
  if (!loadavg.length) return "—";
  return loadavg
    .map((l) => {
      const n = Number(l);
      return Number.isFinite(n) ? n.toFixed(2) : "—";
    })
    .join(" ");
}

/**
 * Truncate string to max length with ellipsis (plain text).
 */
export function truncate(text: string, maxLength: number, ellipsis = "…"): string {
  const plain = stripAnsi(text);
  if (plain.length <= maxLength) return text;
  if (maxLength <= ellipsis.length) return ellipsis.slice(0, maxLength);
  return plain.slice(0, maxLength - ellipsis.length) + ellipsis;
}

/**
 * Pad string to width (left, right, or center).
 */
export function pad(
  text: string,
  width: number,
  align: "left" | "right" | "center" = "left",
  fill = " ",
): string {
  const plain = stripAnsi(text);
  if (plain.length >= width) return text;
  const padLen = width - plain.length;
  switch (align) {
    case "right":
      return fill.repeat(padLen) + text;
    case "center": {
      const left = Math.floor(padLen / 2);
      const right = padLen - left;
      return fill.repeat(left) + text + fill.repeat(right);
    }
    default:
      return text + fill.repeat(padLen);
  }
}

export type TableColumn<T> = {
  key: string;
  header: string;
  width?: number;
  align?: "left" | "right" | "center";
  render?: (row: T) => string;
};

export type AlignTableOptions = {
  /** Gap between columns */
  gap?: number;
  /** Header separator line */
  headerSeparator?: boolean;
  separatorChar?: string;
};

/**
 * Align rows into fixed-width columns for plain-text tables.
 */
export function alignTable<T>(
  rows: readonly T[],
  columns: readonly TableColumn<T>[],
  options: AlignTableOptions = {},
): string[] {
  const { gap = 2, headerSeparator = true, separatorChar = "─" } = options;

  const widths = columns.map((col) => {
    if (col.width) return col.width;
    let max = col.header.length;
    for (const row of rows) {
      const cell = col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "");
      max = Math.max(max, stripAnsi(cell).length);
    }
    return max;
  });

  const formatCell = (text: string, width: number, align: "left" | "right" | "center") =>
    pad(text, width, align);

  const headerLine = columns
    .map((col, i) => formatCell(col.header, widths[i]!, col.align ?? "left"))
    .join(" ".repeat(gap));

  const lines: string[] = [headerLine];

  if (headerSeparator) {
    const sep = columns
      .map((_, i) => separatorChar.repeat(widths[i]!))
      .join(" ".repeat(gap));
    lines.push(sep);
  }

  for (const row of rows) {
    const line = columns
      .map((col, i) => {
        const raw = col.render
          ? col.render(row)
          : String((row as Record<string, unknown>)[col.key] ?? "");
        return formatCell(raw, widths[i]!, col.align ?? "left");
      })
      .join(" ".repeat(gap));
    lines.push(line);
  }

  return lines;
}

/**
 * Format integer with thousands separators.
 */
export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US");
}

/**
 * Format duration in ms as human string.
 */
export function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return formatUptime(Math.floor(ms / 1000));
}

/**
 * Join non-empty strings with separator.
 */
export function joinNonEmpty(parts: readonly (string | undefined | null)[], sep = " · "): string {
  return parts.filter((p) => p && p.trim().length > 0).join(sep);
}

/**
 * Pluralize a word based on count.
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}
