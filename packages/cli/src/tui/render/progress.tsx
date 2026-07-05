import { Box, Text } from "ink";
import type { Theme } from "../core/theme.js";
import { getTheme } from "../core/theme.js";

export type ProgressBarProps = {
  /** 0–1 progress fraction */
  value: number;
  width?: number;
  label?: string;
  showPercent?: boolean;
  theme?: Theme;
  fillChar?: string;
  emptyChar?: string;
};

export function ProgressBar({
  value,
  width = 30,
  label,
  showPercent = true,
  theme = getTheme(),
  fillChar = "█",
  emptyChar = "░",
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const filled = Math.round(clamped * width);
  const bar = fillChar.repeat(filled) + emptyChar.repeat(Math.max(0, width - filled));
  const pct = `${Math.round(clamped * 100)}%`;

  return (
    <Box flexDirection="column">
      {label ? (
        <Text dimColor>
          {label}
          {showPercent ? ` ${pct}` : ""}
        </Text>
      ) : null}
      <Text color={theme.tokens.progressFill}>
        {bar}
        {!label && showPercent ? (
          <Text color={theme.tokens.textMuted}> {pct}</Text>
        ) : null}
      </Text>
    </Box>
  );
}

export type StepIndicatorProps = {
  steps: readonly string[];
  current: number;
  theme?: Theme;
  completedChar?: string;
  pendingChar?: string;
  activeChar?: string;
};

export function StepIndicator({
  steps,
  current,
  theme = getTheme(),
  completedChar = "●",
  pendingChar = "○",
  activeChar = "◉",
}: StepIndicatorProps) {
  return (
    <Box flexDirection="row" gap={1}>
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        const icon = done ? completedChar : active ? activeChar : pendingChar;
        const color = done
          ? theme.tokens.success
          : active
            ? theme.tokens.primary
            : theme.tokens.textMuted;

        return (
          <Box key={step} flexDirection="row">
            <Text color={color}>{icon} </Text>
            <Text color={active ? theme.tokens.textPrimary : theme.tokens.textMuted} bold={active}>
              {step}
            </Text>
            {i < steps.length - 1 ? <Text dimColor> → </Text> : null}
          </Box>
        );
      })}
    </Box>
  );
}

export type IndeterminateProgressProps = {
  width?: number;
  frame?: number;
  theme?: Theme;
};

const INDETERMINATE_FRAMES = ["▰▱▱▱▱", "▱▰▱▱▱", "▱▱▰▱▱", "▱▱▱▰▱", "▱▱▱▱▰"];

export function IndeterminateProgress({
  width = 20,
  frame = 0,
  theme = getTheme(),
}: IndeterminateProgressProps) {
  const pattern = INDETERMINATE_FRAMES[frame % INDETERMINATE_FRAMES.length]!;
  const repeated = pattern.repeat(Math.ceil(width / pattern.length)).slice(0, width);

  return <Text color={theme.tokens.progressFill}>{repeated}</Text>;
}

export type LoadingStepsProps = {
  steps: readonly { label: string; status: "pending" | "active" | "done" | "error" }[];
  theme?: Theme;
};

export function LoadingSteps({ steps, theme = getTheme() }: LoadingStepsProps) {
  return (
    <Box flexDirection="column">
      {steps.map((step) => {
        let icon = "○";
        let color = theme.tokens.textMuted;
        switch (step.status) {
          case "done":
            icon = "✓";
            color = theme.tokens.success;
            break;
          case "active":
            icon = "…";
            color = theme.tokens.primary;
            break;
          case "error":
            icon = "✗";
            color = theme.tokens.error;
            break;
          default:
            break;
        }
        return (
          <Text key={step.label} color={color}>
            {icon} {step.label}
          </Text>
        );
      })}
    </Box>
  );
}
