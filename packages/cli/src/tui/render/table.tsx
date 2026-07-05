import { Box, Text } from "ink";
import stringWidth from "string-width";
import type { Theme } from "../core/theme.js";
import { getTheme } from "../core/theme.js";
import { truncate } from "../core/format.js";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  align?: "left" | "right" | "center";
  render?: (row: T, index: number) => string;
};

export type DataTableProps<T> = {
  columns: readonly DataTableColumn<T>[];
  rows: readonly T[];
  theme?: Theme;
  border?: boolean;
  header?: boolean;
  zebra?: boolean;
  maxRows?: number;
  emptyMessage?: string;
};

/** Box-drawing characters for table borders */
const BOX = {
  topLeft: "┌",
  topRight: "┐",
  bottomLeft: "└",
  bottomRight: "┘",
  horizontal: "─",
  vertical: "│",
  cross: "┼",
  teeDown: "┬",
  teeUp: "┴",
  teeRight: "├",
  teeLeft: "┤",
} as const;

function padCell(text: string, width: number, align: "left" | "right" | "center"): string {
  const w = stringWidth(text);
  if (w >= width) return truncate(text, width);
  const pad = width - w;
  switch (align) {
    case "right":
      return " ".repeat(pad) + text;
    case "center": {
      const left = Math.floor(pad / 2);
      return " ".repeat(left) + text + " ".repeat(pad - left);
    }
    default:
      return text + " ".repeat(pad);
  }
}

function resolveWidths<T>(
  columns: readonly DataTableColumn<T>[],
  rows: readonly T[],
): number[] {
  return columns.map((col) => {
    if (col.width) return col.width;
    let max = stringWidth(col.header);
    for (const row of rows) {
      const raw = col.render
        ? col.render(row, rows.indexOf(row))
        : String((row as Record<string, unknown>)[col.key] ?? "");
      max = Math.max(max, stringWidth(raw));
    }
    const w = max + 2;
    if (col.minWidth) return Math.max(col.minWidth, w);
    if (col.maxWidth) return Math.min(col.maxWidth, w);
    return w;
  });
}

function horizontalLine(widths: number[], left: string, mid: string, right: string): string {
  const segments = widths.map((w) => BOX.horizontal.repeat(w + 2));
  return left + segments.join(mid) + right;
}

export function DataTable<T>({
  columns,
  rows,
  theme = getTheme(),
  border = true,
  header = true,
  zebra = true,
  maxRows,
  emptyMessage = "No data",
}: DataTableProps<T>) {
  const widths = resolveWidths(columns, rows);
  const displayRows = maxRows ? rows.slice(0, maxRows) : rows;

  if (rows.length === 0) {
    return (
      <Box borderStyle={border ? "single" : undefined} borderColor={theme.tokens.tableBorder} paddingX={1}>
        <Text dimColor>{emptyMessage}</Text>
      </Box>
    );
  }

  const renderRow = (cells: string[], key: string, alt: boolean, isHeader = false) => {
    const color = isHeader
      ? theme.tokens.tableHeader
      : alt && zebra
        ? theme.tokens.tableRowAlt
        : theme.tokens.textPrimary;

    const content = cells
      .map((cell, i) => {
        const col = columns[i]!;
        const padded = padCell(cell, widths[i]!, col.align ?? "left");
        return border ? ` ${padded} ` : padded.padEnd(widths[i]! + (border ? 2 : 0));
      })
      .join(border ? BOX.vertical : "  ");

    return (
      <Text key={key} bold={isHeader} color={color}>
        {border ? BOX.vertical : ""}
        {content}
        {border ? BOX.vertical : ""}
      </Text>
    );
  };

  const headerCells = columns.map((c) => c.header);
  const bodyLines = displayRows.map((row, rowIdx) => {
    const cells = columns.map((col) =>
      col.render
        ? col.render(row, rowIdx)
        : String((row as Record<string, unknown>)[col.key] ?? ""),
    );
    return renderRow(cells, `row-${rowIdx}`, rowIdx % 2 === 1);
  });

  return (
    <Box flexDirection="column">
      {border ? (
        <Text color={theme.tokens.tableBorder}>
          {horizontalLine(widths, BOX.topLeft, BOX.teeDown, BOX.topRight)}
        </Text>
      ) : null}

      {header ? renderRow(headerCells, "header", false, true) : null}

      {border && header ? (
        <Text color={theme.tokens.tableBorder}>
          {horizontalLine(widths, BOX.teeRight, BOX.cross, BOX.teeLeft)}
        </Text>
      ) : null}

      {bodyLines}

      {border ? (
        <Text color={theme.tokens.tableBorder}>
          {horizontalLine(widths, BOX.bottomLeft, BOX.teeUp, BOX.bottomRight)}
        </Text>
      ) : null}

      {maxRows && rows.length > maxRows ? (
        <Text dimColor>
          … {rows.length - maxRows} more row{rows.length - maxRows === 1 ? "" : "s"}
        </Text>
      ) : null}
    </Box>
  );
}

/** Compact key-value table without full borders */
export function KeyValueTable({
  pairs,
  theme = getTheme(),
  labelWidth = 16,
}: {
  pairs: readonly { label: string; value: string }[];
  theme?: Theme;
  labelWidth?: number;
}) {
  return (
    <Box flexDirection="column">
      {pairs.map(({ label, value }) => (
        <Box key={label}>
          <Box width={labelWidth}>
            <Text color={theme.tokens.textMuted}>{label}</Text>
          </Box>
          <Text color={theme.tokens.textPrimary}>{value}</Text>
        </Box>
      ))}
    </Box>
  );
}
