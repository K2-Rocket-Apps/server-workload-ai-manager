/**
 * Keybinding registry for the Mistral TUI.
 *
 * Bindings use Ink's `useInput` key object shape:
 * - `input` — raw character(s) typed
 * - `key.*` — boolean flags (return, escape, tab, upArrow, …)
 *
 * Modifiers are expressed via dedicated actions (e.g. TabNext vs TabNextAlt).
 */

export enum KeyAction {
  /** Exit the application */
  Quit = "quit",
  /** Force quit without confirmation */
  ForceQuit = "forceQuit",

  /** Tab navigation */
  TabChat = "tabChat",
  TabVms = "tabVms",
  TabAlerts = "tabAlerts",
  TabSettings = "tabSettings",
  TabApprovals = "tabApprovals",
  TabNext = "tabNext",
  TabPrev = "tabPrev",

  /** Focus movement */
  FocusNext = "focusNext",
  FocusPrev = "focusPrev",
  FocusInput = "focusInput",
  FocusSidebar = "focusSidebar",
  FocusMain = "focusMain",
  FocusRightPanel = "focusRightPanel",

  /** Chat input */
  Submit = "submit",
  NewLine = "newLine",
  ClearInput = "clearInput",
  HistoryPrev = "historyPrev",
  HistoryNext = "historyNext",

  /** Message list */
  ScrollUp = "scrollUp",
  ScrollDown = "scrollDown",
  ScrollPageUp = "scrollPageUp",
  ScrollPageDown = "scrollPageDown",
  ScrollTop = "scrollTop",
  ScrollBottom = "scrollBottom",

  /** Slash palette */
  OpenPalette = "openPalette",
  OpenCommandPalette = "openCommandPalette",
  ClosePalette = "closePalette",
  PaletteUp = "paletteUp",
  PaletteDown = "paletteDown",
  PaletteAccept = "paletteAccept",

  /** Approvals */
  Approve = "approve",
  Deny = "deny",

  /** VM panel */
  RefreshVms = "refreshVms",
  VmDetails = "vmDetails",
  VmStart = "vmStart",
  VmStop = "vmStop",
  VmRestart = "vmRestart",

  /** Reports & checks */
  RunReport = "runReport",
  RunCheck = "runCheck",

  /** Settings */
  OpenSettings = "openSettings",
  ToggleTheme = "toggleTheme",
  ReloadConfig = "reloadConfig",

  /** Help */
  ShowHelp = "showHelp",
  ShowKeybindings = "showKeybindings",

  /** Search / filter */
  Search = "search",
  ClearFilter = "clearFilter",

  /** Copy / paste hints (terminal dependent) */
  Copy = "copy",
  Paste = "paste",

  /** Debug */
  ToggleDebug = "toggleDebug",
}

export type InkKey = {
  input?: string;
  return?: boolean;
  escape?: boolean;
  tab?: boolean;
  backspace?: boolean;
  delete?: boolean;
  upArrow?: boolean;
  downArrow?: boolean;
  leftArrow?: boolean;
  rightArrow?: boolean;
  pageUp?: boolean;
  pageDown?: boolean;
  home?: boolean;
  end?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  meta?: boolean;
};

export type KeyBinding = {
  action: KeyAction;
  /** Human-readable combo for status bar hints */
  label: string;
  /** Match predicate */
  match: (input: string, key: InkKey) => boolean;
  /** Optional context where binding applies */
  context?: "global" | "chat" | "palette" | "approvals" | "vms";
  description: string;
};

function keyMatch(
  input: string,
  key: InkKey,
  spec: {
    char?: string;
    ctrlChar?: string;
    key?: keyof InkKey;
    shiftKey?: keyof InkKey;
  },
): boolean {
  if (spec.char !== undefined && input === spec.char && !key.ctrl && !key.meta) {
    return true;
  }
  if (spec.ctrlChar !== undefined && key.ctrl && input === spec.ctrlChar) {
    return true;
  }
  if (spec.key !== undefined && key[spec.key] === true) {
    if (spec.shiftKey !== undefined) {
      return key[spec.shiftKey] === true;
    }
    return true;
  }
  return false;
}

function bind(
  action: KeyAction,
  label: string,
  description: string,
  match: (input: string, key: InkKey) => boolean,
  context?: KeyBinding["context"],
): KeyBinding {
  return { action, label, description, match, context };
}

