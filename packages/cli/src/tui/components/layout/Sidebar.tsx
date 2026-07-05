import { Box, Text } from "ink";
import { useAppSelector } from "../../state/context.js";
import { TAB_DEFINITIONS } from "../../core/constants.js";
import { getTheme, listThemes } from "../../core/theme.js";
import type { TabId } from "../../types.js";
import { StatusDot } from "../common/Badge.js";

export type SidebarProps = {
  width: number;
  height: number;
};

export function Sidebar({ width, height }: SidebarProps) {
  const themeName = useAppSelector((s) => s.theme);
  const tab = useAppSelector((s) => s.tab);
  const config = useAppSelector((s) => s.configStatus);
  const pending = useAppSelector((s) => s.pending);
  const theme = getTheme(themeName);

  const apiOk = config?.apiKeySet ?? false;
  const daemonOk = config?.daemonEnabled ?? false;
  const themeLabel = listThemes().find((t) => t.name === theme.name)?.label ?? theme.label;

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
        Navigation
      </Text>
      <Box marginY={1} flexDirection="column">
        {TAB_DEFINITIONS.map((def) => {
          const active = tab === def.id;
          const hasBadge = def.id === "approvals" && pending !== null;

          return (
            <Box key={def.id} flexDirection="row">
              <Text color={active ? theme.tokens.tabActive : theme.tokens.tabInactive}>
                {active ? "▸" : " "}
              </Text>
              <Text color={theme.tokens.tabShortcut} dimColor={!active}>
                {def.shortcut}{" "}
              </Text>
              <Text color={active ? theme.tokens.textPrimary : theme.tokens.textSecondary}>
                {def.icon} {def.label}
              </Text>
              {hasBadge ? <Text color={theme.tokens.warning}> !</Text> : null}
            </Box>
          );
        })}
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text bold color={theme.tokens.textMuted}>
          Status
        </Text>
        <Box marginTop={0}>
          <StatusDot ok={apiOk} theme={theme} label=" API key" />
        </Box>
        <Box>
          <StatusDot ok={daemonOk} theme={theme} label=" Daemon" />
        </Box>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text color={theme.tokens.textMuted}>theme</Text>
        <Text color={theme.tokens.primary}>{themeLabel}</Text>
      </Box>

      <Box flexGrow={1} />

      <Box flexDirection="column">
        <Text color={theme.tokens.textMuted} dimColor>
          Ctrl+T cycle theme
        </Text>
        <Text color={theme.tokens.textMuted} dimColor>
          ? help · Esc quit
        </Text>
      </Box>
    </Box>
  );
}

export function sidebarTabFromShortcut(key: string): TabId | undefined {
  const def = TAB_DEFINITIONS.find((t) => t.shortcut === key);
  return def?.id;
}
