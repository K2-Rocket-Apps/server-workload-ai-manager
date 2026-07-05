export type CommandCategory = "chat" | "llm" | "pve" | "admin" | "nav";

export type SlashArg = {
  name: string;
  description: string;
  optional?: boolean;
  choices?: string[];
};

export type SlashCommand = {
  name: string;
  aliases?: string[];
  description: string;
  usage: string;
  category: CommandCategory;
  args?: SlashArg[];
};

export const LLM_MODELS = [
  "mistral-small-latest",
  "mistral-medium-latest",
  "mistral-large-latest",
  "open-mistral-nemo",
  "codestral-latest",
  "pixtral-large-latest",
  "ministral-8b-latest",
  "ministral-3b-latest",
] as const;

export const OPENROUTER_MODELS = [
  "mistralai/mistral-small",
  "mistralai/mistral-medium",
  "mistralai/mistral-large",
  "mistralai/codestral-latest",
] as const;

export const CATEGORY_LABELS: Record<CommandCategory, string> = {
  chat: "Chat",
  llm: "Model & LLM",
  pve: "Proxmox VMs",
  admin: "Admin & Config",
  nav: "Navigation",
};

export const CATEGORY_COLORS: Record<CommandCategory, string> = {
  chat: "white",
  llm: "magenta",
  pve: "green",
  admin: "yellow",
  nav: "cyan",
};

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    name: "help",
    aliases: ["h", "?"],
    description: "Show all slash commands",
    usage: "/help",
    category: "chat",
  },
  {
    name: "clear",
    description: "Clear chat history",
    usage: "/clear",
    category: "chat",
  },
  {
    name: "exit",
    aliases: ["quit", "q"],
    description: "Exit the TUI",
    usage: "/exit",
    category: "chat",
  },
  {
    name: "model",
    description: "Show or change LLM model",
    usage: "/model [name]",
    category: "llm",
    args: [
      {
        name: "name",
        description: "Model id (tab-complete)",
        optional: true,
        choices: [...LLM_MODELS],
      },
    ],
  },
  {
    name: "models",
    description: "List available models for current provider",
    usage: "/models",
    category: "llm",
  },
  {
    name: "provider",
    description: "Show or set LLM provider",
    usage: "/provider [mistral|openrouter]",
    category: "llm",
    args: [
      { name: "name", description: "Provider", optional: true, choices: ["mistral", "openrouter"] },
    ],
  },
  {
    name: "temperature",
    aliases: ["temp"],
    description: "Show or set LLM temperature (0–2)",
    usage: "/temperature [0.0-2.0]",
    category: "llm",
    args: [{ name: "value", description: "0.0 to 2.0", optional: true }],
  },
  {
    name: "apikey",
    aliases: ["key"],
    description: "API key status (use /setup to change)",
    usage: "/apikey",
    category: "llm",
  },
  {
    name: "report",
    description: "Run VM health report in chat",
    usage: "/report",
    category: "pve",
  },
  {
    name: "check",
    description: "Run daemon health checks now",
    usage: "/check",
    category: "pve",
  },
  {
    name: "vms",
    aliases: ["list"],
    description: "Open VMs tab and refresh",
    usage: "/vms",
    category: "pve",
  },
  {
    name: "vm",
    description: "Detailed status for one VM",
    usage: "/vm <vmid>",
    category: "pve",
    args: [{ name: "vmid", description: "VM ID e.g. 121" }],
  },
  {
    name: "node",
    description: "PVE host CPU/RAM/load status",
    usage: "/node",
    category: "pve",
  },
  {
    name: "start",
    description: "Start a VM (requires approval)",
    usage: "/start <vmid>",
    category: "pve",
    args: [{ name: "vmid", description: "VM ID" }],
  },
  {
    name: "stop",
    description: "Stop a VM (requires approval)",
    usage: "/stop <vmid>",
    category: "pve",
    args: [{ name: "vmid", description: "VM ID" }],
  },
  {
    name: "reboot",
    description: "Reboot a VM (requires approval)",
    usage: "/reboot <vmid>",
    category: "pve",
    args: [{ name: "vmid", description: "VM ID" }],
  },
  {
    name: "ping",
    description: "Guest-agent ping for a VM",
    usage: "/ping <vmid>",
    category: "pve",
    args: [{ name: "vmid", description: "VM ID" }],
  },
  {
    name: "console",
    description: "Get noVNC console URL for a VM",
    usage: "/console <vmid>",
    category: "pve",
    args: [{ name: "vmid", description: "VM ID" }],
  },
  {
    name: "watch",
    description: "Set daemon watched VM IDs",
    usage: "/watch <id,id,...>",
    category: "pve",
    args: [{ name: "vmids", description: "Comma-separated VM IDs" }],
  },
  {
    name: "config",
    description: "Show current config summary",
    usage: "/config",
    category: "admin",
  },
  {
    name: "bind",
    description: "Show web UI bind address and URL",
    usage: "/bind",
    category: "admin",
  },
  {
    name: "setup",
    description: "Re-run interactive setup wizard",
    usage: "/setup",
    category: "admin",
  },
  {
    name: "test-email",
    description: "Send SMTP test email",
    usage: "/test-email",
    category: "admin",
  },
  {
    name: "test-pve",
    description: "Test Proxmox API connection",
    usage: "/test-pve",
    category: "admin",
  },
  {
    name: "test-alert",
    description: "Send test alert (email + Slack)",
    usage: "/test-alert",
    category: "admin",
  },
  {
    name: "daemon",
    description: "Daemon info or daily report",
    usage: "/daemon [status|report]",
    category: "admin",
    args: [
      { name: "action", description: "status or report", optional: true, choices: ["status", "report"] },
    ],
  },
  {
    name: "tab",
    description: "Switch to a tab",
    usage: "/tab <chat|dashboard|vms|alerts|settings|approvals|logs|help>",
    category: "nav",
    args: [
      {
        name: "name",
        description: "Tab name",
        choices: ["chat", "dashboard", "vms", "alerts", "settings", "approvals", "logs", "help"],
      },
    ],
  },
  {
    name: "settings",
    aliases: ["config-ui"],
    description: "Open settings tab",
    usage: "/settings",
    category: "nav",
  },
  {
    name: "alerts",
    description: "Open alerts tab",
    usage: "/alerts",
    category: "nav",
  },
  {
    name: "approvals",
    description: "Open pending approvals tab",
    usage: "/approvals",
    category: "nav",
  },
  {
    name: "dashboard",
    description: "Open dashboard overview",
    usage: "/dashboard",
    category: "nav",
  },
  {
    name: "logs",
    description: "Open tool log viewer",
    usage: "/logs",
    category: "nav",
  },
  {
    name: "theme",
    description: "Show or set UI theme",
    usage: "/theme [mistral|midnight|forest|amber|mono]",
    category: "admin",
    args: [
      {
        name: "name",
        description: "Theme name",
        optional: true,
        choices: ["mistral", "midnight", "forest", "amber", "mono"],
      },
    ],
  },
  {
    name: "themes",
    description: "List available UI themes",
    usage: "/themes",
    category: "admin",
  },
  {
    name: "export",
    description: "Export chat to ~/.mistral/exports/",
    usage: "/export [text|markdown|json]",
    category: "chat",
    args: [
      {
        name: "format",
        description: "Export format",
        optional: true,
        choices: ["text", "markdown", "json"],
      },
    ],
  },
  {
    name: "palette",
    aliases: ["commands", "cmd"],
    description: "Open fuzzy command palette (Ctrl+K)",
    usage: "/palette",
    category: "nav",
  },
  {
    name: "keys",
    aliases: ["keybindings", "shortcuts"],
    description: "Show keyboard shortcuts",
    usage: "/keys",
    category: "chat",
  },
];

