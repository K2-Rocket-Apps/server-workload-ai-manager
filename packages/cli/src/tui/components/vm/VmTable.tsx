import { Box, Text } from "ink";
import { useAppSelector } from "../../state/context.js";
import { getTheme, severityColor } from "../../core/theme.js";
import { formatPercent, truncate } from "../../core/format.js";
import { DataTable, type DataTableColumn } from "../../render/table.js";
import type { VmRow } from "../../types.js";
import { Badge } from "../common/Badge.js";
import { SpinnerLine } from "../common/SpinnerLine.js";
import { EmptyState } from "../common/EmptyState.js";

const VM_COLUMNS: DataTableColumn<VmRow>[] = [
  { key: "vmid", header: "ID", width: 5, align: "right" },
  { key: "name", header: "Name", width: 14, render: (r) => truncate(r.name, 14) },
  {
    key: "status",
    header: "Status",
    width: 10,
    render: (r) => r.status,
  },
  {
    key: "cpu",
    header: "CPU",
    width: 6,
    align: "right",
    render: (r) => (r.cpuPercent != null ? formatPercent(r.cpuPercent, undefined, 0) : "—"),
  },
  {
    key: "mem",
    header: "RAM",
    width: 6,
    align: "right",
    render: (r) => (r.memPercent != null ? formatPercent(r.memPercent, undefined, 0) : "—"),
  },
  {
    key: "issues",
    header: "Issues",
    width: 8,
    render: (r) => (r.issues.length ? String(r.issues.length) : "—"),
  },
];

export type VmTableProps = {
  vms?: VmRow[];
  maxRows?: number;
  loading?: boolean;
};

export function VmTable({ vms: propVms, maxRows = 20, loading }: VmTableProps) {
  const themeName = useAppSelector((s) => s.theme);
  const storeVms = useAppSelector((s) => s.vms);
  const vmsLoading = useAppSelector((s) => s.vmsLoading);
  const vmsError = useAppSelector((s) => s.vmsError);
  const theme = getTheme(themeName);

  const vms = propVms ?? storeVms;
  const isLoading = loading ?? vmsLoading;

  if (isLoading) {
    return <SpinnerLine label="Loading VMs…" theme={theme} />;
  }

  if (vmsError) {
    return (
      <Box flexDirection="column">
        <Text color={theme.tokens.error}>Error: {vmsError}</Text>
        <Text dimColor>Press r to retry or run /vms</Text>
      </Box>
    );
  }

  if (vms.length === 0) {
    return (
      <EmptyState
        title="No VM data"
        description="Refresh to load Proxmox VM health from the API."
        hints={["Press r to refresh", "/vms — load report", "/report — chat report"]}
        theme={theme}
        icon="🖥"
      />
    );
  }

  const running = vms.filter((v) => v.status === "running").length;
  const withIssues = vms.filter((v) => v.issues.length > 0).length;

  return (
    <Box flexDirection="column">
      <Box flexDirection="row" marginBottom={1}>
        <Badge label={`${running} running`} variant="success" theme={theme} />
        <Badge label={`${vms.length} total`} variant="info" theme={theme} />
        {withIssues > 0 ? (
          <Badge label={`${withIssues} issues`} variant="warning" theme={theme} />
        ) : null}
      </Box>
      <DataTable columns={VM_COLUMNS} rows={vms} theme={theme} maxRows={maxRows} zebra />
    </Box>
  );
}

export function VmStatusSummary() {
  const vms = useAppSelector((s) => s.vms);
  const themeName = useAppSelector((s) => s.theme);
  const theme = getTheme(themeName);

  const issueCount = vms.reduce((n, v) => n + v.issues.length, 0);
  const severity = issueCount > 0 ? "warn" : "ok";

  return (
    <Text color={severityColor(theme, severity)}>
      {vms.length} VMs · {issueCount} issue{issueCount === 1 ? "" : "s"}
    </Text>
  );
}
