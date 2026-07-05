import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { HealthVmReport } from "@mistral/pve";

export type DaemonState = {
  lastCheckAt?: string;
  lastReportAt?: string;
  alertedIssues: Record<string, string>;
  recentAlerts: Array<{ at: string; subject: string; body: string }>;
};

export async function loadState(path: string): Promise<DaemonState> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as DaemonState;
  } catch {
    return { alertedIssues: {}, recentAlerts: [] };
  }
}

export async function saveState(path: string, state: DaemonState): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(state, null, 2), "utf8");
}

export function issueKey(vm: HealthVmReport, issue: string): string {
  return `${vm.vmid}:${issue}`;
}

export function shouldAlert(
  vm: HealthVmReport,
  policies: string[],
  state: DaemonState,
): { alert: boolean; issues: string[] } {
  const issues: string[] = [];

  for (const issue of vm.issues) {
    if (issue.includes("Guest agent") && policies.includes("guest_agent_down")) issues.push(issue);
    if (issue.includes("CPU") && policies.includes("high_cpu")) issues.push(issue);
    if (issue.includes("Memory") && policies.includes("high_mem")) issues.push(issue);
    if (issue.includes("Disk") && policies.includes("disk_full")) issues.push(issue);
    if (issue.includes("stopped") && policies.includes("vm_stopped_unexpected")) issues.push(issue);
  }

  const newIssues = issues.filter((i) => !state.alertedIssues[issueKey(vm, i)]);
  return { alert: newIssues.length > 0, issues: newIssues.length ? newIssues : issues };
}

export function matchesCron(cron: string, date = new Date()): boolean {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const [min, hour, dom, mon, dow] = parts;
  const checks = [
    [min, date.getMinutes()],
    [hour, date.getHours()],
    [dom, date.getDate()],
    [mon, date.getMonth() + 1],
    [dow, date.getDay()],
  ] as const;
  return checks.every(([expr, val]) => matchField(expr, val));
}

function matchField(expr: string, value: number): boolean {
  if (expr === "*") return true;
  if (expr.startsWith("*/")) {
    const step = Number(expr.slice(2));
    return value % step === 0;
  }
  return Number(expr) === value;
}