/**
 * Default keybindings.
 * Documented in /help and the status bar.
 */
export const DEFAULT_BINDINGS: KeyBinding[] = [
  bind(KeyAction.Quit, "Esc", "Exit the TUI", (_i, k) => k.escape === true, "global"),
  bind(KeyAction.ForceQuit, "Ctrl+C", "Force quit", (i, k) => k.ctrl === true && i === "c", "global"),

  bind(KeyAction.TabChat, "1", "Switch to Chat tab", (i) => i === "1", "global"),
  bind(KeyAction.TabVms, "2", "Switch to VMs tab", (i) => i === "2", "global"),
  bind(KeyAction.TabAlerts, "3", "Switch to Alerts tab", (i) => i === "3", "global"),
  bind(KeyAction.TabSettings, "4", "Switch to Settings tab", (i) => i === "4", "global"),
  bind(KeyAction.TabApprovals, "5", "Switch to Approvals tab", (i) => i === "5", "global"),
  bind(KeyAction.TabNext, "Tab", "Next tab", (_i, k) => k.tab === true && !k.shift, "global"),
  bind(KeyAction.TabPrev, "Shift+Tab", "Previous tab", (_i, k) => k.tab === true && k.shift === true, "global"),

  bind(KeyAction.FocusInput, "i", "Focus chat input", (i) => i === "i", "chat"),
  bind(KeyAction.FocusSidebar, "s", "Focus sidebar", (i) => i === "s", "global"),
  bind(KeyAction.FocusMain, "m", "Focus main panel", (i) => i === "m", "global"),
  bind(KeyAction.FocusRightPanel, "p", "Focus right panel", (i) => i === "p", "global"),

  bind(KeyAction.Submit, "Enter", "Send message / confirm", (_i, k) => k.return === true, "chat"),
  bind(KeyAction.NewLine, "Shift+Enter", "Insert newline", (_i, k) => k.return === true && k.shift === true, "chat"),
  bind(KeyAction.ClearInput, "Ctrl+U", "Clear input line", (i, k) => k.ctrl === true && i === "u", "chat"),
  bind(KeyAction.HistoryPrev, "Up", "Previous input history", (_i, k) => k.upArrow === true, "chat"),
  bind(KeyAction.HistoryNext, "Down", "Next input history", (_i, k) => k.downArrow === true, "chat"),

  bind(KeyAction.ScrollUp, "Up", "Scroll messages up", (_i, k) => k.upArrow === true, "chat"),
  bind(KeyAction.ScrollDown, "Down", "Scroll messages down", (_i, k) => k.downArrow === true, "chat"),
  bind(KeyAction.ScrollPageUp, "PgUp", "Page up", (_i, k) => k.pageUp === true, "chat"),
  bind(KeyAction.ScrollPageDown, "PgDn", "Page down", (_i, k) => k.pageDown === true, "chat"),
  bind(KeyAction.ScrollTop, "Home", "Scroll to top", (_i, k) => k.home === true, "chat"),
  bind(KeyAction.ScrollBottom, "End", "Scroll to bottom", (_i, k) => k.end === true, "chat"),

  bind(KeyAction.OpenPalette, "/", "Open slash command palette", (i) => i === "/", "chat"),
  bind(
    KeyAction.OpenCommandPalette,
    "Ctrl+K",
    "Open fuzzy command palette",
    (i, k) => k.ctrl === true && (i === "k" || i === "K"),
    "global",
  ),
  bind(KeyAction.ClosePalette, "Esc", "Close palette", (_i, k) => k.escape === true, "palette"),
  bind(KeyAction.PaletteUp, "Up", "Palette previous item", (_i, k) => k.upArrow === true, "palette"),
  bind(KeyAction.PaletteDown, "Down", "Palette next item", (_i, k) => k.downArrow === true, "palette"),
  bind(KeyAction.PaletteAccept, "Enter", "Run selected command", (_i, k) => k.return === true, "palette"),

  bind(KeyAction.Approve, "y", "Approve pending tool", (i) => i === "y", "approvals"),
  bind(KeyAction.Deny, "n", "Deny pending tool", (i) => i === "n", "approvals"),

  bind(KeyAction.RefreshVms, "r", "Refresh VM report", (i) => i === "r", "vms"),
  bind(KeyAction.VmDetails, "d", "VM details", (i) => i === "d", "vms"),
  bind(KeyAction.VmStart, "a", "Start VM (approved)", (i) => i === "a", "vms"),
  bind(KeyAction.VmStop, "x", "Stop VM (approved)", (i) => i === "x", "vms"),
  bind(KeyAction.VmRestart, "z", "Restart VM (approved)", (i) => i === "z", "vms"),

  bind(KeyAction.RunReport, "Ctrl+Shift+R", "Run health report", (i, k) => k.ctrl === true && k.shift === true && (i === "r" || i === "R"), "global"),
  bind(KeyAction.RunCheck, "Ctrl+Shift+H", "Run health check now", (i, k) => k.ctrl === true && k.shift === true && (i === "h" || i === "H"), "global"),

  bind(KeyAction.OpenSettings, "Ctrl+,", "Open settings tab", (i, k) => k.ctrl === true && i === ",", "global"),
  bind(KeyAction.ToggleTheme, "Ctrl+T", "Cycle theme", (i, k) => k.ctrl === true && (i === "t" || i === "T"), "global"),
  bind(KeyAction.ReloadConfig, "Ctrl+R", "Reload config from disk", (i, k) => k.ctrl === true && (i === "r" || i === "R"), "global"),

  bind(KeyAction.ShowHelp, "?", "Show slash command help", (i) => i === "?", "global"),
  bind(KeyAction.ShowKeybindings, "F1", "Show keybindings", (i) => i === "\u001bOP" || i === "", "global"),

  bind(KeyAction.Search, "Ctrl+F", "Search messages", (i, k) => k.ctrl === true && (i === "f" || i === "F"), "chat"),
  bind(KeyAction.ClearFilter, "Ctrl+\\", "Clear search filter", (i, k) => k.ctrl === true && i === "\\", "chat"),

  bind(KeyAction.Copy, "Ctrl+Shift+C", "Copy selection", (_i, k) => k.ctrl === true && k.shift === true, "global"),
  bind(KeyAction.Paste, "Ctrl+Shift+V", "Paste", (_i, k) => k.ctrl === true && k.shift === true, "global"),

  bind(KeyAction.ToggleDebug, "Ctrl+D", "Toggle debug overlay", (i, k) => k.ctrl === true && (i === "d" || i === "D"), "global"),
];

