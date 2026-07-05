import { loadConfig, saveConfig, configPath, toPveConfig } from "@mistral/core";
import { ToolRegistry } from "@mistral/mcp";
import { AlertDispatcher } from "@mistral/alerts";
import { createPveClient } from "@mistral/pve";
import type { TabId, UiMessage } from "../types.js";
import { listThemeNames, type ThemeName } from "../core/theme.js";
import { exportMessages, type ExportFormat } from "../features/export-chat.js";
import { formatBindingsHelp } from "../core/keybindings.js";
import {
  formatHelpText,
  LLM_MODELS,
  OPENROUTER_MODELS,
  resolveCommand,
} from "./registry.js";

export type CommandContext = {
  setTab: (tab: TabId) => void;
  addSystem: (content: string) => void;
  clearChat: () => void;
  setPending: (p: { name: string; args: Record<string, unknown> } | null) => void;
  refreshVms: () => Promise<void>;
  reloadConfig: () => Promise<void>;
  exit: () => void;
  setLoading: (v: boolean) => void;
  setTheme?: (theme: ThemeName) => void;
  openCommandPalette?: () => void;
  openKeybindings?: () => void;
  getMessages?: () => UiMessage[];
};

function parseArgs(line: string): { name: string; args: string[] } {
  const body = line.trimStart().slice(1).trim();
  const parts = body.split(/\s+/);
  return { name: (parts[0] ?? "").toLowerCase(), args: parts.slice(1) };
}

async function vmAction(
  ctx: CommandContext,
  tool: string,
  vmid: number,
): Promise<void> {
  const config = await loadConfig();
  const registry = new ToolRegistry(config);
  const raw = await registry.execute(tool, { vmid });
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  if (parsed.needs_approval) {
    ctx.setPending({ name: tool, args: { vmid } });
    ctx.setTab("approvals");
    ctx.addSystem(`Approval required: ${tool} VM ${vmid}. Open Approvals tab — press y/n.`);
    return;
  }
  if (parsed.error) {
    ctx.addSystem(`Error: ${String(parsed.error)}`);
    return;
  }
  ctx.addSystem(`${tool} VM ${vmid}:\n${JSON.stringify(parsed, null, 2)}`);
}

