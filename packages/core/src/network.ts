import { networkInterfaces } from "node:os";
import { execSync } from "node:child_process";

export type BindMode = "lan" | "tailscale" | "localhost";

export function detectLanIp(): string | undefined {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    if (name === "lo") continue;
    for (const net of nets[name] ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return undefined;
}

export function detectTailscaleIp(): string | undefined {
  try {
    const out = execSync("tailscale ip -4", { encoding: "utf8", timeout: 3000 }).trim();
    return out.split("\n")[0] || undefined;
  } catch {
    return undefined;
  }
}

export function resolveBindHost(mode: BindMode): { host: string; publicUrl: string } {
  const lan = detectLanIp();
  const tailscale = detectTailscaleIp();

  switch (mode) {
    case "lan":
      return {
        host: "0.0.0.0",
        publicUrl: lan ? `http://${lan}:8787` : "http://<lan-ip>:8787",
      };
    case "tailscale":
      if (!tailscale) throw new Error("Tailscale not installed or not connected. Run: tailscale up");
      return {
        host: tailscale,
        publicUrl: `http://${tailscale}:8787`,
      };
    case "localhost":
    default:
      return { host: "127.0.0.1", publicUrl: "http://127.0.0.1:8787" };
  }
}
