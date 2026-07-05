import { Fragment, type ReactNode } from "react";
import { Box, Text } from "ink";
import type { Theme } from "../core/theme.js";
import { getTheme } from "../core/theme.js";
import { wrapText } from "./wrap.js";

/** Markdown AST block types */
export type MdBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "code"; language?: string; code: string }
  | { type: "blockquote"; blocks: MdBlock[] }
  | { type: "list"; ordered: boolean; items: MdListItem[] }
  | { type: "hr" };

export type MdListItem = {
  text: string;
  blocks?: MdBlock[];
};

export type MdInline =
  | { type: "text"; value: string }
  | { type: "bold"; children: MdInline[] }
  | { type: "italic"; children: MdInline[] }
  | { type: "code"; value: string }
  | { type: "link"; label: string; href: string };

/** Parse markdown source into block AST (no external libs). */
export function parseMarkdown(source: string): MdBlock[] {
  const lines = source.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const blocks: MdBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;

    /** Fenced code block */
    const fenceMatch = line.match(/^```(\w*)\s*$/);
    if (fenceMatch) {
      const lang = fenceMatch[1] || undefined;
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.match(/^```\s*$/)) {
        codeLines.push(lines[i]!);
        i++;
      }
      i++; // closing fence
      blocks.push({ type: "code", language: lang, code: codeLines.join("\n") });
      continue;
    }

    /** Horizontal rule */
    if (/^(\*{3,}|-{3,}|_{3,})\s*$/.test(line)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    /** Headings */
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1]!.length as 1 | 2 | 3;
      blocks.push({ type: "heading", level, text: headingMatch[2]!.trim() });
      i++;
      continue;
    }

    /** Blockquote */
    if (line.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i]!.startsWith(">")) {
        quoteLines.push(lines[i]!.replace(/^>\s?/, ""));
        i++;
      }
      const inner = parseMarkdown(quoteLines.join("\n"));
      blocks.push({ type: "blockquote", blocks: inner });
      continue;
    }

    /** Unordered list */
    if (/^[\-*+]\s+/.test(line)) {
      const items = parseListItems(lines, i, false);
      blocks.push({ type: "list", ordered: false, items: items.items });
      i = items.nextIndex;
      continue;
    }

    /** Ordered list */
    if (/^\d+\.\s+/.test(line)) {
      const items = parseListItems(lines, i, true);
      blocks.push({ type: "list", ordered: true, items: items.items });
      i = items.nextIndex;
      continue;
    }

    /** Empty line */
    if (line.trim() === "") {
      i++;
      continue;
    }

    /** Paragraph — collect until blank or block start */
    const paraLines: string[] = [line];
    i++;
    while (i < lines.length) {
      const next = lines[i]!;
      if (
        next.trim() === "" ||
        next.match(/^#{1,3}\s/) ||
        next.match(/^```/) ||
        next.startsWith(">") ||
        /^[\-*+]\s+/.test(next) ||
        /^\d+\.\s+/.test(next) ||
        /^(\*{3,}|-{3,}|_{3,})\s*$/.test(next)
      ) {
        break;
      }
      paraLines.push(next);
      i++;
    }
    blocks.push({ type: "paragraph", text: paraLines.join("\n") });
  }

  return blocks;
}

function parseListItems(
  lines: string[],
  start: number,
  ordered: boolean,
): { items: MdListItem[]; nextIndex: number } {
  const items: MdListItem[] = [];
  let i = start;
  const pattern = ordered ? /^(\d+)\.\s+(.*)$/ : /^[\-*+]\s+(.*)$/;

  while (i < lines.length) {
    const line = lines[i]!;
    const match = line.match(pattern);
    if (!match) break;

    const text = ordered ? match[2]! : match[1]!;
    items.push({ text: text.trim() });
    i++;

    /** Continuation lines (indented) */
    while (i < lines.length && /^\s{2,}\S/.test(lines[i]!)) {
      const last = items[items.length - 1]!;
      last.text += "\n" + lines[i]!.trim();
      i++;
    }
  }

  return { items, nextIndex: i };
}

/** Parse inline markdown into segments. */
export function parseInline(text: string): MdInline[] {
  const nodes: MdInline[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    /** Link [label](url) */
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      nodes.push({ type: "link", label: linkMatch[1]!, href: linkMatch[2]! });
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    /** Inline code `code` */
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      nodes.push({ type: "code", value: codeMatch[1]! });
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    /** Bold **text** or __text__ */
    const boldMatch = remaining.match(/^(\*\*|__)(.+?)\1/);
    if (boldMatch) {
      nodes.push({ type: "bold", children: parseInline(boldMatch[2]!) });
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    /** Italic *text* or _text_ */
    const italicMatch = remaining.match(/^(\*|_)([^*_]+?)\1/);
    if (italicMatch) {
      nodes.push({ type: "italic", children: parseInline(italicMatch[2]!) });
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    /** Plain text until next special char */
    const nextSpecial = remaining.search(/[\[*_`]/);
    if (nextSpecial === -1) {
      nodes.push({ type: "text", value: remaining });
      break;
    }
    if (nextSpecial === 0) {
      nodes.push({ type: "text", value: remaining[0]! });
      remaining = remaining.slice(1);
      continue;
    }
    nodes.push({ type: "text", value: remaining.slice(0, nextSpecial) });
    remaining = remaining.slice(nextSpecial);
  }

  return nodes;
}

