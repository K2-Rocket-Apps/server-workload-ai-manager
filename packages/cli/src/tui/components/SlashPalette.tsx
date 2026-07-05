import { Box, Text } from "ink";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  type SlashCommand,
} from "../commands/registry.js";

type SlashPaletteProps = {
  matches: SlashCommand[];
  selectedIndex: number;
  maxRows?: number;
};

export function SlashPalette({ matches, selectedIndex, maxRows = 10 }: SlashPaletteProps) {
  if (!matches.length) {
    return (
      <Box borderStyle="round" borderColor="gray" paddingX={1} marginBottom={0}>
        <Text dimColor>No matching commands</Text>
      </Box>
    );
  }

  const visible = matches.slice(0, maxRows);
  const overflow = matches.length - visible.length;

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} marginBottom={0}>
      <Text bold color="cyan">
        Commands {matches.length > 1 ? `(${matches.length})` : ""} — ↑↓ select  Tab complete  Enter run
      </Text>
      {visible.map((cmd, i) => {
        const selected = i === selectedIndex;
        const catColor = CATEGORY_COLORS[cmd.category];
        return (
          <Box key={`${cmd.name}-${i}`}>
            <Text color={selected ? "cyan" : undefined}>{selected ? "▸ " : "  "}</Text>
            <Text bold color={selected ? "white" : "gray"}>
              {cmd.usage.padEnd(28)}
            </Text>
            <Text color={catColor} dimColor={!selected}>
              {CATEGORY_LABELS[cmd.category].padEnd(12)}
            </Text>
            <Text wrap="truncate-end">{cmd.description}</Text>
          </Box>
        );
      })}
      {overflow > 0 && <Text dimColor>  …and {overflow} more — keep typing to filter</Text>}
    </Box>
  );
}
