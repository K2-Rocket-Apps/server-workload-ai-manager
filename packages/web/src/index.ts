import { Hono } from "hono";
import { serve } from "@hono/node-server";
import type { AppConfig } from "@mistral/core";
import { loadConfig, saveConfig, toPveConfig } from "@mistral/core";
import { createPveClient } from "@mistral/pve";
import { ToolRegistry } from "@mistral/mcp";
import { AlertDispatcher } from "@mistral/alerts";
import { loadState } from "@mistral/daemon";
import { statePath } from "@mistral/core";

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Mistral PVE Settings</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; margin: 0; background: #0f1419; color: #e7e9ea; }
    header { padding: 1rem 1.5rem; border-bottom: 1px solid #2f3336; }
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
    .err { color: #f4212e; }
    pre { white-space: pre-wrap; font-size: 0.8rem; background: #0f1419; padding: 0.75rem; border-radius: 8px; overflow: auto; }
  </style>
</head>
<body>
  <header><h1>Mistral PVE Agent</h1></header>
  <main>
    <section>
      <h2>Dashboard</h2>
      <div id="dashboard" class="cards">Loading...</div>
      <button onclick="refreshDashboard()">Refresh</button>
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
      <h2>Alerts</h2>
      <label>SMTP Host</label>
      <input id="smtp_host" />
      <label>Alert Email To</label>
      <input id="alert_to" />
      <label>Slack Webhook URL</label>
      <input id="slack_webhook" type="password" placeholder="••••••••" />
      <button onclick="saveAlerts()">Save Alerts</button>
      <button class="secondary" onclick="testAlert()">Send Test Alert</button>
    </section>
    <section>
      <h2>Recent Alerts</h2>
      <pre id="recent_alerts">Loading...</pre>
    </section>
  </main>
  <script>
    async function api(path, opts) {
      const res = await fetch(path, opts);
      return res.json();
    }
    async function refreshDashboard() {
      const data = await api('/api/dashboard');
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
        to: document.getElementById('alert_to').value.split(',').map(s => s.trim()).filter(Boolean),
        slack_webhook: document.getElementById('slack_webhook').value,
      })});
      alert('Saved');
    }
    async function testLlm() { alert(JSON.stringify(await api('/api/test/llm', {method:'POST'}))); }
    async function testAlert() { alert(JSON.stringify(await api('/api/test/alert', {method:'POST'}))); }
    async function testPve() { alert(JSON.stringify(await api('/api/test/pve', {method:'POST'}))); }
    refreshDashboard();
  </script>
</body>
</html>`;

export function createWebApp(getConfig: () => Promise<AppConfig>) {
  const app = new Hono();

  app.get("/", (c) => c.html(HTML));

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
      config: {
        llm: { provider: config.llm.provider, model: config.llm.model },
        alerts: { email: { smtp_host: config.alerts.email.smtp_host, to: config.alerts.email.to } },
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
    const body = await c.req.json<{ smtp_host?: string; to?: string[]; slack_webhook?: string }>();
    if (body.smtp_host) {
      config.alerts.email.smtp_host = body.smtp_host;
      config.alerts.email.enabled = true;
    }
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
  const app = createWebApp(async () => loadConfig());
  const host = config.web.host;
  const port = config.web.port;
  serve({ fetch: app.fetch, hostname: host, port });
  console.log(`Web UI at http://${host}:${port}`);
}
