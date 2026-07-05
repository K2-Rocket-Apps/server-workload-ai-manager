export const LOGIN_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Mistral PVE — Login</title>
  <link rel="stylesheet" href="/assets/app.css" />
</head>
<body class="login-page">
  <div class="login-card">
    <div class="brand">
      <span class="brand-icon">◆</span>
      <h1>Mistral PVE</h1>
      <p>Proxmox AI operations</p>
    </div>
    <div id="err" class="alert alert-error hidden"></div>
    <form id="login">
      <label for="password">Password</label>
      <input id="password" type="password" autocomplete="current-password" required autofocus />
      <button type="submit" class="btn btn-primary">Sign in</button>
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
      err.classList.remove('hidden');
    };
  </script>
</body>
</html>`;

export const DASHBOARD_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Mistral PVE Dashboard</title>
  <link rel="stylesheet" href="/assets/app.css" />
</head>
<body>
  <div class="app">
    <aside class="sidebar">
      <div class="sidebar-brand">
        <span class="brand-icon">◆</span>
        <div>
          <strong>Mistral PVE</strong>
          <small id="node-name">pve</small>
        </div>
      </div>
      <nav class="sidebar-nav">
        <button class="nav-item active" data-panel="dashboard">📊 Dashboard</button>
        <button class="nav-item" data-panel="vms">🖥 Virtual Machines</button>
        <button class="nav-item" data-panel="alerts">🔔 Alerts</button>
        <button class="nav-item" data-panel="settings">⚙ Settings</button>
        <button class="nav-item" data-panel="chat">💬 Terminal</button>
      </nav>
      <div class="sidebar-footer">
        <div id="status-api" class="status-pill">API …</div>
        <div id="status-pve" class="status-pill">PVE …</div>
        <button class="btn btn-ghost btn-sm" onclick="logout()">Logout</button>
      </div>
    </aside>

    <main class="main">
      <header class="topbar">
        <div>
          <h2 id="page-title">Dashboard</h2>
          <p class="muted" id="public-url"></p>
        </div>
        <div class="topbar-actions">
          <button class="btn btn-secondary" onclick="refreshAll()">↻ Refresh</button>
          <button class="btn btn-secondary" onclick="testPve()">Test PVE</button>
        </div>
      </header>

      <div id="global-error" class="alert alert-error hidden"></div>

      <section id="panel-dashboard" class="panel active">
        <div class="stats-grid" id="stats-grid"></div>
        <div class="card">
          <h3>Node</h3>
          <div id="node-stats" class="muted">Loading…</div>
        </div>
        <div class="card">
          <h3>VM Overview</h3>
          <div id="dashboard-vms"></div>
        </div>
      </section>

      <section id="panel-vms" class="panel">
        <div class="card">
          <div class="card-header">
            <h3>All Virtual Machines</h3>
            <span class="muted" id="vm-count"></span>
          </div>
          <div class="table-wrap">
            <table class="data-table" id="vm-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>OS</th>
                  <th>Status</th>
                  <th>CPU</th>
                  <th>RAM</th>
                  <th>Cores</th>
                  <th>Issues</th>
                </tr>
              </thead>
              <tbody id="vm-tbody">
                <tr><td colspan="8" class="muted">Loading…</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="panel-alerts" class="panel">
        <div class="card">
          <h3>Email (SMTP)</h3>
          <div class="form-grid">
            <label>SMTP Host<input id="smtp_host" placeholder="smtp.gmail.com" /></label>
            <label>Port<input id="smtp_port" type="number" value="587" /></label>
            <label>Username<input id="smtp_user" /></label>
            <label>Password<input id="smtp_pass" type="password" /></label>
            <label>From<input id="smtp_from" /></label>
            <label>To (comma-separated)<input id="alert_to" /></label>
          </div>
          <div class="btn-row">
            <button class="btn btn-primary" onclick="saveAlerts()">Save Email</button>
            <button class="btn btn-secondary" onclick="testEmail()">Test Email</button>
          </div>
        </div>
        <div class="card">
          <h3>Slack</h3>
          <label>Webhook URL<input id="slack_webhook" type="password" placeholder="https://hooks.slack.com/..." /></label>
          <div class="btn-row">
            <button class="btn btn-primary" onclick="saveAlerts()">Save Slack</button>
            <button class="btn btn-secondary" onclick="testAlert()">Test Alert</button>
          </div>
        </div>
        <div class="card">
          <h3>Recent Daemon Alerts</h3>
          <pre id="recent_alerts" class="code-block">Loading…</pre>
        </div>
      </section>

      <section id="panel-settings" class="panel">
        <div class="card">
          <h3>LLM</h3>
          <div class="form-grid">
            <label>Provider
              <select id="llm_provider"><option value="mistral">mistral</option><option value="openrouter">openrouter</option></select>
            </label>
            <label>Model<input id="llm_model" /></label>
            <label>API Key (blank = keep)<input id="llm_api_key" type="password" /></label>
          </div>
          <div class="btn-row">
            <button class="btn btn-primary" onclick="saveLlm()">Save LLM</button>
            <button class="btn btn-secondary" onclick="testLlm()">Test API</button>
          </div>
        </div>
        <div class="card">
          <h3>PVE Connection</h3>
          <p class="muted">On the Proxmox host, Mistral uses <code>pvesh</code> as root — no API token needed. Remote access: set <code>MISTRAL_PVE_TOKEN_SECRET</code> in <code>/etc/mistral/secrets.env</code></p>
          <div class="btn-row">
            <button class="btn btn-secondary" onclick="testPve()">Test Proxmox API</button>
          </div>
          <pre id="pve-test-result" class="code-block hidden"></pre>
        </div>
      </section>

      <section id="panel-chat" class="panel">
        <div class="card">
          <h3>Terminal Chat</h3>
          <p>SSH to your PVE host and run:</p>
          <pre class="code-block">mistral</pre>
          <p class="muted">Full TUI with slash commands, VM tools, and AI chat.</p>
        </div>
      </section>
    </main>
  </div>

  <script src="/assets/app.js"></script>
</body>
</html>`;

