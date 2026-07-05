/** ASCII banner shown on first launch (optional overlay). */
export const MISTRAL_BANNER = `
  ╭──────────────────────────────────────────────────────────╮
  │  ███╗   ███╗██╗███████╗████████╗██████╗  █████╗ ██╗     │
  │  ████╗ ████║██║██╔════╝╚══██╔══╝██╔══██╗██╔══██╗██║     │
  │  ██╔████╔██║██║███████╗   ██║   ██████╔╝███████║██║     │
  │  ██║╚██╔╝██║██║╚════██║   ██║   ██╔══██╗██╔══██║██║     │
  │  ██║ ╚═╝ ██║██║███████║   ██║   ██║  ██║██║  ██║███████╗│
  │  ╚═╝     ╚═╝╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝│
  │              PVE Agent · Proxmox AI Ops                  │
  ╰──────────────────────────────────────────────────────────╯
`.trim();

export const QUICK_TIPS = [
  "Type / to browse 35+ slash commands with Tab completion",
  "Ctrl+K opens the fuzzy command palette (search any command)",
  "Press 1-8 to jump between tabs instantly",
  "Ctrl+T cycles themes: mistral, midnight, forest, amber, mono",
  "/model mistral-large-latest — switch LLM without leaving TUI",
  "/export markdown — save chat to ~/.mistral/exports/",
  "/dashboard — cluster overview with VM stats and sparklines",
  "y/n on Approvals tab for VM start/stop/reboot actions",
  "? for help · Ctrl+? for full keybinding reference",
  "↑↓ in chat recalls previous prompts",
] as const;

export function randomTip(): string {
  const tip = QUICK_TIPS[Math.floor(Math.random() * QUICK_TIPS.length)]!;
  return `Tip: ${tip}`;
}

export function bannerWithTip(): string {
  return `${MISTRAL_BANNER}\n\n${randomTip()}`;
}

/** Compact one-line status for narrow terminals. */
export function compactStatus(model: string, apiOk: boolean, vmCount: number): string {
  const api = apiOk ? "API✓" : "API✗";
  return `mistral · ${model} · ${api} · ${vmCount} VMs · /help`;
}

/** Feature list for help screen. */
export const TUI_FEATURES = {
  layout: [
    "3-column responsive layout (sidebar · main · tool panel)",
    "Auto-hides sidebar on terminals < 80 cols",
    "Live terminal resize detection",
  ],
  chat: [
    "Markdown rendering for assistant replies",
    "Scrollable message history with Page Up/Down",
    "Input history with ↑↓ arrows",
    "Tool call cards in right panel",
    "Streaming indicator while agent thinks",
  ],
  commands: [
    "Inline / slash palette with live filter",
    "Full-screen Ctrl+K fuzzy command search",
    "Tab completion for commands and arguments",
    "35+ built-in slash commands",
  ],
  pve: [
    "VM dashboard with sortable table",
    "Node CPU/RAM sparklines",
    "Health reports and daemon checks",
    "Approval-gated VM power actions",
  ],
  admin: [
    "Settings tab with live config summary",
    "Theme switcher (/theme or Ctrl+T)",
    "Chat export (text, markdown, json)",
    "SMTP/PVE test commands from TUI",
  ],
} as const;

export function formatFeatureList(): string {
  const lines: string[] = ["Mistral TUI Features", ""];
  for (const [section, items] of Object.entries(TUI_FEATURES)) {
    lines.push(`${section.charAt(0).toUpperCase()}${section.slice(1)}:`);
    for (const item of items) {
      lines.push(`  • ${item}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
