import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { parse, stringify } from "yaml";
import { AppConfig, ConfigSchema, DEFAULT_CONFIG } from "./config.js";

const ENV_PATTERN = /\$\{([A-Z0-9_]+)\}/g;

export function configPath(): string {
  return process.env.MISTRAL_CONFIG ?? join(homedir(), ".config", "mistral", "config.yaml");
}

export function statePath(): string {
  return process.env.MISTRAL_STATE ?? join(homedir(), ".local", "share", "mistral", "state.json");
}

export function resolveEnvVars(input: string): string {
  return input.replace(ENV_PATTERN, (_, key: string) => process.env[key] ?? "");
}

function resolveObjectEnv(obj: unknown): unknown {
  if (typeof obj === "string") return resolveEnvVars(obj);
  if (Array.isArray(obj)) return obj.map(resolveObjectEnv);
  if (obj && typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) out[k] = resolveObjectEnv(v);
    return out;
  }
  return obj;
}

export async function loadSecretsEnv(): Promise<void> {
  const candidates = [
    process.env.MISTRAL_SECRETS_FILE,
    "/etc/mistral/secrets.env",
    join(homedir(), ".config", "mistral", "secrets.env"),
  ].filter((p): p is string => Boolean(p));

  for (const path of candidates) {
    try {
      const raw = await readFile(path, "utf8");
      for (const line of raw.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq <= 0) continue;
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (key && process.env[key] === undefined) {
          process.env[key] = val;
        }
      }
      return;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        console.warn(`Warning: could not read secrets file ${path}`);
      }
    }
  }
}

export async function loadConfig(path = configPath()): Promise<AppConfig> {
  await loadSecretsEnv();
  try {
    const raw = await readFile(path, "utf8");
    const parsed = resolveObjectEnv(parse(raw));
    return applyEnvDefaults(ConfigSchema.parse({ ...DEFAULT_CONFIG, ...(parsed as object) }));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      const merged = applyEnvDefaults(DEFAULT_CONFIG);
      await saveConfig(merged, path);
      return merged;
    }
    throw err;
  }
}

export async function saveConfig(config: AppConfig, path = configPath()): Promise<void> {
  const validated = ConfigSchema.parse(config);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, stringify(validated), "utf8");
}

function applyEnvDefaults(config: AppConfig): AppConfig {
  return ConfigSchema.parse({
    ...config,
    pve: {
      ...config.pve,
      token_secret: config.pve.token_secret || process.env.MISTRAL_PVE_TOKEN_SECRET || "",
    },
    llm: {
      ...config.llm,
      api_key:
        config.llm.api_key ||
        process.env.MISTRAL_API_KEY ||
        process.env.OPENROUTER_API_KEY ||
        "",
    },
    alerts: {
      email: {
        ...config.alerts.email,
        smtp_host: config.alerts.email.smtp_host || process.env.SMTP_HOST,
        smtp_user: config.alerts.email.smtp_user || process.env.SMTP_USER,
        smtp_pass: config.alerts.email.smtp_pass || process.env.SMTP_PASS,
        to: config.alerts.email.to.length
          ? config.alerts.email.to
          : process.env.ALERT_EMAIL_TO
            ? [process.env.ALERT_EMAIL_TO]
            : [],
      },
      slack: {
        ...config.alerts.slack,
        webhook_url: config.alerts.slack.webhook_url || process.env.SLACK_WEBHOOK_URL,
      },
    },
  });
}

export function toPveConfig(config: AppConfig) {
  return {
    host: config.pve.host,
    tokenId: config.pve.token_id,
    tokenSecret: config.pve.token_secret,
    node: config.pve.node,
    insecure: config.pve.insecure,
    auth: "auto" as const,
  };
}
