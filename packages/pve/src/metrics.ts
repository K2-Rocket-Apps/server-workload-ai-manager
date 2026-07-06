/** PVE reports host CPU as 0.0–1.0 fraction of total capacity. */
export function hostCpuToPercent(cpu: number): number {
  if (!Number.isFinite(cpu)) return 0;
  if (cpu >= 0 && cpu <= 1.5) return Math.round(cpu * 100);
  return Math.round(Math.min(100, cpu));
}

/** PVE reports VM CPU as fraction of host CPU used by the VM. */
export function vmCpuToPercent(cpu: number | undefined): number | undefined {
  if (cpu === undefined || !Number.isFinite(cpu)) return undefined;
  if (cpu >= 0 && cpu <= 2) return Math.min(100, Math.round(cpu * 100));
  return Math.min(100, Math.round(cpu));
}

export function memToPercent(used: number | undefined, max: number | undefined): number | undefined {
  if (used === undefined || !max) return undefined;
  return Math.round((used / max) * 100);
}
