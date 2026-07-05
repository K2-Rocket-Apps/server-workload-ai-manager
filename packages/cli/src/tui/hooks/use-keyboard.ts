import { useCallback, useMemo } from "react";
import { useInput } from "ink";
import {
  KeyAction,
  matchKeyBinding,
  type InkKey,
} from "../core/keybindings.js";
import { listThemeNames, type ThemeName as CoreThemeName } from "../core/theme.js";
import type { AppDispatch } from "../state/actions.js";
import type { AppState, TabId } from "../types.js";

export type KeyboardHandlers = {
  onExit: () => void;
  onSubmit: () => void;
  onRefreshVms?: () => void;
  onApprove?: () => void;
  onDeny?: () => void;
  onSaveSession?: () => void;
  onClearChat?: () => void;
  onSlashTab?: () => void;
  onHistoryUp?: () => void;
  onHistoryDown?: () => void;
  onSlashUp?: () => void;
  onSlashDown?: () => void;
  onReloadConfig?: () => void;
  onRunReport?: () => void;
  onRunCheck?: () => void;
};

export type UseKeyboardOptions = {
  state: AppState;
  dispatch: AppDispatch;
  handlers: KeyboardHandlers;
  enabled?: boolean;
};

function resolveContext(state: AppState): import("../core/keybindings.js").KeyBinding["context"] {
  if (state.modal.type !== "none") return "global";
  if (state.tab === "approvals") return "approvals";
  if (state.tab === "vms") return "vms";
  if (state.tab === "chat") {
    if (state.input.startsWith("/")) return "palette";
    return "chat";
  }
  return "global";
}

function tabFromNumber(n: string): TabId | undefined {
  const map: Record<string, TabId> = {
    "1": "chat",
    "2": "dashboard",
    "3": "vms",
    "4": "alerts",
    "5": "settings",
    "6": "approvals",
    "7": "logs",
    "8": "help",
  };
  return map[n];
}

