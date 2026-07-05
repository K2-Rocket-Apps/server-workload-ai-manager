import { Box, Text } from "ink";
import { useAppSelector } from "../../state/context.js";
import { KeyAction, formatKeyHint } from "../../core/keybindings.js";
import { getTheme } from "../../core/theme.js";
import type { TabId } from "../../types.js";
import { KeyHintRow } from "../common/KeyHint.js";

const TAB_HINTS: Record<TabId, { action: KeyAction; label: string }[]> = {
  chat: [
    { action: KeyAction.Submit, label: "send" },
    { action: KeyAction.OpenPalette, label: "commands" },
    { action: KeyAction.ScrollUp, label: "scroll" },
    { action: KeyAction.Quit, label: "quit" },
  ],
  dashboard: [
    { action: KeyAction.RunReport, label: "report" },
    { action: KeyAction.RefreshVms, label: "refresh" },
    { action: KeyAction.TabNext, label: "next tab" },
    { action: KeyAction.Quit, label: "quit" },
  ],
  vms: [
    { action: KeyAction.RefreshVms, label: "refresh" },
    { action: KeyAction.VmDetails, label: "details" },
    { action: KeyAction.TabNext, label: "next tab" },
    { action: KeyAction.Quit, label: "quit" },
  ],
  alerts: [
    { action: KeyAction.RunCheck, label: "check now" },
    { action: KeyAction.ReloadConfig, label: "reload" },
    { action: KeyAction.TabNext, label: "next tab" },
    { action: KeyAction.Quit, label: "quit" },
  ],
  settings: [
    { action: KeyAction.ReloadConfig, label: "reload config" },
    { action: KeyAction.ToggleTheme, label: "theme" },
    { action: KeyAction.TabNext, label: "next tab" },
    { action: KeyAction.Quit, label: "quit" },
  ],
  approvals: [
    { action: KeyAction.Approve, label: "approve" },
    { action: KeyAction.Deny, label: "deny" },
    { action: KeyAction.TabNext, label: "next tab" },
    { action: KeyAction.Quit, label: "quit" },
  ],
  logs: [
    { action: KeyAction.ScrollUp, label: "scroll" },
    { action: KeyAction.ReloadConfig, label: "reload" },
    { action: KeyAction.TabNext, label: "next tab" },
    { action: KeyAction.Quit, label: "quit" },
  ],
  help: [
    { action: KeyAction.ShowKeybindings, label: "keys" },
    { action: KeyAction.TabNext, label: "next tab" },
    { action: KeyAction.Quit, label: "quit" },
  ],
};

export type FooterBarProps = {
  slashActive?: boolean;
  paletteOpen?: boolean;
};

export function FooterBar({ slashActive = false, paletteOpen = false }: FooterBarProps) {
  const themeName = useAppSelector((s) => s.theme);
  const tab = useAppSelector((s) => s.tab);
  const loading = useAppSelector((s) => s.loading);
  const modal = useAppSelector((s) => s.modal);
  const theme = getTheme(themeName);

  let hints = TAB_HINTS[tab];

  if (paletteOpen || slashActive) {
    hints = [
      { action: KeyAction.PaletteUp, label: "prev" },
      { action: KeyAction.PaletteDown, label: "next" },
      { action: KeyAction.PaletteAccept, label: "run" },
      { action: KeyAction.ClosePalette, label: "close" },
    ];
  }

  if (modal.type === "commandPalette") {
    hints = [
      { action: KeyAction.PaletteUp, label: "prev" },
      { action: KeyAction.PaletteDown, label: "next" },
      { action: KeyAction.PaletteAccept, label: "select" },
      { action: KeyAction.ClosePalette, label: "close" },
    ];
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={theme.tokens.borderMuted}
      paddingX={1}
    >
      <Box flexDirection="row" justifyContent="space-between">
        <KeyHintRow
          theme={theme}
          hints={hints.map((h) => ({
            keys: formatKeyHint(h.action),
            label: h.label,
          }))}
        />
        <Box flexDirection="row">
          {loading ? (
            <Text color={theme.tokens.warning}>● busy</Text>
          ) : (
            <Text color={theme.tokens.success}>● ready</Text>
          )}
          <Text color={theme.tokens.textMuted}> · {tab}</Text>
        </Box>
      </Box>
    </Box>
  );
}

export function getFooterHintsForTab(tab: TabId) {
  return TAB_HINTS[tab];
}
