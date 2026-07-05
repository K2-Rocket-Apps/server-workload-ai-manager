import { useMemo } from "react";
import { Box, Text } from "ink";
import { useAppSelector } from "../../state/context.js";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  SLASH_COMMANDS,
} from "../../commands/registry.js";
import { buildHighlightSegments, fuzzyFilterMulti } from "../../core/fuzzy.js";
import { getTheme } from "../../core/theme.js";
import { computeSelectScrollOffset } from "../common/SelectList.js";
import type { AppDispatch } from "../../state/actions.js";

export type CommandPaletteProps = {
  query: string;
  selectedIndex: number;
};

function HighlightedText({
  text,
  indices,
  theme,
}: {
  text: string;
  indices: readonly number[];
  theme: ReturnType<typeof getTheme>;
}) {
  const segments = buildHighlightSegments(text, indices);

  return (
    <>
      {segments.map((seg, i) => (
        <Text
          key={i}
          bold={seg.highlighted}
          color={seg.highlighted ? theme.tokens.primaryBright : theme.tokens.textPrimary}
        >
          {seg.text}
        </Text>
      ))}
    </>
  );
}

export function CommandPalette({ query, selectedIndex }: CommandPaletteProps) {
  const themeName = useAppSelector((s) => s.theme);
  const terminalWidth = useAppSelector((s) => s.terminalWidth);
  const terminalHeight = useAppSelector((s) => s.terminalHeight);
  const theme = getTheme(themeName);

  const results = useMemo(
    () =>
      fuzzyFilterMulti(
        SLASH_COMMANDS,
        query,
        [
          (c) => c.name,
          (c) => c.usage,
          (c) => c.description,
          (c) => c.category,
          (c) => (c.aliases ?? []).join(" "),
        ],
        50,
      ),
    [query],
  );

  const safeIndex = Math.max(0, Math.min(selectedIndex, Math.max(0, results.length - 1)));
  const selected = results[safeIndex];
  const scrollOffset = computeSelectScrollOffset(safeIndex, results.length, 12);

  return (
    <Box
      flexDirection="column"
      width={terminalWidth}
      height={terminalHeight}
      borderStyle="double"
      borderColor={theme.tokens.borderFocus}
      paddingX={2}
      paddingY={1}
    >
      <Box flexDirection="row" justifyContent="space-between">
        <Text bold color={theme.tokens.primaryBright}>
          Command Palette
        </Text>
        <Text color={theme.tokens.textMuted}>Esc close</Text>
      </Box>

      <Box marginY={1}>
        <Text color={theme.tokens.textSecondary}>
          Search:{" "}
          <Text bold color={theme.tokens.inputText}>
            {query || " "}
          </Text>
          <Text color={theme.tokens.inputCursor}>▌</Text>
        </Text>
      </Box>

      <Box flexDirection="row" flexGrow={1}>
        <Box flexDirection="column" width={Math.floor(terminalWidth * 0.55)}>
          {results.length === 0 ? (
            <Text color={theme.tokens.textMuted}>No commands match "{query}"</Text>
          ) : (
            results.slice(scrollOffset, scrollOffset + 12).map((result, i) => {
              const idx = scrollOffset + i;
              const cmd = result.item;
              const isSelected = idx === safeIndex;
              const catColor = CATEGORY_COLORS[cmd.category];

              return (
                <Box key={cmd.name} flexDirection="row">
                  <Text color={isSelected ? theme.tokens.primary : theme.tokens.textMuted}>
                    {isSelected ? "▸ " : "  "}
                  </Text>
                  <Text bold={isSelected} color={isSelected ? theme.tokens.textPrimary : undefined}>
                    <HighlightedText text={cmd.usage} indices={result.indices} theme={theme} />
                  </Text>
                  <Text color={catColor}> {CATEGORY_LABELS[cmd.category]}</Text>
                </Box>
              );
            })
          )}
        </Box>

        <Box
          flexDirection="column"
          width={Math.floor(terminalWidth * 0.4)}
          borderStyle="single"
          borderColor={theme.tokens.borderMuted}
          paddingX={1}
          marginLeft={2}
        >
          {selected ? (
            <>
              <Text bold color={theme.tokens.secondary}>
                {selected.item.usage}
              </Text>
              <Text color={CATEGORY_COLORS[selected.item.category]}>
                {CATEGORY_LABELS[selected.item.category]}
              </Text>
              <Box marginTop={1}>
                <Text wrap="wrap">{selected.item.description}</Text>
              </Box>
              {selected.item.aliases?.length ? (
                <Text color={theme.tokens.textMuted}>
                  aliases: {selected.item.aliases.join(", ")}
                </Text>
              ) : null}
              {selected.item.args?.map((arg) => (
                <Text key={arg.name} color={theme.tokens.textMuted}>
                  • {arg.name}
                  {arg.optional ? " (optional)" : ""}: {arg.description}
                </Text>
              ))}
            </>
          ) : (
            <Text color={theme.tokens.textMuted}>Select a command</Text>
          )}
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text color={theme.tokens.textMuted}>
          ↑↓ navigate · Enter run · Esc dismiss · {results.length} results
        </Text>
      </Box>
    </Box>
  );
}

export function CommandPaletteOverlay() {
  const modal = useAppSelector((s) => s.modal);

  if (modal.type !== "commandPalette") return null;

  return <CommandPalette query={modal.query} selectedIndex={modal.selectedIndex} />;
}

export function openCommandPalette(dispatch: AppDispatch, query = "") {
  dispatch({ type: "OPEN_COMMAND_PALETTE", query });
}
