import { useCallback, useEffect, useRef } from "react";
import { Box, useApp as useInkApp } from "ink";
import { AppStateProvider, useAppDispatch, useAppSelector, useAppState } from "./state/context.js";
import { AppShell } from "./components/layout/AppShell.js";
import { CommandPaletteOverlay } from "./components/command/CommandPalette.js";
import { useAgent } from "./hooks/use-agent.js";
import { useConfigLoader } from "./hooks/use-config-loader.js";
import { useVms } from "./hooks/use-vms.js";
import { useSlashInput } from "./hooks/use-slash-input.js";
import { useInputHistory } from "./hooks/use-input-history.js";
import { useKeyboard } from "./hooks/use-keyboard.js";
import { useTerminalDispatch } from "./hooks/use-terminal-dispatch.js";
import { useCommandPaletteKeyboard } from "./hooks/use-command-palette.js";
import { welcomeMessageBody } from "./features/welcome.js";
import { addSystemMessage } from "./state/actions.js";
import {
  filterCommands,
  parseSlashInput,
  resolveCommand,
} from "./commands/registry.js";
import {
  ChatScreen,
  DashboardScreen,
  VmsScreen,
  AlertsScreen,
  SettingsScreen,
  ApprovalsScreen,
  LogsScreen,
  HelpScreen,
} from "./views/index.js";

type InnerProps = {
  onExit: () => void;
};

function MistralAppInner({ onExit }: InnerProps) {
  const { exit } = useInkApp();
  const state = useAppState();
  const dispatch = useAppDispatch();
  const tab = useAppSelector((s) => s.tab);
  const input = useAppSelector((s) => s.input);
  const modal = useAppSelector((s) => s.modal);
  const welcomeShown = useAppSelector((s) => s.welcomeShown);
  const configStatus = useAppSelector((s) => s.configStatus);

  useTerminalDispatch();
  const { reload } = useConfigLoader();
  const { refreshVms } = useVms();
  const slash = useSlashInput();
  const inputHistory = useInputHistory();

  const doExit = useCallback(() => {
    onExit();
    exit();
  }, [onExit, exit]);

  const { sendChat, runSlash, approvePending, denyPending } = useAgent({ onExit: doExit });
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!welcomeShown && configStatus) {
      dispatch(addSystemMessage(welcomeMessageBody(configStatus)));
      dispatch({ type: "SET_WELCOME_SHOWN", shown: true });
    }
  }, [welcomeShown, configStatus, dispatch]);

  useEffect(() => {
    if (tab === "dashboard" || tab === "vms") {
      void refreshVms();
    }
  }, [tab, refreshVms]);

  const handleSubmit = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || state.loading || submittingRef.current) return;

      submittingRef.current = true;
      dispatch({ type: "CLEAR_INPUT" });
      dispatch({ type: "RESET_SLASH_SELECTED_INDEX" });
      inputHistory.pushLine(text);

      try {
        if (text.startsWith("/")) {
          const { commandPart } = parseSlashInput(text);
          if (!resolveCommand(commandPart)) {
            const matches = filterCommands(text);
            if (matches.length === 1) {
              const base = matches[0]!.name.split(" ")[0]!;
              const resolved = text.includes(" ") ? text : `/${base}`;
              await runSlash(resolved);
              return;
            }
            if (matches.length > 1) {
              dispatch(
                addSystemMessage(
                  `Unknown: /${commandPart}\nDid you mean: ${matches
                    .slice(0, 5)
                    .map((m) => m.usage)
                    .join("  ·  ")}\nTab to complete, or keep typing.`,
                ),
              );
              return;
            }
          }
          await runSlash(text);
          return;
        }
        await sendChat(text);
      } finally {
        submittingRef.current = false;
      }
    },
    [dispatch, inputHistory, runSlash, sendChat, state.loading],
  );

  const handleKeyboardSubmit = useCallback(() => {
    if (modal.type === "commandPalette") return;
    void handleSubmit(input);
  }, [handleSubmit, input, modal.type]);

  useCommandPaletteKeyboard((line) => {
    void handleSubmit(line);
  });

  useKeyboard({
    state,
    dispatch,
    handlers: {
      onExit: doExit,
      onSubmit: handleKeyboardSubmit,
      onRefreshVms: () => void refreshVms(),
      onApprove: () => void approvePending(),
      onDeny: denyPending,
      onReloadConfig: () => void reload(),
      onSlashTab: slash.handleTab,
      onSlashUp: slash.handleUp,
      onSlashDown: slash.handleDown,
      onHistoryUp: () => {
        const line = inputHistory.historyUp();
        if (line !== null) dispatch({ type: "SET_INPUT", input: line });
      },
      onHistoryDown: () => {
        const line = inputHistory.historyDown();
        if (line !== null) dispatch({ type: "SET_INPUT", input: line });
      },
      onRunReport: () => void runSlash("/report"),
      onRunCheck: () => void runSlash("/check"),
      onClearChat: () => dispatch({ type: "CLEAR_CHAT" }),
    },
    enabled: modal.type === "none" || modal.type === "helpOverlay" || modal.type === "keybindingsOverlay",
  });

  const paletteOpen = modal.type === "commandPalette";
  const slashActive = tab === "chat" && input.startsWith("/");

  if (paletteOpen) {
    return (
      <Box flexDirection="column">
        <CommandPaletteOverlay />
      </Box>
    );
  }

  return (
    <AppShell
      slashActive={slashActive && slash.showPalette}
      paletteOpen={slash.showPalette}
      toolLogRows={state.toolLog.length > 0 ? 4 : 0}
    >
      {tab === "chat" && <ChatScreen onSubmit={(v) => void handleSubmit(v)} />}
      {tab === "dashboard" && <DashboardScreen />}
      {tab === "vms" && <VmsScreen />}
      {tab === "alerts" && <AlertsScreen />}
      {tab === "settings" && <SettingsScreen />}
      {tab === "approvals" && <ApprovalsScreen />}
      {tab === "logs" && <LogsScreen />}
      {tab === "help" && <HelpScreen />}
    </AppShell>
  );
}

export type MistralAppProps = {
  onExit: () => void;
};

export function MistralApp({ onExit }: MistralAppProps) {
  return (
    <AppStateProvider>
      <MistralAppInner onExit={onExit} />
    </AppStateProvider>
  );
}
