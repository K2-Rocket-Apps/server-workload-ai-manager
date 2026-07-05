import { useMemo } from "react";
import { Box, Text } from "ink";
import { useAppDispatch, useAppSelector } from "../../state/context.js";
import { TAB_DEFINITIONS } from "../../core/constants.js";
import { fuzzyFilter } from "../../core/fuzzy.js";
import { getTheme } from "../../core/theme.js";
import type { TabId } from "../../types.js";
import { computeSelectScrollOffset } from "../common/SelectList.js";

export type QuickOpenProps = {
  query: string;
  selectedIndex: number;
  onSelectTab?: (tab: TabId) => void;
};

export function QuickOpen({ query, selectedIndex }: QuickOpenProps) {
  const themeName = useAppSelector((s) => s.theme);
  const terminalWidth = useAppSelector((s) => s.terminalWidth);
  const theme = getTheme(themeName);

  const results = useMemo(
    () =>
      fuzzyFilter(
        TAB_DEFINITIONS,
        query,
        (t) => `${t.label} ${t.id} ${t.description} ${t.shortcut}`,
        20,
      ),
    [query],
  );

  const safeIndex = Math.max(0, Math.min(selectedIndex, Math.max(0, results.length - 1)));
  const scrollOffset = computeSelectScrollOffset(safeIndex, results.length, 8);

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={theme.tokens.borderFocus}
      paddingX={2}
      paddingY={1}
      width={Math.min(terminalWidth - 4, 60)}
    >
      <Text bold color={theme.tokens.primaryBright}>
        Quick Open
      </Text>
      <Text color={theme.tokens.textMuted}>
        Jump to tab · query: {query || "(all)"}
      </Text>

      <Box marginTop={1} flexDirection="column">
        {results.slice(scrollOffset, scrollOffset + 8).map((result, i) => {
          const idx = scrollOffset + i;
          const tab = result.item;
          const selected = idx === safeIndex;

          return (
            <Box key={tab.id} flexDirection="row">
              <Text color={selected ? theme.tokens.primary : theme.tokens.textMuted}>
                {selected ? "▸" : " "}
              </Text>
              <Text color={theme.tokens.tabShortcut}>{tab.shortcut} </Text>
              <Text bold={selected}>
                {tab.icon} {tab.label}
              </Text>
              <Text color={theme.tokens.textMuted} wrap="truncate-end">
                {" "}
                — {tab.description}
              </Text>
            </Box>
          );
        })}
      </Box>

      <Box marginTop={1}>
        <Text color={theme.tokens.textMuted}>Enter switch · Esc cancel</Text>
      </Box>
    </Box>
  );
}

export function QuickOpenOverlay({
  query,
  selectedIndex,
}: {
  query: string;
  selectedIndex: number;
}) {
  return <QuickOpen query={query} selectedIndex={selectedIndex} />;
}

export function useQuickOpenSelect(selectedIndex: number, query: string): TabId | undefined {
  const results = useMemo(
    () =>
      fuzzyFilter(
        TAB_DEFINITIONS,
        query,
        (t) => `${t.label} ${t.id} ${t.description}`,
        20,
      ),
    [query],
  );
  const safeIndex = Math.max(0, Math.min(selectedIndex, results.length - 1));
  return results[safeIndex]?.item.id;
}

export function dispatchQuickOpenTab(dispatch: ReturnType<typeof useAppDispatch>, tab: TabId) {
  dispatch({ type: "SET_TAB", tab });
}
