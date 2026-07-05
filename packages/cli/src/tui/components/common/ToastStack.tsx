import { useEffect } from "react";
import { Box, Text } from "ink";
import { useAppDispatch, useAppSelector } from "../../state/context.js";
import { getTheme } from "../../core/theme.js";
import type { Toast, ToastType } from "../../types.js";

function toastColor(type: ToastType, tokens: ReturnType<typeof getTheme>["tokens"]): string {
  switch (type) {
    case "success":
      return tokens.success;
    case "warn":
      return tokens.warning;
    case "error":
      return tokens.error;
    default:
      return tokens.info;
  }
}

function toastIcon(type: ToastType): string {
  switch (type) {
    case "success":
      return "✓";
    case "warn":
      return "!";
    case "error":
      return "✗";
    default:
      return "i";
  }
}

type ToastItemProps = {
  toast: Toast;
};

function ToastItem({ toast }: ToastItemProps) {
  const themeName = useAppSelector((s) => s.theme);
  const theme = getTheme(themeName);
  const color = toastColor(toast.type, theme.tokens);

  return (
    <Box
      marginBottom={1}
      borderStyle="round"
      borderColor={color}
      paddingX={1}
      flexDirection="row"
    >
      <Text bold color={color}>
        {toastIcon(toast.type)}{" "}
      </Text>
      <Text color={theme.tokens.textPrimary} wrap="wrap">
        {toast.message}
      </Text>
    </Box>
  );
}

export function ToastStack() {
  const toasts = useAppSelector((s) => s.toasts);
  const dispatch = useAppDispatch();
  const themeName = useAppSelector((s) => s.theme);
  const theme = getTheme(themeName);

  useEffect(() => {
    if (toasts.length === 0) return;

    const id = setInterval(() => {
      dispatch({ type: "PURGE_EXPIRED_TOASTS", now: Date.now() });
    }, 500);

    return () => clearInterval(id);
  }, [toasts.length, dispatch]);

  if (toasts.length === 0) return null;

  return (
    <Box
      flexDirection="column"
      position="absolute"
      alignItems="flex-end"
      width="100%"
      paddingX={1}
    >
      <Box flexDirection="column" width={Math.min(50, 40)}>
        <Text color={theme.tokens.textMuted} dimColor>
          notifications
        </Text>
        {toasts.slice(-4).map((t) => (
          <ToastItem key={t.id} toast={t} />
        ))}
      </Box>
    </Box>
  );
}
