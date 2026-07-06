export const LOGIN_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Mistral PVE — Sign in</title>
  <link rel="stylesheet" href="/assets/app.css" />
</head>
<body class="login-page">
  <div class="login-card">
    <div class="brand">
      <div class="brand-mark">M</div>
      <h1>Mistral PVE</h1>
      <p>Proxmox AI operations dashboard</p>
    </div>
    <div id="setup-hint" class="alert alert-info">{{SETUP_HINT}}</div>
    <div id="err" class="alert alert-error hidden"></div>
    <form id="login">
      <label for="username">Username</label>
      <input id="username" type="text" name="username" autocomplete="username" required autofocus />
      <label for="password">Password</label>
      <input id="password" type="password" name="password" autocomplete="current-password" required />
      <button type="submit" class="btn btn-primary btn-block">Sign in</button>
    </form>
  </div>
  <script>
    (function () {
      var hint = document.getElementById('setup-hint');
      if (!hint.textContent.trim()) hint.classList.add('hidden');
      document.getElementById('login').onsubmit = async function (e) {
        e.preventDefault();
        var username = document.getElementById('username').value;
        var password = document.getElementById('password').value;
        var res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username, password: password }),
        });
        if (res.ok) { window.location.href = '/'; return; }
        var data = await res.json();
        var err = document.getElementById('err');
        err.textContent = data.error || 'Login failed';
        err.classList.remove('hidden');
      };
    })();
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
        <div class="brand-mark sm">M</div>
        <div>
          <strong>Mistral PVE</strong>
          <small id="node-name">pve</small>
        </div>
      </div>
      <nav class="sidebar-nav">
        <button class="nav-item active" data-panel="dashboard">Dashboard</button>
        <button class="nav-item" data-panel="chat">Chat</button>
        <button class="nav-item" data-panel="vms">VMs</button>
        <button class="nav-item" data-panel="alerts">Alerts</button>
        <button class="nav-item" data-panel="approvals">Approvals</button>
        <button class="nav-item" data-panel="logs">Logs</button>
        <button class="nav-item" data-panel="settings">Settings</button>
        <button class="nav-item" data-panel="help">Help</button>
      </nav>
      <div class="sidebar-footer">
        <div id="status-api" class="status-pill">API …</div>
        <div id="status-pve" class="status-pill">PVE …</div>
        <div id="status-daemon" class="status-pill">Daemon …</div>
        <button class="btn btn-ghost btn-sm btn-block" onclick="logout()">Logout</button>
      </div>
    </aside>

    <main class="main">
      <header class="topbar">
        <div>
          <h2 id="page-title">Dashboard</h2>
          <p class="muted" id="public-url"></p>
        </div>
        <div class="topbar-actions">
          <button class="btn btn-secondary" onclick="runCheck()">Run check</button>
          <button class="btn btn-secondary" onclick="refreshAll()">Refresh</button>
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
          <h3>VM overview</h3>
          <div id="dashboard-vms"></div>
        </div>
      </section>

      <section id="panel-chat" class="panel">
        <div id="chat-approval-banner" class="approval-banner hidden">
          <div>
            <strong>Approval required</strong>
            <p id="chat-pending-desc" class="muted"></p>
          </div>
          <div class="btn-row">
            <button class="btn btn-primary" onclick="approvePending()">Approve</button>
            <button class="btn btn-secondary" onclick="denyPending()">Deny</button>
          </div>
        </div>
        <div class="card chat-card">
          <div id="chat-messages" class="chat-messages">
            <p class="muted">Start a conversation with the Mistral agent.</p>
          </div>
          <form id="chat-form" class="chat-input-row" onsubmit="sendChat(event)">
            <input id="chat-input" type="text" placeholder="Message the agent…" autocomplete="off" />
            <button type="submit" class="btn btn-primary" id="chat-send">Send</button>
          </form>
        </div>
      </section>

      <section id="panel-vms" class="panel">
        <div class="card">
          <div class="card-header">
            <h3>Virtual machines</h3>
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
            <label>SMTP host<input id="smtp_host" placeholder="smtp.gmail.com" /></label>
            <label>Port<input id="smtp_port" type="number" value="587" /></label>
            <label>Username<input id="smtp_user" /></label>
            <label>Password<input id="smtp_pass" type="password" /></label>
            <label>From<input id="smtp_from" /></label>
            <label>To (comma-separated)<input id="alert_to" /></label>
          </div>
          <div class="btn-row">
            <button class="btn btn-primary" onclick="saveAlerts()">Save email</button>
            <button class="btn btn-secondary" onclick="testEmail()">Test email</button>
          </div>
        </div>
        <div class="card">
          <h3>Slack</h3>
          <label>Webhook URL<input id="slack_webhook" type="password" placeholder="https://hooks.slack.com/…" /></label>
          <div class="btn-row">
            <button class="btn btn-primary" onclick="saveAlerts()">Save Slack</button>
            <button class="btn btn-secondary" onclick="testAlert()">Test alert</button>
          </div>
        </div>
        <div class="card">
          <h3>Recent daemon alerts</h3>
          <pre id="recent_alerts" class="code-block">Loading…</pre>
        </div>
      </section>

      <section id="panel-approvals" class="panel">
        <div class="card">
          <h3>Pending approvals</h3>
          <div id="approvals-content">
            <p class="muted">No pending actions.</p>
          </div>
        </div>
      </section>

      <section id="panel-logs" class="panel">
        <div class="card">
          <h3>Tool execution log</h3>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Tool</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Preview</th>
                </tr>
              </thead>
              <tbody id="tool-log-tbody">
                <tr><td colspan="5" class="muted">No tool activity yet.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="panel-settings" class="panel">
        <div class="card">
          <h3>LLM</h3>
          <div class="form-grid">
            <label>Provider
              <select id="llm_provider">
                <option value="mistral">mistral</option>
                <option value="openrouter">openrouter</option>
              </select>
            </label>
            <label>Model<input id="llm_model" /></label>
            <label>API key (blank = keep)<input id="llm_api_key" type="password" /></label>
          </div>
          <div class="btn-row">
            <button class="btn btn-primary" onclick="saveLlm()">Save LLM</button>
            <button class="btn btn-secondary" onclick="testLlm()">Test API</button>
          </div>
        </div>
        <div class="card">
          <h3>Web UI</h3>
          <div class="form-grid">
            <label>Admin username<input id="admin_username" /></label>
            <label>Bind mode
              <select id="bind_mode">
                <option value="lan">LAN</option>
                <option value="tailscale">Tailscale</option>
                <option value="localhost">localhost</option>
              </select>
            </label>
            <label>Port<input id="web_port" type="number" min="1" max="65535" /></label>
            <label>New password (8+ chars)<input id="web_password" type="password" autocomplete="new-password" /></label>
          </div>
          <p class="muted" id="network-hint"></p>
          <div class="btn-row">
            <button class="btn btn-primary" onclick="saveWeb()">Save web settings</button>
          </div>
        </div>
        <div class="card">
          <h3>Proxmox VE</h3>
          <p class="muted">On the Proxmox host, Mistral uses <code>pvesh</code> as root. Remote: set <code>MISTRAL_PVE_TOKEN_SECRET</code> in <code>/etc/mistral/secrets.env</code></p>
          <div class="btn-row">
            <button class="btn btn-secondary" onclick="testPve()">Test Proxmox API</button>
          </div>
          <pre id="pve-test-result" class="code-block hidden"></pre>
        </div>
      </section>

      <section id="panel-help" class="panel">
        <div class="card">
          <h3>Slash commands</h3>
          <p class="muted">Available in the terminal TUI (<code>mistral</code>). Type <code>/</code> then Tab to complete.</p>
          <pre id="help-commands" class="code-block help-block"></pre>
        </div>
      </section>
    </main>
  </div>

  <script src="/assets/app.js"></script>
