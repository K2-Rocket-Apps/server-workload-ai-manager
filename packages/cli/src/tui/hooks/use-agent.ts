import { useCallback, useRef } from "react";
import { AgentLoop, loadConfig } from "@mistral/core";
import { ToolRegistry } from "@mistral/mcp";
import { executeSlashCommand } from "../commands/handler.js";
import type { CommandContext } from "../commands/handler.js";
import { redactSlashCommand } from "../core/secrets.js";
import {
  addAssistantMessage,
  addSystemMessage,
  addUserMessage,
  type AppDispatch,
} from "../state/actions.js";
import { startToolLog } from "../state/reducer.js";
import { useAppDispatch, useAppState } from "../state/context.js";
import type { PendingApproval } from "../types.js";

export type AgentHooks = {
  sendChat: (text: string) => Promise<void>;
  runSlash: (line: string) => Promise<void>;
  approvePending: () => Promise<void>;
  denyPending: () => void;
};

function buildCommandContext(dispatch: AppDispatch, onExit: () => void, getState: () => import("../types.js").AppState): CommandContext {
  return {
    setTab: (tab) => dispatch({ type: "SET_TAB", tab }),
    addSystem: (content) => dispatch(addSystemMessage(content)),
    clearChat: () => dispatch({ type: "CLEAR_CHAT" }),
    setPending: (p) => dispatch({ type: "SET_PENDING", pending: p }),
    refreshVms: async () => {
      dispatch({ type: "VMS_LOAD_START" });
      try {
        const config = await loadConfig();
        const registry = new ToolRegistry(config);
        const raw = await registry.execute("pve_health_report", {});
        const { parseHealthReport } = await import("../hooks/use-vms.js");
        const parsed = parseHealthReport(raw);
        dispatch({
          type: "VMS_LOAD_SUCCESS",
          vms: parsed.vms,
          raw: parsed.formatted,
          nodeStats: parsed.nodeStats,
        });
      } catch (err) {
        dispatch({ type: "VMS_LOAD_ERROR", error: (err as Error).message });
      }
    },
    reloadConfig: async () => {
      dispatch({ type: "CONFIG_LOAD_START" });
      try {
        const config = await loadConfig();
        dispatch({
          type: "CONFIG_LOAD_SUCCESS",
          status: {
            model: config.llm.model,
            provider: config.llm.provider,
            apiKeySet: Boolean(config.llm.api_key || process.env.MISTRAL_API_KEY),
            pveHost: config.pve.host,
            pveNode: config.pve.node,
            webUrl: config.web.public_url ?? `http://${config.web.host}:${config.web.port}`,
            watchedVmids: config.daemon.watched_vmids,
            emailEnabled: config.alerts.email.enabled,
            slackEnabled: config.alerts.slack.enabled,
            temperature: config.llm.temperature,
            daemonIntervalMinutes: config.daemon.check_interval_minutes,
            daemonEnabled: config.daemon.enabled,
            checkCron: config.daemon.report_cron,
          },
        });
      } catch (err) {
        dispatch({ type: "CONFIG_LOAD_ERROR", error: (err as Error).message });
      }
    },
    exit: onExit,
    setLoading: (v) => dispatch({ type: "SET_LOADING", loading: v }),
    setTheme: (theme) => {
      dispatch({ type: "SET_THEME", theme });
      dispatch({ type: "ADD_TOAST", message: `Theme: ${theme}`, toastType: "info" });
    },
    openCommandPalette: () => dispatch({ type: "OPEN_COMMAND_PALETTE", query: "" }),
    openKeybindings: () => dispatch({ type: "OPEN_KEYBINDINGS_OVERLAY" }),
    getMessages: () => getState().messages,
  };
}

export type UseAgentOptions = {
  onExit: () => void;
};

