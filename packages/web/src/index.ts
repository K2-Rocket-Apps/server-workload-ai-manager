import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import type { Context, Next } from "hono";
import { serve } from "@hono/node-server";
import type { AppConfig } from "@mistral/core";
import {
  loadConfig,
  saveConfig,
  toPveConfig,
  statePath,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
} from "@mistral/core";
import { createPveClient, isLocalPveHost } from "@mistral/pve";
import { AlertDispatcher } from "@mistral/alerts";
import { loadState } from "@mistral/daemon";
import { APP_CSS, APP_JS, DASHBOARD_PAGE, LOGIN_PAGE } from "./ui/assets.js";

function requireAuth(getConfig: () => Promise<AppConfig>) {
  return async (c: Context, next: Next) => {
    const path = c.req.path;
    if (path === "/login" || path === "/api/login" || path.startsWith("/assets/")) {
      return next();
    }

    const config = await getConfig();
    if (!config.web.password_hash) return next();

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
  const base = {
    recentAlerts: state.recentAlerts,
    lastCheckAt: state.lastCheckAt,
    publicUrl: config.web.public_url,
    apiKeySet: Boolean(config.llm.api_key),
    node: config.pve.node,
    pveOk: false,
    vms: [] as Array<Record<string, unknown>>,
    nodeStatus: null as {
      cpuPercent: number;
      memPercent: number;
      uptime: number;
      status: string;
    } | null,
    config: {
      llm: { provider: config.llm.provider, model: config.llm.model },
      alerts: {
        email: {
          smtp_host: config.alerts.email.smtp_host,
          smtp_port: config.alerts.email.smtp_port,
          smtp_user: config.alerts.email.smtp_user,
          from: config.alerts.email.from,
          to: config.alerts.email.to,
        },
      },
    },
  };

  if (!config.pve.token_secret && !isLocalPveHost()) {
    return {
      ...base,
      error:
        "PVE not reachable. Run on the Proxmox host (uses pvesh as root) or set MISTRAL_PVE_TOKEN_SECRET in /etc/mistral/secrets.env",
      vms: [],
    };
  }

  try {
    const pve = createPveClient(toPveConfig(config));
    const report = await pve.inventoryReport();
    const nodeStatus = report.nodeStatus
      ? {
          cpuPercent: report.nodeStatus.maxcpu
            ? (report.nodeStatus.cpu / report.nodeStatus.maxcpu) * 100
            : report.nodeStatus.cpu * 100,
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

  app.use("*", requireAuth(getConfig));

  app.get("/assets/app.css", (c) =>
    c.body(APP_CSS, 200, { "Content-Type": "text/css; charset=utf-8" }),
  );
  app.get("/assets/app.js", (c) =>
    c.body(APP_JS, 200, { "Content-Type": "application/javascript; charset=utf-8" }),
  );

  app.get("/login", async (c) => {
    const config = await getConfig();
    if (!config.web.password_hash) return c.redirect("/");
    return c.html(LOGIN_PAGE);
  });

  app.post("/api/login", async (c) => {
    const config = await getConfig();
    const body = await c.req.json<{ password?: string }>();
    if (!body.password || !verifyPassword(body.password, config.web.password_hash)) {
      return c.json({ error: "Invalid password" }, 401);
    }
    const token = createSessionToken(config.web.session_secret);
    setCookie(c, "mistral_session", token, {
      httpOnly: true,
      sameSite: "Strict",
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

  app.get("/api/vms", async (c) => {
    const config = await getConfig();
    const data = await fetchDashboardData(config);
    return c.json({
      vms: data.vms,
      error: "error" in data ? data.error : undefined,
      nodeStatus: data.nodeStatus,
    });
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
      return c.json({
        ok: false,
        error: "Not on a Proxmox host and no API token configured",
      });
    }
    try {
      const pve = createPveClient(toPveConfig(config));
      const vms = await pve.listVms();
      const report = await pve.inventoryReport();
      return c.json({ ok: true, count: vms.length, local: pve.isLocalMode(), vms: report.vms });
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
    const result = await alerts.send({
      subject: "[Mistral PVE] Email test",
      body: "If you received this, SMTP is configured correctly.",
      severity: "info",
    });
    return c.json(result);
  });

  app.post("/api/test/alert", async (c) => {
    const config = await getConfig();
    const alerts = new AlertDispatcher(config.alerts);
    const result = await alerts.send({
      subject: "[Mistral PVE] Web UI test",
      body: "Test alert from web settings panel.",
      severity: "info",
    });
    return c.json(result);
  });

  return app;
}

export async function startWebServer(config: AppConfig): Promise<void> {
  if (!config.web.password_hash) {
    console.warn("WARNING: Web UI has no password set. Run: mistral setup");
  }
  const app = createWebApp(async () => loadConfig());
  const host = config.web.host;
  const port = config.web.port;
  serve({ fetch: app.fetch, hostname: host, port });
  const url = config.web.public_url ?? `http://${host}:${port}`;
  console.log(`Web UI at ${url}`);
  if (!config.web.password_hash) {
    console.log("Set a password: mistral setup");
  }
}
