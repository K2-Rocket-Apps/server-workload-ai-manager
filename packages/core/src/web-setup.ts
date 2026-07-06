import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import type { AppConfig } from "./config.js";
import { hashPassword, generateSessionSecret } from "./auth.js";
import {
  detectLanIp,
  detectTailscaleIp,
  resolveBindHost,
  type BindMode,
} from "./network.js";
import { loadConfig, saveConfig, configPath } from "./config-loader.js";
import { promptMasked } from "./setup.js";

export type WebSetupOptions = {
  nonInteractive?: boolean;
  enableSystemd?: boolean;
  skipPassword?: boolean;
};

function assertInteractiveTty(): void {
  if (!input.isTTY) {
    throw new Error(
      "Interactive setup requires a terminal. SSH in and run: sudo mistral start web",
    );
  }
}

/** Interactive wizard: admin user, password, LAN/Tailscale bind. */
export async function runWebSetup(options: WebSetupOptions = {}): Promise<AppConfig> {
  const config = await loadConfig();
  const interactive = !options.nonInteractive;
  if (interactive) assertInteractiveTty();
  const rl = readline.createInterface({ input, output });

  console.log("\n=== Mistral Web Dashboard Setup ===\n");

  if (!options.skipPassword) {
    if (options.nonInteractive) {
      if (!isWebPasswordConfigured(config)) {
        throw new Error("Web password not set. Run interactively: sudo mistral start web");
      }
    } else {
      const user =
        (await rl.question(`Admin username [${config.web.admin_username || "admin"}]: `)) ||
        config.web.admin_username ||
        "admin";
      config.web.admin_username = user.trim() || "admin";

      console.log("\n--- Admin password (min 8 characters) ---");
      let password = "";
      while (password.length < 8) {
        password = await promptMasked("Password: ", rl);
        if (password.length < 8) console.log("Password must be at least 8 characters.");
      }
      const confirm = await promptMasked("Confirm password: ", rl);
      if (password !== confirm) {
        console.error("Passwords do not match.");
        process.exit(1);
      }
      config.web.password_hash = hashPassword(password);
      config.web.session_secret = generateSessionSecret();
    }
  } else if (!isWebPasswordConfigured(config)) {
    throw new Error("Web password not set. Run: sudo mistral start web");
  } else if (!config.web.session_secret) {
    config.web.session_secret = generateSessionSecret();
  }

  if (!config.web.admin_username) {
    config.web.admin_username = "admin";
  }

  const lan = detectLanIp();
  const tailscale = detectTailscaleIp();
  console.log(`\nDetected LAN IP: ${lan ?? "none"}`);
  console.log(`Detected Tailscale IP: ${tailscale ?? "not connected"}`);
  console.log("\nWhere should the web dashboard listen?");
  console.log("  1) LAN — all interfaces (local network)");
  if (tailscale) {
    console.log(`  2) Tailscale only — bind to ${tailscale}`);
  } else {
    console.log("  2) Tailscale — (not available, install: tailscale up)");
  }
  console.log("  3) localhost — SSH tunnel only");

  let bindMode: BindMode = config.web.bind_mode ?? "lan";
  if (!options.nonInteractive) {
    const defaultChoice = bindMode === "tailscale" ? "2" : bindMode === "localhost" ? "3" : "1";
    const choice = await rl.question(`Choose [1/2/3] (default ${defaultChoice}): `);
    if (choice === "2" && tailscale) bindMode = "tailscale";
    else if (choice === "3") bindMode = "localhost";
    else if (choice === "1" || !choice) bindMode = "lan";
    else if (choice === "2" && !tailscale) {
      console.log("Tailscale not available — using LAN.");
      bindMode = "lan";
    }
  } else {
    bindMode = (process.env.MISTRAL_BIND_MODE as BindMode) || bindMode;
  }

  const portStr = !options.nonInteractive
    ? await rl.question(`Port [${config.web.port}]: `)
    : "";
  if (portStr) {
    const port = Number(portStr);
    if (port > 0 && port < 65536) config.web.port = port;
  }

  const bind = resolveBindHost(bindMode);
  config.web.bind_mode = bindMode;
  config.web.host = bind.host;
  config.web.public_url = bind.publicUrl.replace(":8787", `:${config.web.port}`);

  await saveConfig(config);
  rl.close();

  console.log("\n=== Web setup complete ===");
  console.log(`Config: ${configPath()}`);
  console.log(`Admin:  ${config.web.admin_username}`);
  console.log(`URL:    ${config.web.public_url}`);
  console.log("");

  return config;
}

export function applyWebBind(config: AppConfig): AppConfig {
  const bind = resolveBindHost(config.web.bind_mode);
  config.web.host = bind.host;
  config.web.public_url = bind.publicUrl.replace(":8787", `:${config.web.port}`);
  return config;
}

export function isWebPasswordConfigured(config: AppConfig): boolean {
  const hash = config.web.password_hash?.trim() ?? "";
  if (!hash) return false;
  const colon = hash.indexOf(":");
  if (colon <= 0) return false;
  const digest = hash.slice(colon + 1);
  return digest.length >= 32;
}

export function webNeedsSetup(config: AppConfig): boolean {
  return !isWebPasswordConfigured(config);
}
