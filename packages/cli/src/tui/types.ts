import type { ChatMessage } from "@mistral/core";
import type { ThemeName } from "./core/theme.js";

export type { ThemeName };

export type TabId =
  | "chat"
  | "dashboard"
  | "vms"
  | "alerts"
  | "settings"
  | "approvals"
  | "logs"
  | "help";

export const TAB_ORDER: TabId[] = [
  "chat",
  "dashboard",
  "vms",
  "alerts",
  "settings",
  "approvals",
  "logs",
  "help",
];

export type UiMessageRole = "user" | "assistant" | "system";

export type UiMessage = {
  id: string;
  role: UiMessageRole;
  content: string;
  ts: number;
  streaming?: boolean;
  toolCalls?: string[];
};

export type ToolLogStatus = "running" | "done" | "error";

export type ToolLogEntry = {
  id: string;
  name: string;
  status: ToolLogStatus;
  duration: number;
  outputPreview: string;
};

export type ToastType = "info" | "success" | "warn" | "error";

export type Toast = {
  id: string;
  message: string;
  type: ToastType;
  expiresAt: number;
};

export type ModalState =
  | { type: "none" }
  | {
      type: "confirm";
      title: string;
      message: string;
      confirmLabel?: string;
      cancelLabel?: string;
      confirmActionId: string;
    }
  | { type: "modelPicker"; selectedIndex: number }
  | { type: "commandPalette"; selectedIndex: number; query: string }
  | { type: "helpOverlay" }
  | { type: "keybindingsOverlay" };

export type PendingApproval = {
  name: string;
  args: Record<string, unknown>;
};

export type ConfigStatus = {
  model: string;
  provider: string;
  apiKeySet: boolean;
  pveHost: string;
  pveNode: string;
  webUrl: string;
  watchedVmids: number[];
  emailEnabled: boolean;
  slackEnabled: boolean;
  temperature: number;
  daemonIntervalMinutes: number;
  daemonEnabled: boolean;
  checkCron: string;
};

export type VmRow = {
  vmid: number;
  name: string;
  status: string;
  node: string;
  guestAgent: boolean;
  cpuPercent?: number;
  memPercent?: number;
  diskPercent?: number;
  issues: string[];
  ips?: string[];
};

export type NodeStats = {
  node: string;
  status: string;
  cpuPercent: number;
  memPercent: number;
  uptime: number;
  loadavg: number[];
};

export type AppState = {
  tab: TabId;
  input: string;
  messages: UiMessage[];
  chatHistory: ChatMessage[];
  toolLog: ToolLogEntry[];
  loading: boolean;
  pending: PendingApproval | null;
  configStatus: ConfigStatus | null;
  configLoading: boolean;
  configError: string | null;
  vms: VmRow[];
  vmReportRaw: string;
  vmsLoading: boolean;
  vmsError: string | null;
  nodeStats: NodeStats | null;
  scrollOffset: number;
  inputHistory: string[];
  inputHistoryIndex: number;
  slashSelectedIndex: number;
  theme: ThemeName;
  modal: ModalState;
  toasts: Toast[];
  terminalWidth: number;
  terminalHeight: number;
  sessionId: string;
  welcomeShown: boolean;
};

/** @deprecated Use AppState slices directly */
export type AgentState = {
  history: ChatMessage[];
  messages: UiMessage[];
  toolLog: ToolLogEntry[];
  loading: boolean;
  pending: PendingApproval | null;
};

export function createMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createToolLogId(): string {
  return `tool-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createToastId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
