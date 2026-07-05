import type { ChatMessage } from "@mistral/core";
import type { ThemeName } from "../core/theme.js";
import type {
  ConfigStatus,
  ModalState,
  NodeStats,
  PendingApproval,
  TabId,
  ToastType,
  ToolLogEntry,
  UiMessage,
  VmRow,
} from "../types.js";

export type AppAction =
  | { type: "SET_TAB"; tab: TabId }
  | { type: "NEXT_TAB" }
  | { type: "PREV_TAB" }
  | { type: "SET_INPUT"; input: string }
  | { type: "CLEAR_INPUT" }
  | { type: "ADD_MESSAGE"; message: UiMessage }
  | { type: "ADD_MESSAGES"; messages: UiMessage[] }
  | { type: "UPDATE_MESSAGE"; id: string; patch: Partial<UiMessage> }
  | { type: "SET_MESSAGES"; messages: UiMessage[] }
  | { type: "CLEAR_CHAT" }
  | { type: "SET_CHAT_HISTORY"; history: ChatMessage[] }
  | { type: "ADD_TOOL_LOG"; entry: ToolLogEntry }
  | { type: "UPDATE_TOOL_LOG"; id: string; patch: Partial<ToolLogEntry> }
  | { type: "CLEAR_TOOL_LOG" }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_PENDING"; pending: PendingApproval | null }
  | { type: "CONFIG_LOAD_START" }
  | { type: "CONFIG_LOAD_SUCCESS"; status: ConfigStatus }
  | { type: "CONFIG_LOAD_ERROR"; error: string }
  | { type: "VMS_LOAD_START" }
  | { type: "VMS_LOAD_SUCCESS"; vms: VmRow[]; raw: string; nodeStats: NodeStats | null }
  | { type: "VMS_LOAD_ERROR"; error: string }
  | { type: "SET_SCROLL_OFFSET"; offset: number }
  | { type: "SCROLL_UP"; amount?: number }
  | { type: "SCROLL_DOWN"; amount?: number }
  | { type: "SCROLL_PAGE_UP"; pageSize: number }
  | { type: "SCROLL_PAGE_DOWN"; pageSize: number }
  | { type: "SCROLL_TO_TOP" }
  | { type: "SCROLL_TO_BOTTOM" }
  | { type: "PUSH_INPUT_HISTORY"; line: string }
  | { type: "SET_INPUT_HISTORY_INDEX"; index: number }
  | { type: "RESET_INPUT_HISTORY_NAV" }
  | { type: "SET_SLASH_SELECTED_INDEX"; index: number }
  | { type: "RESET_SLASH_SELECTED_INDEX" }
  | { type: "SET_THEME"; theme: ThemeName }
  | { type: "SET_MODAL"; modal: ModalState }
  | { type: "CLOSE_MODAL" }
  | { type: "OPEN_CONFIRM"; title: string; message: string; confirmActionId: string }
  | { type: "OPEN_MODEL_PICKER" }
  | { type: "OPEN_COMMAND_PALETTE"; query?: string }
  | { type: "OPEN_HELP_OVERLAY" }
  | { type: "OPEN_KEYBINDINGS_OVERLAY" }
  | { type: "ADD_TOAST"; message: string; toastType?: ToastType; ttlMs?: number }
  | { type: "REMOVE_TOAST"; id: string }
  | { type: "PURGE_EXPIRED_TOASTS"; now?: number }
  | { type: "SET_TERMINAL_SIZE"; width: number; height: number }
  | { type: "SET_SESSION_ID"; sessionId: string }
  | { type: "SET_WELCOME_SHOWN"; shown: boolean }
  | { type: "RESTORE_SESSION"; messages: UiMessage[]; history: ChatMessage[]; tab?: TabId }
  | { type: "HYDRATE"; partial: Partial<import("../types.js").AppState> };

export type AppDispatch = (action: AppAction) => void;

export function setTab(tab: TabId): AppAction {
  return { type: "SET_TAB", tab };
}

export function addSystemMessage(content: string, ts = Date.now()): AppAction {
  return {
    type: "ADD_MESSAGE",
    message: {
      id: `sys-${ts}-${Math.random().toString(36).slice(2, 6)}`,
      role: "system",
      content,
      ts,
    },
  };
}

export function addUserMessage(content: string, ts = Date.now()): AppAction {
  return {
    type: "ADD_MESSAGE",
    message: {
      id: `usr-${ts}-${Math.random().toString(36).slice(2, 6)}`,
      role: "user",
      content,
      ts,
    },
  };
}

export function addAssistantMessage(content: string, ts = Date.now()): AppAction {
  return {
    type: "ADD_MESSAGE",
    message: {
      id: `asst-${ts}-${Math.random().toString(36).slice(2, 6)}`,
      role: "assistant",
      content,
      ts,
    },
  };
}
