import type { ChatMessage } from "@mistral/core";
import { AgentLoop, loadConfig } from "@mistral/core";
import { ToolRegistry } from "@mistral/mcp";

export type PendingApproval = {
  name: string;
  args: Record<string, unknown>;
};

export type ToolLogRow = {
  id: string;
  name: string;
  status: "running" | "done" | "error";
  at: string;
  duration?: number;
  preview?: string;
};

export type ChatTurn = {
  role: "user" | "assistant" | "system";
  content: string;
  at: string;
};

let chatHistory: ChatMessage[] = [];
let displayMessages: ChatTurn[] = [];
let pendingApproval: PendingApproval | null = null;
let toolLogs: ToolLogRow[] = [];
let logId = 0;

function now() {
  return new Date().toISOString();
}

function isApprovalText(text: string): boolean {
  const t = text.trim().toLowerCase();
  return ["y", "yes", "approve", "ok", "sure", "go"].includes(t) || /^y+$/i.test(t);
}

function isDenialText(text: string): boolean {
  const t = text.trim().toLowerCase();
  return ["n", "no", "deny", "cancel", "reject"].includes(t) || /^n+$/i.test(t);
}

export function getWebSessionState() {
  return {
    messages: displayMessages,
    pending: pendingApproval,
    toolLogs: toolLogs.slice(-50),
  };
}

export async function approveWebPending(): Promise<{ ok: boolean; error?: string; reply?: string }> {
  if (!pendingApproval) return { ok: false, error: "Nothing pending" };
  const config = await loadConfig();
  const registry = new ToolRegistry(config);
  const pending = pendingApproval;
  pendingApproval = null;

  const logEntry: ToolLogRow = {
    id: String(++logId),
    name: pending.name,
    status: "running",
    at: now(),
  };
  toolLogs.push(logEntry);
  const started = Date.now();

  try {
    const result = await registry.execute(
      pending.name,
      { ...pending.args, approved: true },
      { approved: true },
    );
    logEntry.status = "done";
    logEntry.duration = Date.now() - started;
    logEntry.preview = result.slice(0, 200);

    const agent = new AgentLoop(config, registry.definitions(), (n, a, c) =>
      registry.execute(n, a, c),
    );
    const followUp = await agent.run(
      `User approved ${pending.name}. Result:\n${result}\nSummarize for the user.`,
      chatHistory,
      { approved: true },
    );
    chatHistory = followUp.history;
    displayMessages.push({
      role: "assistant",
      content: followUp.reply,
      at: now(),
    });
    if (followUp.pendingApproval) {
      pendingApproval = followUp.pendingApproval;
    }
    return { ok: true, reply: followUp.reply };
  } catch (err) {
    logEntry.status = "error";
    logEntry.duration = Date.now() - started;
    return { ok: false, error: (err as Error).message };
  }
}

export function denyWebPending(): void {
  pendingApproval = null;
  displayMessages.push({
    role: "system",
    content: "Action denied by user.",
    at: now(),
  });
}

export async function runWebChat(
  text: string,
): Promise<{ reply: string; pending: PendingApproval | null }> {
  displayMessages.push({ role: "user", content: text, at: now() });

  if (pendingApproval) {
    if (isApprovalText(text)) {
      const r = await approveWebPending();
      return { reply: r.reply ?? r.error ?? "Done", pending: pendingApproval };
    }
    if (isDenialText(text)) {
      denyWebPending();
      return { reply: "Action denied.", pending: null };
    }
  }

  const config = await loadConfig();
  if (!config.llm.api_key && !process.env.MISTRAL_API_KEY) {
    const msg = "No API key configured. Set MISTRAL_API_KEY or use Settings.";
    displayMessages.push({ role: "system", content: msg, at: now() });
    return { reply: msg, pending: null };
  }

  const registry = new ToolRegistry(config);
  const agent = new AgentLoop(config, registry.definitions(), (name, args, ctx) =>
    registry.execute(name, args, ctx),
  );

  const result = await agent.run(text, chatHistory, {
    onEvent: (ev) => {
      if (ev.type === "tool_start") {
        toolLogs.push({
          id: String(++logId),
          name: ev.name,
          status: "running",
          at: now(),
        });
      }
      if (ev.type === "tool_end") {
        const last = [...toolLogs].reverse().find((l) => l.name === ev.name && l.status === "running");
        if (last) {
          last.status = "done";
          last.preview = ev.result.slice(0, 200);
        }
      }
      if (ev.type === "needs_approval") {
        pendingApproval = { name: ev.name, args: ev.args };
      }
    },
  });

  chatHistory = result.history;
  displayMessages.push({ role: "assistant", content: result.reply, at: now() });
  if (result.pendingApproval) {
    pendingApproval = result.pendingApproval;
  }

  return { reply: result.reply, pending: pendingApproval };
}

export async function runWebCheck(): Promise<{ checkedAt: string; alertsSent: number }> {
  const config = await loadConfig();
  const { MistralDaemon } = await import("@mistral/daemon");
  const daemon = new MistralDaemon(config);
  const result = await daemon.runOnce();
  displayMessages.push({
    role: "system",
    content: `Health check @ ${result.checkedAt} — alerts sent: ${result.alertsSent}`,
    at: now(),
  });
  return result;
}