const byName = new Map<string, SlashCommand>();
for (const cmd of SLASH_COMMANDS) {
  byName.set(cmd.name, cmd);
  for (const alias of cmd.aliases ?? []) {
    byName.set(alias, cmd);
  }
}

export function resolveCommand(name: string): SlashCommand | undefined {
  return byName.get(name.toLowerCase());
}

export function parseSlashInput(input: string): {
  commandPart: string;
  argPart: string;
  query: string;
  hasArgSlot: boolean;
} {
  const trimmed = input.trimStart();
  if (!trimmed.startsWith("/")) {
    return { commandPart: "", argPart: "", query: "", hasArgSlot: false };
  }
  const body = trimmed.slice(1);
  const space = body.indexOf(" ");
  if (space === -1) {
    return { commandPart: body.toLowerCase(), argPart: "", query: body.toLowerCase(), hasArgSlot: false };
  }
  return {
    commandPart: body.slice(0, space).toLowerCase(),
    argPart: body.slice(space + 1),
    query: body.slice(0, space).toLowerCase(),
    hasArgSlot: true,
  };
}

export function filterCommands(input: string): SlashCommand[] {
  const { commandPart, argPart, hasArgSlot } = parseSlashInput(input);
  if (!input.trimStart().startsWith("/")) return [];

  if (hasArgSlot) {
    const cmd = resolveCommand(commandPart);
    if (!cmd) return [];
    const arg = cmd.args?.[0];
    if (arg?.choices) {
      const q = argPart.toLowerCase();
      const matches = arg.choices.filter((c) => !q || c.toLowerCase().startsWith(q));
      return matches.map((choice) => ({
        ...cmd,
        name: `${cmd.name} ${choice}`,
        description: `Set ${arg.name} → ${choice}`,
        usage: `/${cmd.name} ${choice}`,
      }));
    }
    return [cmd];
  }

  const q = commandPart;
  if (!q) return SLASH_COMMANDS;

  return SLASH_COMMANDS.filter(
    (c) =>
      c.name.startsWith(q) ||
      c.aliases?.some((a) => a.startsWith(q)) ||
      c.description.toLowerCase().includes(q),
  );
}

