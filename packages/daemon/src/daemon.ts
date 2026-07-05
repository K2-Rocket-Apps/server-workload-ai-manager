import { createPveClient } from "@mistral/pve";
import type { AppConfig } from "@mistral/core";
import { toPveConfig, statePath } from "@mistral/core";
import { AlertDispatcher, formatVmAlert } from "@mistral/alerts";
import { issueKey, loadState, matchesCron, saveState, shouldAlert } from "./state.js";

export type DaemonRunResult = {
  checkedAt: string;
  alertsSent: number;
  report?: string;
};

export class MistralDaemon {
  private readonly pve;
  private readonly alerts;
  private running = false;
  private intervalHandle?: ReturnType<typeof setInterval>;

  constructor(
    private readonly config: AppConfig,
    private readonly stateFile = statePath(),
  ) {
    this.pve = createPveClient(toPveConfig(config));
    this.alerts = new AlertDispatcher(config.alerts);
  }

  async runOnce(): Promise<DaemonRunResult> {
    const state = await loadState(this.stateFile);
    const report = await this.pve.healthReport(this.config.daemon.watched_vmids);
    let alertsSent = 0;

    for (const vm of report.vms) {
      const { alert, issues } = shouldAlert(vm, this.config.policies.auto_alert_on, state);
      if (!alert) continue;

      const payload = formatVmAlert({ ...vm, issues });
      await this.alerts.send(payload);
      alertsSent++;

      for (const issue of issues) {
        state.alertedIssues[issueKey(vm, issue)] = new Date().toISOString();
      }
      state.recentAlerts.unshift({
        at: new Date().toISOString(),
        subject: payload.subject,
        body: payload.body,
      });
      state.recentAlerts = state.recentAlerts.slice(0, 50);
    }

    // Clear resolved issues
    for (const key of Object.keys(state.alertedIssues)) {
      const [vmidStr, ...rest] = key.split(":");
      const vm = report.vms.find((v) => v.vmid === Number(vmidStr));
      const issue = rest.join(":");
      if (vm && !vm.issues.some((i) => i === issue || i.includes(issue.split(" ")[0] ?? ""))) {
        delete state.alertedIssues[key];
      }
    }

    state.lastCheckAt = new Date().toISOString();
    await saveState(this.stateFile, state);

    return { checkedAt: state.lastCheckAt, alertsSent };
  }

  async runDailyReport(): Promise<DaemonRunResult> {
    const report = await this.pve.healthReport(this.config.daemon.watched_vmids);
    const lines = report.vms.map(
      (v) =>
        `VM ${v.vmid} ${v.name}: ${v.status} | GA: ${v.guestAgentAlive ? "ok" : "down"} | issues: ${v.issues.join(", ") || "none"}`,
    );
    const body = [`Daily PVE health report (${report.generatedAt})`, "", ...lines].join("\n");
    await this.alerts.send({ subject: "[Mistral PVE] Daily health report", body, severity: "info" });

    const state = await loadState(this.stateFile);
    state.lastReportAt = new Date().toISOString();
    await saveState(this.stateFile, state);

    return { checkedAt: new Date().toISOString(), alertsSent: 1, report: body };
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    await this.alerts.send({
      subject: "[Mistral PVE] Daemon online",
      body: `Mistral daemon started on ${this.config.pve.node}. Watching VMs: ${this.config.daemon.watched_vmids.join(", ")}`,
      severity: "info",
    });

    await this.runOnce();

    const intervalMs = this.config.daemon.check_interval_minutes * 60_000;
    this.intervalHandle = setInterval(async () => {
      try {
        await this.runOnce();
        if (matchesCron(this.config.daemon.report_cron)) {
          await this.runDailyReport();
        }
      } catch (err) {
        console.error("Daemon check failed:", err);
      }
    }, intervalMs);
  }

  stop(): void {
    this.running = false;
    if (this.intervalHandle) clearInterval(this.intervalHandle);
  }
}
