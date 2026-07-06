import { useCallback, useRef } from "react";
import { loadConfig } from "@mistral/core";
import { ToolRegistry } from "@mistral/mcp";
import { useAppDispatch, useAppState } from "../state/context.js";
import type { NodeStats, VmRow } from "../types.js";
import { formatUptime } from "../core/format.js";

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
    ostype?: string;
    osLabel?: string;
    cpus?: number;
    maxmem?: number;
    maxdisk?: number;
    memUsed?: number;
    uptime?: number;
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

export function mapVmFromReport(v: NonNullable<HealthReportJson["vms"]>[number]): VmRow {
  return {
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
    osLabel: v.osLabel ?? v.ostype,
    ostype: v.ostype,
    cpus: v.cpus,
    maxmem: v.maxmem,
    maxdisk: v.maxdisk,
    memUsed: v.memUsed,
    uptime: v.uptime,
  };
}

export function parseHealthReport(raw: string): {
  vms: VmRow[];
  nodeStats: NodeStats | null;
  formatted: string;
  error?: string;
} {
  try {
    const data = JSON.parse(raw) as HealthReportJson & { error?: string };
    if (data.error) {
      return { vms: [], nodeStats: null, formatted: raw, error: String(data.error) };
    }

    const vms: VmRow[] = (data.vms ?? []).map(mapVmFromReport);

    let nodeStats: NodeStats | null = null;
    if (data.nodeStatus) {
      const ns = data.nodeStatus;
      const cpu = Number(ns.cpu);
      const maxcpu = Number(ns.maxcpu);
      const mem = Number(ns.mem);
      const maxmem = Number(ns.maxmem);
      nodeStats = {
        node: ns.node,
        status: ns.status,
        cpuPercent: maxcpu ? (cpu / maxcpu) * 100 : cpu * 100,
        memPercent: maxmem ? (mem / maxmem) * 100 : 0,
        uptime: Number(ns.uptime) || 0,
        loadavg: (ns.loadavg ?? []).map((l) => Number(l)).filter((n) => Number.isFinite(n)),
      };
    }

    const lines = vms.map((v) => {
      const issues = v.issues.length ? v.issues.join(", ") : "ok";
      const ga = v.guestAgent ? "GA✓" : "GA·";
      const os = v.osLabel ?? "—";
      const cpu = v.cpuPercent != null ? `${v.cpuPercent}%` : "—";
      const ram = v.memPercent != null ? `${v.memPercent}%` : "—";
      const cores = v.cpus != null ? `${v.cpus}c` : "";
      return `  VM ${v.vmid} ${v.name} [${v.status}] ${os} ${cores} CPU ${cpu} RAM ${ram} ${ga} — ${issues}`;
    });

    const header = [
      `Inventory @ ${data.generatedAt ?? "unknown"}`,
      data.node ? `Node: ${data.node}` : "",
      nodeStats
        ? `Host CPU ${nodeStats.cpuPercent.toFixed(0)}%  RAM ${nodeStats.memPercent.toFixed(0)}%  up ${formatUptime(nodeStats.uptime)}`
        : "",
      vms.length ? `${vms.length} VM(s)` : "No VMs returned — check PVE token",
    ].filter(Boolean);

    return {
      vms,
      nodeStats,
      formatted: [...header, ...lines].join("\n"),
    };
  } catch {
    return { vms: [], nodeStats: null, formatted: raw, error: "Invalid PVE response" };
  }
}

/** Load all VMs via fast inventory (no guest-agent probes). */
export async function fetchVmInventory(
  registry: { execute: (name: string, args: Record<string, unknown>) => Promise<string> },
): Promise<{ vms: VmRow[]; nodeStats: NodeStats | null; formatted: string; error?: string }> {
  const raw = await registry.execute("pve_health_report", { all: true, quick: true });
  return parseHealthReport(raw);
}

/** Format VM rows as a compact table string for the logs tab. */
export function formatVmTable(rows: VmRow[]): string {
  if (!rows.length) return "No VMs loaded.";
  const header = "VMID  NAME              OS           CPU   RAM   STATUS";
  const lines = rows.map((v) => {
    const name = v.name.slice(0, 16).padEnd(16);
    const os = (v.osLabel ?? "—").slice(0, 12).padEnd(12);
    const cpu = v.cpuPercent != null ? `${v.cpuPercent}%`.padStart(4) : "  — ";
    const ram = v.memPercent != null ? `${v.memPercent}%`.padStart(4) : "  — ";
    return `${String(v.vmid).padEnd(5)} ${name} ${os} ${cpu} ${ram} ${v.status}`;
  });
  return [header, ...lines].join("\n");
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
  const inflight = useRef<Promise<void> | null>(null);

  const refreshVms = useCallback(async () => {
    if (inflight.current) return inflight.current;

    const run = async () => {
      dispatch({ type: "VMS_LOAD_START" });
      try {
        const config = await loadConfig();
        const registry = new ToolRegistry(config);
        const parsed = await fetchVmInventory(registry);
        if (parsed.error && !parsed.vms.length) {
          dispatch({ type: "VMS_LOAD_ERROR", error: parsed.error });
          return;
        }
        dispatch({
          type: "VMS_LOAD_SUCCESS",
          vms: parsed.vms,
          raw: parsed.formatted,
          nodeStats: parsed.nodeStats,
        });
      } catch (err) {
        dispatch({ type: "VMS_LOAD_ERROR", error: (err as Error).message });
      } finally {
        inflight.current = null;
      }
    };

    inflight.current = run();
    return inflight.current;
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
