import type { AppConfig } from "./config.js";
import { LlmClient, type ChatMessage, type ToolDefinition } from "./llm.js";

export type ToolExecutor = (
  name: string,
  args: Record<string, unknown>,
  ctx: { approved?: boolean },
) => Promise<string>;

export type AgentEvent =
  | { type: "tool_start"; name: string; args: Record<string, unknown> }
  | { type: "tool_end"; name: string; result: string }
  | { type: "needs_approval"; name: string; args: Record<string, unknown> }
  | { type: "assistant"; content: string };

export type AgentOptions = {
  maxRounds?: number;
  approved?: boolean;
  onEvent?: (event: AgentEvent) => void;
};

const SYSTEM_PROMPT = `You are Mistral, the K2 Proxmox VE ops agent running on the PVE host.
Prefer read-only health checks before taking action.
For destructive operations (stop, reboot, migrate, guest exec), explain what you plan to do and wait for approval.
Guest exec can run any shell command inside a VM once the user approves — do not refuse commands as "not on the allowlist".
Be concise. Report VM status with vmid, name, and actionable next steps.`;

export class AgentLoop {
  private readonly llm: LlmClient;

  constructor(
    private readonly config: AppConfig,
    private readonly tools: ToolDefinition[],
    private readonly execute: ToolExecutor,
  ) {
    this.llm = new LlmClient(config.llm);
  }

  async run(userMessage: string, history: ChatMessage[] = [], options: AgentOptions = {}): Promise<{
    reply: string;
    history: ChatMessage[];
    pendingApproval?: { name: string; args: Record<string, unknown> };
  }> {
    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history,
      { role: "user", content: userMessage },
    ];

    const maxRounds = options.maxRounds ?? 8;
    let pendingApproval: { name: string; args: Record<string, unknown> } | undefined;

    for (let round = 0; round < maxRounds; round++) {
      const assistant = await this.llm.chat(messages, this.tools);
      messages.push(assistant);

      if (!assistant.tool_calls?.length) {
        const reply = assistant.content ?? "";
        options.onEvent?.({ type: "assistant", content: reply });
        return { reply, history: messages.slice(1), pendingApproval };
      }

      for (const call of assistant.tool_calls) {
        const name = call.function.name;
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function.arguments || "{}") as Record<string, unknown>;
        } catch {
          args = {};
        }

        options.onEvent?.({ type: "tool_start", name, args });

        const needsApproval = this.requiresApproval(name) && !options.approved && !args.approved;
        if (needsApproval) {
          pendingApproval = { name, args };
          options.onEvent?.({ type: "needs_approval", name, args });
          const result = JSON.stringify({
            needs_approval: true,
            action: name,
            message: "User must approve this action in the TUI before proceeding.",
          });
          messages.push({ role: "tool", tool_call_id: call.id, name, content: result });
          options.onEvent?.({ type: "tool_end", name, result });
          continue;
        }

        const result = await this.execute(name, args, { approved: options.approved || Boolean(args.approved) });
        messages.push({ role: "tool", tool_call_id: call.id, name, content: result });
        options.onEvent?.({ type: "tool_end", name, result });
      }
    }

    return {
      reply: "Reached maximum tool rounds. Please try a simpler request.",
      history: messages.slice(1),
      pendingApproval,
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
}
