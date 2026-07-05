import { useMemo } from "react";
import { Box, Text } from "ink";
import { useAppSelector } from "../../state/context.js";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  type CommandCategory,
  type SlashCommand,
} from "../../commands/registry.js";
import { PALETTE } from "../../core/constants.js";
import { getTheme } from "../../core/theme.js";
import { Divider } from "../common/Divider.js";

export type SlashPaletteProps = {
  matches: SlashCommand[];
  selectedIndex: number;
  maxRows?: number;
  width?: number;
};

function groupByCategory(commands: SlashCommand[]): Map<CommandCategory, SlashCommand[]> {
  const map = new Map<CommandCategory, SlashCommand[]>();
  for (const cmd of commands) {
    const list = map.get(cmd.category) ?? [];
    list.push(cmd);
    map.set(cmd.category, list);
  }
  return map;
}

export function SlashPalette({
  matches,
  selectedIndex,
  maxRows = PALETTE.maxVisible,
  width = 72,
}: SlashPaletteProps) {
  const themeName = useAppSelector((s) => s.theme);
  const theme = getTheme(themeName);

  const grouped = useMemo(() => groupByCategory(matches), [matches]);

  if (!matches.length) {
    return (
      <Box
        borderStyle="round"
        borderColor={theme.tokens.borderMuted}
        paddingX={1}
        width={width}
      >
        <Text color={theme.tokens.textMuted}>No matching commands</Text>
      </Box>
    );
  }

  const visible = matches.slice(0, maxRows);
  const overflow = matches.length - visible.length;
  const safeIndex = Math.max(0, Math.min(selectedIndex, matches.length - 1));
  const selectedCmd = matches[safeIndex];

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={theme.tokens.borderFocus}
      paddingX={1}
      width={width}
    >
      <Box flexDirection="row" justifyContent="space-between">
        <Text bold color={theme.tokens.primaryBright}>
          Slash Commands
        </Text>
        <Text color={theme.tokens.textMuted}>
          {matches.length} match{matches.length === 1 ? "" : "es"}
        </Text>
      </Box>

      <Divider width={width - 6} theme={theme} />

      <Text color={theme.tokens.textMuted} dimColor>
        ↑↓ select · Tab complete · Enter run
      </Text>

      {visible.map((cmd, i) => {
        const globalIndex = matches.indexOf(cmd);
        const selected = globalIndex === safeIndex;
        const catColor = CATEGORY_COLORS[cmd.category];

        return (
          <Box key={`${cmd.name}-${cmd.usage}-${i}`} flexDirection="row">
            <Text color={selected ? theme.tokens.primary : theme.tokens.textMuted}>
              {selected ? "▸" : " "}
            </Text>
            <Text bold color={selected ? theme.tokens.textPrimary : theme.tokens.textSecondary}>
              {cmd.usage.padEnd(26)}
            </Text>
            <Text color={catColor} dimColor={!selected}>
              {CATEGORY_LABELS[cmd.category].padEnd(14)}
            </Text>
            <Text wrap="truncate-end" color={selected ? theme.tokens.textPrimary : undefined}>
              {cmd.description}
            </Text>
          </Box>
        );
      })}

      {overflow > 0 ? (
        <Text color={theme.tokens.textMuted}>…and {overflow} more — keep typing</Text>
      ) : null}

      {selectedCmd ? (
        <Box marginTop={1} flexDirection="column" borderStyle="single" borderColor={theme.tokens.borderMuted} paddingX={1}>
          <Text color={theme.tokens.secondary}>
            {CATEGORY_LABELS[selectedCmd.category]} · {selectedCmd.usage}
          </Text>
          <Text wrap="wrap">{selectedCmd.description}</Text>
          {selectedCmd.args?.length ? (
            <Text color={theme.tokens.textMuted}>
              args: {selectedCmd.args.map((a) => a.name + (a.optional ? "?" : "")).join(", ")}
            </Text>
          ) : null}
        </Box>
      ) : null}

      {grouped.size > 1 ? (
        <Box marginTop={0} flexDirection="row" flexWrap="wrap">
          {([...grouped.entries()] as [CommandCategory, SlashCommand[]][]).map(([cat, cmds]) => (
            <Text key={cat} color={CATEGORY_COLORS[cat]}>
              {CATEGORY_LABELS[cat]}({cmds.length}){" "}
            </Text>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}
