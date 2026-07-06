import { Box, Text } from "ink";
import { useAppSelector } from "../../state/context.js";
import { CHAT } from "../../core/constants.js";
import { formatDurationMs, formatPercent } from "../../core/format.js";
import { innerBoxHeight, innerBoxWidth } from "../../core/layout.js";
import { getTheme, severityColor } from "../../core/theme.js";
import { Divider } from "../common/Divider.js";
import { EmptyState } from "../common/EmptyState.js";
import { ToolCallCard } from "../chat/ToolCallCard.js";

export type RightPanelProps = {
  width: number;
  height: number;
};

export function RightPanel({ width, height }: RightPanelProps) {
  const themeName = useAppSelector((s) => s.theme);
  const toolLog = useAppSelector((s) => s.toolLog);
  const pending = useAppSelector((s) => s.pending);
  const vms = useAppSelector((s) => s.vms);
  const config = useAppSelector((s) => s.configStatus);
  const nodeStats = useAppSelector((s) => s.nodeStats);
  const loading = useAppSelector((s) => s.loading);
  const theme = getTheme(themeName);

  const innerW = innerBoxWidth(width);
  const innerH = innerBoxHeight(height);
  const recentTools = toolLog.slice(-Math.min(6, Math.floor(innerH / 3)));

  const runningCount = vms.filter((v) => v.status === "running").length;
  const issueCount = vms.reduce((n, v) => n + v.issues.length, 0);

  return (
    <Box
      flexDirection="column"
      width={width}
      height={height}
      borderStyle="single"
      borderColor={theme.tokens.borderDefault}
      paddingX={1}
    >
      <Text bold color={theme.tokens.primary}>
        Tool Log
      </Text>
      <Box flexDirection="column" marginTop={0} height={Math.min(12, Math.floor(innerH * 0.45))}>
        {recentTools.length === 0 ? (
          <Text color={theme.tokens.textMuted} dimColor>
            No tool calls yet
          </Text>
        ) : (
          recentTools.map((entry) => (
            <ToolCallCard key={entry.id} entry={entry} theme={theme} compact />
          ))
        )}
        {toolLog.length > CHAT.maxToolLogLines ? (
          <Text color={theme.tokens.textMuted} dimColor>
            … truncated
          </Text>
        ) : null}
      </Box>

      <Divider width={innerW - 4} label="Quick Stats" theme={theme} />

      <Box flexDirection="column" marginTop={0}>
        <Box flexDirection="row" justifyContent="space-between">
          <Text color={theme.tokens.textMuted}>VMs</Text>
          <Text color={theme.tokens.textPrimary}>
            {runningCount}/{vms.length} running
          </Text>
        </Box>
        <Box flexDirection="row" justifyContent="space-between">
          <Text color={theme.tokens.textMuted}>Issues</Text>
          <Text color={severityColor(theme, issueCount > 0 ? "warn" : "ok")}>
            {issueCount}
          </Text>
        </Box>
        {nodeStats ? (
          <>
            <Box flexDirection="row" justifyContent="space-between">
              <Text color={theme.tokens.textMuted}>Node CPU</Text>
              <Text color={theme.tokens.textPrimary}>
                {formatPercent(nodeStats.cpuPercent, undefined, 0)}
              </Text>
            </Box>
            <Box flexDirection="row" justifyContent="space-between">
              <Text color={theme.tokens.textMuted}>Node RAM</Text>
              <Text color={theme.tokens.textPrimary}>
                {formatPercent(nodeStats.memPercent, undefined, 0)}
              </Text>
            </Box>
          </>
        ) : null}
        {config ? (
          <Box flexDirection="row" justifyContent="space-between">
            <Text color={theme.tokens.textMuted}>Daemon</Text>
            <Text color={config.daemonEnabled ? theme.tokens.success : theme.tokens.textMuted}>
              {config.daemonEnabled ? "enabled" : "off"}
            </Text>
          </Box>
        ) : null}
        {loading ? <Text color={theme.tokens.warning}>Agent working…</Text> : null}
      </Box>

      <Divider width={innerW - 4} theme={theme} />

      <Text bold color={theme.tokens.secondary}>
        Pending Approval
      </Text>
      <Box marginTop={0} flexGrow={1}>
        {pending ? (
          <Box flexDirection="column">
            <Text color={theme.tokens.warning} bold>
              {pending.name}
            </Text>
            <Text color={theme.tokens.textSecondary} wrap="wrap">
              {JSON.stringify(pending.args, null, 0).slice(0, innerW - 2)}
            </Text>
            <Box marginTop={1}>
              <Text color={theme.tokens.primary}>y approve · n deny · or type yes/no</Text>
            </Box>
          </Box>
        ) : (
          <EmptyState
            title="None pending"
            description="Destructive VM actions queue here for approval."
            theme={theme}
            icon="✓"
          />
        )}
      </Box>

      {toolLog.length > 0 ? (
        <Box marginTop={0}>
          <Text color={theme.tokens.textMuted} dimColor>
            last {formatDurationMs(toolLog[toolLog.length - 1]?.duration ?? 0)}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
}