export function shouldShowPalette(input: string): boolean {
  if (!input.startsWith("/")) return false;
  const { commandPart, hasArgSlot } = parseSlashInput(input);
  if (!commandPart) return true;
  const cmd = resolveCommand(commandPart);
  if (!cmd) return true;
  if (!hasArgSlot) return commandPart.length < cmd.name.length || Boolean(cmd.args?.length);
  return Boolean(cmd.args?.[0]?.choices);
}

export function autocompleteInput(input: string, selectedIndex: number, matches: SlashCommand[]): string {
  const { argPart } = parseSlashInput(input);
  const selected = matches[selectedIndex] ?? matches[0];
  if (!selected) return input;

  if (argPart && selected.args?.[0]?.choices) {
    const choice = selected.usage.split(" ").slice(1).join(" ");
    return `/${selected.name.split(" ")[0]} ${choice} `;
  }

  if (!argPart) {
    const base = selected.name.split(" ")[0]!;
    const cmd = resolveCommand(base);
    if (cmd?.args?.length && !cmd.args[0]!.optional) {
      return `/${base} `;
    }
    if (cmd?.args?.[0]?.choices) {
      return `/${base} `;
    }
    return `/${base} `;
  }

  return input;
}

export function formatHelpText(): string {
  const lines: string[] = ["Slash commands (type / then Tab to complete):\n"];
  const categories = Object.keys(CATEGORY_LABELS) as CommandCategory[];

  for (const cat of categories) {
    const cmds = SLASH_COMMANDS.filter((c) => c.category === cat);
    if (!cmds.length) continue;
    lines.push(`${CATEGORY_LABELS[cat]}:`);
    for (const c of cmds) {
      lines.push(`  /${c.name.padEnd(14)} ${c.description}`);
      if (c.usage !== `/${c.name}`) {
        lines.push(`    ${" ".repeat(16)}usage: ${c.usage}`);
      }
    }
    lines.push("");
  }
  lines.push("Tips: ↑↓ select  •  Tab complete  •  Enter run  •  Esc exit");
  return lines.join("\n");
}
