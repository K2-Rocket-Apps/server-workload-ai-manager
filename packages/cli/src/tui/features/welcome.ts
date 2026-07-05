import type { AppConfig } from "@mistral/core";
import type { ConfigStatus } from "../types.js";

/**
 * Build startup banner lines shown when the TUI opens.
 */
export function generateWelcomeMessages(
  config: AppConfig | ConfigStatus | null,
): string[] {
  const lines: string[] = [];

  lines.push("Welcome to Mistral PVE Agent");
  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push("");
  lines.push("Type a question about your Proxmox host, or / for slash commands.");
  lines.push("Tab cycles views  •  Esc exits  •  ? help  •  Ctrl+? keybindings");
  lines.push("");

  if (!config) {
    lines.push("Loading configuration…");
    return lines;
  }

  const isFullConfig = "pve" in config;
  const provider = isFullConfig ? config.llm.provider : config.provider;
  const model = isFullConfig ? config.llm.model : config.model;
  const apiKeySet = isFullConfig
    ? Boolean(config.llm.api_key || process.env.MISTRAL_API_KEY)
    : config.apiKeySet;
  const pveHost = isFullConfig ? config.pve.host : config.pveHost;
  const pveNode = isFullConfig ? config.pve.node : config.pveNode;
  const watched = isFullConfig ? config.daemon.watched_vmids : config.watchedVmids;
  const temp = isFullConfig ? config.llm.temperature : config.temperature;
  const interval = isFullConfig
    ? config.daemon.check_interval_minutes
    : config.daemonIntervalMinutes;
  const webUrl = isFullConfig
    ? config.web.public_url ?? `http://${config.web.host}:${config.web.port}`
    : config.webUrl;

  lines.push(`Model: ${provider}/${model} (temp ${temp})`);
  lines.push(`API key: ${apiKeySet ? "configured ✓" : "NOT SET — use /apikey <key> or mistral setup"}`);
  lines.push(`PVE: ${pveHost} (node ${pveNode})`);
  lines.push(`Watched VMs: ${watched.join(", ")}`);
  lines.push(`Daemon check interval: ${interval} min`);
  lines.push(`Web UI: ${webUrl}`);
  lines.push("");
  lines.push("Quick commands:");
  lines.push("  /vms      — VM health dashboard");
  lines.push("  /report   — health snapshot in chat");
  lines.push("  /config   — show full config");
  lines.push("  /help     — all slash commands");

  if (!apiKeySet) {
    lines.push("");
    lines.push("⚠ Chat requires an LLM API key. PVE tools work without it.");
  }

  return lines;
}

/** Join welcome lines into a single system message body. */
export function welcomeMessageBody(config: AppConfig | ConfigStatus | null): string {
  return generateWelcomeMessages(config).join("\n");
}
