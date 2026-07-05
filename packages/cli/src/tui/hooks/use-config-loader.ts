import { useCallback, useEffect } from "react";
import { loadConfig } from "@mistral/core";
import { useAppDispatch, useAppState } from "../state/context.js";
import type { ConfigStatus } from "../types.js";

export async function loadConfigStatus(): Promise<ConfigStatus> {
  const config = await loadConfig();
  return {
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
  };
}

export type UseConfigLoaderResult = {
  configStatus: ConfigStatus | null;
  configLoading: boolean;
  configError: string | null;
  reload: () => Promise<void>;
};

export function useConfigLoader(autoLoad = true): UseConfigLoaderResult {
  const { configStatus, configLoading, configError } = useAppState();
  const dispatch = useAppDispatch();

  const reload = useCallback(async () => {
    dispatch({ type: "CONFIG_LOAD_START" });
    try {
      const status = await loadConfigStatus();
      dispatch({ type: "CONFIG_LOAD_SUCCESS", status });
    } catch (err) {
      dispatch({ type: "CONFIG_LOAD_ERROR", error: (err as Error).message });
    }
  }, [dispatch]);

  useEffect(() => {
    if (autoLoad && !configStatus && !configLoading) {
      void reload();
    }
  }, [autoLoad, configStatus, configLoading, reload]);

  return { configStatus, configLoading, configError, reload };
}
