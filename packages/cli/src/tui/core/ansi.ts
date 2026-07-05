/** ANSI escape sequence pattern (CSI and OSC, common SGR). */
const ANSI_PATTERN =
  // eslint-disable-next-line no-control-regex
  /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

/**
 * Remove ANSI escape sequences from a string.
 */
export function stripAnsi(text: string): string {
  if (!text) return "";
  return text.replace(ANSI_PATTERN, "");
}

/**
 * Visible character count (excluding ANSI codes and treating wide chars via length heuristic).
 * For precise width use string-width in wrap/format modules.
 */
export function visibleLength(text: string): number {
  return stripAnsi(text).length;
}

/**
 * Split text into lines, normalizing CRLF and lone CR.
 */
export function splitLines(text: string): string[] {
  if (text === "") return [""];
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
}

/**
 * Join lines with platform newline (always \n for TUI).
 */
export function joinLines(lines: readonly string[]): string {
  return lines.join("\n");
}

/**
 * Returns true if the string contains ANSI escape codes.
 */
export function hasAnsi(text: string): boolean {
  ANSI_PATTERN.lastIndex = 0;
  return ANSI_PATTERN.test(text);
}

/**
 * Pad/truncate to visible width without breaking ANSI codes at end.
 * Truncation appends ellipsis when shortened.
 */
export function truncateVisible(text: string, maxWidth: number, ellipsis = "…"): string {
  const plain = stripAnsi(text);
  if (plain.length <= maxWidth) return text;
  if (maxWidth <= ellipsis.length) return ellipsis.slice(0, maxWidth);
  return plain.slice(0, maxWidth - ellipsis.length) + ellipsis;
}
