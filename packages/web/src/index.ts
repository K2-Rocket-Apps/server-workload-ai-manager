import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { secureHeaders } from "hono/secure-headers";
import type { Context, Next } from "hono";
import { serve } from "@hono/node-server";
import type { AppConfig } from "@mistral/core";
import {
  loadConfig,
  saveConfig,
  toPveConfig,
  statePath,
  verifyWebLogin,
  hashPassword,
  generateSessionSecret,
  createSessionToken,
  verifySessionToken,
  applyWebBind,
  detectLanIp,
  detectTailscaleIp,
} from "@mistral/core";
import { createPveClient, isLocalPveHost, hostCpuToPercent } from "@mistral/pve";
import { AlertDispatcher } from "@mistral/alerts";
import { loadState } from "@mistral/daemon";
import { APP_CSS, APP_JS, DASHBOARD_PAGE, LOGIN_PAGE } from "./ui/assets.js";
import {
  approveWebPending,
  denyWebPending,
  getWebSessionState,
  runWebChat,
  runWebCheck,
} from "./session-state.js";

function requireAuth(getConfig: () => Promise<AppConfig>) {
  return async (c: Context, next: Next) => {
    const path = c.req.path;
    if (path === "/login" || path === "/api/login" || path.startsWith("/assets/")) {
      return next();
    }

    const config = await getConfig();
    if (!config.web.password_hash) {
      if (path.startsWith("/api/")) {
        return c.json({ error: "Web not configured. Run: mistral start web" }, 503);
      }
      return c.redirect("/login");
    }

    const token = getCookie(c, "mistral_session");
    if (!token || !verifySessionToken(token, config.web.session_secret)) {
      if (path.startsWith("/api/")) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      return c.redirect("/login");
    }
    return next();
  };
}

async function fetchDashboardData(config: AppConfig) {
  const state = await loadState(statePath());
  const session = getWebSessionState();
  const base = {
    recentAlerts: state.recentAlerts,
    lastCheckAt: state.lastCheckAt,
    publicUrl: config.web.public_url,
    bindMode: config.web.bind_mode,
    adminUsername: config.web.admin_username,
    apiKeySet: Boolean(config.llm.api_key),
    daemonEnabled: config.daemon.enabled,
    daemonInterval: config.daemon.check_interval_minutes,
    watchedVmids: config.daemon.watched_vmids,
    node: config.pve.node,
    pveOk: false,
    pveLocal: isLocalPveHost(),
    vms: [] as Array<Record<string, unknown>>,
    nodeStatus: null as {
      cpuPercent: number;
      memPercent: number;
      uptime: number;
      status: string;
    } | null,
    chat: session.messages.slice(-40),
    pending: session.pending,
    toolLogs: session.toolLogs,
    config: {
      llm: { provider: config.llm.provider, model: config.llm.model },
      web: { bind_mode: config.web.bind_mode, port: config.web.port, host: config.web.host },
      alerts: {
        email: {
          smtp_host: config.alerts.email.smtp_host,
          smtp_port: config.alerts.email.smtp_port,
          smtp_user: config.alerts.email.smtp_user,
          from: config.alerts.email.from,
          to: config.alerts.email.to,
          enabled: config.alerts.email.enabled,
        },
        slack: { enabled: config.alerts.slack.enabled },
      },
    },
  };

  if (!config.pve.token_secret && !isLocalPveHost()) {
    return {
      ...base,
      error:
        "PVE not reachable. Run on Proxmox host or set MISTRAL_PVE_TOKEN_SECRET in /etc/mistral/secrets.env",
      vms: [],
    };
  }

  try {
    const pve = createPveClient(toPveConfig(config));
    const report = await pve.inventoryReport();
    const nodeStatus = report.nodeStatus
      ? {
          cpuPercent: hostCpuToPercent(report.nodeStatus.cpu),
          memPercent: report.nodeStatus.maxmem
            ? (report.nodeStatus.mem / report.nodeStatus.maxmem) * 100
            : 0,
          uptime: report.nodeStatus.uptime,
          status: report.nodeStatus.status,
        }
      : null;

    return {
      ...base,
      pveOk: true,
      pveLocal: pve.isLocalMode(),
      vms: report.vms,
      nodeStatus,
      node: report.node,
    };
  } catch (err) {
    return {
      ...base,
      error: `PVE API failed: ${(err as Error).message}`,
      vms: [],
    };
  }
}