export async function executeSlashCommand(line: string, ctx: CommandContext): Promise<boolean> {
  const { name, args } = parseArgs(line);
  const cmd = resolveCommand(name);
  if (!cmd) {
    ctx.addSystem(`Unknown command: /${name}\nType /help or press / then Tab to browse commands.`);
    return true;
  }

  const canonical = cmd.name;

  switch (canonical) {
    case "help":
      ctx.addSystem(formatHelpText());
      return true;

    case "clear":
      ctx.clearChat();
      return true;

    case "exit":
      ctx.exit();
      return true;

    case "model": {
      const config = await loadConfig();
      if (!args[0]) {
        ctx.addSystem(`Current model: ${config.llm.model}\nProvider: ${config.llm.provider}\nChange: /model <name>  •  /models to list`);
        return true;
      }
      const model = args.join(" ");
      const allowed: readonly string[] =
        config.llm.provider === "openrouter" ? OPENROUTER_MODELS : LLM_MODELS;
      if (!allowed.includes(model)) {
        ctx.addSystem(`Unknown model "${model}".\nRun /models for valid options.`);
        return true;
      }
      config.llm.model = model;
      await saveConfig(config);
      await ctx.reloadConfig();
      ctx.addSystem(`Model set to ${model}`);
      return true;
    }

    case "models": {
      const config = await loadConfig();
      const list = config.llm.provider === "openrouter" ? OPENROUTER_MODELS : LLM_MODELS;
      ctx.addSystem(
        [`Provider: ${config.llm.provider}`, "Models:", ...list.map((m) => `  • ${m}`)].join("\n"),
      );
      return true;
    }

    case "provider": {
      const config = await loadConfig();
      if (!args[0]) {
        ctx.addSystem(`Current provider: ${config.llm.provider}\nSet: /provider mistral | /provider openrouter`);
        return true;
      }
      const p = args[0]!.toLowerCase();
      if (p !== "mistral" && p !== "openrouter") {
        ctx.addSystem("Provider must be mistral or openrouter");
        return true;
      }
      config.llm.provider = p;
      if (p === "openrouter" && !config.llm.model.includes("/")) {
        config.llm.model = OPENROUTER_MODELS[0]!;
      }
      if (p === "mistral" && config.llm.model.includes("/")) {
        config.llm.model = LLM_MODELS[0]!;
      }
      await saveConfig(config);
      await ctx.reloadConfig();
      ctx.addSystem(`Provider set to ${p}. Model: ${config.llm.model}`);
      return true;
    }

    case "temperature": {
      const config = await loadConfig();
      if (!args[0]) {
        ctx.addSystem(`Temperature: ${config.llm.temperature}\nSet: /temperature 0.3`);
        return true;
      }
      const val = Number(args[0]);
      if (Number.isNaN(val) || val < 0 || val > 2) {
        ctx.addSystem("Temperature must be between 0 and 2");
        return true;
      }
      config.llm.temperature = val;
      await saveConfig(config);
      await ctx.reloadConfig();
      ctx.addSystem(`Temperature set to ${val}`);
      return true;
    }

    case "apikey": {
      const config = await loadConfig();
      const set = Boolean(config.llm.api_key || process.env.MISTRAL_API_KEY);
      ctx.addSystem(
        set
          ? "API key: configured ✓\nTo change: exit TUI and run `mistral setup`"
          : "API key: NOT SET ✗\nRun: mistral setup",
      );
      return true;
    }

    case "report": {
      ctx.setLoading(true);
      try {
        const config = await loadConfig();
        const registry = new ToolRegistry(config);
        const raw = await registry.execute("pve_health_report", {});
        const data = JSON.parse(raw) as {
          vms: Array<{ vmid: number; name: string; status: string; issues: string[] }>;
        };
        const lines = data.vms.map(
          (v) => `  VM ${v.vmid} ${v.name} [${v.status}] — ${v.issues.join(", ") || "ok"}`,
        );
        ctx.addSystem(["Health report:", ...lines].join("\n"));
      } catch (err) {
        ctx.addSystem(`Report failed: ${(err as Error).message}`);
      } finally {
        ctx.setLoading(false);
      }
      return true;
    }

    case "check": {
      ctx.setLoading(true);
      try {
        const { MistralDaemon } = await import("@mistral/daemon");
        const config = await loadConfig();
        const daemon = new MistralDaemon(config);
        const result = await daemon.runOnce();
        ctx.addSystem(`Check complete @ ${result.checkedAt}\nAlerts sent: ${result.alertsSent}`);
      } catch (err) {
        ctx.addSystem(`Check failed: ${(err as Error).message}`);
      } finally {
        ctx.setLoading(false);
      }
      return true;
    }

    case "vms":
      ctx.setTab("vms");
      await ctx.refreshVms();
      return true;

    case "vm": {
      const vmid = Number(args[0]);
      if (!vmid) {
        ctx.addSystem("Usage: /vm <vmid>");
        return true;
      }
      ctx.setLoading(true);
      try {
        const config = await loadConfig();
        const registry = new ToolRegistry(config);
        const raw = await registry.execute("pve_vm_status", { vmid });
        ctx.addSystem(`VM ${vmid}:\n${raw}`);
      } catch (err) {
        ctx.addSystem(`Error: ${(err as Error).message}`);
      } finally {
        ctx.setLoading(false);
      }
      return true;
    }

    case "node": {
      ctx.setLoading(true);
      try {
        const config = await loadConfig();
        const registry = new ToolRegistry(config);
        const raw = await registry.execute("pve_node_status", {});
        ctx.addSystem(`Node status:\n${raw}`);
      } catch (err) {
        ctx.addSystem(`Error: ${(err as Error).message}`);
      } finally {
        ctx.setLoading(false);
      }
      return true;
    }

    case "start":
    case "stop":
    case "reboot": {
      const vmid = Number(args[0]);
      if (!vmid) {
        ctx.addSystem(`Usage: /${canonical} <vmid>`);
        return true;
      }
      const toolMap = { start: "pve_vm_start", stop: "pve_vm_stop", reboot: "pve_vm_reboot" } as const;
      ctx.setLoading(true);
      try {
        await vmAction(ctx, toolMap[canonical], vmid);
      } finally {
        ctx.setLoading(false);
      }
      return true;
    }

    case "ping": {
      const vmid = Number(args[0]);
      if (!vmid) {
        ctx.addSystem("Usage: /ping <vmid>");
        return true;
      }
      ctx.setLoading(true);
      try {
        const config = await loadConfig();
        const registry = new ToolRegistry(config);
        const raw = await registry.execute("pve_guest_agent_ping", { vmid });
        ctx.addSystem(`Guest agent VM ${vmid}: ${raw}`);
      } catch (err) {
        ctx.addSystem(`Error: ${(err as Error).message}`);
      } finally {
        ctx.setLoading(false);
      }
      return true;
    }

    case "console": {
      const vmid = Number(args[0]);
      if (!vmid) {
        ctx.addSystem("Usage: /console <vmid>");
        return true;
      }
      ctx.setLoading(true);
      try {
        const config = await loadConfig();
        const registry = new ToolRegistry(config);
        const raw = await registry.execute("pve_console_url", { vmid });
        ctx.addSystem(`Console VM ${vmid}: ${raw}`);
      } catch (err) {
        ctx.addSystem(`Error: ${(err as Error).message}`);
      } finally {
        ctx.setLoading(false);
      }
      return true;
    }

    case "watch": {
      if (!args[0]) {
        const config = await loadConfig();
        ctx.addSystem(`Watched VMs: ${config.daemon.watched_vmids.join(", ")}\nSet: /watch 121,122`);
        return true;
      }
      const vmids = args[0]!.split(",").map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n));
      if (!vmids.length) {
        ctx.addSystem("Usage: /watch 121,122");
        return true;
      }
      const config = await loadConfig();
      config.daemon.watched_vmids = vmids;
      await saveConfig(config);
      await ctx.reloadConfig();
      ctx.addSystem(`Watched VMs set to: ${vmids.join(", ")}`);
      return true;
    }

    case "config": {
      const config = await loadConfig();
      ctx.addSystem(
        [
          `Config: ${configPath()}`,
          `PVE: ${config.pve.host} (node ${config.pve.node})`,
          `LLM: ${config.llm.provider} / ${config.llm.model} (temp ${config.llm.temperature})`,
          `API key: ${config.llm.api_key ? "set" : "MISSING"}`,
          `Watched: ${config.daemon.watched_vmids.join(", ")}`,
          `Daemon: every ${config.daemon.check_interval_minutes}m, cron ${config.daemon.report_cron}`,
          `Alerts: email=${config.alerts.email.enabled} slack=${config.alerts.slack.enabled}`,
          `Web: ${config.web.public_url ?? `http://${config.web.host}:${config.web.port}`} (${config.web.bind_mode})`,
        ].join("\n"),
      );
      return true;
    }

    case "bind": {
      const config = await loadConfig();
      ctx.addSystem(
        [
          `Bind mode: ${config.web.bind_mode}`,
          `Host: ${config.web.host}:${config.web.port}`,
          `URL: ${config.web.public_url ?? `http://${config.web.host}:${config.web.port}`}`,
          `Password: ${config.web.password_hash ? "set" : "NOT SET"}`,
        ].join("\n"),
      );
      return true;
    }

    case "setup":
      ctx.addSystem("Exit TUI and run:\n  mistral setup\n\nSets API key, web password, SMTP, bind address.");
      return true;

    case "test-email": {
      ctx.setLoading(true);
      try {
        const config = await loadConfig();
        if (!config.alerts.email.enabled) {
          ctx.addSystem("Email not enabled. Run: mistral setup");
          return true;
        }
        const alerts = new AlertDispatcher(config.alerts);
        const result = await alerts.send({
          subject: "[Mistral PVE] Email test",
          body: "SMTP test from Mistral TUI.",
          severity: "info",
        });
        ctx.addSystem(`Test email: ${JSON.stringify(result.email)}`);
      } catch (err) {
        ctx.addSystem(`Error: ${(err as Error).message}`);
      } finally {
        ctx.setLoading(false);
      }
      return true;
    }

    case "test-pve": {
      ctx.setLoading(true);
      try {
        const config = await loadConfig();
        const pve = createPveClient(toPveConfig(config));
        const vms = await pve.listVms();
        ctx.addSystem(`PVE OK — ${vms.length} VMs found.`);
      } catch (err) {
        ctx.addSystem(`PVE failed: ${(err as Error).message}`);
      } finally {
        ctx.setLoading(false);
      }
      return true;
    }

    case "test-alert": {
      ctx.setLoading(true);
      try {
        const config = await loadConfig();
        const alerts = new AlertDispatcher(config.alerts);
        const result = await alerts.send({
          subject: "[Mistral PVE] Test alert",
          body: "Test from Mistral TUI.",
          severity: "info",
        });
        ctx.addSystem(`Alert result: ${JSON.stringify(result)}`);
      } catch (err) {
        ctx.addSystem(`Error: ${(err as Error).message}`);
      } finally {
        ctx.setLoading(false);
      }
      return true;
    }

    case "daemon": {
      const action = (args[0] ?? "status").toLowerCase();
      const config = await loadConfig();
      if (action === "status") {
        ctx.addSystem(
          [
            `Daemon enabled: ${config.daemon.enabled}`,
            `Interval: ${config.daemon.check_interval_minutes} minutes`,
            `Daily report cron: ${config.daemon.report_cron}`,
            `Watched VMs: ${config.daemon.watched_vmids.join(", ")}`,
            `State file: /var/lib/mistral/state.json`,
            `Service: sudo systemctl status mistral-daemon`,
          ].join("\n"),
        );
        return true;
      }
      if (action === "report") {
        ctx.setLoading(true);
        try {
          const { MistralDaemon } = await import("@mistral/daemon");
          const daemon = new MistralDaemon(config);
          const r = await daemon.runDailyReport();
          ctx.addSystem(r.report ?? "Daily report sent.");
        } catch (err) {
          ctx.addSystem(`Error: ${(err as Error).message}`);
        } finally {
          ctx.setLoading(false);
        }
        return true;
      }
      ctx.addSystem("Usage: /daemon status | /daemon report");
      return true;
    }

    case "tab": {
      const t = (args[0] ?? "").toLowerCase() as TabId;
      const valid: TabId[] = [
        "chat",
        "dashboard",
        "vms",
        "alerts",
        "settings",
        "approvals",
        "logs",
        "help",
      ];
      if (!valid.includes(t)) {
        ctx.addSystem(`Unknown tab. Use: ${valid.join(", ")}`);
        return true;
      }
      ctx.setTab(t);
      return true;
    }

    case "dashboard":
      ctx.setTab("dashboard");
      await ctx.refreshVms();
      return true;

    case "logs":
      ctx.setTab("logs");
      return true;

    case "theme": {
      if (!args[0]) {
        ctx.addSystem(`Themes: ${listThemeNames().join(", ")}\nSet: /theme mistral`);
        return true;
      }
      const name = args[0]!.toLowerCase() as ThemeName;
      if (!listThemeNames().includes(name)) {
        ctx.addSystem(`Unknown theme "${name}". Run /themes`);
        return true;
      }
      ctx.setTheme?.(name);
      ctx.addSystem(`Theme set to ${name}`);
      return true;
    }

    case "themes":
      ctx.addSystem(`Available themes:\n${listThemeNames().map((t) => `  • ${t}`).join("\n")}`);
      return true;

    case "export": {
      const format = (args[0] ?? "markdown").toLowerCase() as ExportFormat;
      if (!["text", "markdown", "json"].includes(format)) {
        ctx.addSystem("Usage: /export text|markdown|json");
        return true;
      }
      const messages = ctx.getMessages?.() ?? [];
      if (!messages.length) {
        ctx.addSystem("No messages to export.");
        return true;
      }
      ctx.setLoading(true);
      try {
        const path = await exportMessages(messages, format);
        ctx.addSystem(`Exported ${messages.length} messages to:\n${path}`);
      } catch (err) {
        ctx.addSystem(`Export failed: ${(err as Error).message}`);
      } finally {
        ctx.setLoading(false);
      }
      return true;
    }

    case "palette":
      ctx.openCommandPalette?.();
      return true;

    case "keys":
      ctx.openKeybindings?.();
      ctx.addSystem(formatBindingsHelp());
      return true;

    case "settings":
      ctx.setTab("settings");
      return true;

    case "alerts":
      ctx.setTab("alerts");
      return true;

    case "approvals":
      ctx.setTab("approvals");
      return true;

    default:
      ctx.addSystem(`Command /${canonical} not implemented yet.`);
      return true;
  }
}
