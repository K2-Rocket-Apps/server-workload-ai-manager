import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import { useAppDispatch, useAppSelector } from "../../state/context.js";
import { getTheme } from "../../core/theme.js";
import { useInputHistoryDraft } from "../../hooks/use-input-history.js";
import { shouldShowPalette } from "../../commands/registry.js";

export type PromptEditorProps = {
  onSubmit: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  showHistoryHint?: boolean;
};

export function PromptEditor({
  onSubmit,
  disabled = false,
  placeholder = "Ask or type / for commands…",
  showHistoryHint = true,
}: PromptEditorProps) {
  const themeName = useAppSelector((s) => s.theme);
  const input = useAppSelector((s) => s.input);
  const loading = useAppSelector((s) => s.loading);
  const dispatch = useAppDispatch();
  const theme = getTheme(themeName);
  const { index, total } = useInputHistoryDraft();

  const slashMode = input.startsWith("/");
  const paletteVisible = slashMode && shouldShowPalette(input);

  const handleChange = (value: string) => {
    dispatch({ type: "SET_INPUT", input: value });
  };

  const handleSubmit = (value: string) => {
    if (disabled || loading) return;
    onSubmit(value);
  };

  return (
    <Box flexDirection="column" width="100%">
      <Box flexDirection="row">
        <Text bold color={theme.tokens.inputCursor}>
          {slashMode ? "/" : "❯"}{" "}
        </Text>
        <Box flexGrow={1}>
          <TextInput
            value={input}
            onChange={handleChange}
            onSubmit={handleSubmit}
            placeholder={placeholder}
            showCursor
          />
        </Box>
      </Box>

      <Box flexDirection="row" justifyContent="space-between" marginTop={0}>
        <Box flexDirection="row">
          {paletteVisible ? (
            <Text color={theme.tokens.primary} dimColor>
              slash palette · ↑↓ Tab Enter
            </Text>
          ) : (
            <Text color={theme.tokens.textMuted} dimColor>
              Enter send · / commands · ↑ history
            </Text>
          )}
        </Box>
        {showHistoryHint && index >= 0 && total > 0 ? (
          <Text color={theme.tokens.textMuted}>
            history {index + 1}/{total}
          </Text>
        ) : null}
        {loading ? (
          <Text color={theme.tokens.warning}> thinking…</Text>
        ) : null}
      </Box>
    </Box>
  );
}

export function PromptEditorReadOnly({ value }: { value: string }) {
  const themeName = useAppSelector((s) => s.theme);
  const theme = getTheme(themeName);

  return (
    <Box flexDirection="row">
      <Text color={theme.tokens.textMuted}>❯ </Text>
      <Text color={theme.tokens.inputText}>{value || "—"}</Text>
    </Box>
  );
}
