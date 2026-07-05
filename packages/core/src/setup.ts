import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import type { AppConfig } from "./config.js";
import { hashPassword, generateSessionSecret } from "./auth.js";
import { detectLanIp, detectTailscaleIp, resolveBindHost, type BindMode } from "./network.js";
import { loadConfig, saveConfig, configPath } from "./config-loader.js";

function prompt(rl: readline.Interface, question: string, hidden = false): Promise<string> {
  if (!hidden) return rl.question(question);
  return new Promise((resolve) => {
    process.stdout.write(question);
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    stdin.setRawMode?.(true);
    let value = "";
    const onData = (buf: Buffer) => {
      const ch = buf.toString();
      if (ch === "\n" || ch === "\r" || ch === "\u0004") {
        stdin.setRawMode?.(wasRaw ?? false);
        stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolve(value);
        return;
      }
      if (ch === "\u0003") process.exit(1);
      if (ch === "\u007f") {
        value = value.slice(0, -1);
        return;
      }
      value += ch;
    };
    stdin.on("data", onData);
    stdin.resume();
  });
}

export async function runSetup(options: { nonInteractive?: boolean } = {}): Promise<AppConfig> {
  const config = await loadConfig();
  const rl = readline.createInterface({ input, output });

  console.log("\n=== Mistral PVE Setup ===\n");

  // Web password (required)
  if (!options.nonInteractive) {
    let password = "";
    while (password.length < 8) {
      password = await prompt(rl, "Web UI password (min 8 chars): ", true);
      if (password.length < 8) console.log("Password must be at least 8 characters.");
    }
    const confirm = await prompt(rl, "Confirm password: ", true);
    if (password !== confirm) {
      console.error("Passwords do not match.");
      process.exit(1);
    }
    config.web.password_hash = hashPassword(password);
    config.web.session_secret = generateSessionSecret();
  }

  // Bind mode
  const lan = detectLanIp();
  const tailscale = detectTailscaleIp();
  console.log(`\nDetected LAN IP: ${lan ?? "none"}`);
  console.log(`Detected Tailscale IP: ${tailscale ?? "not installed"}`);
  console.log("\nWeb UI bind address:");
  console.log("  1) LAN — accessible on your local network (recommended)");
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

  // Email
  console.log("\n--- Email alerts (SMTP) ---");
  console.log("Gmail: smtp.gmail.com:587 with an App Password");
  console.log("Mailgun: smtp.mailgun.org:587");
  console.log("Local postfix: localhost:25 (no auth)\n");

  if (!options.nonInteractive) {
    const setupEmail = await rl.question("Configure email alerts now? [Y/n]: ");
    if (setupEmail.toLowerCase() !== "n") {
      config.alerts.email.smtp_host = await rl.question(`SMTP host [${config.alerts.email.smtp_host ?? "smtp.gmail.com"}]: `) || "smtp.gmail.com";
      const portStr = await rl.question(`SMTP port [587]: `);
      config.alerts.email.smtp_port = portStr ? Number(portStr) : 587;
      config.alerts.email.smtp_user = await rl.question("SMTP username (email): ");
      config.alerts.email.smtp_pass = await prompt(rl, "SMTP password / app password: ", true);
      config.alerts.email.from = await rl.question(`From address [${config.alerts.email.from}]: `) || config.alerts.email.from;
      const to = await rl.question("Alert recipients (comma-separated): ");
      config.alerts.email.to = to.split(",").map((s) => s.trim()).filter(Boolean);
      config.alerts.email.enabled = config.alerts.email.to.length > 0;
      config.alerts.email.require_tls = config.alerts.email.smtp_port !== 25;
    }

    const setupSlack = await rl.question("\nConfigure Slack webhook? [y/N]: ");
    if (setupSlack.toLowerCase() === "y") {
      config.alerts.slack.webhook_url = await prompt(rl, "Slack webhook URL: ", true);
      config.alerts.slack.enabled = Boolean(config.alerts.slack.webhook_url);
    }
  }

  await saveConfig(config);
  rl.close();

  console.log("\n=== Setup complete ===");
  console.log(`Config saved: ${configPath()}`);
  console.log(`Web UI: ${config.web.public_url}`);
  console.log(`Test email: mistral test-email`);
  console.log(`Start web:  sudo systemctl enable --now mistral-web\n`);

  return config;
}
