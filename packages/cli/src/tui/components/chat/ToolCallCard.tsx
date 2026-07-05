import { Box, Text } from "ink";
import type { Theme } from "../../core/theme.js";
import { getTheme } from "../../core/theme.js";
import { formatDurationMs, truncate } from "../../core/format.js";
import type { ToolLogEntry } from "../../types.js";

export type ToolCallCardProps = {
  entry: ToolLogEntry;
  theme?: Theme;
  compact?: boolean;
  width?: number;
};

function statusIcon(status: ToolLogEntry["status"]): string {
  switch (status) {
    case "running":
      return "→";
    case "done":
      return "✓";
    case "error":
      return "✗";
    default:
      return "·";
  }
}

function statusColor(theme: Theme, status: ToolLogEntry["status"]): string {
  switch (status) {
    case "running":
      return theme.tokens.info;
    case "done":
      return theme.tokens.success;
    case "error":
      return theme.tokens.error;
    default:
      return theme.tokens.textMuted;
  }
}

export function ToolCallCard({ entry, theme, compact = false, width = 40 }: ToolCallCardProps) {
  const resolved = theme ?? getTheme();
  const color = statusColor(resolved, entry.status);
  const icon = statusIcon(entry.status);

  if (compact) {
    return (
      <Box flexDirection="row">
        <Text color={color}>{icon} </Text>
        <Text color={resolved.tokens.textPrimary} wrap="truncate-end">
          {truncate(entry.name, width - 10)}
        </Text>
        {entry.status !== "running" ? (
          <Text color={resolved.tokens.textMuted}>
            {" "}
            {formatDurationMs(entry.duration)}
          </Text>
        ) : null}
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={color}
      paddingX={1}
      marginBottom={1}
    >
      <Box flexDirection="row" justifyContent="space-between">
        <Text bold color={color}>
          {icon} {entry.name}
        </Text>
        <Text color={resolved.tokens.textMuted}>
          {entry.status === "running" ? "running…" : formatDurationMs(entry.duration)}
        </Text>
      </Box>
      {entry.outputPreview ? (
        <Box marginTop={0}>
          <Text color={resolved.tokens.textSecondary} wrap="wrap">
            {truncate(entry.outputPreview, width)}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
}

export function ToolCallList({
  entries,
  theme,
  maxItems = 8,
}: {
  entries: readonly ToolLogEntry[];
  theme?: Theme;
  maxItems?: number;
}) {
  const resolved = theme ?? getTheme();
  const visible = entries.slice(-maxItems);

  if (visible.length === 0) {
    return (
      <Text color={resolved.tokens.textMuted} dimColor>
        No tool activity
      </Text>
    );
  }

  return (
    <Box flexDirection="column">
      {visible.map((entry) => (
        <ToolCallCard key={entry.id} entry={entry} theme={resolved} compact />
      ))}
    </Box>
  );
}
