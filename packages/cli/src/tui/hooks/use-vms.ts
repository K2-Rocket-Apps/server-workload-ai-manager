import { useCallback } from "react";
import { loadConfig } from "@mistral/core";
import { ToolRegistry } from "@mistral/mcp";
import { useAppDispatch, useAppState } from "../state/context.js";
import type { NodeStats, VmRow } from "../types.js";

type HealthReportJson = {
  generatedAt?: string;
  node?: string;
  vms?: Array<{
    vmid: number;
    name: string;
    status: string;
    node: string;
    guestAgentAlive?: boolean;
    cpuPercent?: number;
    memPercent?: number;
    diskPercent?: number;
    issues?: string[];
    ips?: string[];
  }>;
  nodeStatus?: {
    node: string;
    status: string;
    cpu: number;
    maxcpu: number;
    mem: number;
    maxmem: number;
    uptime: number;
    loadavg: number[];
  };
};

export function parseHealthReport(raw: string): {
  vms: VmRow[];
  nodeStats: NodeStats | null;
  formatted: string;
} {
  try {
    const data = JSON.parse(raw) as HealthReportJson;
    const vms: VmRow[] = (data.vms ?? []).map((v) => ({
      vmid: v.vmid,
      name: v.name,
      status: v.status,
      node: v.node,
      guestAgent: Boolean(v.guestAgentAlive),
      cpuPercent: v.cpuPercent,
      memPercent: v.memPercent,
      diskPercent: v.diskPercent,
      issues: v.issues ?? [],
      ips: v.ips,
    }));

    let nodeStats: NodeStats | null = null;
    if (data.nodeStatus) {
      const ns = data.nodeStatus;
      nodeStats = {
        node: ns.node,
        status: ns.status,
        cpuPercent: ns.maxcpu ? (ns.cpu / ns.maxcpu) * 100 : ns.cpu,
        memPercent: ns.maxmem ? (ns.mem / ns.maxmem) * 100 : 0,
        uptime: ns.uptime,
        loadavg: ns.loadavg ?? [],
      };
    }

    const lines = vms.map((v) => {
      const issues = v.issues.length ? v.issues.join(", ") : "ok";
      const ga = v.guestAgent ? "GA✓" : "GA✗";
      return `  VM ${v.vmid} ${v.name} [${v.status}] ${ga} — ${issues}`;
    });

    const header = [
      `Health @ ${data.generatedAt ?? "unknown"}`,
      data.node ? `Node: ${data.node}` : "",
      nodeStats
        ? `CPU ${nodeStats.cpuPercent.toFixed(0)}%  MEM ${nodeStats.memPercent.toFixed(0)}%  uptime ${nodeStats.uptime}s`
        : "",
    ].filter(Boolean);

    return {
      vms,
      nodeStats,
      formatted: [...header, ...lines].join("\n"),
    };
  } catch {
    return { vms: [], nodeStats: null, formatted: raw };
  }
}

export type UseVmsResult = {
  vms: VmRow[];
  vmReportRaw: string;
  nodeStats: NodeStats | null;
  vmsLoading: boolean;
  vmsError: string | null;
  refreshVms: () => Promise<void>;
};

export function useVms(): UseVmsResult {
  const { vms, vmReportRaw, nodeStats, vmsLoading, vmsError } = useAppState();
  const dispatch = useAppDispatch();

  const refreshVms = useCallback(async () => {
    dispatch({ type: "VMS_LOAD_START" });
    try {
      const config = await loadConfig();
      const registry = new ToolRegistry(config);
      const raw = await registry.execute("pve_health_report", {});
      const parsed = parseHealthReport(raw);
      dispatch({
        type: "VMS_LOAD_SUCCESS",
        vms: parsed.vms,
        raw: parsed.formatted,
        nodeStats: parsed.nodeStats,
      });
    } catch (err) {
      dispatch({ type: "VMS_LOAD_ERROR", error: (err as Error).message });
    }
  }, [dispatch]);

  return {
    vms,
    vmReportRaw,
    nodeStats,
    vmsLoading,
    vmsError,
    refreshVms,
  };
}

/** Format VM rows as a compact table string for the logs tab. */
export function formatVmTable(rows: VmRow[]): string {
  if (!rows.length) return "No VMs loaded.";
  const header = "VMID  NAME              STATUS    GA   ISSUES";
  const lines = rows.map((v) => {
    const name = v.name.slice(0, 16).padEnd(16);
    const ga = v.guestAgent ? "yes" : "no ";
    const issues = v.issues.join("; ") || "ok";
    return `${String(v.vmid).padEnd(5)} ${name} ${v.status.padEnd(8)} ${ga}   ${issues}`;
  });
  return [header, ...lines].join("\n");
}
