# Server Workload AI Manager (Mistral PVE Agent)

AI ops agent for Proxmox VE. Runs on the PVE host, exposes VM tools via MCP, provides a `mistral` CLI with Ink TUI, and a background daemon for health checks with email + Slack alerts.

## Stack

- TypeScript monorepo (pnpm workspaces)
- Proxmox VE API (token auth)
- Mistral API (OpenAI-compatible tool calling)
- MCP (`@modelcontextprotocol/sdk`)
- Ink TUI + Commander CLI
- Hono web settings UI

## Quick start (dev)

```bash
pnpm install
pnpm build
cp .env.example .env   # fill in secrets
mistral config         # or edit ~/.config/mistral/config.yaml
mistral report
mistral                # chat TUI
```

## Install on PVE host

**One-click (recommended):**

```bash
curl -fsSL https://raw.githubusercontent.com/K2-Rocket-Apps/server-workload-ai-manager/main/infra/one-click-install.sh | sudo bash
```

Or from a local clone:

```bash
sudo ./infra/install.sh
sudo systemctl enable --now mistral-daemon mistral-web
```

Setup wizard prompts for:
- **Web UI password** (required)
- **Bind address**: LAN (default), Tailscale, or localhost
- **SMTP email** and Slack (optional)

## Web UI

Password-protected. URL is `web.public_url` in config (LAN IP or Tailscale IP).

```bash
mistral setup          # reconfigure password / bind / email
mistral test-email     # verify SMTP
```

## Configuration

Config file: `~/.config/mistral/config.yaml`

Secrets via environment variables or `/etc/mistral/secrets.env` (loaded by systemd).

### PVE API token setup

```bash
pveum role add MistralAgent -privs "VM.Audit,VM.Monitor,VM.PowerMgmt,Sys.Audit"
pveum user add mistral@pve
pveum aclmod / -user mistral@pve -role MistralAgent
pveum user token add mistral@pve agent --privsep 1
```

Set `pve.token_id` to `mistral@pve!agent` and `pve.token_secret` from env `MISTRAL_PVE_TOKEN_SECRET`.

## CLI commands

| Command | Description |
|---------|-------------|
| `mistral` | Chat TUI |
| `mistral report` | Health report |
| `mistral check [--vmid N]` | Run checks now |
| `mistral config` | Settings TUI |
| `mistral daemon start\|stop\|status` | Daemon control |
| `mistral mcp` | Stdio MCP server |
| `mistral web` | Settings web UI (:8787) |

## Watched VMs (defaults)

- VM 121 `k3s-cp` @ 192.168.0.125
- VM 122 `k3s-w1` @ 192.168.0.126

## MCP Gateway

See [docs/mcp-gateway.md](docs/mcp-gateway.md) for registering with K2 MCP Gateway.

## Packages

- `@mistral/pve` — Proxmox API client
- `@mistral/core` — Config, Mistral client, agent loop
- `@mistral/mcp` — MCP tool server
- `@mistral/alerts` — Email + Slack
- `@mistral/daemon` — Background health runner
- `@mistral/cli` — `mistral` command
- `@mistral/web` — Settings GUI
