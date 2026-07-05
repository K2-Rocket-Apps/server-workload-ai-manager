# Mistral PVE Agent

AI ops agent for your Proxmox VE host. Chat from the terminal, get VM health reports, receive email + Slack alerts, and manage everything from a password-protected web UI on your LAN or Tailscale.

## Install (on your PVE host)

**Repo is private** — `curl` to `raw.githubusercontent.com` will 404. Use a GitHub token with read access.

### Option A — clone + install (recommended)

SSH to PVE as root (`ssh root@100.78.123.108` via Tailscale), then:

```bash
export GITHUB_TOKEN=ghp_YOUR_TOKEN_HERE

git clone https://x-access-token:${GITHUB_TOKEN}@github.com/K2-Rocket-Apps/server-workload-ai-manager.git /opt/mistral
cd /opt/mistral && sudo -E bash infra/install.sh

sudo systemctl enable --now mistral-daemon mistral-web
```

Create a token at: https://github.com/settings/tokens — scope: **repo** (read) on `K2-Rocket-Apps/server-workload-ai-manager`.

### Option B — one-liner (token in env)

```bash
export GITHUB_TOKEN=ghp_YOUR_TOKEN_HERE

curl -fsSL -H "Authorization: Bearer $GITHUB_TOKEN" \
  "https://api.github.com/repos/K2-Rocket-Apps/server-workload-ai-manager/contents/infra/one-click-install.sh?ref=main" \
  | jq -r .content | base64 -d | sudo -E bash
```

### What setup asks you

1. Install Node.js 22 + pnpm
2. Clone the repo to `/opt/mistral` and build
3. **Ask you to set a web UI password** (required, min 8 chars)
4. Let you choose **LAN** (default), **Tailscale**, or **localhost** bind address
5. Optionally configure **SMTP email** and Slack alerts
6. Install `mistral` to `/usr/local/bin` and register systemd services

After install:

```bash
sudo systemctl enable --now mistral-daemon   # background health checks + alerts
sudo systemctl enable --now mistral-web      # password-protected web UI
```

## Web UI access

| Bind mode | URL | Who can reach it |
|-----------|-----|------------------|
| **LAN** (default) | `http://192.168.x.x:8787` | Anyone on your local network |
| **Tailscale** | `http://100.x.x.x:8787` | Devices on your tailnet only |
| **localhost** | `http://127.0.0.1:8787` | SSH tunnel only |

The URL is saved in `/etc/mistral/config.yaml` as `web.public_url`. You must log in with the password you set during setup.

Reconfigure anytime:

```bash
sudo mistral setup
```

## Email alerts (SMTP)

Email is configured during `mistral setup` or in the web UI under **Email Alerts**.

### Gmail example

1. Enable 2FA on your Google account
2. Create an [App Password](https://myaccount.google.com/apppasswords)
3. During setup enter:
   - SMTP host: `smtp.gmail.com`
   - Port: `587`
   - Username: your Gmail address
   - Password: the 16-char app password

Test it:

```bash
sudo mistral test-email
```

### Other providers

| Provider | Host | Port | Notes |
|----------|------|------|-------|
| Gmail | `smtp.gmail.com` | 587 | App password required |
| Mailgun | `smtp.mailgun.org` | 587 | Use SMTP credentials from dashboard |
| SendGrid | `smtp.sendgrid.net` | 587 | Username: `apikey` |
| Local postfix | `localhost` | 25 | No auth, set `require_tls: false` |

Secrets live in `/etc/mistral/secrets.env` (never committed to git).

## CLI commands

```bash
mistral              # chat TUI
mistral report       # VM health report
mistral check        # run checks + send alerts now
mistral setup        # password, bind address, email, Slack
mistral test-email   # verify SMTP works
mistral test-alert   # test email + Slack
mistral config       # show current settings
mistral web          # start web UI manually
mistral mcp          # stdio MCP for Cursor
```

## PVE API token

Create a limited token on your Proxmox host:

```bash
pveum role add MistralAgent -privs "VM.Audit,VM.Monitor,VM.PowerMgmt,Sys.Audit"
pveum user add mistral@pve
pveum aclmod / -user mistral@pve -role MistralAgent
pveum user token add mistral@pve agent --privsep 1
```

Add to `/etc/mistral/secrets.env`:

```bash
MISTRAL_PVE_TOKEN_SECRET=<token-secret-from-above>
MISTRAL_API_KEY=<your-mistral-api-key>
```

## Watched VMs (defaults)

- VM 121 `k3s-cp` @ 192.168.0.125
- VM 122 `k3s-w1` @ 192.168.0.126

Edit in `/etc/mistral/config.yaml` → `daemon.watched_vmids`.

## Development

```bash
git clone https://github.com/K2-Rocket-Apps/server-workload-ai-manager.git
cd server-workload-ai-manager
pnpm install && pnpm build
cp config.example.yaml ~/.config/mistral/config.yaml
mistral setup
```

## Docs

- [CLAUDE.md](CLAUDE.md) — agent context for AI sessions
- [docs/mcp-gateway.md](docs/mcp-gateway.md) — MCP Gateway registration

## Repo

Private — [K2-Rocket-Apps/server-workload-ai-manager](https://github.com/K2-Rocket-Apps/server-workload-ai-manager)
