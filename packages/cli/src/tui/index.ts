/**
 * Mistral PVE Agent — Terminal UI
 *
 * Architecture overview:
 *
 * ```
 * chat.tsx          Entry point → MistralApp
 * app.tsx           Provider + keyboard + screen routing
 * state/            Reducer + React context (single source of truth)
 * hooks/            Agent loop, VMs, config, keyboard, palette
 * core/             Theme, layout, keybindings, fuzzy search, formatters
 * render/           Markdown, tables, sparklines, progress bars
 * components/       Ink UI building blocks
 * views/            Screen wrappers (chat, dashboard, vms, …)
 * commands/         Slash command registry + handler
 * features/         Welcome banner, session save, chat export
 * ```
 *
 * Keyboard shortcuts (global):
 *   1-8     Switch tabs
 *   Tab     Next tab
 *   Ctrl+K  Fuzzy command palette
 *   Ctrl+T  Cycle theme
 *   Ctrl+R  Reload config
 *   ?       Help overlay
 *   Esc     Exit / close modal
 *
 * Chat:
 *   /       Slash command palette with Tab completion
 *   ↑↓      History / palette navigation
 *   Enter   Send message or run command
 */

export { runChatTui } from "./chat.js";
export { MistralApp } from "./app.js";
export type { TabId, UiMessage, AppState, ThemeName } from "./types.js";
export { TAB_ORDER } from "./types.js";
export { getTheme, listThemeNames, listThemes } from "./core/theme.js";
export { SLASH_COMMANDS, formatHelpText } from "./commands/registry.js";
export { KeyAction, formatBindingsHelp, listBindings } from "./core/keybindings.js";
