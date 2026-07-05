/**
 * Extended slash-command argument completions beyond static choices.
 * Used by the inline palette and Ctrl+K command search.
 */

import { loadConfig } from "@mistral/core";
import { ToolRegistry } from "@mistral/mcp";
import { LLM_MODELS, OPENROUTER_MODELS } from "../commands/registry.js";
import { listThemeNames } from "../core/theme.js";
import { TAB_ORDER } from "../types.js";

export type CompletionContext = {
  command: string;
  argIndex: number;
  partial: string;
};

export type CompletionItem = {
  value: string;
  label: string;
  description?: string;
};

export async function fetchCompletions(ctx: CompletionContext): Promise<CompletionItem[]> {
  const partial = ctx.partial.toLowerCase();

  switch (ctx.command) {
    case "model": {
      const config = await loadConfig();
      const models = config.llm.provider === "openrouter" ? OPENROUTER_MODELS : LLM_MODELS;
      return models
        .filter((m) => !partial || m.toLowerCase().includes(partial))
        .map((m) => ({ value: m, label: m, description: "LLM model" }));
    }

    case "theme":
      return listThemeNames()
        .filter((t) => !partial || t.includes(partial))
        .map((t) => ({ value: t, label: t, description: "UI theme" }));

    case "tab":
      return TAB_ORDER.filter((t) => !partial || t.startsWith(partial)).map((t) => ({
        value: t,
        label: t,
        description: "Switch tab",
      }));

    case "vm":
    case "start":
    case "stop":
    case "reboot":
    case "ping":
    case "console": {
      try {
        const config = await loadConfig();
        const registry = new ToolRegistry(config);
        const raw = await registry.execute("pve_list_vms", {});
        const vms = JSON.parse(raw) as Array<{ vmid: number; name: string }>;
        return vms
          .filter(
            (v) =>
              !partial ||
              String(v.vmid).startsWith(partial) ||
              v.name.toLowerCase().includes(partial),
          )
          .map((v) => ({
            value: String(v.vmid),
            label: `${v.vmid} ${v.name}`,
            description: "VM ID",
          }));
      } catch {
        return [];
      }
    }

    case "watch": {
      try {
        const config = await loadConfig();
        return config.daemon.watched_vmids.map((id) => ({
          value: String(id),
          label: String(id),
          description: "Watched VM",
        }));
      } catch {
        return [];
      }
    }

    default:
      return [];
  }
}

/** Format completions as palette rows for display. */
export function formatCompletionRows(items: CompletionItem[], max = 12): string[] {
  return items.slice(0, max).map((item) => {
    const desc = item.description ? ` — ${item.description}` : "";
    return `  ${item.label}${desc}`;
  });
}

/** Merge static choices with dynamic completions, deduped by value. */
export function mergeCompletions(
  staticChoices: string[],
  dynamic: CompletionItem[],
): CompletionItem[] {
  const seen = new Set<string>();
  const out: CompletionItem[] = [];

  for (const value of staticChoices) {
    if (!seen.has(value)) {
      seen.add(value);
      out.push({ value, label: value });
    }
  }

  for (const item of dynamic) {
    if (!seen.has(item.value)) {
      seen.add(item.value);
      out.push(item);
    }
  }

  return out;
}
