import { Box, Text } from "ink";
import { useAppSelector } from "../../state/context.js";
import { TAB_DEFINITIONS } from "../../core/constants.js";
import { formatPercent, formatLoadAvg } from "../../core/format.js";
import { getTheme, severityColor } from "../../core/theme.js";
import { Badge, StatusDot } from "../common/Badge.js";
import { Divider } from "../common/Divider.js";
import { KeyHintRow } from "../common/KeyHint.js";
import { NodeStatsWidget } from "../vm/NodeStatsWidget.js";
import { VmTable } from "../vm/VmTable.js";

export function DashboardView() {
  const themeName = useAppSelector((s) => s.theme);
  const config = useAppSelector((s) => s.configStatus);
  const vms = useAppSelector((s) => s.vms);
  const nodeStats = useAppSelector((s) => s.nodeStats);
  const pending = useAppSelector((s) => s.pending);
  const vmsLoading = useAppSelector((s) => s.vmsLoading);
  const vmsError = useAppSelector((s) => s.vmsError);
  const loading = useAppSelector((s) => s.loading);
  const toolLog = useAppSelector((s) => s.toolLog);
  const theme = getTheme(themeName);

  const running = vms.filter((v) => v.status === "running").length;
  const issueCount = vms.reduce((n, v) => n + v.issues.length, 0);
  const apiOk = config?.apiKeySet ?? false;
  const recentTools = toolLog.filter((t) => t.status === "done").length;

  return (
    <Box flexDirection="column">
      <Text bold color={theme.tokens.primaryBright}>
        Dashboard
      </Text>
      <Text color={theme.tokens.textMuted}>Cluster overview and quick actions</Text>

      <Box flexDirection="row" marginTop={1} flexWrap="wrap">
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={theme.tokens.borderDefault}
          paddingX={1}
          marginRight={1}
          width={22}
        >
          <Text color={theme.tokens.textMuted}>API Status</Text>
          <StatusDot ok={apiOk} theme={theme} label={apiOk ? " connected" : " no key"} />
          <Text color={theme.tokens.textSecondary}>
            {config?.provider ?? "—"} / {config?.model ?? "—"}
          </Text>
        </Box>

        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={theme.tokens.borderDefault}
          paddingX={1}
          marginRight={1}
          width={18}
        >
          <Text color={theme.tokens.textMuted}>VMs</Text>
          <Text bold color={theme.tokens.textPrimary}>
            {running}/{vms.length}
          </Text>
          <Text color={severityColor(theme, issueCount > 0 ? "warn" : "ok")}>
            {issueCount} issue{issueCount === 1 ? "" : "s"}
          </Text>
        </Box>

        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={theme.tokens.borderDefault}
          paddingX={1}
          marginRight={1}
          width={18}
        >
          <Text color={theme.tokens.textMuted}>Alerts</Text>
          <Text color={config?.emailEnabled ? theme.tokens.success : theme.tokens.textMuted}>
            email {config?.emailEnabled ? "on" : "off"}
          </Text>
          <Text color={config?.slackEnabled ? theme.tokens.success : theme.tokens.textMuted}>
            slack {config?.slackEnabled ? "on" : "off"}
          </Text>
        </Box>

        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={pending ? theme.tokens.warning : theme.tokens.borderMuted}
          paddingX={1}
          width={18}
        >
          <Text color={theme.tokens.textMuted}>Approvals</Text>
          <Text color={pending ? theme.tokens.warning : theme.tokens.success}>
            {pending ? "1 pending" : "none"}
          </Text>
        </Box>
      </Box>

      <Divider label="Node" theme={theme} width={55} />

      <Box flexDirection="row" marginTop={0}>
        <NodeStatsWidget stats={nodeStats} theme={theme} width={32} />
        <Box marginLeft={2} flexDirection="column">
          <Text color={theme.tokens.textMuted}>session</Text>
          <Text>tools run: {recentTools}</Text>
          <Text>log entries: {toolLog.length}</Text>
          {loading ? <Text color={theme.tokens.warning}>agent busy</Text> : null}
        </Box>
      </Box>

      <Divider label="VMs" theme={theme} width={55} />

      {vmsError ? (
        <Text color={theme.tokens.error}>PVE: {vmsError} — /test-pve</Text>
      ) : vmsLoading ? (
        <Text color={theme.tokens.textMuted}>Loading VMs…</Text>
      ) : (
        <VmTable maxRows={6} />
      )}

      <Divider label="Quick Actions" theme={theme} width={55} />

      <KeyHintRow
        theme={theme}
        hints={[
          { keys: "R", label: "health report" },
          { keys: "r", label: "refresh VMs" },
          { keys: "c", label: "run check" },
          { keys: "1", label: "chat" },
        ]}
      />

      <Box marginTop={1} flexDirection="row" flexWrap="wrap">
        {TAB_DEFINITIONS.slice(0, 6).map((tab) => (
          <Badge key={tab.id} label={`${tab.shortcut} ${tab.label}`} theme={theme} />
        ))}
      </Box>

      {nodeStats ? (
        <Box marginTop={1}>
          <Text color={theme.tokens.textMuted}>
            Node load avg: {formatLoadAvg(nodeStats.loadavg)} · CPU{" "}
            {formatPercent(nodeStats.cpuPercent, undefined, 0)}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
}