function handleAction(
  action: KeyAction,
  dispatch: AppDispatch,
  handlers: KeyboardHandlers,
  state: AppState,
): boolean {
  switch (action) {
    case KeyAction.Quit:
    case KeyAction.ForceQuit:
      handlers.onExit();
      return true;

    case KeyAction.TabNext:
      dispatch({ type: "NEXT_TAB" });
      return true;

    case KeyAction.TabPrev:
      dispatch({ type: "PREV_TAB" });
      return true;

    case KeyAction.TabChat:
      dispatch({ type: "SET_TAB", tab: "chat" });
      return true;

    case KeyAction.TabVms:
      dispatch({ type: "SET_TAB", tab: "vms" });
      return true;

    case KeyAction.TabAlerts:
      dispatch({ type: "SET_TAB", tab: "alerts" });
      return true;

    case KeyAction.TabSettings:
      dispatch({ type: "SET_TAB", tab: "settings" });
      return true;

    case KeyAction.TabApprovals:
      dispatch({ type: "SET_TAB", tab: "approvals" });
      return true;

    case KeyAction.Submit:
      // TextInput handles Enter in chat; only palette/modals use keyboard submit.
      if (state.modal.type === "none" && state.tab === "chat" && !state.input.startsWith("/")) {
        return false;
      }
      handlers.onSubmit();
      return true;

    case KeyAction.PaletteAccept:
      handlers.onSubmit();
      return true;

    case KeyAction.ClearInput:
      dispatch({ type: "CLEAR_INPUT" });
      return true;

    case KeyAction.HistoryPrev:
      handlers.onHistoryUp?.();
      return true;

    case KeyAction.HistoryNext:
      handlers.onHistoryDown?.();
      return true;

    case KeyAction.PaletteUp:
      handlers.onSlashUp?.();
      return true;

    case KeyAction.PaletteDown:
      handlers.onSlashDown?.();
      return true;

    case KeyAction.ClosePalette:
      dispatch({ type: "CLOSE_MODAL" });
      return true;

    case KeyAction.ScrollUp:
      dispatch({ type: "SCROLL_UP" });
      return true;

    case KeyAction.ScrollDown:
      dispatch({ type: "SCROLL_DOWN" });
      return true;

    case KeyAction.ScrollPageUp:
      dispatch({ type: "SCROLL_PAGE_UP", pageSize: 10 });
      return true;

    case KeyAction.ScrollPageDown:
      dispatch({ type: "SCROLL_PAGE_DOWN", pageSize: 10 });
      return true;

    case KeyAction.ScrollTop:
      dispatch({ type: "SCROLL_TO_TOP" });
      return true;

    case KeyAction.ScrollBottom:
      dispatch({ type: "SCROLL_TO_BOTTOM" });
      return true;

    case KeyAction.Approve:
      handlers.onApprove?.();
      return true;

    case KeyAction.Deny:
      handlers.onDeny?.();
      return true;

    case KeyAction.RefreshVms:
      handlers.onRefreshVms?.();
      return true;

    case KeyAction.ShowHelp:
      if (state.modal.type === "helpOverlay") {
        dispatch({ type: "CLOSE_MODAL" });
      } else {
        dispatch({ type: "OPEN_HELP_OVERLAY" });
      }
      return true;

    case KeyAction.ShowKeybindings:
      if (state.modal.type === "keybindingsOverlay") {
        dispatch({ type: "CLOSE_MODAL" });
      } else {
        dispatch({ type: "OPEN_KEYBINDINGS_OVERLAY" });
      }
      return true;

    case KeyAction.OpenSettings:
      dispatch({ type: "SET_TAB", tab: "settings" });
      return true;

    case KeyAction.ReloadConfig:
      handlers.onReloadConfig?.();
      return true;

    case KeyAction.RunReport:
      handlers.onRunReport?.();
      return true;

    case KeyAction.RunCheck:
      handlers.onRunCheck?.();
      return true;

    case KeyAction.ToggleTheme: {
      const themes = listThemeNames();
      const idx = themes.indexOf(state.theme as CoreThemeName);
      const next = themes[(idx + 1) % themes.length]!;
      dispatch({ type: "SET_THEME", theme: next });
      dispatch({ type: "ADD_TOAST", message: `Theme: ${next}`, toastType: "info" });
      return true;
    }

    case KeyAction.OpenCommandPalette:
      dispatch({ type: "OPEN_COMMAND_PALETTE", query: "" });
      return true;

    case KeyAction.OpenPalette:
      dispatch({ type: "SET_INPUT", input: "/" });
      return true;

    case KeyAction.FocusInput:
      dispatch({ type: "SET_TAB", tab: "chat" });
      return true;

    case KeyAction.NewLine:
    case KeyAction.FocusNext:
    case KeyAction.FocusPrev:
    case KeyAction.FocusSidebar:
    case KeyAction.FocusMain:
    case KeyAction.FocusRightPanel:
    case KeyAction.VmDetails:
    case KeyAction.VmStart:
    case KeyAction.VmStop:
    case KeyAction.VmRestart:
    case KeyAction.Search:
    case KeyAction.ClearFilter:
    case KeyAction.Copy:
    case KeyAction.Paste:
    case KeyAction.ToggleDebug:
      return false;

    default:
      return false;
  }
}

/**
 * Central keyboard handler wired to ink's useInput.
 * Resolves raw keys via core/keybindings and dispatches state updates or callbacks.
 */
export function useKeyboard({ state, dispatch, handlers, enabled = true }: UseKeyboardOptions): void {
  const ctx = useMemo(() => resolveContext(state), [state]);

  const onKey = useCallback(
    (input: string, key: InkKey) => {
      if (!enabled) return;

      const tabShortcut = tabFromNumber(input);
      if (tabShortcut && !key.ctrl && !key.meta) {
        dispatch({ type: "SET_TAB", tab: tabShortcut });
        return;
      }

      if (ctx === "palette" && key.tab) {
        handlers.onSlashTab?.();
        return;
      }

      const action = matchKeyBinding(input, key, ctx);
      if (action !== undefined) {
        handleAction(action, dispatch, handlers, state);
      }
    },
    [enabled, ctx, dispatch, handlers, state],
  );

  useInput(onKey, { isActive: enabled });
}

export { KeyAction, matchKeyBinding };
