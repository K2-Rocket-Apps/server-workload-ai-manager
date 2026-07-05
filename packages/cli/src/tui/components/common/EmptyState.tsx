import { Box, Text } from "ink";
import type { Theme } from "../../core/theme.js";
import { getTheme } from "../../core/theme.js";

export type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: string;
  hints?: readonly string[];
  theme?: Theme;
  width?: number;
};

export function EmptyState({
  title,
  description,
  icon = "○",
  hints,
  theme,
  width,
}: EmptyStateProps) {
  const resolved = theme ?? getTheme();

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={resolved.tokens.borderMuted}
      paddingX={2}
      paddingY={1}
      width={width}
    >
      <Text bold color={resolved.tokens.textSecondary}>
        {icon} {title}
      </Text>
      {description ? (
        <Box marginTop={1}>
          <Text color={resolved.tokens.textMuted} wrap="wrap">
            {description}
          </Text>
        </Box>
      ) : null}
      {hints && hints.length > 0 ? (
        <Box marginTop={1} flexDirection="column">
          {hints.map((hint) => (
            <Text key={hint} color={resolved.tokens.textMuted}>
              • {hint}
            </Text>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}
