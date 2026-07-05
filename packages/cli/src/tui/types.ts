import type { ChatMessage } from "@mistral/core";

export type TabId = "chat" | "vms" | "alerts" | "settings" | "approvals";

export type UiMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  ts?: number;
};

export type PendingApproval = {
  name: string;
  args: Record<string, unknown>;
};

export type ConfigStatus = {
  model: string;
  provider: string;
  apiKeySet: boolean;
  pveHost: string;
  webUrl: string;
  watchedVmids: number[];
  emailEnabled: boolean;
  slackEnabled: boolean;
};

export type AgentState = {
  history: ChatMessage[];
  messages: UiMessage[];
  toolLog: string[];
  loading: boolean;
  pending: PendingApproval | null;
};
