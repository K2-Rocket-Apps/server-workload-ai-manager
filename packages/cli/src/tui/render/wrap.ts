import stringWidth from "string-width";
import wrapAnsi from "wrap-ansi";
import { splitLines } from "../core/ansi.js";

export type WrapOptions = {
  /** Preserve paragraph breaks (blank lines) */
  preserveParagraphs?: boolean;
  /** Trim trailing whitespace on each line */
  trimLines?: boolean;
  /** Hard break long words that exceed width */
  hardBreak?: boolean;
  /** Indent continuation lines */
  indent?: string;
};

/**
 * Wrap plain text to terminal width using string-width for display width.
 */
export function wrapText(text: string, width: number, options: WrapOptions = {}): string {
  const {
    preserveParagraphs = true,
    trimLines = true,
    hardBreak = true,
    indent = "",
  } = options;

  if (width < 1) return text;
  if (!text) return "";

  const paragraphs = preserveParagraphs ? text.split(/\n\n+/) : [text];
  const wrappedParagraphs: string[] = [];

  for (const paragraph of paragraphs) {
    const lines = splitLines(paragraph);
    const wrappedLines: string[] = [];

    for (const line of lines) {
      if (line.trim() === "") {
        wrappedLines.push("");
        continue;
      }

      const wrapped = wrapLine(line, width, hardBreak, indent);
      wrappedLines.push(...wrapped);
    }

    const joined = trimLines
      ? wrappedLines.map((l) => l.trimEnd()).join("\n")
      : wrappedLines.join("\n");
    wrappedParagraphs.push(joined);
  }

  return wrappedParagraphs.join("\n\n");
}

function wrapLine(line: string, width: number, hardBreak: boolean, indent: string): string[] {
  if (stringWidth(line) <= width) {
    return [line];
  }

  /** Use wrap-ansi for ANSI-aware wrapping when no hard break needed */
  if (!hardBreak && !line.includes(" ")) {
    return wrapAnsi(line, width, { hard: false, trim: false }).split("\n");
  }

  const words = line.split(/(\s+)/);
  const result: string[] = [];
  let current = "";

  const flush = () => {
    if (current.length > 0) {
      result.push(current);
      current = "";
    }
  };

  for (const word of words) {
    if (word === "") continue;

    const isWhitespace = /^\s+$/.test(word);
    if (isWhitespace) {
      if (current.length > 0) current += word;
      continue;
    }

    const candidate = current.length === 0 ? word : current + word;
    if (stringWidth(candidate) <= width) {
      current = candidate;
      continue;
    }

    flush();

    if (stringWidth(word) > width) {
      if (hardBreak) {
        result.push(...hardBreakWord(word, width, indent));
      } else {
        result.push(...wrapAnsi(word, width, { hard: true, trim: false }).split("\n"));
      }
      continue;
    }

    current = (result.length > 0 && indent ? indent : "") + word;
  }

  flush();
  return result;
}

function hardBreakWord(word: string, width: number, indent: string): string[] {
  const lines: string[] = [];
  let remaining = word;
  let first = true;

  while (remaining.length > 0) {
    let take = remaining.length;
    while (take > 0 && stringWidth(remaining.slice(0, take)) > width) {
      take--;
    }
    if (take === 0) take = 1;
    const prefix = first ? "" : indent;
    lines.push(prefix + remaining.slice(0, take));
    remaining = remaining.slice(take);
    first = false;
  }

  return lines;
}

/**
 * Wrap text with ANSI color codes preserved (delegates to wrap-ansi).
 */
export function wrapAnsiText(text: string, width: number): string {
  return wrapAnsi(text, width, { hard: true, trim: false });
}

/**
 * Measure display width of text.
 */
export function textWidth(text: string): number {
  return stringWidth(text);
}

/**
 * Split text into lines that fit within width (returns array of lines).
 */
export function wrapToLines(text: string, width: number, options?: WrapOptions): string[] {
  return wrapText(text, width, options).split("\n");
}
