import { Box, Text } from "ink";
import { useAppSelector } from "../../state/context.js";
import { getTheme } from "../../core/theme.js";
import { KeyHintRow } from "./KeyHint.js";
import { Modal } from "./Modal.js";

export type ConfirmDialogProps = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
};

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
}: ConfirmDialogProps) {
  const themeName = useAppSelector((s) => s.theme);
  const theme = getTheme(themeName);

  const lines = message.split("\n");

  return (
    <Modal
      title={title}
      theme={theme}
      width={56}
      footer={
        <KeyHintRow
          theme={theme}
          hints={[
            { keys: "Enter", label: confirmLabel },
            { keys: "Esc", label: cancelLabel },
          ]}
        />
      }
    >
      <Box flexDirection="column">
        {lines.map((line, i) => (
          <Text key={i} color={theme.tokens.textPrimary} wrap="wrap">
            {line}
          </Text>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text color={theme.tokens.warning}>
          This action may affect running VMs or configuration.
        </Text>
      </Box>
    </Modal>
  );
}

/** Renders confirm dialog from modal state slice */
export function ConfirmDialogFromState() {
  const modal = useAppSelector((s) => s.modal);
  if (modal.type !== "confirm") return null;

  return (
    <ConfirmDialog
      title={modal.title}
      message={modal.message}
      confirmLabel={modal.confirmLabel ?? "Confirm"}
      cancelLabel={modal.cancelLabel ?? "Cancel"}
    />
  );
}

export function ConfirmDialogInline({
  title,
  message,
  variant = "warn",
}: {
  title: string;
  message: string;
  variant?: "warn" | "error" | "info";
}) {
  const themeName = useAppSelector((s) => s.theme);
  const theme = getTheme(themeName);
  const borderColor =
    variant === "error"
      ? theme.tokens.error
      : variant === "info"
        ? theme.tokens.info
        : theme.tokens.warning;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor}
      paddingX={2}
      paddingY={1}
    >
      <Text bold color={borderColor}>
        {title}
      </Text>
      <Box marginTop={1}>
        <Text wrap="wrap">{message}</Text>
      </Box>
      <Box marginTop={1}>
        <KeyHintRow
          theme={theme}
          hints={[
            { keys: "y", label: "yes" },
            { keys: "n", label: "no" },
          ]}
        />
      </Box>
    </Box>
  );
}
