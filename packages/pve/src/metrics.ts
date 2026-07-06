/** Parse PVE numeric fields (may be number or string bytes). */
export function toPveNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value.trim());
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/** Host node CPU: PVE reports 0.0–1.0 fraction of total host capacity. */
export function hostCpuToPercent(cpu: number): number {
  if (!Number.isFinite(cpu) || cpu <= 0) return 0;
  if (cpu <= 1.5) return Math.round(cpu * 100);
  return Math.round(Math.min(100, cpu));
}

/**
 * VM CPU from qemu status/current: fraction of allocated vCPUs (can exceed 1.0).
 * Match Proxmox UI: cpu * 100 (% of one core-equivalent; multi-vCPU can show >100).
 */
export function vmCpuToPercent(cpu: number | undefined, _vcpus?: number): number | undefined {
  if (cpu === undefined || !Number.isFinite(cpu) || cpu < 0) return undefined;
  const pct = Math.round(cpu * 100);
  if (pct <= 0) return 0;
  return pct;
}

/** VM CPU from cluster/resources when status/current unavailable. */
export function vmCpuFromCluster(cpu: number | undefined, maxcpu?: number): number | undefined {
  if (cpu === undefined || !Number.isFinite(cpu) || cpu < 0) return undefined;
  const cores = maxcpu && maxcpu > 0 ? maxcpu : 1;
  return Math.min(100, Math.round((cpu / cores) * 100));
}

export function memToPercent(used: number | undefined, max: number | undefined): number | undefined {
  if (used === undefined || !max || max <= 0) return undefined;
  return Math.round((used / max) * 100);
}
