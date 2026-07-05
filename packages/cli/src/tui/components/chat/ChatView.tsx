import { useMemo } from "react";
import { Box } from "ink";
import { useAppSelector } from "../../state/context.js";
import { PALETTE } from "../../core/constants.js";
import { getTheme } from "../../core/theme.js";
import { filterCommands, shouldShowPalette } from "../../commands/registry.js";
import { useTerminalLayout } from "../layout/AppShell.js";
import { SpinnerLine } from "../common/SpinnerLine.js";
import { MessageList } from "./MessageList.js";
import { PromptEditor } from "./PromptEditor.js";
import { SlashPalette } from "../command/SlashPalette.js";

export type ChatViewProps = {
  onSubmit: (value: string) => void;
  height?: number;
};

export function ChatView({ onSubmit, height }: ChatViewProps) {
  const themeName = useAppSelector((s) => s.theme);
  const input = useAppSelector((s) => s.input);
  const slashSelectedIndex = useAppSelector((s) => s.slashSelectedIndex);
  const loading = useAppSelector((s) => s.loading);
  const terminalWidth = useAppSelector((s) => s.terminalWidth);
  const theme = getTheme(themeName);

  const layout = useTerminalLayout({ paletteOpen: input.startsWith("/") });
  const viewHeight = height ?? layout.chatHeight;
  const paletteOpen = input.startsWith("/") && shouldShowPalette(input);

  const slashMatches = useMemo(
    () => (input.startsWith("/") ? filterCommands(input) : []),
    [input],
  );

  const messageAreaHeight = paletteOpen
    ? Math.max(6, viewHeight - PALETTE.maxVisible - 4)
    : Math.max(6, viewHeight - 3);

  return (
    <Box flexDirection="column" height={viewHeight} width="100%">
      <Box flexDirection="column" flexGrow={1} height={messageAreaHeight}>
        <MessageList height={messageAreaHeight} width={layout.mainWidth - 4} />
      </Box>

      {loading ? (
        <Box marginY={0}>
          <SpinnerLine label="Agent is thinking…" theme={theme} />
        </Box>
      ) : null}

      {paletteOpen ? (
        <Box marginY={0}>
          <SlashPalette
            matches={slashMatches}
            selectedIndex={slashSelectedIndex}
            maxRows={PALETTE.maxVisible}
            width={Math.min(terminalWidth - 8, layout.mainWidth - 2)}
          />
        </Box>
      ) : null}

      <Box marginTop={0}>
        <PromptEditor onSubmit={onSubmit} disabled={loading} />
      </Box>
    </Box>
  );
}
