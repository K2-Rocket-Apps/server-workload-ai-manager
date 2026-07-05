import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import TextInput from "ink-text-input";
import Spinner from "ink-spinner";
import { AgentLoop, loadConfig, type ChatMessage } from "@mistral/core";
import { ToolRegistry } from "@mistral/mcp";
import { executeSlashCommand } from "./commands/handler.js";
import {
  autocompleteInput,
  filterCommands,
  shouldShowPalette,
} from "./commands/registry.js";
import { Header } from "./components/Header.js";
import { MessageList } from "./components/MessageList.js";
import { SlashPalette } from "./components/SlashPalette.js";
import { StatusBar } from "./components/StatusBar.js";
import {
  AlertsPanel,
  ApprovalsPanel,
  SettingsPanel,
  VmsPanel,
} from "./components/Panels.js";
import type { ConfigStatus, PendingApproval, TabId, UiMessage } from "./types.js";

const TABS: TabId[] = ["chat", "vms", "alerts", "settings", "approvals"];

type AppProps = {
  onExit: () => void;
};

async function loadConfigStatus(): Promise<ConfigStatus> {
  const config = await loadConfig();
  return {
    model: config.llm.model,
    provider: config.llm.provider,
    apiKeySet: Boolean(config.llm.api_key || process.env.MISTRAL_API_KEY),
    pveHost: config.pve.host,
    webUrl: config.web.public_url ?? `http://${config.web.host}:${config.web.port}`,
    watchedVmids: config.daemon.watched_vmids,
    emailEnabled: config.alerts.email.enabled,
    slackEnabled: config.alerts.slack.enabled,
  };
}

