# Mistral PVE Agent

AI ops agent for your Proxmox VE host. Chat from the terminal, get VM health reports, receive email + Slack alerts, and manage everything from a password-protected web UI on your LAN or Tailscale.

## Install (on your PVE host)

SSH to PVE as root, then one command:

```bash
curl -fsSL https://raw.githubusercontent.com/K2-Rocket-Apps/server-workload-ai-manager/main/infra/one-click-install.sh | sudo bash
```

Then start the web dashboard (setup wizard + boot persistence):

```bash
sudo mistral start web
```

### What setup asks you

1. Install Node.js 22 + pnpm
2. Clone the repo to `/opt/mistral` and build
3. **Admin username + password** for the web dashboard (min 8 chars)
4. Let you choose **LAN** (default), **Tailscale**, or **localhost** bind address
5. Optionally configure **SMTP email** and Slack alerts
6. Enable **systemd** so web + daemon start on boot

After install:

```bash
sudo mistral start web      # web dashboard (or re-run setup)
mistral                     # TUI chat in terminal
```

## Web UI access

| Bind mode | URL | Who can reach it |
|-----------|-----|------------------|
| **LAN** (default) | `http://192.168.x.x:8787` | Anyone on your local network |
| **Tailscale** | `http://100.x.x.x:8787` | Devices on your tailnet only |
| **localhost** | `http://127.0.0.1:8787` | SSH tunnel only |

The URL is saved in `/etc/mistral/config.yaml` as `web.public_url`. Log in with the **admin username** and password from setup.

Reconfigure anytime:

```bash
sudo mistral start web --reconfigure
# or full setup:
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

Public — https://github.com/K2-Rocket-Apps/server-workload-ai-manager
