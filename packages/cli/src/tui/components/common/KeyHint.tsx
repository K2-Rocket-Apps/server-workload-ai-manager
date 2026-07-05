import { Box, Text } from "ink";
import type { Theme } from "../../core/theme.js";
import { getTheme } from "../../core/theme.js";

export type KeyHintProps = {
  keys: string;
  label: string;
  theme?: Theme;
  dim?: boolean;
};

export function KeyHint({ keys, label, theme, dim = false }: KeyHintProps) {
  const resolved = theme ?? getTheme();

  return (
    <Box marginRight={2}>
      <Text bold={!dim} color={resolved.tokens.tabShortcut}>
        {keys}
      </Text>
      <Text color={dim ? resolved.tokens.textMuted : resolved.tokens.textSecondary}>
        {" "}
        {label}
      </Text>
    </Box>
  );
}

export type KeyHintRowProps = {
  hints: readonly { keys: string; label: string }[];
  theme?: Theme;
  separator?: string;
};

export function KeyHintRow({ hints, theme, separator = "  " }: KeyHintRowProps) {
  const resolved = theme ?? getTheme();

  return (
    <Box flexDirection="row" flexWrap="wrap">
      {hints.map((hint, i) => (
        <Box key={`${hint.keys}-${i}`} flexDirection="row">
          {i > 0 ? <Text color={resolved.tokens.textMuted}>{separator}</Text> : null}
          <KeyHint keys={hint.keys} label={hint.label} theme={resolved} />
        </Box>
      ))}
    </Box>
  );
}
