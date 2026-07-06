import { Agent, fetch as undiciFetch } from "undici";
import { isLocalPveHost, pveshCall } from "./local.js";
import type {
  GuestExecResult,
  GuestExecStatus,
  HealthReport,
  HealthVmReport,
  NodeStatus,
  PveConfig,
  VmStatus,
  VmSummary,
} from "./types.js";

type JsonRecord = Record<string, unknown>;

export class PveClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;
  private readonly defaultNode: string;
  private readonly dispatcher: Agent | undefined;
  private readonly useLocal: boolean;

  constructor(private readonly config: PveConfig) {
    const host = config.host.replace(/\/$/, "");
    this.baseUrl = `${host}/api2/json`;
    this.authHeader = `PVEAPIToken=${config.tokenId}=${config.tokenSecret}`;
    this.defaultNode = config.node ?? "pve";
    this.useLocal = resolveLocalAuth(config);
    if (config.insecure !== false) {
      this.dispatcher = new Agent({ connect: { rejectUnauthorized: false } });
    }
  }

  /** Whether this client talks to PVE via local pvesh (no API token). */
  isLocalMode(): boolean {
    return this.useLocal;
  }

  async listVms(node?: string): Promise<VmSummary[]> {
    const n = node ?? this.defaultNode;
    const data = await this.get<unknown[]>(`/nodes/${n}/qemu`);
    return (data ?? []).map((row) => this.mapVm(row as JsonRecord, n));
  }

  async vmStatus(vmid: number, node?: string): Promise<VmStatus> {
    const n = node ?? this.defaultNode;
    const data = await this.get<JsonRecord>(`/nodes/${n}/qemu/${vmid}/status/current`);
    const config = (await this.get<JsonRecord>(`/nodes/${n}/qemu/${vmid}/config`).catch(() => ({}))) as JsonRecord;
    return {
      ...this.mapVm({ ...data, name: config.name ?? data.name, vmid }, n),
      pid: data.pid as number | undefined,
      qmpstatus: data.qmpstatus as string | undefined,
      lock: data.lock as string | undefined,
    };
  }

  async nodeStatus(node?: string): Promise<NodeStatus> {
    const n = node ?? this.defaultNode;
    const data = await this.get<JsonRecord>(`/nodes/${n}/status`);
    return {
      node: n,
      status: String(data.status ?? "unknown"),
      cpu: Number(data.cpu ?? 0),
      maxcpu: Number(data.maxcpu ?? 0),
      mem: Number(data.mem ?? 0),
      maxmem: Number(data.maxmem ?? 0),
      uptime: Number(data.uptime ?? 0),
      loadavg: toNumArray(data.loadavg),
    };
  }

  async guestAgentPing(vmid: number, node?: string): Promise<boolean> {
    const n = node ?? this.defaultNode;
    try {
      await this.post(`/nodes/${n}/qemu/${vmid}/agent/ping`, {});
      return true;
    } catch {
      return false;
    }
  }

  async guestExec(vmid: number, command: string[], node?: string): Promise<GuestExecResult> {
    const n = node ?? this.defaultNode;
    const data = await this.post<JsonRecord>(`/nodes/${n}/qemu/${vmid}/agent/exec`, { command });
    return { pid: Number(data.pid) };
  }

  async guestExecStatus(vmid: number, pid: number, node?: string): Promise<GuestExecStatus> {
    const n = node ?? this.defaultNode;
    const data = await this.get<JsonRecord>(`/nodes/${n}/qemu/${vmid}/agent/exec-status`, { pid });
    const outdata = data["out-data"] as string | undefined;
    const errdata = data["err-data"] as string | undefined;
    return {
      exited: Boolean(data.exited),
      exitcode: data.exitcode as number | undefined,
      outdata: outdata ? Buffer.from(outdata, "base64").toString("utf8") : undefined,
      errdata: errdata ? Buffer.from(errdata, "base64").toString("utf8") : undefined,
    };
  }

  async guestExecAndWait(
    vmid: number,
    command: string[],
    node?: string,
    timeoutMs = 30_000,
  ): Promise<GuestExecStatus> {
    const { pid } = await this.guestExec(vmid, command, node);
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const status = await this.guestExecStatus(vmid, pid, node);
      if (status.exited) return status;
      await sleep(500);
    }
    throw new Error(`Guest exec timed out after ${timeoutMs}ms`);
  }

  async guestGetIps(vmid: number, node?: string): Promise<string[]> {
    const n = node ?? this.defaultNode;
    try {
      const data = await this.get<JsonRecord>(`/nodes/${n}/qemu/${vmid}/agent/network-get-interfaces`);
      const result = data.result as JsonRecord[] | undefined;
      const ips: string[] = [];
      for (const iface of result ?? []) {
        const entries = iface["ip-addresses"] as JsonRecord[] | undefined;
        for (const entry of entries ?? []) {
          const ip = entry["ip-address"] as string | undefined;
          if (ip && !ip.startsWith("fe80")) ips.push(ip);
        }
      }
      return ips;
    } catch {
      return [];
    }
  }

  consoleUrl(vmid: number, node?: string): string {
    const n = node ?? this.defaultNode;
    const host = this.config.host.replace(/\/$/, "");
    return `${host}/?console=kvm&novnc=1&vmid=${vmid}&node=${n}`;
  }

  async vmStart(vmid: number, node?: string): Promise<void> {
    const n = node ?? this.defaultNode;
    await this.post(`/nodes/${n}/qemu/${vmid}/status/start`, {});
  }

  async vmStop(vmid: number, node?: string): Promise<void> {
    const n = node ?? this.defaultNode;
    await this.post(`/nodes/${n}/qemu/${vmid}/status/stop`, {});
  }

  async vmReboot(vmid: number, node?: string): Promise<void> {
    const n = node ?? this.defaultNode;
    await this.post(`/nodes/${n}/qemu/${vmid}/status/reboot`, {});
  }

  async setVmNote(vmid: number, note: string, node?: string): Promise<void> {
    const n = node ?? this.defaultNode;
    await this.put(`/nodes/${n}/qemu/${vmid}/config`, { description: note });
  }

  async migrateVm(_vmid: number, _targetNode: string, _node?: string): Promise<{ blocked: true; reason: string }> {
    return { blocked: true, reason: "Single-node cluster: live migration not available until additional nodes are added." };
  }

  async healthReport(watchedVmids?: number[]): Promise<HealthReport> {
    const node = this.defaultNode;
    const nodeStatus = await this.nodeStatus(node).catch(() => undefined);
    const vms = await this.listVms(node);
    const filtered = watchedVmids?.length
      ? vms.filter((v) => watchedVmids.includes(v.vmid))
      : vms;

    const reports: HealthVmReport[] = [];
    for (const vm of filtered) {
      reports.push(await this.checkVmHealth(vm));
    }

    return {
      generatedAt: new Date().toISOString(),
      node,
      nodeStatus,
      vms: reports,
    };
  }

  /** Fast inventory of all VMs — no guest-agent probes (for TUI dashboard). */
  async inventoryReport(): Promise<HealthReport> {
    const node = this.defaultNode;
    const [nodeStatus, vms] = await Promise.all([
      this.nodeStatus(node).catch(() => undefined),
      this.listVms(node),
    ]);

    const reports = await Promise.all(
      vms.map(async (vm) => {
        const enriched = await this.enrichVmFromConfig(vm);
        const issues: string[] = [];
        if (vm.status !== "running") issues.push(`VM is ${vm.status}`);

        const cpuPercent = vm.cpu !== undefined ? Math.round(vm.cpu * 100) : undefined;
        const memPercent =
          vm.mem !== undefined && vm.maxmem ? Math.round((vm.mem / vm.maxmem) * 100) : undefined;

        return {
          vmid: vm.vmid,
          name: vm.name,
          status: vm.status,
          node: vm.node,
          guestAgentAlive: false,
          cpuPercent,
          memPercent,
          diskPercent: undefined,
          issues,
          ips: [],
          ostype: enriched.ostype,
          osLabel: enriched.osLabel,
          cpus: enriched.cpus ?? vm.cpus,
          maxmem: vm.maxmem,
          maxdisk: vm.maxdisk,
          uptime: vm.uptime,
          memUsed: vm.mem,
        } satisfies HealthVmReport;
      }),
    );

    return {
      generatedAt: new Date().toISOString(),
      node,
      nodeStatus,
      vms: reports,
    };
  }

  private async enrichVmFromConfig(vm: VmSummary): Promise<{
    ostype?: string;
    osLabel?: string;
    cpus?: number;
  }> {
    try {
      const config = await this.get<JsonRecord>(
        `/nodes/${vm.node}/qemu/${vm.vmid}/config`,
      );
      const ostype = config.ostype ? String(config.ostype) : undefined;
      return {
        ostype,
        osLabel: ostype ? formatOstype(ostype) : undefined,
        cpus: config.cores ? Number(config.cores) : vm.cpus,
      };
    } catch {
      return { cpus: vm.cpus };
    }
  }

  private async checkVmHealth(vm: VmSummary): Promise<HealthVmReport> {
    const issues: string[] = [];
    const guestAgentAlive = vm.status === "running" ? await this.guestAgentPing(vm.vmid, vm.node) : false;

    if (vm.status !== "running") {
      issues.push(`VM is ${vm.status}`);
    }
    if (vm.status === "running" && !guestAgentAlive) {
      issues.push("Guest agent unreachable");
    }

    let diskPercent: number | undefined;
    if (guestAgentAlive) {
      try {
        const result = await this.guestExecAndWait(
          vm.vmid,
          ["/bin/bash", "-c", "df -P / | tail -1 | awk '{print $5}' | tr -d '%'"],
          vm.node,
        );
        const pct = Number(result.outdata?.trim());
        if (!Number.isNaN(pct)) {
          diskPercent = pct;
          if (pct >= 90) issues.push(`Disk usage critical: ${pct}%`);
          else if (pct >= 80) issues.push(`Disk usage high: ${pct}%`);
        }
      } catch {
        // guest exec may fail on Windows VMs etc.
      }
    }

    const cpuPercent = vm.cpu !== undefined ? Math.round(vm.cpu * 100) : undefined;
    const memPercent = vm.mem !== undefined && vm.maxmem ? Math.round((vm.mem / vm.maxmem) * 100) : undefined;

    if (cpuPercent !== undefined && cpuPercent >= 90) issues.push(`CPU high: ${cpuPercent}%`);
    if (memPercent !== undefined && memPercent >= 90) issues.push(`Memory high: ${memPercent}%`);

    const ips = guestAgentAlive ? await this.guestGetIps(vm.vmid, vm.node) : [];

    return {
      vmid: vm.vmid,
      name: vm.name,
      status: vm.status,
      node: vm.node,
      guestAgentAlive,
      cpuPercent,
      memPercent,
      diskPercent,
      issues,
      ips,
    };
  }

  private mapVm(row: JsonRecord, node: string): VmSummary {
    const vmid = Number(row.vmid);
    return {
      vmid,
      name: String(row.name ?? `vm-${vmid}`),
      status: String(row.status ?? "unknown"),
      node,
      cpus: row.cpus != null ? toNum(row.cpus) : undefined,
      maxmem: row.maxmem != null ? toNum(row.maxmem) : undefined,
      maxdisk: row.maxdisk != null ? toNum(row.maxdisk) : undefined,
      uptime: row.uptime != null ? toNum(row.uptime) : undefined,
      cpu: row.cpu != null ? toNum(row.cpu) : undefined,
      mem: row.mem != null ? toNum(row.mem) : undefined,
      disk: row.disk != null ? toNum(row.disk) : undefined,
    };
  }

  private async get<T>(path: string, params?: Record<string, string | number>): Promise<T> {
    if (this.useLocal) {
      const query = params
        ? Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
        : undefined;
      return pveshCall<T>("get", path, query);
    }
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
    }
    const res = await undiciFetch(url, {
      method: "GET",
      headers: { Authorization: this.authHeader },
      dispatcher: this.dispatcher,
    });
    return this.parseResponse<T>(res);
  }

  private async post<T>(path: string, body: JsonRecord): Promise<T> {
    if (this.useLocal) {
      const params: Record<string, string | number | string[]> = {};
      for (const [k, v] of Object.entries(body)) {
        if (Array.isArray(v)) params[k] = v.map(String);
        else if (v != null) params[k] = typeof v === "number" ? v : String(v);
      }
      return pveshCall<T>("create", path, params);
    }
    const res = await undiciFetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      dispatcher: this.dispatcher,
    });
    return this.parseResponse<T>(res);
  }

  private async put<T>(path: string, body: JsonRecord): Promise<T> {
    if (this.useLocal) {
      const params: Record<string, string | number | string[]> = {};
      for (const [k, v] of Object.entries(body)) {
        if (v != null) params[k] = typeof v === "number" ? v : String(v);
      }
      return pveshCall<T>("set", path, params);
    }
    const res = await undiciFetch(`${this.baseUrl}${path}`, {
      method: "PUT",
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      dispatcher: this.dispatcher,
    });
    return this.parseResponse<T>(res);
  }

  private async parseResponse<T>(res: Response): Promise<T> {
    const text = await res.text();
    let json: { data?: T; errors?: unknown };
    try {
      json = JSON.parse(text) as { data?: T; errors?: unknown };
    } catch {
      throw new Error(`PVE API error (${res.status}): ${text.slice(0, 300)}`);
    }
    if (!res.ok) {
      throw new Error(`PVE API error (${res.status}): ${text.slice(0, 300)}`);
    }
    return json.data as T;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function toNum(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toNumArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => toNum(v));
}

const OSTYPE_LABELS: Record<string, string> = {
  other: "Other",
  wxp: "Windows XP",
  w2k: "Windows 2000",
  w2k3: "Windows 2003",
  w2k8: "Windows 2008",
  win7: "Windows 7",
  win8: "Windows 8",
  win10: "Windows 10",
  win11: "Windows 11",
  l24: "Linux 2.4",
  l26: "Linux",
  solaris: "Solaris",
};

function formatOstype(ostype: string): string {
  return OSTYPE_LABELS[ostype] ?? ostype;
}

function resolveLocalAuth(config: PveConfig): boolean {
  if (config.auth === "local") return true;
  if (config.auth === "token") return false;
  if (config.tokenSecret) return false;
  return isLocalPveHost();
}

export function createPveClient(config: PveConfig): PveClient {
  return new PveClient(config);
}

export { isLocalPveHost } from "./local.js";