export function useAgent({ onExit }: UseAgentOptions): AgentHooks {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const stateRef = useRef(state);
  stateRef.current = state;

  const toolStarts = useRef<Map<string, number>>(new Map());

  const handleNeedsApproval = useCallback(
    (pending: PendingApproval) => {
      dispatch({ type: "SET_PENDING", pending });
      dispatch({ type: "SET_TAB", tab: "approvals" });
    },
    [dispatch],
  );

  const sendChat = useCallback(
    async (text: string) => {
      dispatch(addUserMessage(text));
      dispatch({ type: "SET_LOADING", loading: true });

      try {
        const config = await loadConfig();
        if (!config.llm.api_key && !process.env.MISTRAL_API_KEY) {
          dispatch(addSystemMessage("No API key. Run: mistral setup  or  /apikey"));
          return;
        }

        const registry = new ToolRegistry(config);
        const agent = new AgentLoop(config, registry.definitions(), (name, args, ctx) =>
          registry.execute(name, args, ctx),
        );

        const history = stateRef.current.chatHistory;
        const result = await agent.run(text, history, {
          onEvent: (ev) => {
            if (ev.type === "tool_start") {
              const entry = startToolLog(ev.name);
              toolStarts.current.set(ev.name, Date.now());
              dispatch({ type: "ADD_TOOL_LOG", entry });
            }
            if (ev.type === "tool_end") {
              const started = toolStarts.current.get(ev.name);
              const duration = started ? Date.now() - started : 0;
              toolStarts.current.delete(ev.name);
              const last = stateRef.current.toolLog.find(
                (e) => e.name === ev.name && e.status === "running",
              );
              if (last) {
                dispatch({
                  type: "UPDATE_TOOL_LOG",
                  id: last.id,
                  patch: {
                    status: "done",
                    duration,
                    outputPreview: ev.result.slice(0, 120),
                  },
                });
              }
            }
            if (ev.type === "needs_approval") {
              handleNeedsApproval({ name: ev.name, args: ev.args });
            }
          },
        });

        dispatch({ type: "SET_CHAT_HISTORY", history: result.history });
        dispatch(addAssistantMessage(result.reply));

        if (result.pendingApproval) {
          handleNeedsApproval(result.pendingApproval);
        }
      } catch (err) {
        const msg = (err as Error).message;
        if (msg.includes("401") || msg.includes("Unauthorized")) {
          dispatch(addSystemMessage("API key invalid. Run: mistral setup"));
        } else {
          dispatch(addSystemMessage(`Error: ${msg}`));
        }
      } finally {
        dispatch({ type: "SET_LOADING", loading: false });
      }
    },
    [dispatch, handleNeedsApproval],
  );

  const runSlash = useCallback(
    async (line: string) => {
      dispatch(addUserMessage(redactSlashCommand(line)));
      const ctx = buildCommandContext(dispatch, onExit, () => stateRef.current);
      await executeSlashCommand(line, ctx);
    },
    [dispatch, onExit],
  );

  const approvePending = useCallback(async () => {
    const pending = stateRef.current.pending;
    if (!pending) return;

    dispatch({ type: "SET_LOADING", loading: true });
    try {
      const config = await loadConfig();
      const registry = new ToolRegistry(config);
      const result = await registry.execute(
        pending.name,
        { ...pending.args, approved: true },
        { approved: true },
      );
      const entry = startToolLog(pending.name);
      dispatch({
        type: "ADD_TOOL_LOG",
        entry: { ...entry, status: "done", outputPreview: result.slice(0, 120) },
      });
      dispatch(addSystemMessage(`Approved: ${pending.name}\n${result.slice(0, 400)}`));
      dispatch({ type: "SET_PENDING", pending: null });
    } catch (err) {
      dispatch(addSystemMessage(`Approval failed: ${(err as Error).message}`));
    } finally {
      dispatch({ type: "SET_LOADING", loading: false });
    }
  }, [dispatch]);

  const denyPending = useCallback(() => {
    dispatch({ type: "SET_PENDING", pending: null });
    dispatch(addSystemMessage("Action denied."));
  }, [dispatch]);

  return { sendChat, runSlash, approvePending, denyPending };
}