type InlineRendererProps = {
  nodes: MdInline[];
  theme: Theme;
};

function InlineRenderer({ nodes, theme }: InlineRendererProps): ReactNode {
  return (
    <>
      {nodes.map((node, idx) => {
        switch (node.type) {
          case "text":
            return <Fragment key={idx}>{node.value}</Fragment>;
          case "bold":
            return (
              <Text key={idx} bold color={theme.tokens.mdBold}>
                <InlineRenderer nodes={node.children} theme={theme} />
              </Text>
            );
          case "italic":
            return (
              <Text key={idx} color={theme.tokens.mdItalic}>
                <InlineRenderer nodes={node.children} theme={theme} />
              </Text>
            );
          case "code":
            return (
              <Text key={idx} color={theme.tokens.mdCode}>
                {` ${node.value} `}
              </Text>
            );
          case "link":
            return (
              <Text key={idx} color={theme.tokens.mdLink}>
                {node.label}
              </Text>
            );
          default:
            return null;
        }
      })}
    </>
  );
}

type BlockRendererProps = {
  block: MdBlock;
  theme: Theme;
  width?: number;
};

function BlockRenderer({ block, theme, width }: BlockRendererProps): ReactNode {
  switch (block.type) {
    case "heading": {
      const colors = {
        1: theme.tokens.mdHeading,
        2: theme.tokens.primary,
        3: theme.tokens.textSecondary,
      };
      const bold = block.level <= 2;
      const text =
        width && width > 0 ? wrapText(block.text, width) : block.text;
      return (
        <Box marginTop={block.level === 1 ? 0 : 1} marginBottom={0}>
          <Text bold={bold} color={colors[block.level]}>
            <InlineRenderer nodes={parseInline(text.split("\n")[0] ?? text)} theme={theme} />
          </Text>
        </Box>
      );
    }

    case "paragraph": {
      const wrapped =
        width && width > 0 ? wrapText(block.text, width) : block.text;
      return (
        <Box flexDirection="column" marginTop={0}>
          {wrapped.split("\n").map((line, i) => (
            <Text key={i} wrap="wrap">
              <InlineRenderer nodes={parseInline(line)} theme={theme} />
            </Text>
          ))}
        </Box>
      );
    }

    case "code": {
      const codeLines = block.code.split("\n");
      return (
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={theme.tokens.borderMuted}
          paddingX={1}
          marginY={1}
        >
          {block.language ? (
            <Text dimColor>{block.language}</Text>
          ) : null}
          {codeLines.map((line, i) => (
            <Text key={i} color={theme.tokens.mdCode}>
              {line || " "}
            </Text>
          ))}
        </Box>
      );
    }

    case "blockquote":
      return (
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor={theme.tokens.mdQuote}
          paddingX={1}
          marginY={0}
        >
          {block.blocks.map((inner, i) => (
            <BlockRenderer key={i} block={inner} theme={theme} width={width} />
          ))}
        </Box>
      );

    case "list":
      return (
        <Box flexDirection="column" marginY={0}>
          {block.items.map((item, i) => {
            const bullet = block.ordered ? `${i + 1}.` : "•";
            return (
              <Box key={i} flexDirection="row">
                <Text color={theme.tokens.primary}>{bullet} </Text>
                <Box flexDirection="column" flexGrow={1}>
                  <Text wrap="wrap">
                    <InlineRenderer nodes={parseInline(item.text)} theme={theme} />
                  </Text>
                </Box>
              </Box>
            );
          })}
        </Box>
      );

    case "hr":
      return (
        <Box marginY={1}>
          <Text dimColor>{"─".repeat(Math.min(width ?? 40, 60))}</Text>
        </Box>
      );

    default:
      return null;
  }
}

