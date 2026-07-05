import { Box, Text } from "ink";
import { useAppSelector } from "../../state/context.js";
import type { Theme } from "../../core/theme.js";
import { getTheme, severityColor } from "../../core/theme.js";
import { formatPercent, joinNonEmpty, truncate } from "../../core/format.js";
import { KeyValueTable } from "../../render/table.js";
import type { VmRow } from "../../types.js";
import { Badge } from "../common/Badge.js";
import { Divider } from "../common/Divider.js";

export type VmDetailCardProps = {
  vm: VmRow;
  theme?: Theme;
  width?: number;
};

export function VmDetailCard({ vm, theme, width = 48 }: VmDetailCardProps) {
  const resolved = theme ?? getTheme();
  const statusSeverity =
    vm.status === "running" ? "ok" : vm.status === "stopped" ? "unknown" : "warn";

  const pairs = [
    { label: "VMID", value: String(vm.vmid) },
    { label: "Name", value: vm.name },
    { label: "Node", value: vm.node },
    { label: "Status", value: vm.status },
    { label: "Guest Agent", value: vm.guestAgent ? "yes ✓" : "no" },
    {
      label: "CPU",
      value: vm.cpuPercent != null ? formatPercent(vm.cpuPercent, undefined, 1) : "—",
    },
    {
      label: "Memory",
      value: vm.memPercent != null ? formatPercent(vm.memPercent, undefined, 1) : "—",
    },
    {
      label: "Disk",
      value: vm.diskPercent != null ? formatPercent(vm.diskPercent, undefined, 1) : "—",
    },
    { label: "IPs", value: vm.ips?.join(", ") ?? "—" },
  ];

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={resolved.tokens.borderFocus}
      paddingX={1}
      width={width}
    >
      <Box flexDirection="row" justifyContent="space-between">
        <Text bold color={resolved.tokens.primaryBright}>
          VM {vm.vmid} · {truncate(vm.name, 24)}
        </Text>
        <Text color={severityColor(resolved, statusSeverity)}>{vm.status}</Text>
      </Box>

      <Divider width={width - 6} theme={resolved} />

      <KeyValueTable pairs={pairs} theme={resolved} labelWidth={14} />

      {vm.issues.length > 0 ? (
        <Box marginTop={1} flexDirection="column">
          <Text bold color={resolved.tokens.warning}>
            Issues ({vm.issues.length})
          </Text>
          {vm.issues.map((issue, i) => (
            <Text key={i} color={resolved.tokens.warning}>
              • {issue}
            </Text>
          ))}
        </Box>
      ) : (
        <Box marginTop={1}>
          <Badge label="healthy" variant="success" theme={resolved} />
        </Box>
      )}

      <Box marginTop={1}>
        <Text color={resolved.tokens.textMuted} dimColor>
          /vm {vm.vmid} · /ping · /console
        </Text>
      </Box>
    </Box>
  );
}

export function VmDetailCardPlaceholder({ vmid }: { vmid: number }) {
  const themeName = useAppSelector((s) => s.theme);
  const theme = getTheme(themeName);

  return (
    <Box borderStyle="round" borderColor={theme.tokens.borderMuted} paddingX={1}>
      <Text color={theme.tokens.textMuted}>VM {vmid} — select or run /vm {vmid}</Text>
    </Box>
  );
}

export function VmDetailFromStore({ vmid }: { vmid: number }) {
  const vms = useAppSelector((s) => s.vms);
  const vm = vms.find((v) => v.vmid === vmid);

  if (!vm) return <VmDetailCardPlaceholder vmid={vmid} />;

  return <VmDetailCard vm={vm} />;
}

export function VmQuickFacts({ vm }: { vm: VmRow }) {
  const themeName = useAppSelector((s) => s.theme);
  const theme = getTheme(themeName);

  return (
    <Text color={theme.tokens.textSecondary}>
      {joinNonEmpty([
        vm.status,
        vm.cpuPercent != null ? `cpu ${formatPercent(vm.cpuPercent, undefined, 0)}` : undefined,
        vm.issues.length ? `${vm.issues.length} issues` : undefined,
      ])}
    </Text>
  );
}