const BINDING_MAP = new Map<KeyAction, KeyBinding>(
  DEFAULT_BINDINGS.map((b) => [b.action, b]),
);

/** Format a key label for compact UI hints (e.g. status bar). */
export function formatKeyHint(action: KeyAction): string {
  const binding = BINDING_MAP.get(action);
  return binding?.label ?? action;
}

/** Get binding metadata for an action. */
export function getBinding(action: KeyAction): KeyBinding | undefined {
  return BINDING_MAP.get(action);
}

/** List bindings, optionally filtered by context. */
export function listBindings(context?: KeyBinding["context"]): KeyBinding[] {
  if (!context) return [...DEFAULT_BINDINGS];
  return DEFAULT_BINDINGS.filter((b) => !b.context || b.context === context || b.context === "global");
}

/**
 * Match input against registered bindings.
 * Returns the first matching action or undefined.
 */
export function matchKeyBinding(
  input: string,
  key: InkKey,
  context?: KeyBinding["context"],
): KeyAction | undefined {
  const pool = context
    ? DEFAULT_BINDINGS.filter(
        (b) => b.context === context || b.context === "global" || !b.context,
      )
    : DEFAULT_BINDINGS;

  for (const binding of pool) {
    if (binding.match(input, key)) {
      return binding.action;
    }
  }
  return undefined;
}

/** Build a help table of all bindings grouped by context. */
export function formatBindingsHelp(): string {
  const groups = new Map<string, KeyBinding[]>();
  for (const b of DEFAULT_BINDINGS) {
    const ctx = b.context ?? "global";
    const list = groups.get(ctx) ?? [];
    list.push(b);
    groups.set(ctx, list);
  }

  const lines: string[] = ["Keybindings:", ""];
  for (const [ctx, bindings] of groups) {
    lines.push(`[${ctx}]`);
    for (const b of bindings) {
      lines.push(`  ${b.label.padEnd(14)} ${b.description}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

export { keyMatch };
