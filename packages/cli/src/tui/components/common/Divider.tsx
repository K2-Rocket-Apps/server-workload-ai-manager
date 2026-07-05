import { Box, Text } from "ink";
import type { Theme } from "../../core/theme.js";
import { getTheme } from "../../core/theme.js";

export type DividerProps = {
  width?: number;
  label?: string;
  theme?: Theme;
  char?: string;
};

export function Divider({ width = 40, label, theme, char = "─" }: DividerProps) {
  const resolved = theme ?? getTheme();
  const lineColor = resolved.tokens.borderMuted;

  if (label) {
    const labelLen = label.length + 2;
    const side = Math.max(2, Math.floor((width - labelLen) / 2));
    const left = char.repeat(side);
    const right = char.repeat(Math.max(2, width - side - labelLen));

    return (
      <Box flexDirection="row">
        <Text color={lineColor}>{left}</Text>
        <Text color={resolved.tokens.textSecondary}> {label} </Text>
        <Text color={lineColor}>{right}</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Text color={lineColor}>{char.repeat(Math.max(4, width))}</Text>
    </Box>
  );
}

export function VerticalDivider({ height = 1, theme }: { height?: number; theme?: Theme }) {
  const resolved = theme ?? getTheme();

  return (
    <Box flexDirection="column" marginX={1}>
      {Array.from({ length: height }, (_, i) => (
        <Text key={i} color={resolved.tokens.borderMuted}>
          │
        </Text>
      ))}
    </Box>
  );
}
