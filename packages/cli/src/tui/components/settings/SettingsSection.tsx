import type { ReactNode } from "react";
import { Box, Text } from "ink";
import { useAppSelector } from "../../state/context.js";
import type { Theme } from "../../core/theme.js";
import { getTheme } from "../../core/theme.js";
import { Divider } from "../common/Divider.js";

export { ConfigRow } from "./ConfigRow.js";

export type SettingsSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  theme?: Theme;
};

export function SettingsSection({ title, description, children, theme }: SettingsSectionProps) {
  const resolved = theme ?? getTheme();

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color={resolved.tokens.primary}>
        {title}
      </Text>
      {description ? (
        <Text color={resolved.tokens.textMuted}>{description}</Text>
      ) : null}
      <Box marginTop={0} flexDirection="column" paddingLeft={2}>
        {children}
      </Box>
    </Box>
  );
}

export function SettingsDivider() {
  const themeName = useAppSelector((s) => s.theme);
  return <Divider width={50} theme={getTheme(themeName)} />;
}
