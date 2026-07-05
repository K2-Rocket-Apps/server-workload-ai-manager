import { useEffect, useState } from "react";
import { Box, Text } from "ink";
import { SPINNER_FRAMES } from "../../core/constants.js";
import type { Theme } from "../../core/theme.js";
import { getTheme } from "../../core/theme.js";

export type SpinnerLineProps = {
  label?: string;
  theme?: Theme;
  intervalMs?: number;
  color?: string;
};

export function SpinnerLine({
  label = "Loading…",
  theme,
  intervalMs = 80,
  color,
}: SpinnerLineProps) {
  const resolved = theme ?? getTheme();
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setFrame((f) => (f + 1) % SPINNER_FRAMES.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  const spinnerColor = color ?? resolved.tokens.primary;

  return (
    <Box flexDirection="row">
      <Text color={spinnerColor}>{SPINNER_FRAMES[frame]} </Text>
      <Text color={resolved.tokens.textSecondary}>{label}</Text>
    </Box>
  );
}

export type LoadingOverlayProps = {
  message: string;
  theme?: Theme;
  width?: number;
};

export function LoadingOverlay({ message, theme, width }: LoadingOverlayProps) {
  const resolved = theme ?? getTheme();

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={resolved.tokens.borderFocus}
      paddingX={2}
      paddingY={1}
      width={width}
    >
      <SpinnerLine label={message} theme={resolved} />
    </Box>
  );
}