export const APP_CSS = `
:root {
  --bg: #0b0f14;
  --bg-elevated: #12181f;
  --bg-sidebar: #0e1319;
  --border: #1e2a38;
  --text: #e8edf4;
  --muted: #7d8da6;
  --primary: #3b82f6;
  --primary-hover: #2563eb;
  --success: #22c55e;
  --warning: #f59e0b;
  --error: #ef4444;
  --radius: 10px;
  --sidebar-w: 240px;
}
* { box-sizing: border-box; }
body { margin: 0; font-family: 'Segoe UI', system-ui, sans-serif; background: var(--bg); color: var(--text); }
code { background: #1a2332; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.85em; }
.muted { color: var(--muted); font-size: 0.9rem; }
.hidden { display: none !important; }

.login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; }
.login-card { background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 16px; padding: 2rem; width: 100%; max-width: 400px; }
.brand { text-align: center; margin-bottom: 1.5rem; }
.brand-icon { font-size: 2rem; color: var(--primary); }
.brand h1 { margin: 0.5rem 0 0; }
.brand p { margin: 0; color: var(--muted); }

.app { display: flex; min-height: 100vh; }
.sidebar { width: var(--sidebar-w); background: var(--bg-sidebar); border-right: 1px solid var(--border); display: flex; flex-direction: column; padding: 1rem 0.75rem; position: fixed; top: 0; left: 0; bottom: 0; }
.sidebar-brand { display: flex; gap: 0.75rem; align-items: center; padding: 0 0.5rem 1rem; border-bottom: 1px solid var(--border); margin-bottom: 0.75rem; }
.sidebar-brand small { display: block; color: var(--muted); }
.sidebar-nav { flex: 1; display: flex; flex-direction: column; gap: 0.25rem; }
.nav-item { background: none; border: none; color: var(--muted); text-align: left; padding: 0.65rem 0.75rem; border-radius: var(--radius); cursor: pointer; font-size: 0.95rem; }
.nav-item:hover { background: #1a2332; color: var(--text); }
.nav-item.active { background: #1e3a5f; color: var(--primary); font-weight: 600; }
.sidebar-footer { border-top: 1px solid var(--border); padding-top: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; }
.status-pill { font-size: 0.75rem; padding: 0.25rem 0.5rem; border-radius: 999px; background: #1a2332; color: var(--muted); }
.status-pill.ok { color: var(--success); }
.status-pill.err { color: var(--error); }

.main { margin-left: var(--sidebar-w); flex: 1; padding: 1.25rem 1.5rem; }
.topbar { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
.topbar h2 { margin: 0; font-size: 1.35rem; }
.topbar-actions { display: flex; gap: 0.5rem; }

.panel { display: none; }
.panel.active { display: block; }
.card { background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.25rem; margin-bottom: 1rem; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.card h3 { margin: 0 0 1rem; font-size: 1rem; }

.stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 1rem; }
.stat-card { background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius); padding: 1rem; }
.stat-card .label { color: var(--muted); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; }
.stat-card .value { font-size: 1.75rem; font-weight: 700; margin-top: 0.25rem; }
.stat-card .value.ok { color: var(--success); }
.stat-card .value.warn { color: var(--warning); }
.stat-card .value.err { color: var(--error); }

.table-wrap { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.data-table th { text-align: left; padding: 0.6rem 0.75rem; color: var(--muted); border-bottom: 1px solid var(--border); font-weight: 600; }
.data-table td { padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--border); }
.data-table tr:hover td { background: #151c27; }
.badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
.badge-running { background: #14532d; color: #86efac; }
.badge-stopped { background: #374151; color: #9ca3af; }
.badge-other { background: #451a03; color: #fdba74; }

.form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1rem; }
label { display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.85rem; color: var(--muted); }
input, select { padding: 0.55rem 0.65rem; border-radius: 8px; border: 1px solid var(--border); background: var(--bg); color: var(--text); }
.btn-row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.btn { padding: 0.55rem 1.1rem; border-radius: 8px; border: none; cursor: pointer; font-weight: 600; font-size: 0.9rem; }
.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:hover { background: var(--primary-hover); }
.btn-secondary { background: #1e2a38; color: var(--text); }
.btn-ghost { background: transparent; color: var(--muted); border: 1px solid var(--border); }
.btn-sm { padding: 0.35rem 0.75rem; font-size: 0.8rem; }
.alert { padding: 0.85rem 1rem; border-radius: var(--radius); margin-bottom: 1rem; }
.alert-error { background: #3f1515; border: 1px solid var(--error); color: #fecaca; }
.code-block { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; overflow: auto; font-size: 0.8rem; white-space: pre-wrap; }
.vm-mini-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem; }
.vm-mini { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 0.75rem; }
`;