</body>
</html>`;

export const APP_CSS = `
:root {
  --bg: #f8fafc;
  --bg-elevated: #ffffff;
  --bg-sidebar: #ffffff;
  --border: #e2e8f0;
  --border-strong: #cbd5e1;
  --text: #0f172a;
  --muted: #64748b;
  --primary: #4f46e5;
  --primary-hover: #4338ca;
  --primary-soft: #eef2ff;
  --success: #16a34a;
  --success-soft: #dcfce7;
  --warning: #d97706;
  --warning-soft: #fef3c7;
  --error: #dc2626;
  --error-soft: #fee2e2;
  --info-soft: #e0e7ff;
  --radius: 10px;
  --shadow: 0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04);
  --sidebar-w: 248px;
  --font: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: var(--font);
  background: var(--bg);
  color: var(--text);
  font-size: 0.9375rem;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
code {
  background: var(--primary-soft);
  color: var(--primary);
  padding: 0.12rem 0.35rem;
  border-radius: 4px;
  font-size: 0.85em;
}
.muted { color: var(--muted); font-size: 0.875rem; }
.hidden { display: none !important; }

.brand-mark {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--primary), #7c3aed);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.1rem;
  flex-shrink: 0;
}
.brand-mark.sm { width: 2rem; height: 2rem; font-size: 0.9rem; border-radius: 8px; }

