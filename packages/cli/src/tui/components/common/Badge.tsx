import { Text } from "ink";
import type { Theme } from "../../core/theme.js";
import { getTheme } from "../../core/theme.js";

export type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "muted";

export type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
  theme?: Theme;
  bold?: boolean;
};

function variantColor(theme: Theme, variant: BadgeVariant): string {
  switch (variant) {
    case "success":
      return theme.tokens.success;
    case "warning":
      return theme.tokens.warning;
    case "error":
      return theme.tokens.error;
    case "info":
      return theme.tokens.info;
    case "muted":
      return theme.tokens.textMuted;
    default:
      return theme.tokens.primary;
  }
}

export function Badge({ label, variant = "default", theme, bold = false }: BadgeProps) {
  const resolved = theme ?? getTheme();
  const color = variantColor(resolved, variant);

  return (
    <Text bold={bold} color={color}>
      {" "}
      [{label}]{" "}
    </Text>
  );
}

export function StatusDot({
  ok,
  theme,
  label,
}: {
  ok: boolean;
  theme?: Theme;
  label?: string;
}) {
  const resolved = theme ?? getTheme();
  const color = ok ? resolved.tokens.success : resolved.tokens.error;
  const symbol = ok ? "●" : "○";

  return (
    <Text color={color}>
      {symbol}
      {label ? ` ${label}` : ""}
    </Text>
  );
}
