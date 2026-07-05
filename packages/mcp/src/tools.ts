import { createPveClient } from "@mistral/pve";
import type { AppConfig } from "@mistral/core";
import { toPveConfig } from "@mistral/core";
import { AlertDispatcher } from "@mistral/alerts";
import type { ToolDefinition } from "@mistral/core";

type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

const WRITE_TOOLS = new Set([
  "pve_vm_start",
  "pve_vm_stop",
  "pve_vm_reboot",
  "pve_migrate_vm",
  "pve_set_vm_note",
  "pve_guest_exec",
]);

export class ToolRegistry {
  private readonly pve;
  private readonly alerts;
  private schedules: Array<{ vmid: number; cron: string; note?: string }> = [];

  constructor(private readonly config: AppConfig) {
    this.pve = createPveClient(toPveConfig(config));
    this.alerts = new AlertDispatcher(config.alerts);
  }

  definitions(): ToolDefinition[] {
    return [
      tool("pve_list_vms", "List all VMs with status, CPU, RAM, disk.", {}),
      tool("pve_vm_status", "Detailed status for one VM.", {
        vmid: { type: "integer", description: "VM ID" },
      }, ["vmid"]),
      tool("pve_node_status", "Host CPU, RAM, load, uptime.", {}),
      tool("pve_guest_agent_ping", "Check if QEMU guest agent is alive.", {
        vmid: { type: "integer" },
      }, ["vmid"]),
      tool("pve_guest_exec", "Run command in VM via guest agent (PVE 8 array format). Requires approval.", {
        vmid: { type: "integer" },
        command: { type: "array", items: { type: "string" }, description: 'e.g. ["/bin/bash","-c","df -h"]' },
        approved: { type: "boolean", description: "Set true after user approval" },
      }, ["vmid", "command"]),
      tool("pve_guest_get_ips", "Get guest network IPs.", { vmid: { type: "integer" } }, ["vmid"]),
      tool("pve_console_url", "Get noVNC console URL for a VM.", { vmid: { type: "integer" } }, ["vmid"]),
      tool("pve_health_report", "Structured health snapshot for watched VMs.", {
        vmids: { type: "array", items: { type: "integer" }, description: "Optional VM IDs to check" },
      }),
      tool("pve_vm_start", "Start a VM. Requires approval.", {
        vmid: { type: "integer" },
        approved: { type: "boolean" },
      }, ["vmid"]),
      tool("pve_vm_stop", "Stop a VM. Requires approval.", {
        vmid: { type: "integer" },
        approved: { type: "boolean" },
      }, ["vmid"]),
      tool("pve_vm_reboot", "Reboot a VM. Requires approval.", {
        vmid: { type: "integer" },
        approved: { type: "boolean" },
      }, ["vmid"]),
      tool("pve_migrate_vm", "Migrate VM to another node (blocked on single-node).", {
        vmid: { type: "integer" },
        target_node: { type: "string" },
        approved: { type: "boolean" },
      }, ["vmid", "target_node"]),
      tool("pve_set_vm_note", "Set VM description note in PVE.", {
        vmid: { type: "integer" },
        note: { type: "string" },
      }, ["vmid", "note"]),
      tool("alert_send", "Send alert via email and/or Slack now.", {
        subject: { type: "string" },
        body: { type: "string" },
        severity: { type: "string", enum: ["info", "warn", "critical"] },
      }, ["subject", "body"]),
      tool("alert_configure", "Update alert thresholds (in-memory for session).", {
        high_cpu_threshold: { type: "integer" },
        high_mem_threshold: { type: "integer" },
      }),
      tool("schedule_add_check", "Add a per-VM scheduled check note.", {
        vmid: { type: "integer" },
        cron: { type: "string", description: "Cron expression e.g. */30 * * * *" },
        note: { type: "string" },
      }, ["vmid", "cron"]),
    ];
  }

