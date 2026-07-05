import { Box, Text } from "ink";
import { useAppSelector } from "../../state/context.js";
import { CONFIG_FILE, LOG_DIR, SECRETS_FILE } from "../../core/constants.js";
import { getTheme, listThemes } from "../../core/theme.js";
import { SpinnerLine } from "../common/SpinnerLine.js";
import { ConfigRow, SettingsDivider, SettingsSection } from "./SettingsSection.js";

export type SettingsViewProps = {
  height?: number;
};

export function SettingsView({ height }: SettingsViewProps) {
  const themeName = useAppSelector((s) => s.theme);
  const config = useAppSelector((s) => s.configStatus);
  const configLoading = useAppSelector((s) => s.configLoading);
  const configError = useAppSelector((s) => s.configError);
  const theme = getTheme(themeName);
  const themeLabel = listThemes().find((t) => t.name === theme.name)?.label ?? theme.label;

  if (configLoading) {
    return <SpinnerLine label="Loading configuration…" theme={theme} />;
  }

  if (configError) {
    return (
      <Box flexDirection="column">
        <Text color={theme.tokens.error}>Config error: {configError}</Text>
        <Text dimColor>Ctrl+R reload · /config</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height={height} overflow="hidden">
      <Text bold color={theme.tokens.primaryBright}>
        Settings
      </Text>
      <Text color={theme.tokens.textMuted}>
        /config · /model · /provider · /setup · Ctrl+T theme
      </Text>

      <SettingsDivider />

      <SettingsSection title="LLM" description="Model and API configuration" theme={theme}>
        <ConfigRow label="Provider" value={config?.provider ?? "—"} theme={theme} />
        <ConfigRow label="Model" value={config?.model ?? "—"} theme={theme} />
        <ConfigRow
          label="API key"
          value={config?.apiKeySet ? "configured" : "NOT SET"}
          ok={config?.apiKeySet}
          hint="/setup or /apikey"
          theme={theme}
        />
        <ConfigRow
          label="Temperature"
          value={config != null ? String(config.temperature) : "—"}
          theme={theme}
        />
      </SettingsSection>

      <SettingsSection title="Proxmox VE" theme={theme}>
        <ConfigRow label="Host" value={config?.pveHost ?? "—"} theme={theme} />
        <ConfigRow label="Node" value={config?.pveNode ?? "—"} theme={theme} />
        <ConfigRow
          label="Watched VMs"
          value={config?.watchedVmids.join(", ") ?? "—"}
          theme={theme}
        />
      </SettingsSection>

      <SettingsSection title="Web UI" theme={theme}>
        <ConfigRow label="URL" value={config?.webUrl ?? "—"} theme={theme} />
        <ConfigRow label="Service" value="mistral-web" hint="systemctl status mistral-web" theme={theme} />
      </SettingsSection>

      <SettingsSection title="Daemon" theme={theme}>
        <ConfigRow
          label="Enabled"
          value={config?.daemonEnabled ? "yes" : "no"}
          ok={config?.daemonEnabled}
          theme={theme}
        />
        <ConfigRow
          label="Interval"
          value={config != null ? `${config.daemonIntervalMinutes} min` : "—"}
          theme={theme}
        />
        <ConfigRow label="Report cron" value={config?.checkCron ?? "—"} theme={theme} />
      </SettingsSection>

      <SettingsSection title="Alerts" theme={theme}>
        <ConfigRow
          label="Email"
          value={config?.emailEnabled ? "enabled" : "disabled"}
          ok={config?.emailEnabled}
          theme={theme}
        />
        <ConfigRow
          label="Slack"
          value={config?.slackEnabled ? "enabled" : "disabled"}
          ok={config?.slackEnabled}
          theme={theme}
        />
      </SettingsSection>

      <SettingsSection title="Appearance" theme={theme}>
        <ConfigRow label="Theme" value={themeLabel} hint="Ctrl+T to cycle" theme={theme} />
      </SettingsSection>

      <SettingsDivider />

      <SettingsSection title="Paths" theme={theme}>
        <ConfigRow label="Config" value={CONFIG_FILE} theme={theme} />
        <ConfigRow label="Secrets" value={SECRETS_FILE} secret theme={theme} />
        <ConfigRow label="Logs" value={LOG_DIR} theme={theme} />
      </SettingsSection>
    </Box>
  );
}
