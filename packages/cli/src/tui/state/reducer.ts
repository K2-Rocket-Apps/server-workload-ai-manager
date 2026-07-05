import type { AppAction } from "./actions.js";
import {
  TAB_ORDER,
  createMessageId,
  createToastId,
  createToolLogId,
  type AppState,
  type ToolLogEntry,
} from "../types.js";

const TOAST_DEFAULT_TTL = 5000;

export function createInitialState(overrides: Partial<AppState> = {}): AppState {
  const sessionId = `session-${Date.now()}`;
  return {
    tab: "chat",
    input: "",
    messages: [],
    chatHistory: [],
    toolLog: [],
    loading: false,
    pending: null,
    configStatus: null,
    configLoading: false,
    configError: null,
    vms: [],
    vmReportRaw: "Press r or /vms to load VM report",
    vmsLoading: false,
    vmsError: null,
    nodeStats: null,
    scrollOffset: 0,
    inputHistory: [],
    inputHistoryIndex: -1,
    slashSelectedIndex: 0,
    theme: "mistral",
    modal: { type: "none" },
    toasts: [],
    terminalWidth: process.stdout.columns ?? 80,
    terminalHeight: process.stdout.rows ?? 24,
    sessionId,
    welcomeShown: false,
    ...overrides,
  };
}

function clampScroll(state: AppState, offset: number): number {
  const max = Math.max(0, state.messages.length - 1);
  return Math.max(0, Math.min(offset, max));
}

