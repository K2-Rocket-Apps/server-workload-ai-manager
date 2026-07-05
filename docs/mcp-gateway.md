# MCP Gateway Registration

Register the PVE Mistral MCP server with K2 MCP Gateway so Cursor and other clients can use PVE tools through the central authenticated endpoint.

## Prerequisites

- Mistral agent installed on PVE host
- MCP HTTP transport running locally
- MCP Gateway deployed (see `mcp-gateway` repo)

## 1. Start MCP HTTP on PVE

On the Proxmox host:

```bash
mistral mcp --http
```

This binds `http://127.0.0.1:8788/mcp` (localhost only).

For production, run via systemd (see `infra/systemd/mistral-mcp.service`).

## 2. SSH tunnel (for gateway discovery from another host)

If MCP Gateway runs elsewhere and needs to reach PVE:

```bash
ssh -L 8788:127.0.0.1:8788 root@192.168.0.15
```

## 3. Register in MCP Gateway admin

1. Open MCP Gateway admin console
2. Create product: **Ops** (slug: `ops`)
3. Add server:
   - Name: `pve-mistral`
   - Transport: `streamable_http` or `http`
   - Endpoint: `http://127.0.0.1:8788/mcp` (or tunneled URL)
4. Run **Discover tools** — expect tools prefixed `ops.pve_*`
5. Enable tools per user/grant (read tools for observers, write tools for admins)

## 4. Cursor client config

Point Cursor MCP at the gateway (not direct PVE):

```json
{
  "mcpServers": {
    "k2-gateway": {
      "url": "https://your-gateway.example.com/mcp",
      "headers": {
        "X-Gateway-Token": "your-scoped-token"
      }
    }
  }
}
```

## Tool scopes

| Scope | Tools |
|-------|-------|
| Read | `pve_list_vms`, `pve_vm_status`, `pve_node_status`, `pve_guest_agent_ping`, `pve_guest_get_ips`, `pve_console_url`, `pve_health_report` |
| Write | `pve_vm_start`, `pve_vm_stop`, `pve_vm_reboot`, `pve_guest_exec`, `pve_set_vm_note`, `alert_send` |
| Blocked (single-node) | `pve_migrate_vm` — returns structured blocked response until cluster nodes are configured |

## Migration (future multi-node)

When additional Proxmox nodes join the cluster:

1. Set `migration.target_nodes` in `~/.config/mistral/config.yaml`
2. `pve_migrate_vm` will call `POST /nodes/{node}/qemu/{vmid}/migrate`
3. Always requires approval (`migration.requires_approval: true`)

Example config:

```yaml
migration:
  target_nodes: ["pve2", "pve3"]
  requires_approval: true
```

## Security

- MCP HTTP must bind `127.0.0.1` only on PVE
- Gateway enforces per-user tool ACL and audit log
- Write tools require step-up / approval in both gateway and local TUI policies
