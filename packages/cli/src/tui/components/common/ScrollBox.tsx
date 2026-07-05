import { useMemo, type ReactNode } from "react";
import { Box, Text } from "ink";
import type { Theme } from "../../core/theme.js";
import { getTheme } from "../../core/theme.js";
import { innerBoxHeight } from "../../core/layout.js";

export type ScrollBoxProps = {
  /** Total item count */
  itemCount: number;
  /** Viewport height in rows */
  height: number;
  /** Current scroll offset (0 = top) */
  offset: number;
  /** Render visible slice */
  children: (visibleStart: number, visibleEnd: number) => ReactNode;
  theme?: Theme;
  showScrollbar?: boolean;
  emptyMessage?: string;
  width?: number;
};

export function ScrollBox({
  itemCount,
  height,
  offset,
  children,
  theme,
  showScrollbar = true,
  emptyMessage = "Nothing to show",
  width,
}: ScrollBoxProps) {
  const resolved = theme ?? getTheme();
  const innerHeight = innerBoxHeight(height);

  const { start, end, atTop, atBottom } = useMemo(() => {
    const maxOffset = Math.max(0, itemCount - innerHeight);
    const clampedOffset = Math.max(0, Math.min(offset, maxOffset));
    const visibleEnd = Math.min(itemCount, clampedOffset + innerHeight);
    const visibleStart = clampedOffset;
    return {
      start: visibleStart,
      end: visibleEnd,
      atTop: clampedOffset <= 0,
      atBottom: clampedOffset >= maxOffset,
    };
  }, [itemCount, innerHeight, offset]);

  if (itemCount === 0) {
    return (
      <Box height={height} width={width} flexDirection="column" justifyContent="center">
        <Text color={resolved.tokens.textMuted}>{emptyMessage}</Text>
      </Box>
    );
  }

  const scrollPct =
    itemCount <= innerHeight ? 1 : offset / Math.max(1, itemCount - innerHeight);
  const thumbPos = Math.round(scrollPct * Math.max(0, innerHeight - 1));

  return (
    <Box flexDirection="row" height={height} width={width}>
      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        {children(start, end)}
      </Box>
      {showScrollbar && itemCount > innerHeight ? (
        <Box flexDirection="column" marginLeft={1} width={1}>
          {Array.from({ length: innerHeight }, (_, i) => (
            <Text
              key={i}
              color={
                i === thumbPos ? resolved.tokens.primary : resolved.tokens.borderMuted
              }
            >
              {i === thumbPos ? "█" : "│"}
            </Text>
          ))}
        </Box>
      ) : null}
      {(atTop || atBottom) && itemCount > innerHeight ? (
        <Box position="absolute" marginLeft={width ? width - 8 : undefined}>
          <Text dimColor>{atTop ? "▲" : ""}{atBottom ? "▼" : ""}</Text>
        </Box>
      ) : null}
    </Box>
  );
}

export type ScrollIndicatorProps = {
  offset: number;
  total: number;
  viewport: number;
  theme?: Theme;
};

export function ScrollIndicator({ offset, total, viewport, theme }: ScrollIndicatorProps) {
  const resolved = theme ?? getTheme();
  if (total <= viewport) return null;

  const maxOffset = total - viewport;
  const pct = Math.round((offset / Math.max(1, maxOffset)) * 100);

  return (
    <Text color={resolved.tokens.textMuted}>
      {offset + 1}–{Math.min(total, offset + viewport)} of {total} ({pct}%)
    </Text>
  );
}
