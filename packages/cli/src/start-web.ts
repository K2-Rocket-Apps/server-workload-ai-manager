import { execSync } from "node:child_process";
import {
  loadConfig,
  saveConfig,
  applyWebBind,
  runWebSetup,
  webNeedsSetup,
  type WebSetupOptions,
} from "@mistral/core";
import { startWebServer } from "@mistral/web";

export type StartWebOptions = WebSetupOptions & {
  foreground?: boolean;
  noSystemd?: boolean;
};

function isRoot(): boolean {
  return typeof process.getuid === "function" && process.getuid() === 0;
}

function enableSystemdServices(): void {
  execSync("systemctl daemon-reload", { stdio: "inherit" });
  execSync("systemctl enable --now mistral-web.service mistral-daemon.service", {
    stdio: "inherit",
  });
}

function systemdActive(): boolean {
  try {
    const out = execSync("systemctl is-active mistral-web.service", {
      encoding: "utf8",
    }).trim();
    return out === "active";
  } catch {
    return false;
  }
}

/** Setup admin, bind LAN/Tailscale, enable systemd on boot, start web. */
export async function runStartWeb(options: StartWebOptions = {}): Promise<void> {
  let config = await loadConfig();

  if (webNeedsSetup(config)) {
    config = await runWebSetup(options);
  } else {
    config = applyWebBind(config);
    await saveConfig(config);
  }

  const url = config.web.public_url ?? `http://${config.web.host}:${config.web.port}`;

  if (isRoot() && !options.noSystemd && !options.foreground) {
    console.log("==> Enabling mistral-web + mistral-daemon on boot...");
    enableSystemdServices();
    if (systemdActive()) {
      console.log(`\n✓ Web dashboard running at ${url}`);
      console.log(`  Login: ${config.web.admin_username}`);
      console.log("  TUI chat: mistral");
      return;
    }
    console.warn("systemd start failed — starting in foreground.");
  }

  if (!isRoot()) {
    console.log("Tip: sudo mistral start web — enables boot + systemd");
  }
  console.log(`Starting web UI at ${url} (Ctrl+C to stop)`);
  await startWebServer(config);
}