.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(160deg, #eef2ff 0%, var(--bg) 45%);
}
.login-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 2rem;
  width: 100%;
  max-width: 400px;
  box-shadow: var(--shadow);
}
.brand { text-align: center; margin-bottom: 1.5rem; }
.brand .brand-mark { margin: 0 auto 0.75rem; }
.brand h1 { margin: 0 0 0.25rem; font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em; }
.brand p { margin: 0; color: var(--muted); font-size: 0.875rem; }

.app { display: flex; min-height: 100vh; }
.sidebar {
  width: var(--sidebar-w);
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 1rem 0.75rem;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 10;
}
.sidebar-brand {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  padding: 0 0.5rem 1rem;
  border-bottom: 1px solid var(--border);
  margin-bottom: 0.75rem;
}
.sidebar-brand strong { display: block; font-size: 0.95rem; }
.sidebar-brand small { display: block; color: var(--muted); font-size: 0.75rem; }
.sidebar-nav { flex: 1; display: flex; flex-direction: column; gap: 0.15rem; overflow-y: auto; }
.nav-item {
  background: none;
  border: none;
  color: var(--muted);
  text-align: left;
  padding: 0.55rem 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  font-family: inherit;
  transition: background 0.12s, color 0.12s;
}
.nav-item:hover { background: #f1f5f9; color: var(--text); }
.nav-item.active {
  background: var(--primary-soft);
  color: var(--primary);
  font-weight: 600;
}
.sidebar-footer {
  border-top: 1px solid var(--border);
  padding-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.status-pill {
  font-size: 0.7rem;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  background: #f1f5f9;
  color: var(--muted);
  font-weight: 600;
  letter-spacing: 0.01em;
}
.status-pill.ok { background: var(--success-soft); color: var(--success); }
.status-pill.err { background: var(--error-soft); color: var(--error); }
.status-pill.warn { background: var(--warning-soft); color: var(--warning); }

.main { margin-left: var(--sidebar-w); flex: 1; padding: 1.5rem 2rem; min-width: 0; }
.topbar { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem; gap: 1rem; }
.topbar h2 { margin: 0; font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em; }
.topbar-actions { display: flex; gap: 0.5rem; flex-shrink: 0; }

.panel { display: none; }
.panel.active { display: block; }
.card {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.25rem;
  margin-bottom: 1rem;
  box-shadow: var(--shadow);
}
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.card h3 { margin: 0 0 1rem; font-size: 0.95rem; font-weight: 600; color: var(--text); }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.stat-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1rem;
  box-shadow: var(--shadow);
}
.stat-card .label {
  color: var(--muted);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 600;
}
.stat-card .value { font-size: 1.6rem; font-weight: 700; margin-top: 0.2rem; letter-spacing: -0.02em; }
.stat-card .value.ok { color: var(--success); }
.stat-card .value.warn { color: var(--warning); }
.stat-card .value.err { color: var(--error); }

.table-wrap { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.data-table th {
  text-align: left;
  padding: 0.55rem 0.75rem;
  color: var(--muted);
  border-bottom: 1px solid var(--border);
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.data-table td { padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--border); }
.data-table tr:hover td { background: #f8fafc; }
.badge {
  display: inline-block;
  padding: 0.12rem 0.5rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: lowercase;
}
.badge-running { background: var(--success-soft); color: var(--success); }
.badge-stopped { background: #f1f5f9; color: var(--muted); }
.badge-other { background: var(--warning-soft); color: var(--warning); }
.badge-running, .badge-done { background: var(--success-soft); color: var(--success); }
.badge-error { background: var(--error-soft); color: var(--error); }

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}
label {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--muted);
}
input, select, textarea {
  padding: 0.5rem 0.65rem;
  border-radius: 8px;
  border: 1px solid var(--border-strong);
  background: var(--bg-elevated);
  color: var(--text);
  font-family: inherit;
  font-size: 0.875rem;
  transition: border-color 0.12s, box-shadow 0.12s;
}
input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
}
.btn-row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.btn {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.875rem;
  font-family: inherit;
  transition: background 0.12s, color 0.12s;
}
.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:hover { background: var(--primary-hover); }
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
.btn-secondary { background: #f1f5f9; color: var(--text); border: 1px solid var(--border); }
.btn-secondary:hover { background: #e2e8f0; }
.btn-ghost { background: transparent; color: var(--muted); border: 1px solid var(--border); }
.btn-ghost:hover { background: #f8fafc; color: var(--text); }
.btn-sm { padding: 0.35rem 0.7rem; font-size: 0.8rem; }
.btn-block { width: 100%; }

.alert { padding: 0.75rem 1rem; border-radius: var(--radius); margin-bottom: 1rem; font-size: 0.875rem; }
.alert-error { background: var(--error-soft); border: 1px solid #fecaca; color: #991b1b; }
.alert-info { background: var(--info-soft); border: 1px solid #c7d2fe; color: #3730a3; }
.code-block {
  background: #f8fafc;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1rem;
  overflow: auto;
  font-size: 0.8rem;
  white-space: pre-wrap;
  font-family: ui-monospace, "Cascadia Code", "Segoe UI Mono", monospace;
  margin: 0;
}
.help-block { max-height: 70vh; }
.vm-mini-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem; }
.vm-mini {
  background: #f8fafc;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.75rem;
  font-size: 0.85rem;
}

.approval-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1rem;
  margin-bottom: 1rem;
  background: var(--warning-soft);
  border: 1px solid #fcd34d;
  border-radius: var(--radius);
}
.approval-banner p { margin: 0.25rem 0 0; font-size: 0.8rem; }
.approval-card {
  background: #fffbeb;
  border: 1px solid #fcd34d;
  border-radius: var(--radius);
  padding: 1rem;
  margin-bottom: 0.75rem;
}

.chat-card { display: flex; flex-direction: column; min-height: 420px; padding: 0; overflow: hidden; }
.chat-messages {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  max-height: 55vh;
  min-height: 280px;
}
.chat-msg {
  margin-bottom: 0.75rem;
  padding: 0.65rem 0.85rem;
  border-radius: 10px;
  max-width: 85%;
  font-size: 0.875rem;
  line-height: 1.45;
}
.chat-msg.user { background: var(--primary-soft); margin-left: auto; border-bottom-right-radius: 2px; }
.chat-msg.assistant { background: #f1f5f9; border-bottom-left-radius: 2px; }
.chat-msg.system { background: var(--warning-soft); font-size: 0.8rem; max-width: 100%; }
.chat-msg .meta { font-size: 0.65rem; color: var(--muted); margin-bottom: 0.2rem; }
.chat-input-row {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--border);
  background: #fafbfc;
}
.chat-input-row input { flex: 1; }

@media (max-width: 768px) {
  .sidebar { width: 100%; position: relative; border-right: none; border-bottom: 1px solid var(--border); }
  .main { margin-left: 0; padding: 1rem; }
  .app { flex-direction: column; }
  .sidebar-nav { flex-direction: row; flex-wrap: wrap; }
}
`;

export const APP_JS = `
var TITLES = {
  dashboard: 'Dashboard',
  chat: 'Chat',
  vms: 'VMs',
  alerts: 'Alerts',
  approvals: 'Approvals',
  logs: 'Logs',
  settings: 'Settings',
  help: 'Help'
};

var HELP_TEXT = [
  'Chat:',
  '  /help            Show all slash commands',
  '  /clear           Clear chat history',
  '  /exit            Exit the TUI',
  '  /export          Export chat (text|markdown|json)',
  '  /keys            Show keyboard shortcuts',
  '',
  'Model & LLM:',
  '  /model [name]    Show or change LLM model',
  '  /models          List available models',
  '  /provider        Show or set LLM provider',
  '  /temperature     Show or set temperature (0–2)',
  '  /apikey          Show or set API key',
  '',
  'Proxmox VMs:',
  '  /report          Run VM health report',
  '  /check           Run daemon health checks now',
  '  /vms             Open VMs tab and refresh',
  '  /vm <vmid>       Detailed status for one VM',
  '  /node            PVE host CPU/RAM/load status',
  '  /start <vmid>    Start a VM (requires approval)',
  '  /stop <vmid>     Stop a VM (requires approval)',
  '  /reboot <vmid>   Reboot a VM (requires approval)',
  '  /ping <vmid>     Guest-agent ping',
  '  /console <vmid>  Get noVNC console URL',
  '  /watch <ids>     Set daemon watched VM IDs',
  '',
  'Admin & Config:',
  '  /config          Show config summary',
  '  /bind            Show web UI bind address',
  '  /setup           Re-run setup wizard',
  '  /test-email      Send SMTP test email',
  '  /test-pve        Test Proxmox API',
  '  /test-alert      Send test alert',
  '  /daemon          Daemon status or report',
  '  /theme           Show or set UI theme',
  '  /themes          List available themes',
  '',
  'Navigation:',
  '  /tab <name>      Switch to a tab',
  '  /settings        Open settings tab',
  '  /alerts          Open alerts tab',
  '  /approvals       Open approvals tab',
  '  /dashboard       Open dashboard',
  '  /logs            Open tool log viewer',
  '  /palette         Open command palette'
].join('\\n');

var dashData = null;
var chatBusy = false;

document.getElementById('help-commands').textContent = HELP_TEXT;

document.querySelectorAll('.nav-item').forEach(function (btn) {
  btn.onclick = function () {
    document.querySelectorAll('.nav-item').forEach(function (b) { b.classList.remove('active'); });
    document.querySelectorAll('.panel').forEach(function (p) { p.classList.remove('active'); });
    btn.classList.add('active');
    var panel = btn.dataset.panel;
    document.getElementById('panel-' + panel).classList.add('active');
    document.getElementById('page-title').textContent = TITLES[panel] || panel;
  };
});

async function api(path, opts) {
  var res = await fetch(path, opts);
  if (res.status === 401) { window.location.href = '/login'; return null; }
  return res.json();
}

function showError(msg) {
  var el = document.getElementById('global-error');
  if (!msg) { el.classList.add('hidden'); el.textContent = ''; return; }
  el.textContent = msg;
  el.classList.remove('hidden');
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function statusBadge(id, state, label) {
  var el = document.getElementById(id);
  el.textContent = label;
  el.className = 'status-pill ' + state;
}

function statusClass(s) {
  if (s === 'running' || s === 'done') return 'badge-running';
  if (s === 'stopped') return 'badge-stopped';
  if (s === 'error') return 'badge-error';
  return 'badge-other';
}

function pct(v) { return v != null ? Math.round(v) + '%' : '—'; }

function formatUptime(sec) {
  if (!sec) return '—';
  var d = Math.floor(sec / 86400);
  var h = Math.floor((sec % 86400) / 3600);
  return d ? d + 'd ' + h + 'h' : h + 'h';
}

function formatTime(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString(); } catch (e) { return iso; }
}

function stat(label, value, cls) {
  return '<div class="stat-card"><div class="label">' + label + '</div><div class="value ' + (cls || '') + '">' + value + '</div></div>';
}

function pendingDesc(p) {
  if (!p) return '';
  var args = p.args || {};
  var parts = Object.keys(args).map(function (k) { return k + '=' + JSON.stringify(args[k]); });
  return p.name + (parts.length ? ' (' + parts.join(', ') + ')' : '');
}

function renderVmRow(v) {
  var issues = (v.issues && v.issues.length) ? v.issues.join(', ') : '—';
  return '<tr>' +
    '<td>' + v.vmid + '</td>' +
    '<td><strong>' + escapeHtml(v.name) + '</strong></td>' +
    '<td>' + escapeHtml(v.osLabel || v.ostype || '—') + '</td>' +
    '<td><span class="badge ' + statusClass(v.status) + '">' + escapeHtml(v.status) + '</span></td>' +
    '<td>' + pct(v.cpuPercent) + '</td>' +
    '<td>' + pct(v.memPercent) + '</td>' +
    '<td>' + (v.cpus != null ? v.cpus : '—') + '</td>' +
    '<td class="muted">' + escapeHtml(issues) + '</td></tr>';
}

function renderChatMessages(messages) {
  var el = document.getElementById('chat-messages');
  if (!messages || !messages.length) {
    el.innerHTML = '<p class="muted">Start a conversation with the Mistral agent.</p>';
    return;
  }
  el.innerHTML = messages.map(function (m) {
    return '<div class="chat-msg ' + m.role + '">' +
      '<div class="meta">' + escapeHtml(m.role) + ' · ' + formatTime(m.at) + '</div>' +
      escapeHtml(m.content) + '</div>';
  }).join('');
  el.scrollTop = el.scrollHeight;
}

function renderPending(pending) {
  var banner = document.getElementById('chat-approval-banner');
  var desc = document.getElementById('chat-pending-desc');
  var approvals = document.getElementById('approvals-content');

  if (pending) {
    var text = pendingDesc(pending);
    banner.classList.remove('hidden');
    desc.textContent = text;
    approvals.innerHTML =
      '<div class="approval-card">' +
      '<strong>' + escapeHtml(pending.name) + '</strong>' +
      '<p class="muted">' + escapeHtml(text) + '</p>' +
      '<div class="btn-row">' +
      '<button class="btn btn-primary" onclick="approvePending()">Approve</button>' +
      '<button class="btn btn-secondary" onclick="denyPending()">Deny</button>' +
      '</div></div>';
  } else {
    banner.classList.add('hidden');
    desc.textContent = '';
    approvals.innerHTML = '<p class="muted">No pending actions.</p>';
  }
}

function renderToolLogs(logs) {
  var tbody = document.getElementById('tool-log-tbody');
  if (!logs || !logs.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="muted">No tool activity yet.</td></tr>';
    return;
  }
  tbody.innerHTML = logs.slice().reverse().map(function (l) {
    return '<tr>' +
      '<td class="muted">' + formatTime(l.at) + '</td>' +
      '<td><strong>' + escapeHtml(l.name) + '</strong></td>' +
      '<td><span class="badge ' + statusClass(l.status) + '">' + escapeHtml(l.status) + '</span></td>' +
      '<td>' + (l.duration != null ? l.duration + 'ms' : '—') + '</td>' +
      '<td class="muted">' + escapeHtml(l.preview || '—') + '</td></tr>';
  }).join('');
}

function renderDashboard(data) {
  dashData = data;
  if (data.error) showError(data.error);
  else showError('');

  var vms = data.vms || [];
  var node = data.nodeStatus;
  var running = vms.filter(function (v) { return v.status === 'running'; }).length;
  var issues = vms.reduce(function (n, v) { return n + (v.issues && v.issues.length ? v.issues.length : 0); }, 0);

  document.getElementById('public-url').textContent = data.publicUrl ? 'Web UI: ' + data.publicUrl : '';
  if (data.node) document.getElementById('node-name').textContent = data.node;

  statusBadge('status-api', data.apiKeySet ? 'ok' : 'err', data.apiKeySet ? '● LLM API' : '○ LLM API');
  statusBadge('status-pve', data.pveOk ? 'ok' : 'err',
    data.pveOk ? (data.pveLocal ? '● PVE local' : '● PVE connected') : '○ PVE error');
  var daemonLabel = data.daemonEnabled
    ? '● Daemon (' + (data.daemonInterval || '?') + 'm)'
    : '○ Daemon off';
  statusBadge('status-daemon', data.daemonEnabled ? 'ok' : 'warn', daemonLabel);

  document.getElementById('stats-grid').innerHTML = [
    stat('VMs running', running + '/' + vms.length, running > 0 ? 'ok' : ''),
    stat('Issues', issues, issues > 0 ? 'warn' : 'ok'),
    stat('Node CPU', node ? Math.round(node.cpuPercent) + '%' : '—', ''),
    stat('Node RAM', node ? Math.round(node.memPercent) + '%' : '—', ''),
    stat('Last check', data.lastCheckAt ? formatTime(data.lastCheckAt) : '—', '')
  ].join('');

  document.getElementById('node-stats').innerHTML = node
    ? 'CPU ' + node.cpuPercent.toFixed(1) + '% · RAM ' + node.memPercent.toFixed(1) + '% · Uptime ' + formatUptime(node.uptime) + ' · Status ' + escapeHtml(node.status)
    : 'Node stats unavailable';

  document.getElementById('dashboard-vms').innerHTML = vms.length
    ? '<div class="vm-mini-grid">' + vms.map(function (v) {
        return '<div class="vm-mini"><strong>VM ' + v.vmid + ' ' + escapeHtml(v.name) + '</strong><br/>' +
          '<span class="badge ' + statusClass(v.status) + '">' + escapeHtml(v.status) + '</span> ' +
          escapeHtml(v.osLabel || '') + '<br/>CPU ' + pct(v.cpuPercent) + ' · RAM ' + pct(v.memPercent) + '</div>';
      }).join('') + '</div>'
    : '<p class="muted">No VMs loaded. Check PVE connection in Settings.</p>';

  document.getElementById('vm-count').textContent = vms.length + ' VM(s)';
  document.getElementById('vm-tbody').innerHTML = vms.length
    ? vms.map(renderVmRow).join('')
    : '<tr><td colspan="8" class="muted">No VMs — configure PVE and refresh</td></tr>';

  if (data.recentAlerts) {
    document.getElementById('recent_alerts').textContent =
      data.recentAlerts.length ? JSON.stringify(data.recentAlerts, null, 2) : 'No recent alerts.';
  }

  if (data.config) {
    document.getElementById('llm_provider').value = data.config.llm.provider || 'mistral';
    document.getElementById('llm_model').value = data.config.llm.model || '';
    var e = (data.config.alerts && data.config.alerts.email) || {};
    document.getElementById('smtp_host').value = e.smtp_host || '';
    document.getElementById('smtp_port').value = e.smtp_port || 587;
    document.getElementById('smtp_user').value = e.smtp_user || '';
    document.getElementById('smtp_from').value = e.from || '';
    document.getElementById('alert_to').value = (e.to || []).join(', ');
    var w = data.config.web || {};
    document.getElementById('bind_mode').value = w.bind_mode || 'lan';
    document.getElementById('web_port').value = w.port || 8787;
  }
  if (data.adminUsername) {
    document.getElementById('admin_username').value = data.adminUsername;
  }

  renderChatMessages(data.chat);
  renderPending(data.pending);
  renderToolLogs(data.toolLogs);
}

async function refreshAll() {
  var data = await api('/api/dashboard');
  if (data) renderDashboard(data);
}

async function testPve() {
  var data = await api('/api/test/pve', { method: 'POST' });
  var el = document.getElementById('pve-test-result');
  el.classList.remove('hidden');
  el.textContent = JSON.stringify(data, null, 2);
  if (data && data.ok) refreshAll();
}

async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/login';
}

async function saveLlm() {
  await api('/api/config/llm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: document.getElementById('llm_provider').value,
      model: document.getElementById('llm_model').value,
      api_key: document.getElementById('llm_api_key').value
    })
  });
  alert('LLM settings saved');
  refreshAll();
}