export type MarkdownViewProps = {
  source: string;
  theme?: Theme;
  width?: number;
  /** Pre-parsed blocks (skips parse step) */
  blocks?: MdBlock[];
};

export function MarkdownView({
  source,
  theme = getTheme(),
  width,
  blocks: presetBlocks,
}: MarkdownViewProps) {
  const blocks = presetBlocks ?? parseMarkdown(source);

  if (blocks.length === 0) {
    return null;
  }

  return (
    <Box flexDirection="column">
      {blocks.map((block, i) => (
        <BlockRenderer key={i} block={block} theme={theme} width={width} />
      ))}
    </Box>
  );
}

/** Plain-text fallback: strip to readable text without Ink. */
export function markdownToPlainText(source: string): string {
  const blocks = parseMarkdown(source);
  const lines: string[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case "heading":
        lines.push(block.text);
        break;
      case "paragraph":
        lines.push(block.text);
        break;
      case "code":
        lines.push(block.code);
        break;
      case "blockquote":
        for (const inner of block.blocks) {
          if (inner.type === "paragraph") lines.push(`> ${inner.text}`);
        }
        break;
      case "list":
        block.items.forEach((item, i) => {
          const prefix = block.ordered ? `${i + 1}.` : "-";
          lines.push(`${prefix} ${item.text}`);
        });
        break;
      case "hr":
        lines.push("---");
        break;
      default:
        break;
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

/** Extract first heading text if present. */
export function extractTitle(source: string): string | undefined {
  const blocks = parseMarkdown(source);
  const h = blocks.find((b) => b.type === "heading");
  return h && h.type === "heading" ? h.text : undefined;
}

/** Count approximate rendered rows for layout planning. */
export function estimateMarkdownHeight(source: string, width: number): number {
  const blocks = parseMarkdown(source);
  let rows = 0;

  for (const block of blocks) {
    switch (block.type) {
      case "heading":
        rows += 2;
        break;
      case "paragraph": {
        const wrapped = wrapText(block.text, width);
        rows += wrapped.split("\n").length + 1;
        break;
      }
      case "code":
        rows += block.code.split("\n").length + 3;
        break;
      case "blockquote":
        rows += estimateMarkdownHeight(
          block.blocks
            .map((b) => (b.type === "paragraph" ? b.text : ""))
            .join("\n\n"),
          width,
        );
        break;
      case "list":
        rows += block.items.length + 1;
        break;
      case "hr":
        rows += 2;
        break;
      default:
        rows += 1;
    }
  }

  return rows;
}
