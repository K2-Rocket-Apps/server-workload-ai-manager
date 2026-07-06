import { z } from "zod";

export const ConfigSchema = z.object({
  pve: z.object({
    host: z.string().url(),
    token_id: z.string(),
    token_secret: z.string(),
    node: z.string().default("pve"),
    insecure: z.boolean().default(true),
  }),
  llm: z.object({
    provider: z.enum(["mistral", "openrouter"]).default("mistral"),
    api_key: z.string(),
    model: z.string().default("mistral-small-latest"),
    temperature: z.number().min(0).max(2).default(0.3),
    max_tokens: z.number().default(2000),
  }),
  alerts: z.object({
    email: z.object({
      enabled: z.boolean().default(false),
      smtp_host: z.string().optional(),
      smtp_port: z.number().default(587),
      smtp_user: z.string().optional(),
      smtp_pass: z.string().optional(),
      smtp_secure: z.boolean().default(false),
      require_tls: z.boolean().default(true),
      from: z.string().default("mistral@k2tec.local"),
      to: z.array(z.string()).default([]),
    }),
    slack: z.object({
      enabled: z.boolean().default(false),
      webhook_url: z.string().optional(),
    }),
  }),
  daemon: z.object({
    enabled: z.boolean().default(true),
    check_interval_minutes: z.number().default(15),
    report_cron: z.string().default("0 7 * * *"),
    watched_vmids: z.array(z.number()).default([121, 122]),
  }),
  policies: z.object({
    require_approval_for: z
      .array(z.enum(["stop", "reboot", "migrate", "guest_exec", "host_exec", "start"]))
      .default(["stop", "reboot", "migrate", "guest_exec", "host_exec"]),
    auto_alert_on: z
      .array(
        z.enum([
          "guest_agent_down",
          "high_cpu",
          "high_mem",
          "disk_full",
          "vm_stopped_unexpected",
        ]),
      )
      .default(["guest_agent_down", "high_cpu", "high_mem", "disk_full", "vm_stopped_unexpected"]),
    guest_exec_unrestricted: z.boolean().default(true),
    guest_exec_allowlist: z.array(z.string()).default([]),
    host_exec_unrestricted: z.boolean().default(true),
    host_exec_allowlist: z.array(z.string()).default([]),
  }),
  migration: z
    .object({
      target_nodes: z.array(z.string()).default([]),
      requires_approval: z.boolean().default(true),
    })
    .default({}),
  web: z
    .object({
      host: z.string().default("0.0.0.0"),
      port: z.number().default(8787),
      bind_mode: z.enum(["lan", "tailscale", "localhost"]).default("lan"),
      public_url: z.string().optional(),
      admin_username: z.string().default("admin"),
      password_hash: z.string().default(""),
      session_secret: z.string().default(""),
    })
    .default({}),
  mcp: z
    .object({
      http_host: z.string().default("127.0.0.1"),
      http_port: z.number().default(8788),
    })
    .default({}),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

export const DEFAULT_CONFIG: AppConfig = {
  pve: {
    host: "https://192.168.0.15:8006",
    token_id: "mistral@pve!agent",
    token_secret: "",
    node: "pve",
    insecure: true,
  },
  llm: {
    provider: "mistral",
    api_key: "",
    model: "mistral-small-latest",
    temperature: 0.3,
    max_tokens: 2000,
  },
  alerts: {
    email: {
      enabled: false,
      smtp_port: 587,
      smtp_secure: false,
      require_tls: true,
      from: "mistral@k2tec.local",
      to: [],
    },
    slack: { enabled: false },
  },
  daemon: {
    enabled: true,
    check_interval_minutes: 15,
    report_cron: "0 7 * * *",
    watched_vmids: [121, 122],
  },
  policies: {
    require_approval_for: ["stop", "reboot", "migrate", "guest_exec", "host_exec"],
    auto_alert_on: ["guest_agent_down", "high_cpu", "high_mem", "disk_full", "vm_stopped_unexpected"],
    guest_exec_unrestricted: true,
    guest_exec_allowlist: [],
    host_exec_unrestricted: true,
    host_exec_allowlist: [],
  },
  migration: { target_nodes: [], requires_approval: true },
  web: { host: "0.0.0.0", port: 8787, bind_mode: "lan", admin_username: "admin", password_hash: "", session_secret: "" },
  mcp: { http_host: "127.0.0.1", http_port: 8788 },
};
