import { useEffect, useState } from "react";
import { Box, Text } from "ink";
import { useAppSelector } from "../../state/context.js";
import { APP_NAME, VERSION } from "../../core/constants.js";
import { formatUptime } from "../../core/format.js";
import { getTheme } from "../../core/theme.js";

export type TitleBarProps = {
  showClock?: boolean;
  showUptime?: boolean;
};

export function TitleBar({ showClock = true, showUptime = true }: TitleBarProps) {
  const themeName = useAppSelector((s) => s.theme);
  const config = useAppSelector((s) => s.configStatus);
  const loading = useAppSelector((s) => s.loading);
  const sessionId = useAppSelector((s) => s.sessionId);
  const theme = getTheme(themeName);

  const [now, setNow] = useState(new Date());
  const [sessionStart] = useState(Date.now());

  useEffect(() => {
    if (!showClock) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [showClock]);

  const clockStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const uptimeSec = Math.floor((Date.now() - sessionStart) / 1000);
  const model = config?.model ?? "—";
  const provider = config?.provider ?? "—";
  const apiOk = config?.apiKeySet ?? false;

  return (
    <Box flexDirection="column" width="100%">
      <Box flexDirection="row" justifyContent="space-between">
        <Box flexDirection="row">
          <Text bold color={theme.tokens.primaryBright}>
            {APP_NAME}
          </Text>
          <Text color={theme.tokens.textMuted}> v{VERSION}</Text>
          {loading ? (
            <Text color={theme.tokens.warning}> · thinking</Text>
          ) : null}
        </Box>
        <Box flexDirection="row">
          {showClock ? (
            <Text color={theme.tokens.textSecondary}>{clockStr}</Text>
          ) : null}
          {showUptime ? (
            <Text color={theme.tokens.textMuted}>
              {" "}
              · session {formatUptime(uptimeSec, true)}
            </Text>
          ) : null}
        </Box>
      </Box>

      <Box flexDirection="row" justifyContent="space-between" marginTop={0}>
        <Box flexDirection="row">
          <Text color={theme.tokens.textMuted}>model </Text>
          <Text color={theme.tokens.secondary}>{model}</Text>
          <Text color={theme.tokens.textMuted}> · provider </Text>
          <Text color={theme.tokens.secondary}>{provider}</Text>
          <Text color={apiOk ? theme.tokens.success : theme.tokens.error}>
            {" "}
            · api {apiOk ? "●" : "○"}
          </Text>
        </Box>
        <Text color={theme.tokens.textMuted} dimColor>
          {sessionId.slice(-12)}
        </Text>
      </Box>

      <Box marginTop={0}>
        <Text color={theme.tokens.borderDefault}>
          {"─".repeat(Math.min(80, 120))}
        </Text>
      </Box>
    </Box>
  );
}
