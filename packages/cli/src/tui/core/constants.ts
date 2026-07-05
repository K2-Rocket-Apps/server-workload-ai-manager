import type { TabId } from "../types.js";

/** Application branding */
export const APP_NAME = "Mistral PVE";
export const APP_SHORT_NAME = "mistral";
export const VERSION = "0.1.0";
export const APP_TAGLINE = "AI ops agent for Proxmox VE";

/** Config and runtime paths */
export const CONFIG_DIR = process.env.MISTRAL_CONFIG_DIR ?? `${process.env.HOME ?? "/root"}/.config/mistral`;
export const CONFIG_FILE = `${CONFIG_DIR}/config.yaml`;
export const SECRETS_FILE = "/etc/mistral/secrets.env";
export const STATE_DIR = `${CONFIG_DIR}/state`;
export const LOG_DIR = "/var/log/mistral";

/** Default daemon watch list (k3s control plane + worker) */
export const DEFAULT_WATCHED_VMIDS: readonly number[] = [121, 122] as const;

export const DEFAULT_WATCHED_VMS: readonly { vmid: number; name: string; ip: string }[] = [
  { vmid: 121, name: "k3s-cp", ip: "192.168.0.125" },
  { vmid: 122, name: "k3s-w1", ip: "192.168.0.126" },
] as const;

/** Layout defaults */
export const MIN_TERMINAL_COLS = 60;
export const MIN_TERMINAL_ROWS = 16;
export const DEFAULT_WEB_PORT = 8787;

/** Tab metadata for header / navigation */
export type TabDefinition = {
  id: TabId;
  label: string;
  icon: string;
  shortcut: string;
  description: string;
};

export const TAB_DEFINITIONS: readonly TabDefinition[] = [
  {
    id: "chat",
    label: "Chat",
    icon: "💬",
    shortcut: "1",
    description: "Agent conversation and slash commands",
  },
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "📊",
    shortcut: "2",
    description: "Cluster overview and node stats",
  },
  {
    id: "vms",
    label: "VMs",
    icon: "🖥",
    shortcut: "3",
    description: "Proxmox VM health and status",
  },
  {
    id: "alerts",
    label: "Alerts",
    icon: "🔔",
    shortcut: "4",
    description: "Email and Slack alert configuration",
  },
  {
    id: "settings",
    label: "Settings",
    icon: "⚙",
    shortcut: "5",
    description: "LLM, PVE, and web UI settings",
  },
  {
    id: "approvals",
    label: "Approvals",
    icon: "✓",
    shortcut: "6",
    description: "Pending destructive tool approvals",
  },
  {
    id: "logs",
    label: "Logs",
    icon: "📜",
    shortcut: "7",
    description: "Tool execution and daemon logs",
  },
  {
    id: "help",
    label: "Help",
    icon: "?",
    shortcut: "8",
    description: "Slash commands and keybindings reference",
  },
] as const;

export const TAB_ORDER: readonly TabId[] = TAB_DEFINITIONS.map((t) => t.id);

export function tabById(id: TabId): TabDefinition {
  const found = TAB_DEFINITIONS.find((t) => t.id === id);
  if (!found) {
    throw new Error(`Unknown tab: ${id}`);
  }
  return found;
}

export function tabByShortcut(key: string): TabId | undefined {
  const normalized = key.trim();
  return TAB_DEFINITIONS.find((t) => t.shortcut === normalized)?.id;
}

export function tabLabel(id: TabId, active = false): string {
  const def = tabById(id);
  if (active) {
    return `[${def.icon} ${def.label}]`;
  }
  return ` ${def.icon} ${def.label} `;
}

/** UI chrome dimensions (rows/cols consumed by fixed chrome) */
export const CHROME = {
  headerRows: 3,
  statusBarRows: 1,
  inputRows: 1,
  tabBarRows: 1,
  paletteMaxRows: 8,
  sidebarMinWidth: 22,
  sidebarMaxWidth: 36,
  rightPanelMinWidth: 24,
  rightPanelMaxWidth: 40,
  gutter: 1,
} as const;

/** Message / chat limits */
export const CHAT = {
  maxMessages: 500,
  maxToolLogLines: 200,
  inputHistorySize: 100,
  typingIndicatorMs: 400,
} as const;

/** Slash command palette */
export const PALETTE = {
  maxVisible: 8,
  minQueryLength: 0,
  debounceMs: 0,
} as const;

/** Spinner frames for loading states */
export const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"] as const;

/** Severity labels for health reports */
export const SEVERITY = {
  ok: { label: "OK", color: "green" as const },
  warn: { label: "WARN", color: "yellow" as const },
  crit: { label: "CRIT", color: "red" as const },
  unknown: { label: "???", color: "gray" as const },
} as const;

export function formatAppBanner(): string {
  return `${APP_NAME} v${VERSION} — ${APP_TAGLINE}`;
}
