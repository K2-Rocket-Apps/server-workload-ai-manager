import { execSync } from "node:child_process";
import {
  loadConfig,
  saveConfig,
  applyWebBind,
  runWebSetup,
  isWebPasswordConfigured,
  generateSessionSecret,
  type WebSetupOptions,
} from "@mistral/core";
import { startWebServer } from "@mistral/web";

export type StartWebOptions = WebSetupOptions & {
  foreground?: boolean;
  noSystemd?: boolean;
  reconfigure?: boolean;
  /** Skip setup wizard — only start/enable services (password must already be set). */
  quick?: boolean;
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

  if (options.quick) {
    if (!isWebPasswordConfigured(config)) {
      console.error(
        "Web admin password not set.\nRun interactively (will prompt for password):\n  sudo mistral start web",
      );
      process.exit(1);
    }
    config = applyWebBind(config);
    if (!config.web.session_secret) {
      config.web.session_secret = generateSessionSecret();
    }
    await saveConfig(config);
  } else {
    console.log("\n=== Web dashboard setup ===");
    console.log("You will be asked for an admin username and password.\n");
    config = await runWebSetup({ nonInteractive: false });
  }

  if (!isWebPasswordConfigured(config)) {
    console.error("Cannot start web UI without an admin password.");
    process.exit(1);
  }

  const url = config.web.public_url ?? `http://${config.web.host}:${config.web.port}`;

  if (isRoot() && !options.noSystemd && !options.foreground) {
    console.log("==> Enabling mistral-web + mistral-daemon on boot...");
    enableSystemdServices();
    try {
      execSync("systemctl restart mistral-web.service mistral-daemon.service", { stdio: "ignore" });
    } catch {
      /* services may not exist yet */
    }
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