function nextTab(current: AppState["tab"], dir: 1 | -1): AppState["tab"] {
  const idx = TAB_ORDER.indexOf(current);
  const next = (idx + dir + TAB_ORDER.length) % TAB_ORDER.length;
  return TAB_ORDER[next]!;
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_TAB":
      return { ...state, tab: action.tab };

    case "NEXT_TAB":
      return { ...state, tab: nextTab(state.tab, 1) };

    case "PREV_TAB":
      return { ...state, tab: nextTab(state.tab, -1) };

    case "SET_INPUT":
      return {
        ...state,
        input: action.input,
        slashSelectedIndex: 0,
        inputHistoryIndex: -1,
      };

    case "CLEAR_INPUT":
      return { ...state, input: "", inputHistoryIndex: -1 };

    case "ADD_MESSAGE":
      return {
        ...state,
        messages: [...state.messages, action.message],
        scrollOffset: state.messages.length,
      };

    case "ADD_MESSAGES":
      return {
        ...state,
        messages: [...state.messages, ...action.messages],
        scrollOffset: state.messages.length + action.messages.length - 1,
      };

    case "UPDATE_MESSAGE":
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.id ? { ...m, ...action.patch } : m,
        ),
      };

    case "SET_MESSAGES":
      return {
        ...state,
        messages: action.messages,
        scrollOffset: Math.max(0, action.messages.length - 1),
      };

    case "CLEAR_CHAT":
      return {
        ...state,
        messages: [],
        chatHistory: [],
        toolLog: [],
        scrollOffset: 0,
        pending: null,
      };

    case "SET_CHAT_HISTORY":
      return { ...state, chatHistory: action.history };

    case "ADD_TOOL_LOG":
      return { ...state, toolLog: [...state.toolLog, action.entry] };

    case "UPDATE_TOOL_LOG":
      return {
        ...state,
        toolLog: state.toolLog.map((e) =>
          e.id === action.id ? { ...e, ...action.patch } : e,
        ),
      };

    case "CLEAR_TOOL_LOG":
      return { ...state, toolLog: [] };

    case "SET_LOADING":
      return { ...state, loading: action.loading };

    case "SET_PENDING":
      return { ...state, pending: action.pending };

    case "CONFIG_LOAD_START":
      return { ...state, configLoading: true, configError: null };

    case "CONFIG_LOAD_SUCCESS":
      return {
        ...state,
        configLoading: false,
        configStatus: action.status,
        configError: null,
      };

    case "CONFIG_LOAD_ERROR":
      return {
        ...state,
        configLoading: false,
        configError: action.error,
      };

    case "VMS_LOAD_START":
      return { ...state, vmsLoading: true };

    case "VMS_LOAD_SUCCESS":
      return {
        ...state,
        vmsLoading: false,
        vms: action.vms,
        vmReportRaw: action.raw,
        nodeStats: action.nodeStats,
        vmsError: null,
      };

    case "VMS_LOAD_ERROR":
      return {
        ...state,
        vmsLoading: false,
        vmsError: action.error,
        vmReportRaw: `Error: ${action.error}`,
      };

    case "SET_SCROLL_OFFSET":
      return { ...state, scrollOffset: clampScroll(state, action.offset) };

    case "SCROLL_UP":
      return {
        ...state,
        scrollOffset: clampScroll(state, state.scrollOffset - (action.amount ?? 1)),
      };

    case "SCROLL_DOWN":
      return {
        ...state,
        scrollOffset: clampScroll(state, state.scrollOffset + (action.amount ?? 1)),
      };

    case "SCROLL_PAGE_UP":
      return {
        ...state,
        scrollOffset: clampScroll(state, state.scrollOffset - action.pageSize),
      };

    case "SCROLL_PAGE_DOWN":
      return {
        ...state,
        scrollOffset: clampScroll(state, state.scrollOffset + action.pageSize),
      };

    case "SCROLL_TO_TOP":
      return { ...state, scrollOffset: 0 };

    case "SCROLL_TO_BOTTOM":
      return {
        ...state,
        scrollOffset: clampScroll(state, state.messages.length - 1),
      };

    case "PUSH_INPUT_HISTORY": {
      const line = action.line.trim();
      if (!line) return state;
      const deduped = state.inputHistory.filter((h) => h !== line);
      return {
        ...state,
        inputHistory: [...deduped, line].slice(-200),
        inputHistoryIndex: -1,
      };
    }

    case "SET_INPUT_HISTORY_INDEX":
      return { ...state, inputHistoryIndex: action.index };

    case "RESET_INPUT_HISTORY_NAV":
      return { ...state, inputHistoryIndex: -1 };

    case "SET_SLASH_SELECTED_INDEX":
      return { ...state, slashSelectedIndex: action.index };

    case "RESET_SLASH_SELECTED_INDEX":
      return { ...state, slashSelectedIndex: 0 };

    case "SET_THEME":
      return { ...state, theme: action.theme };

    case "SET_MODAL":
      return { ...state, modal: action.modal };

    case "CLOSE_MODAL":
      return { ...state, modal: { type: "none" } };

    case "OPEN_CONFIRM":
      return {
        ...state,
        modal: {
          type: "confirm",
          title: action.title,
          message: action.message,
          confirmActionId: action.confirmActionId,
        },
      };

    case "OPEN_MODEL_PICKER":
      return { ...state, modal: { type: "modelPicker", selectedIndex: 0 } };

    case "OPEN_COMMAND_PALETTE":
      return {
        ...state,
        modal: {
          type: "commandPalette",
          selectedIndex: 0,
          query: action.query ?? "",
        },
      };

    case "OPEN_HELP_OVERLAY":
      return { ...state, modal: { type: "helpOverlay" } };

    case "OPEN_KEYBINDINGS_OVERLAY":
      return { ...state, modal: { type: "keybindingsOverlay" } };

    case "ADD_TOAST": {
      const now = Date.now();
      const ttl = action.ttlMs ?? TOAST_DEFAULT_TTL;
      const toast = {
        id: createToastId(),
        message: action.message,
        type: action.toastType ?? "info",
        expiresAt: now + ttl,
      };
      return { ...state, toasts: [...state.toasts, toast] };
    }

    case "REMOVE_TOAST":
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.id),
      };

    case "PURGE_EXPIRED_TOASTS": {
      const now = action.now ?? Date.now();
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.expiresAt > now),
      };
    }

    case "SET_TERMINAL_SIZE":
      return {
        ...state,
        terminalWidth: action.width,
        terminalHeight: action.height,
      };

    case "SET_SESSION_ID":
      return { ...state, sessionId: action.sessionId };

    case "SET_WELCOME_SHOWN":
      return { ...state, welcomeShown: action.shown };

    case "RESTORE_SESSION":
      return {
        ...state,
        messages: action.messages,
        chatHistory: action.history,
        tab: action.tab ?? state.tab,
        scrollOffset: Math.max(0, action.messages.length - 1),
        welcomeShown: true,
      };

    case "HYDRATE":
      return { ...state, ...action.partial };

    default:
      return state;
  }
}

/** Helper for streaming assistant replies. */
export function startStreamingMessage(): { id: string; message: import("../types.js").UiMessage } {
  const id = createMessageId();
  return {
    id,
    message: {
      id,
      role: "assistant",
      content: "",
      ts: Date.now(),
      streaming: true,
    },
  };
}

/** Helper when a tool starts executing. */
export function startToolLog(name: string): ToolLogEntry {
  return {
    id: createToolLogId(),
    name,
    status: "running",
    duration: 0,
    outputPreview: "",
  };
}
