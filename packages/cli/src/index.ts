#!/usr/bin/env node
import { Command } from "commander";
import { loadConfig, saveConfig, configPath, toPveConfig, runSetup, runWebSetup } from "@mistral/core";
import { createPveClient } from "@mistral/pve";
import { ToolRegistry } from "@mistral/mcp";
import { startStdioMcp, startHttpMcp } from "@mistral/mcp";
import { MistralDaemon } from "@mistral/daemon";
import { AlertDispatcher } from "@mistral/alerts";
import { startWebServer } from "@mistral/web";
import { runChatTui } from "./tui/chat.js";
import { runStartWeb } from "./start-web.js";

const program = new Command();

program.name("mistral").description("Mistral PVE AI ops agent").version("0.1.0");

program
  .command("chat", { isDefault: true })
  .description("Interactive chat TUI")
  .action(async () => {
    await runChatTui();
  });

program
  .command("report")
  .description("Print health report")
  .option("--json", "JSON output")
  .action(async (opts: { json?: boolean }) => {
    const config = await loadConfig();
    const registry = new ToolRegistry(config);
    const result = await registry.execute("pve_health_report", {});
    if (opts.json) {
      console.log(result);
    } else {
      const data = JSON.parse(result) as { generatedAt: string; vms: Array<{ vmid: number; name: string; status: string; issues: string[]; ips?: string[] }> };
      console.log(`Health report @ ${data.generatedAt}\n`);
      for (const vm of data.vms) {
        console.log(`VM ${vm.vmid} ${vm.name} [${vm.status}]`);
        if (vm.ips?.length) console.log(`  IPs: ${vm.ips.join(", ")}`);
        console.log(`  Issues: ${vm.issues.join(", ") || "none"}`);
      }
    }
  });

program
  .command("check")
  .description("Run health checks now")
  .option("--vmid <id>", "Specific VM ID", (v) => Number(v))
  .action(async (opts: { vmid?: number }) => {
    const config = await loadConfig();
    const daemon = new MistralDaemon(config);
    if (opts.vmid) {
      config.daemon.watched_vmids = [opts.vmid];
    }
    const result = await daemon.runOnce();
    console.log(`Checked at ${result.checkedAt}, alerts sent: ${result.alertsSent}`);
  });

program
  .command("config")
  .description("Show config path and validate")
  .action(async () => {
    const path = configPath();
    const config = await loadConfig();
    console.log(`Config: ${path}`);
    console.log(`PVE host: ${config.pve.host}`);
    console.log(`LLM: ${config.llm.provider} / ${config.llm.model}`);
    console.log(`Watched VMs: ${config.daemon.watched_vmids.join(", ")}`);
    console.log(`Alerts: email=${config.alerts.email.enabled} slack=${config.alerts.slack.enabled}`);
    console.log(`Web UI: ${config.web.public_url ?? `http://${config.web.host}:${config.web.port}`}`);
    console.log(`Web password: ${config.web.password_hash ? "set" : "NOT SET — run mistral setup"}`);
  });

program
  .command("setup")
  .description("Interactive setup — web password, bind address (LAN/Tailscale), email")
  .action(async () => {
    await runSetup();
  });

program
  .command("test-email")
  .description("Send test email via SMTP")
  .action(async () => {
    const config = await loadConfig();
    const alerts = new AlertDispatcher(config.alerts);
    if (!config.alerts.email.enabled) {
      console.error("Email not enabled. Run: mistral setup");
      process.exit(1);
    }
    const result = await alerts.send({
      subject: "[Mistral PVE] Email test",
      body: "If you received this, SMTP is working correctly.",
      severity: "info",
    });
    console.log(JSON.stringify(result, null, 2));
    if (!result.email?.ok) process.exit(1);
  });

program
  .command("config-set")
  .description("Update a config value")
  .requiredOption("--key <path>", "Dot path e.g. llm.model")
  .requiredOption("--value <value>", "New value")
  .action(async (opts: { key: string; value: string }) => {
    const config = await loadConfig();
    const parts = opts.key.split(".");
    let obj: Record<string, unknown> = config as unknown as Record<string, unknown>;
    for (let i = 0; i < parts.length - 1; i++) {
      obj = obj[parts[i]!] as Record<string, unknown>;
    }
    const last = parts[parts.length - 1]!;
    const num = Number(opts.value);
    obj[last] = Number.isNaN(num) || opts.value === "" ? opts.value : num;
    await saveConfig(config);
    console.log(`Updated ${opts.key} = ${opts.value}`);
  });

program
  .command("daemon")
  .description("Daemon control")
  .argument("<action>", "start | run-once | report")
  .action(async (action: string) => {
    const config = await loadConfig();
    const daemon = new MistralDaemon(config);
    if (action === "start") {
      console.log("Starting daemon (foreground)...");
      await daemon.start();
      await new Promise(() => {});
    } else if (action === "run-once") {
      const r = await daemon.runOnce();
      console.log(JSON.stringify(r));
    } else if (action === "report") {
      const r = await daemon.runDailyReport();
      console.log(r.report ?? "Report sent");
    } else {
      console.error("Unknown action. Use: start, run-once, report");
      process.exit(1);
    }
  });

program
  .command("mcp")
  .description("Start MCP server")
  .option("--http", "HTTP transport on 127.0.0.1:8788")
  .action(async (opts: { http?: boolean }) => {
    const config = await loadConfig();
    if (opts.http) {
      await startHttpMcp(config);
    } else {
      await startStdioMcp(config);
    }
  });

program
  .command("start")
  .description("Start Mistral services")
  .argument("<target>", "web | daemon | all")
  .option("-f, --foreground", "Run in foreground (no systemd)")
  .option("--reconfigure", "Re-run web setup wizard")
  .action(async (target: string, opts: { foreground?: boolean; reconfigure?: boolean }) => {
    if (target === "web" || target === "all") {
      if (opts.reconfigure) {
        await runWebSetup();
      }
      await runStartWeb({ foreground: opts.foreground });
      return;
    }
    if (target === "daemon") {
      const config = await loadConfig();
      const daemon = new MistralDaemon(config);
      console.log("Starting daemon (foreground)...");
      await daemon.start();
      await new Promise(() => {});
      return;
    }
    console.error("Unknown target. Use: web, daemon, or all");
    process.exit(1);
  });

program
  .command("web")
  .description("Start settings web UI")
  .action(async () => {
    const config = await loadConfig();
    await startWebServer(config);
  });

program
  .command("test-pve")
  .description("Test PVE API connection")
  .action(async () => {
    const config = await loadConfig();
    const pve = createPveClient(toPveConfig(config));
    const vms = await pve.listVms();
    console.log(`Connected. Found ${vms.length} VMs.`);
  });

program
  .command("test-alert")
  .description("Send test alert")
  .action(async () => {
    const config = await loadConfig();
    const alerts = new AlertDispatcher(config.alerts);
    const result = await alerts.send({
      subject: "[Mistral PVE] Test alert",
      body: "This is a test alert from mistral CLI.",
      severity: "info",
    });
    console.log(JSON.stringify(result, null, 2));
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});
