import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import type { ConfigStatus } from "../types.js";

type VmsPanelProps = {
  report: string;
  loading: boolean;
};

export function VmsPanel({ report, loading }: VmsPanelProps) {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold color="green">
        Virtual Machines
      </Text>
      <Text dimColor>r refresh  •  /vms  •  /vm &lt;id&gt;  •  /report</Text>
      {loading && (
        <Text color="yellow">
          <Spinner type="dots" /> loading…
        </Text>
      )}
      <Box marginTop={1}>
        <Text wrap="wrap">{report}</Text>
      </Box>
    </Box>
  );
}

type SettingsPanelProps = {
  config: ConfigStatus | null;
};

export function SettingsPanel({ config }: SettingsPanelProps) {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold color="yellow">
        Settings
      </Text>
      <Text dimColor>/config  /bind  /model  /provider  /setup  /test-email</Text>
      <Box marginTop={1} flexDirection="column">
        <Text>Config file: /etc/mistral/config.yaml</Text>
        {config && (
          <>
            <Text>LLM: {config.provider} / {config.model}</Text>
            <Text>API key: {config.apiKeySet ? "set ✓" : "NOT SET — /setup"}</Text>
            <Text>PVE: {config.pveHost}</Text>
            <Text>Web UI: {config.webUrl}</Text>
            <Text>Watched VMs: {config.watchedVmids.join(", ")}</Text>
            <Text>
              Alerts: email={config.emailEnabled ? "on" : "off"} slack={config.slackEnabled ? "on" : "off"}
            </Text>
          </>
        )}
        <Box marginTop={1} flexDirection="column">
          <Text>Web service: sudo systemctl start mistral-web</Text>
          <Text>Daemon: sudo systemctl status mistral-daemon</Text>
        </Box>
      </Box>
    </Box>
  );
}

export function AlertsPanel() {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold color="yellow">
        Alerts
      </Text>
      <Text dimColor>/check  /test-alert  /test-email  /daemon status</Text>
      <Box marginTop={1} flexDirection="column">
        <Text>State: /var/lib/mistral/state.json</Text>
        <Text>Daemon sends email + Slack on new VM issues.</Text>
        <Text>Run /check to force a health pass now.</Text>
      </Box>
    </Box>
  );
}

type ApprovalsPanelProps = {
  pending: { name: string; args: Record<string, unknown> } | null;
};

export function ApprovalsPanel({ pending }: ApprovalsPanelProps) {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold color="yellow">
        Pending Approvals
      </Text>
      <Text dimColor>y approve  n deny  •  /start /stop /reboot queue here</Text>
      <Box marginTop={1}>
        {pending ? (
          <Box flexDirection="column">
            <Text color="yellow">Action: {pending.name}</Text>
            <Text>{JSON.stringify(pending.args, null, 2)}</Text>
            <Text color="cyan">Press y to approve, n to deny</Text>
          </Box>
        ) : (
          <Text dimColor>No pending approvals</Text>
        )}
      </Box>
    </Box>
  );
}
