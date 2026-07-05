import nodemailer from "nodemailer";
import type { AppConfig } from "@mistral/core";

export type AlertPayload = {
  subject: string;
  body: string;
  severity?: "info" | "warn" | "critical";
};

export type AlertResult = {
  email?: { ok: boolean; error?: string };
  slack?: { ok: boolean; error?: string };
};

export class AlertDispatcher {
  constructor(private readonly config: AppConfig["alerts"]) {}

  async send(payload: AlertPayload): Promise<AlertResult> {
    const result: AlertResult = {};
    if (this.config.email.enabled) {
      result.email = await this.sendEmail(payload);
    }
    if (this.config.slack.enabled) {
      result.slack = await this.sendSlack(payload);
    }
    return result;
  }

  private async sendEmail(payload: AlertPayload): Promise<{ ok: boolean; error?: string }> {
    const email = this.config.email;
    if (!email.smtp_host || !email.to.length) {
      return { ok: false, error: "SMTP host or recipients not configured" };
    }
    try {
      const transport = nodemailer.createTransport({
        host: email.smtp_host,
        port: email.smtp_port,
        secure: email.smtp_port === 465,
        auth: email.smtp_user ? { user: email.smtp_user, pass: email.smtp_pass } : undefined,
      });
      await transport.sendMail({
        from: email.from,
        to: email.to.join(", "),
        subject: payload.subject,
        text: payload.body,
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }

  private async sendSlack(payload: AlertPayload): Promise<{ ok: boolean; error?: string }> {
    const url = this.config.slack.webhook_url;
    if (!url) return { ok: false, error: "Slack webhook not configured" };
    const prefix = payload.severity === "critical" ? ":rotating_light:" : payload.severity === "warn" ? ":warning:" : ":information_source:";
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `${prefix} ${payload.subject}\n${payload.body}` }),
      });
      if (!res.ok) return { ok: false, error: `Slack HTTP ${res.status}` };
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }
}

export function formatVmAlert(vm: {
  vmid: number;
  name: string;
  issues: string[];
  cpuPercent?: number;
  memPercent?: number;
}): AlertPayload {
  const metrics = [
    vm.cpuPercent !== undefined ? `CPU: ${vm.cpuPercent}%` : null,
    vm.memPercent !== undefined ? `Mem: ${vm.memPercent}%` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  return {
    subject: `[Mistral PVE] VM ${vm.vmid} ${vm.name} — ${vm.issues[0] ?? "issue detected"}`,
    body: `${vm.issues.join("\n")}\n${metrics}\nLast check: ${new Date().toLocaleString()}\nRun: mistral check --vmid ${vm.vmid}`,
    severity: vm.issues.some((i) => i.includes("critical") || i.includes("unreachable")) ? "critical" : "warn",
  };
}
