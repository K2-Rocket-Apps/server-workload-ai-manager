# Server Workload AI Manager

Mistral AI agent for Proxmox VE — MCP tools, Ink TUI, background daemon, email + Slack alerts.

## Install

```bash
pnpm install
pnpm build
sudo ./infra/install.sh
```

## Usage

```bash
mistral              # chat TUI
mistral report       # health report
mistral check        # run checks + alert
mistral web          # settings GUI at :8787
mistral mcp          # stdio MCP for Cursor
mistral mcp --http   # HTTP MCP for gateway
```

## Docs

- [CLAUDE.md](CLAUDE.md) — agent context
- [docs/mcp-gateway.md](docs/mcp-gateway.md) — gateway registration + migration

## License

Private — K2-Rocket-Apps
