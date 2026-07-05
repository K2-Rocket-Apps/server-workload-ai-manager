import { Box, Text } from "ink";
import type { Theme } from "../../core/theme.js";
import { getTheme } from "../../core/theme.js";

export type SelectListItem<T = string> = {
  id: string;
  label: string;
  description?: string;
  value: T;
  disabled?: boolean;
  icon?: string;
};

export type SelectListProps<T = string> = {
  items: readonly SelectListItem<T>[];
  selectedIndex: number;
  onSelect?: (index: number, item: SelectListItem<T>) => void;
  theme?: Theme;
  maxVisible?: number;
  scrollOffset?: number;
  showIndex?: boolean;
  emptyMessage?: string;
};

export function SelectList<T = string>({
  items,
  selectedIndex,
  theme,
  maxVisible = 10,
  scrollOffset = 0,
  showIndex = false,
  emptyMessage = "No items",
}: SelectListProps<T>) {
  const resolved = theme ?? getTheme();

  if (items.length === 0) {
    return (
      <Box paddingX={1}>
        <Text color={resolved.tokens.textMuted}>{emptyMessage}</Text>
      </Box>
    );
  }

  const safeIndex = Math.max(0, Math.min(selectedIndex, items.length - 1));
  const start = Math.max(0, Math.min(scrollOffset, items.length - maxVisible));
  const visible = items.slice(start, start + maxVisible);
  const overflowAbove = start;
  const overflowBelow = items.length - start - visible.length;

  return (
    <Box flexDirection="column">
      {overflowAbove > 0 ? (
        <Text color={resolved.tokens.textMuted}>  ↑ {overflowAbove} more</Text>
      ) : null}
      {visible.map((item, i) => {
        const globalIndex = start + i;
        const selected = globalIndex === safeIndex;
        const disabled = item.disabled ?? false;

        return (
          <Box key={item.id} flexDirection="row">
            <Text color={selected ? resolved.tokens.primary : resolved.tokens.textMuted}>
              {selected ? "▸ " : "  "}
            </Text>
            {showIndex ? (
              <Text color={resolved.tokens.tabShortcut} dimColor={!selected}>
                {String(globalIndex + 1).padStart(2)}.{" "}
              </Text>
            ) : null}
            {item.icon ? (
              <Text color={resolved.tokens.textSecondary}>{item.icon} </Text>
            ) : null}
            <Text
              bold={selected}
              color={
                disabled
                  ? resolved.tokens.textMuted
                  : selected
                    ? resolved.tokens.textPrimary
                    : resolved.tokens.textSecondary
              }
            >
              {item.label}
            </Text>
            {item.description ? (
              <Text color={resolved.tokens.textMuted} wrap="truncate-end">
                {" "}
                — {item.description}
              </Text>
            ) : null}
          </Box>
        );
      })}
      {overflowBelow > 0 ? (
        <Text color={resolved.tokens.textMuted}>  ↓ {overflowBelow} more</Text>
      ) : null}
    </Box>
  );
}

export function computeSelectScrollOffset(
  selectedIndex: number,
  total: number,
  maxVisible: number,
): number {
  if (total <= maxVisible) return 0;
  if (selectedIndex < maxVisible - 1) return 0;
  if (selectedIndex >= total - maxVisible) return total - maxVisible;
  return selectedIndex - Math.floor(maxVisible / 2);
}