export function MistralApp({ onExit }: AppProps) {
  const { exit } = useApp();
  const termRows = process.stdout.rows ?? 24;
  const chatHeight = Math.max(6, termRows - 18);

  const [tab, setTab] = useState<TabId>("chat");
  const [input, setInput] = useState("");
  const [slashIndex, setSlashIndex] = useState(0);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [toolLog, setToolLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<PendingApproval | null>(null);
  const [vmReport, setVmReport] = useState("Press r or /vms to load VM report");
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);

  const slashActive = tab === "chat" && input.startsWith("/");
  const slashMatches = useMemo(
    () => (slashActive ? filterCommands(input) : []),
    [slashActive, input],
  );

  const reloadConfig = useCallback(async () => {
    setConfigStatus(await loadConfigStatus());
  }, []);

  useEffect(() => {
    void reloadConfig();
  }, [reloadConfig]);

  const addSystem = useCallback((content: string) => {
    setMessages((m) => [...m, { role: "system", content, ts: Date.now() }]);
  }, []);

  const addUser = useCallback((content: string) => {
    setMessages((m) => [...m, { role: "user", content, ts: Date.now() }]);
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setHistory([]);
    setToolLog([]);
  }, []);

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

  const doExit = useCallback(() => {
    onExit();
    exit();
  }, [onExit, exit]);

  const cmdCtx = useMemo(
    () => ({
      setTab,
      addSystem,
      clearChat,
      setPending,
      refreshVms,
      reloadConfig,
      exit: doExit,
      setLoading,
    }),
    [addSystem, clearChat, refreshVms, reloadConfig, doExit],
  );

  const approvePending = useCallback(async () => {
    if (!pending) return;
    setLoading(true);
    try {
      const config = await loadConfig();
      const registry = new ToolRegistry(config);
      const result = await registry.execute(
        pending.name,
        { ...pending.args, approved: true },
        { approved: true },
      );
      setToolLog((l) => [...l, `✓ ${pending.name}`]);
      addSystem(`Approved: ${pending.name}\n${result.slice(0, 400)}`);
      setPending(null);
    } catch (err) {
      addSystem(`Approval failed: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [pending, addSystem]);

  const runSlash = useCallback(
    async (line: string) => {
      addUser(line);
      await executeSlashCommand(line, cmdCtx);
    },
    [addUser, cmdCtx],
  );

  const sendChat = useCallback(
    async (text: string) => {
      addUser(text);
      setLoading(true);
      try {
        const config = await loadConfig();
        if (!config.llm.api_key && !process.env.MISTRAL_API_KEY) {
          addSystem("No API key. Run: mistral setup  or  /apikey");
          return;
        }

        const registry = new ToolRegistry(config);
        const agent = new AgentLoop(config, registry.definitions(), (name, args, ctx) =>
          registry.execute(name, args, ctx),
        );

        const result = await agent.run(text, history, {
          onEvent: (ev) => {
            if (ev.type === "tool_start") setToolLog((l) => [...l, `→ ${ev.name}`]);
            if (ev.type === "tool_end") setToolLog((l) => [...l, `← ${ev.name}`]);
            if (ev.type === "needs_approval") {
              setPending({ name: ev.name, args: ev.args });
              setTab("approvals");
            }
          },
        });

        setHistory(result.history);
        setMessages((m) => [...m, { role: "assistant", content: result.reply, ts: Date.now() }]);
        if (result.pendingApproval) {
          setPending(result.pendingApproval);
          setTab("approvals");
        }
      } catch (err) {
        const msg = (err as Error).message;
        if (msg.includes("401") || msg.includes("Unauthorized")) {
          addSystem("API key invalid. Run: mistral setup");
        } else {
          addSystem(`Error: ${msg}`);
        }
      } finally {
        setLoading(false);
      }
    },
    [addUser, history, addSystem],
  );

  const submitInput = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setSlashIndex(0);

    if (text.startsWith("/")) {
      await runSlash(text);
      return;
    }
    await sendChat(text);
  }, [input, loading, runSlash, sendChat]);

  useInput((ch, key) => {
    if (key.escape) {
      doExit();
      return;
    }

    if (slashActive && slashMatches.length) {
      if (key.upArrow) {
        setSlashIndex((i) => (i <= 0 ? slashMatches.length - 1 : i - 1));
        return;
      }
      if (key.downArrow) {
        setSlashIndex((i) => (i + 1) % slashMatches.length);
        return;
      }
      if (key.tab) {
        const next = autocompleteInput(input, slashIndex, slashMatches);
        setInput(next);
        setSlashIndex(0);
        return;
      }
    }

    if (key.tab && !slashActive) {
      const idx = TABS.indexOf(tab);
      setTab(TABS[(idx + 1) % TABS.length]!);
      return;
    }

    if (tab === "vms" && ch === "r") {
      void refreshVms();
      return;
    }

    if (tab === "approvals" && pending) {
      if (ch === "y") void approvePending();
      if (ch === "n") {
        setPending(null);
        addSystem("Action denied.");
      }
    }
  });

  useEffect(() => {
    setSlashIndex(0);
  }, [input]);

  const showPalette = slashActive && shouldShowPalette(input);

  return (
    <Box flexDirection="column" padding={1}>
      <Header tab={tab} config={configStatus} />

      {tab === "chat" && (
        <Box flexDirection="column" marginTop={1} flexGrow={1}>
          <MessageList messages={messages} height={chatHeight} />
          {loading && (
            <Text color="yellow">
              <Spinner type="dots" /> thinking…
            </Text>
          )}

          {showPalette && (
            <Box marginTop={1}>
              <SlashPalette matches={slashMatches} selectedIndex={slashIndex} maxRows={8} />
            </Box>
          )}

          <Box marginTop={1}>
            <Text color="green" bold>
              ❯{" "}
            </Text>
            <TextInput
              value={input}
              onChange={setInput}
              onSubmit={() => void submitInput()}
              placeholder="Ask or type / for commands…"
            />
          </Box>

          {toolLog.length > 0 && (
            <Box marginTop={1} flexDirection="column">
              <Text dimColor>tools</Text>
              {toolLog.slice(-4).map((l, i) => (
                <Text key={i} dimColor>
                  {l}
                </Text>
              ))}
            </Box>
          )}
        </Box>
      )}

      {tab === "vms" && <VmsPanel report={vmReport} loading={loading} />}
      {tab === "settings" && <SettingsPanel config={configStatus} />}
      {tab === "alerts" && <AlertsPanel />}
      {tab === "approvals" && <ApprovalsPanel pending={pending} />}

      <Box marginTop={1}>
        <StatusBar slashActive={slashActive && showPalette} loading={loading} tab={tab} />
      </Box>
    </Box>
  );
}
