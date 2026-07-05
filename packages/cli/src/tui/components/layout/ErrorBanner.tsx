import { Box, Text } from "ink";
import { isLocalPveHost } from "@mistral/pve";
import { useAppSelector } from "../../state/context.js";
import { getTheme } from "../../core/theme.js";

export function ErrorBanner() {
  const themeName = useAppSelector((s) => s.theme);
  const vmsError = useAppSelector((s) => s.vmsError);
  const configError = useAppSelector((s) => s.configError);
  const config = useAppSelector((s) => s.configStatus);
  const theme = getTheme(themeName);

  const messages: string[] = [];
  if (vmsError) messages.push(`PVE: ${vmsError}`);
  if (configError) messages.push(`Config: ${configError}`);
  if (config && !config.apiKeySet) {
    messages.push("LLM API key not set — /apikey <key>");
  }
  if (config && !config.pveTokenSet && !isLocalPveHost()) {
    messages.push("PVE not reachable — run on Proxmox host or set API token");
  }

  if (!messages.length) return null;

  return (
    <Box
      borderStyle="round"
      borderColor={theme.tokens.error}
      paddingX={1}
      marginBottom={1}
      flexDirection="column"
    >
      <Text bold color={theme.tokens.error}>
        ⚠ Configuration issues (fix below, then press r to refresh)
      </Text>
      {messages.map((m, i) => (
        <Text key={i} color={theme.tokens.error} wrap="wrap">
          {m}
        </Text>
      ))}
      <Text color={theme.tokens.textMuted} dimColor>
        {isLocalPveHost()
          ? "PVE: local root via pvesh (no token needed) · /test-pve"
          : "PVE token: /etc/mistral/secrets.env → MISTRAL_PVE_TOKEN_SECRET · /test-pve"}
      </Text>
    </Box>
  );
}