export const APP_JS = `
const TITLES = { dashboard: 'Dashboard', vms: 'Virtual Machines', alerts: 'Alerts', settings: 'Settings', chat: 'Terminal' };

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const panel = btn.dataset.panel;
    document.getElementById('panel-' + panel).classList.add('active');
    document.getElementById('page-title').textContent = TITLES[panel] || panel;
  };
});

async function api(path, opts) {
  const res = await fetch(path, opts);
  if (res.status === 401) { window.location.href = '/login'; return null; }
  return res.json();
}

function showError(msg) {
  const el = document.getElementById('global-error');
  if (!msg) { el.classList.add('hidden'); el.textContent = ''; return; }
  el.textContent = msg;
  el.classList.remove('hidden');
}

function statusBadge(id, ok, label) {
  const el = document.getElementById(id);
  el.textContent = label;
  el.className = 'status-pill ' + (ok ? 'ok' : 'err');
}

function statusClass(s) {
  if (s === 'running') return 'badge-running';
  if (s === 'stopped') return 'badge-stopped';
  return 'badge-other';
}

function pct(v) { return v != null ? v + '%' : '—'; }

function renderVmRow(v) {
  const issues = (v.issues && v.issues.length) ? v.issues.join(', ') : '—';
  return '<tr>' +
    '<td>' + v.vmid + '</td>' +
    '<td><strong>' + escapeHtml(v.name) + '</strong></td>' +
    '<td>' + escapeHtml(v.osLabel || v.ostype || '—') + '</td>' +
    '<td><span class="badge ' + statusClass(v.status) + '">' + v.status + '</span></td>' +
    '<td>' + pct(v.cpuPercent) + '</td>' +
    '<td>' + pct(v.memPercent) + '</td>' +
    '<td>' + (v.cpus ?? '—') + '</td>' +
    '<td class="muted">' + escapeHtml(issues) + '</td></tr>';
}

function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function renderDashboard(data) {
  if (data.error) showError(data.error);
  else showError('');

  const vms = data.vms || [];
  const node = data.nodeStatus;
  const running = vms.filter(v => v.status === 'running').length;
  const issues = vms.reduce((n, v) => n + (v.issues?.length || 0), 0);

  document.getElementById('public-url').textContent = data.publicUrl ? 'Web UI: ' + data.publicUrl : '';
  if (data.node) document.getElementById('node-name').textContent = data.node;

  statusBadge('status-api', data.apiKeySet, data.apiKeySet ? '● LLM API' : '○ LLM API');
  statusBadge('status-pve', data.pveOk, data.pveOk ? (data.pveLocal ? '● PVE local' : '● PVE connected') : '○ PVE error');

  document.getElementById('stats-grid').innerHTML = [
    stat('VMs', running + '/' + vms.length, running > 0 ? 'ok' : ''),
    stat('Issues', issues, issues > 0 ? 'warn' : 'ok'),
    stat('Node CPU', node ? Math.round(node.cpuPercent) + '%' : '—', ''),
    stat('Node RAM', node ? Math.round(node.memPercent) + '%' : '—', ''),
  ].join('');

  document.getElementById('node-stats').innerHTML = node
    ? 'CPU ' + node.cpuPercent.toFixed(1) + '% · RAM ' + node.memPercent.toFixed(1) + '% · Uptime ' + formatUptime(node.uptime)
    : 'Node stats unavailable';

  document.getElementById('dashboard-vms').innerHTML = vms.length
    ? '<div class="vm-mini-grid">' + vms.map(v => 
        '<div class="vm-mini"><strong>VM ' + v.vmid + ' ' + escapeHtml(v.name) + '</strong><br/>' +
        '<span class="badge ' + statusClass(v.status) + '">' + v.status + '</span> ' +
        escapeHtml(v.osLabel || '') + '<br/>CPU ' + pct(v.cpuPercent) + ' RAM ' + pct(v.memPercent) + '</div>'
      ).join('') + '</div>'
    : '<p class="muted">No VMs loaded. Check PVE token in Settings.</p>';

  document.getElementById('vm-count').textContent = vms.length + ' VM(s)';
  document.getElementById('vm-tbody').innerHTML = vms.length
    ? vms.map(renderVmRow).join('')
    : '<tr><td colspan="8" class="muted">No VMs — configure PVE token and refresh</td></tr>';

  if (data.recentAlerts) {
    document.getElementById('recent_alerts').textContent = JSON.stringify(data.recentAlerts, null, 2);
  }
  if (data.config) {
    document.getElementById('llm_provider').value = data.config.llm.provider;
    document.getElementById('llm_model').value = data.config.llm.model;
    const e = data.config.alerts?.email || {};
    document.getElementById('smtp_host').value = e.smtp_host || '';
    document.getElementById('smtp_port').value = e.smtp_port || 587;
    document.getElementById('smtp_user').value = e.smtp_user || '';
    document.getElementById('smtp_from').value = e.from || '';
    document.getElementById('alert_to').value = (e.to || []).join(',');
  }
}

function stat(label, value, cls) {
  return '<div class="stat-card"><div class="label">' + label + '</div><div class="value ' + cls + '">' + value + '</div></div>';
}

function formatUptime(sec) {
  if (!sec) return '—';
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  return d ? d + 'd ' + h + 'h' : h + 'h';
}

async function refreshAll() {
  const data = await api('/api/dashboard');
  if (data) renderDashboard(data);
}

async function testPve() {
  const data = await api('/api/test/pve', { method: 'POST' });
  const el = document.getElementById('pve-test-result');
  el.classList.remove('hidden');
  el.textContent = JSON.stringify(data, null, 2);
  if (data?.ok) refreshAll();
}

async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/login';
}

async function saveLlm() {
  await api('/api/config/llm', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({
    provider: document.getElementById('llm_provider').value,
    model: document.getElementById('llm_model').value,
    api_key: document.getElementById('llm_api_key').value,
  })});
  alert('Saved');
  refreshAll();
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

refreshAll();
setInterval(refreshAll, 30000);
`;
