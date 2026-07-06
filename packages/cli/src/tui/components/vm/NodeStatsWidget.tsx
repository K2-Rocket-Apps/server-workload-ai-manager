import { Box, Text } from "ink";
import type { Theme } from "../../core/theme.js";
import { getTheme, severityColor } from "../../core/theme.js";
import { formatPercent, formatUptime, formatLoadAvg } from "../../core/format.js";
import { percentBar, sparkline } from "../../render/sparkline.js";
import { ProgressBar } from "../../render/progress.js";
import type { NodeStats } from "../../types.js";

export type NodeStatsWidgetProps = {
  stats: NodeStats | null;
  theme?: Theme;
  width?: number;
  showSparkline?: boolean;
  history?: readonly number[];
};

export function NodeStatsWidget({
  stats,
  theme,
  width = 28,
  showSparkline = true,
  history = [],
}: NodeStatsWidgetProps) {
  const resolved = theme ?? getTheme();

  if (!stats) {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor={resolved.tokens.borderMuted} paddingX={1}>
        <Text color={resolved.tokens.textMuted}>Node stats unavailable</Text>
        <Text dimColor>Run /node or refresh VMs</Text>
      </Box>
    );
  }

  const cpuRatio = stats.cpuPercent / 100;
  const memRatio = stats.memPercent / 100;
  const statusSeverity =
    stats.status === "online" ? "ok" : stats.status === "unknown" ? "unknown" : "warn";

  const cpuHistory = history.length > 0 ? history : [stats.cpuPercent * 0.8, stats.cpuPercent * 0.9, stats.cpuPercent];
  const spark = sparkline(cpuHistory, { width: Math.min(width - 4, 16) });

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={resolved.tokens.borderDefault}
      paddingX={1}
      width={width}
    >
      <Box flexDirection="row" justifyContent="space-between">
        <Text bold color={resolved.tokens.primary}>
          {stats.node}
        </Text>
        <Text color={severityColor(resolved, statusSeverity)}>{stats.status}</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text color={resolved.tokens.textMuted}>CPU {formatPercent(stats.cpuPercent, undefined, 0)}</Text>
        <ProgressBar value={cpuRatio} width={width - 4} showPercent={false} theme={resolved} />
        {showSparkline ? (
          <Text color={resolved.tokens.chartBar}>{spark}</Text>
        ) : null}
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text color={resolved.tokens.textMuted}>RAM {formatPercent(stats.memPercent, undefined, 0)}</Text>
        <Text color={resolved.tokens.progressFill}>{percentBar(memRatio, width - 4)}</Text>
      </Box>

      <Box marginTop={1} flexDirection="row" justifyContent="space-between">
        <Text color={resolved.tokens.textMuted}>uptime</Text>
        <Text>{formatUptime(stats.uptime)}</Text>
      </Box>

      {stats.loadavg.length > 0 ? (
        <Box flexDirection="row" justifyContent="space-between">
          <Text color={resolved.tokens.textMuted}>load</Text>
          <Text>{formatLoadAvg(stats.loadavg)}</Text>
        </Box>
      ) : null}
    </Box>
  );
}
