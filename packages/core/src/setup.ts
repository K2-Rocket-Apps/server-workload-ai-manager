import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import type { AppConfig } from "./config.js";
import { hashPassword, generateSessionSecret } from "./auth.js";
import { detectLanIp, detectTailscaleIp, resolveBindHost, type BindMode } from "./network.js";
import { loadConfig, saveConfig, configPath } from "./config-loader.js";
import { LlmClient } from "./llm.js";

/** Masked prompt — echoes * for each character. */
export async function promptMasked(question: string, rl?: readline.Interface): Promise<string> {
  rl?.pause();
  const stdin = input;
  const result = await new Promise<string>((resolve, reject) => {
    process.stdout.write(question);
    const wasRaw = stdin.isRaw;
    if (stdin.isTTY) stdin.setRawMode(true);

    let value = "";
    const cleanup = () => {
      if (stdin.isTTY) stdin.setRawMode(wasRaw ?? false);
      stdin.removeListener("data", onData);
      rl?.resume();
    };

    const onData = (buf: Buffer) => {
      const ch = buf.toString();
      if (ch === "\n" || ch === "\r" || ch === "\u0004") {
        cleanup();
        process.stdout.write("\n");
        resolve(value);
        return;
      }
      if (ch === "\u0003") {
        cleanup();
        reject(new Error("Cancelled"));
        return;
      }
      if (ch === "\u007f" || ch === "\b") {
        if (value.length > 0) {
          value = value.slice(0, -1);
          process.stdout.write("\b \b");
        }
        return;
      }
      if (ch.length === 1 && ch >= " " && ch <= "~") {
        value += ch;
        process.stdout.write("*");
      }
    };

    stdin.on("data", onData);
    stdin.resume();
  });
  return result;
}

