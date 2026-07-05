import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** True when this process is on a Proxmox VE node (uses pvesh as root, no API token). */
export function isLocalPveHost(): boolean {
  return existsSync("/etc/pve") && Boolean(pveshBin());
}

function pveshBin(): string | null {
  if (existsSync("/usr/bin/pvesh")) return "/usr/bin/pvesh";
  if (existsSync("/usr/sbin/pvesh")) return "/usr/sbin/pvesh";
  return null;
}

type PveshMethod = "get" | "create" | "set" | "delete";

export async function pveshCall<T = unknown>(
  method: PveshMethod,
  apiPath: string,
  params?: Record<string, string | number | string[]>,
): Promise<T> {
  const bin = pveshBin();
  if (!bin) throw new Error("pvesh not found — not running on a Proxmox host");

  const args = [method, apiPath, "--output-format", "json"];
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      args.push(`--${key}`);
      if (Array.isArray(value)) {
        args.push(JSON.stringify(value));
      } else {
        args.push(String(value));
      }
    }
  }

  try {
    const { stdout } = await execFileAsync(bin, args, {
      maxBuffer: 16 * 1024 * 1024,
      env: process.env,
    });
    const trimmed = stdout.trim();
    if (!trimmed) return null as T;
    return JSON.parse(trimmed) as T;
  } catch (err) {
    const e = err as NodeJS.ErrnoException & { stderr?: string; stdout?: string };
    const detail = (e.stderr || e.stdout || e.message || "pvesh failed").trim();
    throw new Error(`PVE local (${method} ${apiPath}): ${detail.slice(0, 400)}`);
  }
}

export async function detectLocalNode(): Promise<string | undefined> {
  try {
    const nodes = await pveshCall<Array<{ node: string; status: string }>>("get", "/nodes");
    const online = nodes?.find((n) => n.status === "online");
    return online?.node ?? nodes?.[0]?.node;
  } catch {
    return undefined;
  }
}