  async execute(name: string, args: Record<string, unknown>, ctx: { approved?: boolean } = {}): Promise<string> {
    try {
      if (WRITE_TOOLS.has(name) && this.requiresApproval(name) && !ctx.approved && !args.approved) {
        return JSON.stringify({
          needs_approval: true,
          action: name,
          args,
          message: "This action requires user approval.",
        });
      }

      const handler = this.handlers()[name];
      if (!handler) return JSON.stringify({ error: `Unknown tool: ${name}` });
      const result = await handler(args);
      return JSON.stringify(result, null, 2);
    } catch (err) {
      return JSON.stringify({ error: (err as Error).message.slice(0, 300) });
    }
  }

  private handlers(): Record<string, ToolHandler> {
    return {
      pve_list_vms: async () => this.pve.listVms(),
      pve_vm_status: async (a) => this.pve.vmStatus(Number(a.vmid)),
      pve_node_status: async () => this.pve.nodeStatus(),
      pve_guest_agent_ping: async (a) => ({ alive: await this.pve.guestAgentPing(Number(a.vmid)) }),
      pve_guest_exec: async (a) => {
        const command = a.command as string[];
        this.assertGuestExecAllowed(command);
        return this.pve.guestExecAndWait(Number(a.vmid), command);
      },
      pve_guest_get_ips: async (a) => ({ ips: await this.pve.guestGetIps(Number(a.vmid)) }),
      pve_console_url: async (a) => ({ url: this.pve.consoleUrl(Number(a.vmid)) }),
      pve_health_report: async (a) => {
        const vmids = a.vmids as number[] | undefined;
        return this.pve.healthReport(vmids ?? this.config.daemon.watched_vmids);
      },
      pve_vm_start: async (a) => {
        await this.pve.vmStart(Number(a.vmid));
        return { ok: true, action: "start", vmid: a.vmid };
      },
      pve_vm_stop: async (a) => {
        await this.pve.vmStop(Number(a.vmid));
        return { ok: true, action: "stop", vmid: a.vmid };
      },
      pve_vm_reboot: async (a) => {
        await this.pve.vmReboot(Number(a.vmid));
        return { ok: true, action: "reboot", vmid: a.vmid };
      },
      pve_migrate_vm: async (a) => {
        if (!this.config.migration.target_nodes.length) {
          return this.pve.migrateVm(Number(a.vmid), String(a.target_node));
        }
        await this.pve.migrateVm(Number(a.vmid), String(a.target_node));
        return { ok: true, vmid: a.vmid, target: a.target_node };
      },
      pve_set_vm_note: async (a) => {
        await this.pve.setVmNote(Number(a.vmid), String(a.note));
        return { ok: true };
      },
      alert_send: async (a) =>
        this.alerts.send({
          subject: String(a.subject),
          body: String(a.body),
          severity: (a.severity as "info" | "warn" | "critical") ?? "info",
        }),
      alert_configure: async (a) => ({ ok: true, configured: a }),
      schedule_add_check: async (a) => {
        const entry = { vmid: Number(a.vmid), cron: String(a.cron), note: a.note as string | undefined };
        this.schedules.push(entry);
        return { ok: true, schedule: entry, all: this.schedules };
      },
    };
  }

  private requiresApproval(toolName: string): boolean {
    const map: Record<string, string> = {
      pve_vm_stop: "stop",
      pve_vm_reboot: "reboot",
      pve_vm_start: "start",
      pve_migrate_vm: "migrate",
      pve_guest_exec: "guest_exec",
    };
    const policy = map[toolName];
    return policy ? this.config.policies.require_approval_for.includes(policy as never) : false;
  }

  private assertGuestExecAllowed(command: string[]): void {
    const joined = command.join(" ");
    const allowed = this.config.policies.guest_exec_allowlist.some((prefix) =>
      joined.includes(prefix),
    );
    if (!allowed) {
      throw new Error(
        `Guest exec not in allowlist. Allowed prefixes: ${this.config.policies.guest_exec_allowlist.join(", ")}`,
      );
    }
  }
}

function tool(
  name: string,
  description: string,
  properties: Record<string, unknown>,
  required: string[] = [],
): ToolDefinition {
  return {
    type: "function",
    function: {
      name,
      description,
      parameters: {
        type: "object",
        properties,
        required: required.length ? required : undefined,
      },
    },
  };
}
