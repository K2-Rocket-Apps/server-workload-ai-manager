import type { ReactNode } from "react";
import { Box, Text } from "ink";
import type { Theme } from "../../core/theme.js";
import { getTheme } from "../../core/theme.js";

export type ModalProps = {
  title?: string;
  children: ReactNode;
  theme?: Theme;
  width?: number;
  height?: number;
  footer?: ReactNode;
};

export function Modal({ title, children, theme, width = 60, height, footer }: ModalProps) {
  const resolved = theme ?? getTheme();

  return (
    <Box
      flexDirection="column"
      position="absolute"
      width="100%"
      height="100%"
      justifyContent="center"
      alignItems="center"
    >
      <Box
        flexDirection="column"
        borderStyle="double"
        borderColor={resolved.tokens.borderFocus}
        paddingX={2}
        paddingY={1}
        width={width}
        height={height}
      >
        {title ? (
          <Box marginBottom={1}>
            <Text bold color={resolved.tokens.primaryBright}>
              {title}
            </Text>
          </Box>
        ) : null}
        <Box flexDirection="column" flexGrow={1}>
          {children}
        </Box>
        {footer ? (
          <Box marginTop={1} borderStyle="single" borderColor={resolved.tokens.borderMuted} paddingTop={1}>
            {footer}
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}

export type ModalOverlayProps = {
  children: ReactNode;
  theme?: Theme;
  dimLabel?: string;
};

/** Full-screen dimmed backdrop for modals */
export function ModalOverlay({ children, theme, dimLabel }: ModalOverlayProps) {
  const resolved = theme ?? getTheme();

  return (
    <Box flexDirection="column" width="100%" height="100%">
      {dimLabel ? (
        <Box marginBottom={1}>
          <Text color={resolved.tokens.textMuted}>{dimLabel}</Text>
        </Box>
      ) : null}
      {children}
    </Box>
  );
}