async function saveAlerts() {
  await api('/api/config/alerts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      smtp_host: document.getElementById('smtp_host').value,
      smtp_port: Number(document.getElementById('smtp_port').value),
      smtp_user: document.getElementById('smtp_user').value,
      smtp_pass: document.getElementById('smtp_pass').value,
      from: document.getElementById('smtp_from').value,
      to: document.getElementById('alert_to').value.split(',').map(function (s) { return s.trim(); }).filter(Boolean),
      slack_webhook: document.getElementById('slack_webhook').value
    })
  });
  alert('Alert settings saved');
}

async function saveWeb() {
  var body = {
    bind_mode: document.getElementById('bind_mode').value,
    port: Number(document.getElementById('web_port').value),
    admin_username: document.getElementById('admin_username').value
  };
  var pw = document.getElementById('web_password').value;
  if (pw) body.password = pw;
  var res = await api('/api/config/web', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (res && res.ok) {
    alert('Web settings saved' + (res.publicUrl ? '. URL: ' + res.publicUrl : ''));
    document.getElementById('web_password').value = '';
    refreshAll();
  }
}

async function testLlm() { alert(JSON.stringify(await api('/api/test/llm', { method: 'POST' }))); }
async function testAlert() { alert(JSON.stringify(await api('/api/test/alert', { method: 'POST' }))); }
async function testEmail() { alert(JSON.stringify(await api('/api/test/email', { method: 'POST' }))); }

async function runCheck() {
  var res = await api('/api/check', { method: 'POST' });
  if (res) {
    alert('Check complete @ ' + res.checkedAt + '\\nAlerts sent: ' + res.alertsSent);
    refreshAll();
  }
}

async function sendChat(e) {
  e.preventDefault();
  if (chatBusy) return;
  var input = document.getElementById('chat-input');
  var msg = input.value.trim();
  if (!msg) return;
  chatBusy = true;
  document.getElementById('chat-send').disabled = true;
  input.value = '';
  try {
    var res = await api('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg })
    });
    if (res) refreshAll();
  } finally {
    chatBusy = false;
    document.getElementById('chat-send').disabled = false;
    input.focus();
  }
}

async function approvePending() {
  var res = await api('/api/approve', { method: 'POST' });
  if (res && !res.ok && res.error) alert(res.error);
  refreshAll();
}

async function denyPending() {
  await api('/api/deny', { method: 'POST' });
  refreshAll();
}

async function loadNetworkHint() {
  try {
    var net = await api('/api/network');
    if (net) {
      var parts = [];
      if (net.lan) parts.push('LAN: ' + net.lan);
      if (net.tailscale) parts.push('Tailscale: ' + net.tailscale);
      document.getElementById('network-hint').textContent = parts.length ? parts.join(' · ') : '';
    }
  } catch (err) { /* ignore */ }
}

refreshAll();
loadNetworkHint();
setInterval(refreshAll, 30000);
`;
