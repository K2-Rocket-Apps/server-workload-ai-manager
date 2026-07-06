import { Box, Text } from "ink";
import { useAppSelector } from "../../state/context.js";
import { LOG_DIR, STATE_DIR } from "../../core/constants.js";
import { getTheme } from "../../core/theme.js";
import { Divider } from "../common/Divider.js";
import { KeyHintRow } from "../common/KeyHint.js";

export function AlertsView() {
  const themeName = useAppSelector((s) => s.theme);
  const config = useAppSelector((s) => s.configStatus);
  const theme = getTheme(themeName);

  return (
    <Box flexDirection="column">
      <Text bold color={theme.tokens.primaryBright}>
        Alerts
      </Text>
      <Text color={theme.tokens.textMuted}>
        Email and Slack notifications for VM health issues
      </Text>

      <Divider label="Configuration" theme={theme} width={50} />

      <Box flexDirection="column" marginTop={0}>
        <Box flexDirection="row">
          <Box width={16}>
            <Text color={theme.tokens.textMuted}>Email alerts</Text>
          </Box>
          <Text color={config?.emailEnabled ? theme.tokens.success : theme.tokens.textMuted}>
            {config?.emailEnabled ? "enabled ✓" : "disabled"}
          </Text>
        </Box>
        <Box flexDirection="row">
          <Box width={16}>
            <Text color={theme.tokens.textMuted}>Slack alerts</Text>
          </Box>
          <Text color={config?.slackEnabled ? theme.tokens.success : theme.tokens.textMuted}>
            {config?.slackEnabled ? "enabled ✓" : "disabled"}
          </Text>
        </Box>
        <Box flexDirection="row">
          <Box width={16}>
            <Text color={theme.tokens.textMuted}>Daemon</Text>
          </Box>
          <Text color={config?.daemonEnabled ? theme.tokens.success : theme.tokens.warning}>
            {config?.daemonEnabled ? "running checks" : "disabled"}
          </Text>
        </Box>
        <Box flexDirection="row">
          <Box width={16}>
            <Text color={theme.tokens.textMuted}>Interval</Text>
          </Box>
          <Text>
            {config ? `${config.daemonIntervalMinutes} minutes` : "—"}
          </Text>
        </Box>
      </Box>

      <Divider label="State & Logs" theme={theme} width={50} />

      <Box flexDirection="column">
        <Text>State file: {STATE_DIR}/state.json</Text>
        <Text>Alert history: {LOG_DIR}/alerts.log</Text>
        <Text dimColor>Daemon deduplicates repeated issues before notifying.</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text bold color={theme.tokens.secondary}>
          Commands
        </Text>
        <Text>Ctrl+Shift+H — run health check now</Text>
        <Text>/test-alert — send test notification</Text>
        <Text>/test-email — verify SMTP</Text>
        <Text>/daemon status — daemon info</Text>
      </Box>

      <Box marginTop={1}>
        <KeyHintRow
          theme={theme}
          hints={[
            { keys: "c", label: "check now" },
            { keys: "/test-alert", label: "test" },
          ]}
        />
      </Box>
    </Box>
  );
}
