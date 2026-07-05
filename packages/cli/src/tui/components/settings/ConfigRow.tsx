import { Box, Text } from "ink";
import { useAppSelector } from "../../state/context.js";
import type { Theme } from "../../core/theme.js";
import { getTheme } from "../../core/theme.js";

export type ConfigRowProps = {
  label: string;
  value: string;
  hint?: string;
  secret?: boolean;
  ok?: boolean;
  theme?: Theme;
};

export function ConfigRow({ label, value, hint, secret = false, ok, theme }: ConfigRowProps) {
  const resolved = theme ?? getTheme();
  const displayValue = secret && value !== "—" ? "••••••••" : value;
  const valueColor =
    ok === true
      ? resolved.tokens.success
      : ok === false
        ? resolved.tokens.error
        : resolved.tokens.textPrimary;

  return (
    <Box flexDirection="column" marginBottom={0}>
      <Box flexDirection="row">
        <Box width={18}>
          <Text color={resolved.tokens.textMuted}>{label}</Text>
        </Box>
        <Text color={valueColor}>{displayValue}</Text>
      </Box>
      {hint ? (
        <Box paddingLeft={18}>
          <Text color={resolved.tokens.textMuted} dimColor>
            {hint}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
}

export function ConfigRowInline({ label, value }: { label: string; value: string }) {
  const themeName = useAppSelector((s) => s.theme);
  return <ConfigRow label={label} value={value} theme={getTheme(themeName)} />;
}
