#!/usr/bin/env node
import { useState, useCallback } from "react";
import { render, Box, Text, useApp, useInput } from "ink";
import TextInput from "ink-text-input";
import Spinner from "ink-spinner";
import { AgentLoop, loadConfig, type ChatMessage } from "@mistral/core";
import { ToolRegistry } from "@mistral/mcp";

type PendingApproval = { name: string; args: Record<string, unknown> };

type ChatProps = {
  onExit: () => void;
};

function ChatApp({ onExit }: ChatProps) {
  const { exit } = useApp();
  const [tab, setTab] = useState<"chat" | "vms" | "alerts" | "settings" | "approvals">("chat");
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [toolLog, setToolLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<PendingApproval | null>(null);
  const [vmReport, setVmReport] = useState<string>("Press 'r' on VMs tab to refresh");

  useInput((inputKey, key) => {
    if (key.tab) {
      const tabs: typeof tab[] = ["chat", "vms", "alerts", "settings", "approvals"];
      const idx = tabs.indexOf(tab);
      setTab(tabs[(idx + 1) % tabs.length]!);
    }
    if (key.escape) {
      onExit();
      exit();
    }
    if (tab === "vms" && inputKey === "r") {
      void refreshVms();
    }
    if (tab === "approvals" && pending && inputKey === "y") {
      void approvePending();
    }
    if (tab === "approvals" && pending && inputKey === "n") {
      setPending(null);
      setMessages((m) => [...m, { role: "system", content: "Action denied by user." }]);
    }
  });

  const refreshVms = useCallback(async () => {
    setLoading(true);
    try {
      const config = await loadConfig();
      const registry = new ToolRegistry(config);
      const result = await registry.execute("pve_health_report", {});
      setVmReport(result);
    } catch (err) {
      setVmReport(`Error: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const approvePending = useCallback(async () => {
    if (!pending) return;
    setLoading(true);
    try {
      const config = await loadConfig();
      const registry = new ToolRegistry(config);
      const result = await registry.execute(pending.name, { ...pending.args, approved: true }, { approved: true });
      setToolLog((l) => [...l, `approved ${pending.name}: ${result.slice(0, 120)}`]);
      setMessages((m) => [...m, { role: "system", content: `Approved and executed: ${pending.name}` }]);
      setPending(null);
    } catch (err) {
      setMessages((m) => [...m, { role: "system", content: `Approval failed: ${(err as Error).message}` }]);
    } finally {
      setLoading(false);
    }
  }, [pending]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);

    try {
      const config = await loadConfig();
      const registry = new ToolRegistry(config);
      const agent = new AgentLoop(config, registry.definitions(), (name, args, ctx) =>
        registry.execute(name, args, ctx),
      );

      const result = await agent.run(text, history, {
        onEvent: (ev) => {
          if (ev.type === "tool_start") setToolLog((l) => [...l, `→ ${ev.name}`]);
          if (ev.type === "tool_end") setToolLog((l) => [...l, `← ${ev.name}`]);
          if (ev.type === "needs_approval") setPending({ name: ev.name, args: ev.args });
        },
      });

      setHistory(result.history);
      setMessages((m) => [...m, { role: "assistant", content: result.reply }]);
      if (result.pendingApproval) setPending(result.pendingApproval);
    } catch (err) {
      setMessages((m) => [...m, { role: "system", content: `Error: ${(err as Error).message}` }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, history]);

  return (
    <Box flexDirection="column" padding={1}>
      <Box borderStyle="round" borderColor="cyan" paddingX={1}>
        <Text bold color="cyan">
          Mistral PVE Agent
        </Text>
        <Text>  |  Tab: switch  |  Esc: exit  |  [{tab}]</Text>
      </Box>

      {tab === "chat" && (
        <Box flexDirection="column" marginTop={1}>
          <Box flexDirection="column" height={12} overflow="hidden">
            {messages.map((m, i) => (
              <Text key={i} color={m.role === "user" ? "green" : m.role === "assistant" ? "white" : "yellow"}>
                {m.role}: {m.content}
              </Text>
            ))}
            {loading && (
              <Text color="yellow">
                <Spinner type="dots" /> thinking...
              </Text>
            )}
          </Box>
          <Box marginTop={1}>
            <Text color="green">{"> "}</Text>
            <TextInput value={input} onChange={setInput} onSubmit={() => void sendMessage()} />
          </Box>
          <Box marginTop={1} flexDirection="column">
            <Text dimColor>Tools:</Text>
            {toolLog.slice(-5).map((l, i) => (
              <Text key={i} dimColor>
                {l}
              </Text>
            ))}
          </Box>
        </Box>
      )}

      {tab === "vms" && (
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>Press r to refresh health report</Text>
          <Text wrap="wrap">{vmReport}</Text>
        </Box>
      )}

      {tab === "alerts" && (
        <Box flexDirection="column" marginTop={1}>
          <Text>Recent alerts stored in ~/.local/share/mistral/state.json</Text>
          <Text dimColor>Daemon sends email + Slack on new issues.</Text>
        </Box>
      )}

      {tab === "settings" && (
        <Box flexDirection="column" marginTop={1}>
          <Text>Config: ~/.config/mistral/config.yaml</Text>
          <Text>Run `mistral config` for file path or edit directly.</Text>
          <Text>Web UI: mistral web → http://127.0.0.1:8787</Text>
        </Box>
      )}

      {tab === "approvals" && (
        <Box flexDirection="column" marginTop={1}>
          {pending ? (
            <>
              <Text color="yellow">Pending: {pending.name}</Text>
              <Text>{JSON.stringify(pending.args, null, 2)}</Text>
              <Text>Press y to approve, n to deny</Text>
            </>
          ) : (
            <Text dimColor>No pending approvals</Text>
          )}
        </Box>
      )}
    </Box>
  );
}

export function runChatTui(): Promise<void> {
  return new Promise((resolve) => {
    const { unmount } = render(<ChatApp onExit={resolve} />);
    process.on("SIGINT", () => {
      unmount();
      resolve();
    });
  });
}
