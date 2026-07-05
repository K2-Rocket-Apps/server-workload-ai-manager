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
import { createPveClient } from "@mistral/pve";
import { ToolRegistry } from "@mistral/mcp";
import { AlertDispatcher } from "@mistral/alerts";
import { loadState } from "@mistral/daemon";

const LOGIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Mistral PVE — Login</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0f1419; color: #e7e9ea; }
    .card { background: #16181c; border: 1px solid #2f3336; border-radius: 16px; padding: 2rem; width: 100%; max-width: 380px; }
    h1 { margin: 0 0 0.25rem; font-size: 1.25rem; color: #1d9bf0; }
    p { margin: 0 0 1.5rem; color: #71767b; font-size: 0.9rem; }
    label { display: block; margin-bottom: 0.25rem; font-size: 0.85rem; color: #71767b; }
    input { width: 100%; padding: 0.65rem; border-radius: 8px; border: 1px solid #2f3336; background: #0f1419; color: #e7e9ea; margin-bottom: 1rem; }
    button { width: 100%; padding: 0.65rem; border-radius: 999px; border: none; background: #1d9bf0; color: #fff; font-weight: 600; cursor: pointer; }
    .err { color: #f4212e; font-size: 0.85rem; margin-bottom: 1rem; display: none; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Mistral PVE</h1>
    <p>Enter your web UI password to continue.</p>
    <div id="err" class="err"></div>
    <form id="login">
      <label for="password">Password</label>
      <input id="password" type="password" autocomplete="current-password" required autofocus />
      <button type="submit">Sign in</button>
    </form>
  </div>
  <script>
    document.getElementById('login').onsubmit = async (e) => {
      e.preventDefault();
      const password = document.getElementById('password').value;
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) { window.location.href = '/'; return; }
      const data = await res.json();
      const err = document.getElementById('err');
      err.textContent = data.error || 'Login failed';
      err.style.display = 'block';
    };
  </script>
</body>
</html>`;

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Mistral PVE Settings</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; margin: 0; background: #0f1419; color: #e7e9ea; }
    header { padding: 1rem 1.5rem; border-bottom: 1px solid #2f3336; display: flex; justify-content: space-between; align-items: center; }
    h1 { margin: 0; font-size: 1.25rem; color: #1d9bf0; }
    main { padding: 1.5rem; max-width: 960px; }
    section { margin-bottom: 2rem; background: #16181c; border-radius: 12px; padding: 1.25rem; border: 1px solid #2f3336; }
    h2 { margin-top: 0; font-size: 1rem; }
    label { display: block; margin: 0.5rem 0 0.25rem; font-size: 0.85rem; color: #71767b; }
    input, select, textarea { width: 100%; padding: 0.5rem; border-radius: 8px; border: 1px solid #2f3336; background: #0f1419; color: #e7e9ea; }
    button { margin-top: 0.75rem; margin-right: 0.5rem; padding: 0.5rem 1rem; border-radius: 999px; border: none; background: #1d9bf0; color: #fff; cursor: pointer; font-weight: 600; }
    button.secondary { background: #2f3336; }
    .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
    .card { background: #0f1419; border: 1px solid #2f3336; border-radius: 8px; padding: 1rem; }
    .ok { color: #00ba7c; }
    .warn { color: #ffad1f; }
    pre { white-space: pre-wrap; font-size: 0.8rem; background: #0f1419; padding: 0.75rem; border-radius: 8px; overflow: auto; }
    .url { color: #71767b; font-size: 0.85rem; }
  </style>
</head>
<body>
  <header>
    <h1>Mistral PVE Agent</h1>
    <button class="secondary" onclick="logout()">Logout</button>
  </header>
  <main>
    <p class="url" id="public_url"></p>
    <section>
      <h2>Dashboard</h2>
      <div id="dashboard" class="cards">Loading...</div>
      <button onclick="refreshDashboard()">Refresh</button>
    </section>
    <section>
      <h2>Email Alerts (SMTP)</h2>
      <label>SMTP Host</label>
      <input id="smtp_host" placeholder="smtp.gmail.com" />
      <label>SMTP Port</label>
      <input id="smtp_port" type="number" value="587" />
      <label>SMTP Username</label>
      <input id="smtp_user" placeholder="you@gmail.com" />
      <label>SMTP Password / App Password</label>
      <input id="smtp_pass" type="password" placeholder="••••••••" />
      <label>From Address</label>
      <input id="smtp_from" placeholder="mistral@yourdomain.com" />
      <label>Alert Email To (comma-separated)</label>
      <input id="alert_to" placeholder="you@domain.com, ops@domain.com" />
      <button onclick="saveAlerts()">Save Email Settings</button>
      <button class="secondary" onclick="testEmail()">Send Test Email</button>
    </section>
    <section>
      <h2>Slack Alerts</h2>
      <label>Slack Webhook URL</label>
      <input id="slack_webhook" type="password" placeholder="https://hooks.slack.com/..." />
      <button onclick="saveAlerts()">Save Slack</button>
      <button class="secondary" onclick="testAlert()">Send Test Alert (email + Slack)</button>
    </section>
    <section>
      <h2>LLM Settings</h2>
      <label>Provider</label>
      <select id="llm_provider"><option value="mistral">mistral</option><option value="openrouter">openrouter</option></select>
      <label>Model</label>
      <input id="llm_model" />
      <label>API Key (leave blank to keep current)</label>
      <input id="llm_api_key" type="password" placeholder="••••••••" />
      <button onclick="saveLlm()">Save LLM</button>
      <button class="secondary" onclick="testLlm()">Test Mistral API</button>
    </section>
    <section>
      <h2>Recent Alerts</h2>
      <pre id="recent_alerts">Loading...</pre>
    </section>
  </main>
  <script>
    async function api(path, opts) {
      const res = await fetch(path, opts);
      if (res.status === 401) { window.location.href = '/login'; return {}; }
      return res.json();
    }
    async function logout() {
      await fetch('/api/logout', { method: 'POST' });
      window.location.href = '/login';
    }
    async function refreshDashboard() {
      const data = await api('/api/dashboard');
      if (!data.vms) return;
      document.getElementById('public_url').textContent = data.publicUrl ? 'URL: ' + data.publicUrl : '';
      const el = document.getElementById('dashboard');
      el.innerHTML = data.vms.map(v => \`
        <div class="card">
          <strong>VM \${v.vmid} \${v.name}</strong><br/>
          <span class="\${v.issues.length ? 'warn' : 'ok'}">\${v.status}</span><br/>
          GA: \${v.guestAgentAlive ? 'ok' : 'down'}<br/>
          \${v.issues.join('<br/>') || 'No issues'}
        </div>\`).join('');
      document.getElementById('recent_alerts').textContent = JSON.stringify(data.recentAlerts, null, 2);
      if (data.config) {
        document.getElementById('llm_provider').value = data.config.llm.provider;
        document.getElementById('llm_model').value = data.config.llm.model;
        document.getElementById('smtp_host').value = data.config.alerts.email.smtp_host || '';
        document.getElementById('smtp_port').value = data.config.alerts.email.smtp_port || 587;
        document.getElementById('smtp_user').value = data.config.alerts.email.smtp_user || '';
        document.getElementById('smtp_from').value = data.config.alerts.email.from || '';
        document.getElementById('alert_to').value = (data.config.alerts.email.to || []).join(',');
      }
    }
    async function saveLlm() {
      await api('/api/config/llm', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({
        provider: document.getElementById('llm_provider').value,
        model: document.getElementById('llm_model').value,
        api_key: document.getElementById('llm_api_key').value,
      })});
      alert('Saved');
    }
    async function saveAlerts() {
      await api('/api/config/alerts', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({
        smtp_host: document.getElementById('smtp_host').value,
        smtp_port: Number(document.getElementById('smtp_port').value),
        smtp_user: document.getElementById('smtp_user').value,
        smtp_pass: document.getElementById('smtp_pass').value,
        from: document.getElementById('smtp_from').value,
        to: document.getElementById('alert_to').value.split(',').map(s => s.trim()).filter(Boolean),
        slack_webhook: document.getElementById('slack_webhook').value,
      })});
      alert('Saved');
    }
    async function testLlm() { alert(JSON.stringify(await api('/api/test/llm', {method:'POST'}))); }
    async function testAlert() { alert(JSON.stringify(await api('/api/test/alert', {method:'POST'}))); }
    async function testEmail() { alert(JSON.stringify(await api('/api/test/email', {method:'POST'}))); }
    refreshDashboard();
  </script>
</body>
</html>`;

function requireAuth(getConfig: () => Promise<AppConfig>) {
  return async (c: Context, next: Next) => {
    const path = c.req.path;
    if (path === "/login" || path === "/api/login") return next();

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

export function createWebApp(getConfig: () => Promise<AppConfig>) {
  const app = new Hono();

  app.use("*", requireAuth(getConfig));

  app.get("/login", async (c) => {
    const config = await getConfig();
    if (!config.web.password_hash) return c.redirect("/");
    return c.html(LOGIN_HTML);
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

  app.get("/", (c) => c.html(DASHBOARD_HTML));

  app.get("/api/dashboard", async (c) => {
    const config = await getConfig();
    const registry = new ToolRegistry(config);
    const raw = await registry.execute("pve_health_report", {});
    const report = JSON.parse(raw) as { vms: Array<Record<string, unknown>> };
    const state = await loadState(statePath());
    return c.json({
      vms: report.vms,
      recentAlerts: state.recentAlerts,
      lastCheckAt: state.lastCheckAt,
      publicUrl: config.web.public_url,
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
    const pve = createPveClient(toPveConfig(config));
    const vms = await pve.listVms();
    return c.json({ ok: true, count: vms.length });
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
