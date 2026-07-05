import { useMemo } from "react";
import { Box, Text } from "ink";
import { useAppSelector } from "../../state/context.js";
import { DEFAULT_WATCHED_VMS } from "../../core/constants.js";
import { getTheme, severityColor } from "../../core/theme.js";
import { sparkline } from "../../render/sparkline.js";
import { Divider } from "../common/Divider.js";
import { SpinnerLine } from "../common/SpinnerLine.js";
import { NodeStatsWidget } from "./NodeStatsWidget.js";
import { VmTable, VmStatusSummary } from "./VmTable.js";
import { VmDetailFromStore } from "./VmDetailCard.js";

export type VmDashboardProps = {
  selectedVmid?: number;
  height?: number;
};

export function VmDashboard({ selectedVmid, height }: VmDashboardProps) {
  const themeName = useAppSelector((s) => s.theme);
  const nodeStats = useAppSelector((s) => s.nodeStats);
  const vms = useAppSelector((s) => s.vms);
  const vmsLoading = useAppSelector((s) => s.vmsLoading);
  const vmReportRaw = useAppSelector((s) => s.vmReportRaw);
  const theme = getTheme(themeName);

  const cpuHistory = useMemo(
    () => vms.filter((v) => v.cpuPercent != null).map((v) => v.cpuPercent!),
    [vms],
  );

  const firstVmid = selectedVmid ?? vms[0]?.vmid ?? DEFAULT_WATCHED_VMS[0]?.vmid;

  return (
    <Box flexDirection="column" height={height} overflow="hidden">
      <Box flexDirection="row" justifyContent="space-between">
        <Text bold color={theme.tokens.primary}>
          Virtual Machines
        </Text>
        <VmStatusSummary />
      </Box>

      <Text color={theme.tokens.textMuted} dimColor>
        r refresh · /vms · /report · d details
      </Text>

      <Box flexDirection="row" marginTop={1}>
        <NodeStatsWidget stats={nodeStats} theme={theme} history={cpuHistory} />
        <Box marginLeft={2} flexDirection="column">
          <Text color={theme.tokens.textMuted}>cluster CPU trend</Text>
          <Text color={theme.tokens.chartBar}>
            {cpuHistory.length > 0
              ? sparkline(cpuHistory, { width: 24 })
              : "— no data —"}
          </Text>
          <Text color={theme.tokens.textMuted} dimColor>
            {vms.filter((v) => v.guestAgent).length}/{vms.length} guest agent
          </Text>
        </Box>
      </Box>

      <Divider label="VM List" theme={theme} width={60} />

      {vmsLoading ? (
        <SpinnerLine label="Fetching VM health…" theme={theme} />
      ) : (
        <VmTable maxRows={12} />
      )}

      {firstVmid ? (
        <Box marginTop={1}>
          <VmDetailFromStore vmid={firstVmid} />
        </Box>
      ) : null}

      {vmReportRaw && !vms.length ? (
        <Box marginTop={1} flexDirection="column">
          <Text color={theme.tokens.textMuted}>raw report</Text>
          <Text wrap="wrap">{vmReportRaw.slice(0, 500)}</Text>
        </Box>
      ) : null}

      <Box marginTop={1}>
        <Text color={severityColor(theme, vms.some((v) => v.issues.length) ? "warn" : "ok")}>
          Watched: {DEFAULT_WATCHED_VMS.map((v) => `${v.vmid}`).join(", ")}
        </Text>
      </Box>
    </Box>
  );
}