export async function runSetup(options: { nonInteractive?: boolean } = {}): Promise<AppConfig> {
  const config = await loadConfig();
  const rl = readline.createInterface({ input, output });

  console.log("\n=== Mistral PVE Setup ===\n");

  if (!options.nonInteractive) {
    // LLM API key (required for chat)
    console.log("--- Mistral API (required for chat) ---");
    console.log("Get a key: https://console.mistral.ai/api-keys/\n");

    const existingKey = config.llm.api_key || process.env.MISTRAL_API_KEY || "";
    if (existingKey) {
      const keep = await rl.question("API key already set. Keep it? [Y/n]: ");
      if (keep.toLowerCase() === "n") {
        config.llm.api_key = await promptMasked("Mistral API key: ", rl);
      }
    } else {
      let apiKey = "";
      while (!apiKey) {
        apiKey = await promptMasked("Mistral API key: ", rl);
        if (!apiKey) console.log("API key is required.");
      }
      config.llm.api_key = apiKey;
    }

    const model = await rl.question(`Model [${config.llm.model}]: `);
    if (model) config.llm.model = model;

    // Quick API test
    const llm = new LlmClient(config.llm);
    if (llm.configured()) {
      process.stdout.write("Testing API key...");
      try {
        await llm.chat([{ role: "user", content: "Reply with exactly: ok" }]);
        console.log(" OK");
      } catch (err) {
        console.log(` FAILED: ${(err as Error).message}`);
        const cont = await rl.question("Continue anyway? [y/N]: ");
        if (cont.toLowerCase() !== "y") process.exit(1);
      }
    }

    // PVE access
    const { createPveClient, isLocalPveHost } = await import("@mistral/pve");
    const { toPveConfig } = await import("./config-loader.js");

    if (isLocalPveHost()) {
      console.log("\n--- Proxmox (local host) ---");
      console.log("Running on PVE — using pvesh as root (no API token needed).");
    } else {
      console.log("\n--- Proxmox API (remote host) ---");
      const pveSet = config.pve.token_secret || process.env.MISTRAL_PVE_TOKEN_SECRET;
      if (!pveSet) {
        const token = await promptMasked("PVE token secret (mistral@pve!agent): ", rl);
        if (token) config.pve.token_secret = token;
      } else {
        console.log("PVE token already configured.");
      }
    }

    process.stdout.write("Testing PVE...");
    try {
      const pve = createPveClient(toPveConfig(config));
      const vms = await pve.listVms();
      const mode = pve.isLocalMode() ? "local pvesh" : "API token";
      console.log(` OK (${vms.length} VMs via ${mode})`);
    } catch (err) {
      console.log(` FAILED: ${(err as Error).message}`);
      const cont = await rl.question("Continue anyway? [y/N]: ");
      if (cont.toLowerCase() !== "y") process.exit(1);
    }

    // Web password
    console.log("\n--- Web UI password ---");
    let password = "";
    while (password.length < 8) {
      password = await promptMasked("Web UI password (min 8 chars): ", rl);
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

  const lan = detectLanIp();
  const tailscale = detectTailscaleIp();
  console.log(`\nDetected LAN IP: ${lan ?? "none"}`);
  console.log(`Detected Tailscale IP: ${tailscale ?? "not installed"}`);
  console.log("\nWeb UI bind address:");
  console.log("  1) LAN — accessible on your local network");
  console.log("  2) Tailscale — accessible via your tailnet only");
  console.log("  3) localhost — SSH tunnel only");

  let bindMode: BindMode = "lan";
  if (!options.nonInteractive) {
    const choice = await rl.question("Choose [1/2/3] (default 1): ");
    bindMode = choice === "2" ? "tailscale" : choice === "3" ? "localhost" : "lan";
  } else {
    bindMode = (process.env.MISTRAL_BIND_MODE as BindMode) || "lan";
  }

  const bind = resolveBindHost(bindMode);
  config.web.bind_mode = bindMode;
  config.web.host = bind.host;
  config.web.public_url = bind.publicUrl.replace(":8787", `:${config.web.port}`);

  console.log("\n--- Email alerts (SMTP) ---");
  console.log("Gmail: smtp.gmail.com:587 with an App Password\n");

  if (!options.nonInteractive) {
    const setupEmail = await rl.question("Configure email alerts now? [Y/n]: ");
    if (setupEmail.toLowerCase() !== "n") {
      config.alerts.email.smtp_host =
        (await rl.question(`SMTP host [${config.alerts.email.smtp_host ?? "smtp.gmail.com"}]: `)) ||
        "smtp.gmail.com";
      const portStr = await rl.question("SMTP port [587]: ");
      config.alerts.email.smtp_port = portStr ? Number(portStr) : 587;
      config.alerts.email.smtp_user = await rl.question("SMTP username (email): ");
      config.alerts.email.smtp_pass = await promptMasked("SMTP password / app password: ", rl);
      config.alerts.email.from =
        (await rl.question(`From address [${config.alerts.email.from}]: `)) || config.alerts.email.from;
      const to = await rl.question("Alert recipients (comma-separated): ");
      config.alerts.email.to = to.split(",").map((s) => s.trim()).filter(Boolean);
      config.alerts.email.enabled = config.alerts.email.to.length > 0;
      config.alerts.email.require_tls = config.alerts.email.smtp_port !== 25;
    }

    const setupSlack = await rl.question("\nConfigure Slack webhook? [y/N]: ");
    if (setupSlack.toLowerCase() === "y") {
      config.alerts.slack.webhook_url = await promptMasked("Slack webhook URL: ", rl);
      config.alerts.slack.enabled = Boolean(config.alerts.slack.webhook_url);
    }
  }

  await saveConfig(config);
  rl.close();

  console.log("\n=== Setup complete ===");
  console.log(`Config saved: ${configPath()}`);
  console.log(`Web UI: ${config.web.public_url}`);
  console.log(`Chat:   mistral`);
  console.log(`Test:   mistral test-email`);
  console.log(`Start:  sudo systemctl enable --now mistral-web mistral-daemon\n`);

  return config;
}