export function createWebApp(getConfig: () => Promise<AppConfig>) {
  const app = new Hono();

  app.use("*", secureHeaders());
  app.use("*", requireAuth(getConfig));

  app.get("/assets/app.css", (c) =>
    c.body(APP_CSS, 200, { "Content-Type": "text/css; charset=utf-8" }),
  );
  app.get("/assets/app.js", (c) =>
    c.body(APP_JS, 200, { "Content-Type": "application/javascript; charset=utf-8" }),
  );

  app.get("/login", async (c) => {
    const config = await getConfig();
    if (!config.web.password_hash) {
      return c.html(LOGIN_PAGE.replace("{{SETUP_HINT}}", "Run on the server: mistral start web"));
    }
    return c.html(LOGIN_PAGE.replace("{{SETUP_HINT}}", ""));
  });

  app.post("/api/login", async (c) => {
    const config = await getConfig();
    const body = await c.req.json<{ username?: string; password?: string }>();
    if (
      !body.username ||
      !body.password ||
      !verifyWebLogin(
        body.username,
        body.password,
        config.web.admin_username || "admin",
        config.web.password_hash,
      )
    ) {
      return c.json({ error: "Invalid username or password" }, 401);
    }
    if (!config.web.session_secret) {
      config.web.session_secret = generateSessionSecret();
      await saveConfig(config);
    }
    const token = createSessionToken(config.web.session_secret);
    setCookie(c, "mistral_session", token, {
      httpOnly: true,
      sameSite: "Strict",
      secure: false,
      maxAge: 86400,
      path: "/",
    });
    return c.json({ ok: true });
  });

  app.post("/api/logout", async (c) => {
    setCookie(c, "mistral_session", "", { httpOnly: true, maxAge: 0, path: "/" });
    return c.json({ ok: true });
  });

  app.get("/", (c) => c.html(DASHBOARD_PAGE));

  app.get("/api/dashboard", async (c) => {
    const config = await getConfig();
    return c.json(await fetchDashboardData(config));
  });

  app.get("/api/network", async (c) => {
    return c.json({
      lan: detectLanIp(),
      tailscale: detectTailscaleIp(),
    });
  });

  app.post("/api/chat", async (c) => {
    const body = await c.req.json<{ message?: string }>();
    if (!body.message?.trim()) return c.json({ error: "Empty message" }, 400);
    const result = await runWebChat(body.message.trim());
    return c.json(result);
  });

  app.post("/api/approve", async (c) => c.json(await approveWebPending()));

  app.post("/api/deny", async (c) => {
    denyWebPending();
    return c.json({ ok: true });
  });

  app.post("/api/check", async (c) => c.json(await runWebCheck()));

  app.post("/api/config/web", async (c) => {
    const config = await getConfig();
    const body = await c.req.json<{
      bind_mode?: "lan" | "tailscale" | "localhost";
      port?: number;
      password?: string;
      admin_username?: string;
    }>();
    if (body.bind_mode) config.web.bind_mode = body.bind_mode;
    if (body.port && body.port > 0) config.web.port = body.port;
    if (body.admin_username?.trim()) config.web.admin_username = body.admin_username.trim();
    if (body.password && body.password.length >= 8) {
      config.web.password_hash = hashPassword(body.password);
    }
    applyWebBind(config);
    await saveConfig(config);
    return c.json({ ok: true, publicUrl: config.web.public_url });
  });

  app.post("/api/config/llm", async (c) => {
    const config = await getConfig();
    const body = await c.req.json<{ provider?: string; model?: string; api_key?: string }>();
    if (body.provider) config.llm.provider = body.provider as "mistral" | "openrouter";
    if (body.model) config.llm.model = body.model;
    if (body.api_key) config.llm.api_key = body.api_key;
    await saveConfig(config);
    return c.json({ ok: true });
  });

  app.post("/api/config/alerts", async (c) => {
    const config = await getConfig();
    const body = await c.req.json<{
      smtp_host?: string;
      smtp_port?: number;
      smtp_user?: string;
      smtp_pass?: string;
      from?: string;
      to?: string[];
      slack_webhook?: string;
    }>();
    if (body.smtp_host) {
      config.alerts.email.smtp_host = body.smtp_host;
      config.alerts.email.enabled = true;
    }
    if (body.smtp_port) config.alerts.email.smtp_port = body.smtp_port;
    if (body.smtp_user) config.alerts.email.smtp_user = body.smtp_user;
    if (body.smtp_pass) config.alerts.email.smtp_pass = body.smtp_pass;
    if (body.from) config.alerts.email.from = body.from;
    if (body.to) {
      config.alerts.email.to = body.to;
      config.alerts.email.enabled = body.to.length > 0;
    }
    if (body.slack_webhook) {
      config.alerts.slack.webhook_url = body.slack_webhook;
      config.alerts.slack.enabled = true;
    }
    await saveConfig(config);
    return c.json({ ok: true });
  });

  app.post("/api/test/pve", async (c) => {
    const config = await getConfig();
    if (!config.pve.token_secret && !isLocalPveHost()) {
      return c.json({ ok: false, error: "Not on Proxmox host and no API token" });
    }
    try {
      const pve = createPveClient(toPveConfig(config));
      const report = await pve.inventoryReport();
      return c.json({ ok: true, count: report.vms.length, vms: report.vms });
    } catch (err) {
      return c.json({ ok: false, error: (err as Error).message });
    }
  });

  app.post("/api/test/llm", async (c) => {
    const config = await getConfig();
    const { LlmClient } = await import("@mistral/core");
    const llm = new LlmClient(config.llm);
    if (!llm.configured()) return c.json({ ok: false, error: "No API key" });
    const msg = await llm.chat([{ role: "user", content: "Reply with exactly: pong" }]);
    return c.json({ ok: true, reply: msg.content });
  });

  app.post("/api/test/email", async (c) => {
    const config = await getConfig();
    const alerts = new AlertDispatcher(config.alerts);
    return c.json(
      await alerts.send({
        subject: "[Mistral PVE] Email test",
        body: "SMTP test from web dashboard.",
        severity: "info",
      }),
    );
  });

  app.post("/api/test/alert", async (c) => {
    const config = await getConfig();
    const alerts = new AlertDispatcher(config.alerts);
    return c.json(
      await alerts.send({
        subject: "[Mistral PVE] Web test",
        body: "Test alert from web dashboard.",
        severity: "info",
      }),
    );
  });

  return app;
}

export async function startWebServer(config: AppConfig): Promise<void> {
  if (!config.web.password_hash) {
    console.warn("WARNING: Web not secured. Run: mistral start web");
  }
  applyWebBind(config);
  const app = createWebApp(async () => loadConfig());
  const host = config.web.host;
  const port = config.web.port;
  serve({ fetch: app.fetch, hostname: host, port });
  const url = config.web.public_url ?? `http://${host}:${port}`;
  console.log(`Web dashboard: ${url}`);
  if (config.web.admin_username) {
    console.log(`Login: ${config.web.admin_username}`);
  }
}
