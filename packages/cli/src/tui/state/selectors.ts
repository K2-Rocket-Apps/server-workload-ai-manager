import type { AppState } from "../types.js";

/** Pure selectors for derived app state (keeps components thin). */

export function selectApiOk(state: AppState): boolean {
  return state.configStatus?.apiKeySet ?? false;
}

export function selectModelLabel(state: AppState): string {
  const c = state.configStatus;
  if (!c) return "loading…";
  return `${c.provider}/${c.model}`;
}

export function selectRunningVmCount(state: AppState): number {
  return state.vms.filter((v) => v.status === "running").length;
}

export function selectIssueCount(state: AppState): number {
  return state.vms.reduce((n, v) => n + v.issues.length, 0);
}

export function selectHasPendingApproval(state: AppState): boolean {
  return state.pending !== null;
}

export function selectRecentToolLog(state: AppState, limit = 5) {
  return state.toolLog.slice(-limit);
}

export function selectVisibleMessages(state: AppState, viewportHeight: number) {
  const total = state.messages.length;
  if (total <= viewportHeight) return state.messages;
  const start = Math.max(0, total - viewportHeight - state.scrollOffset);
  const end = Math.min(total, start + viewportHeight);
  return state.messages.slice(start, end);
}

export function selectIsModalOpen(state: AppState): boolean {
  return state.modal.type !== "none";
}

export function selectIsCommandPaletteOpen(state: AppState): boolean {
  return state.modal.type === "commandPalette";
}

export function selectActiveToasts(state: AppState, now = Date.now()) {
  return state.toasts.filter((t) => t.expiresAt > now);
}

export function selectTabLabel(state: AppState): string {
  return state.tab;
}

export function selectConfigSummary(state: AppState): string {
  const c = state.configStatus;
  if (!c) return "Config not loaded";
  return [
    `LLM: ${c.provider}/${c.model}`,
    `PVE: ${c.pveHost}`,
    `Web: ${c.webUrl}`,
    `Watched: ${c.watchedVmids.join(", ")}`,
    `Daemon: ${c.daemonEnabled ? "on" : "off"} every ${c.daemonIntervalMinutes}m`,
  ].join(" · ");
}

export function selectVmById(state: AppState, vmid: number) {
  return state.vms.find((v) => v.vmid === vmid);
}

export function selectVmsWithIssues(state: AppState) {
  return state.vms.filter((v) => v.issues.length > 0);
}

export function selectChatBusy(state: AppState): boolean {
  return state.loading;
}

export function selectCanSubmit(state: AppState): boolean {
  return !state.loading && state.input.trim().length > 0;
}

export function selectSlashMode(state: AppState): boolean {
  return state.tab === "chat" && state.input.startsWith("/");
}

export function selectFooterContext(state: AppState): "chat" | "vms" | "approvals" | "default" {
  if (state.tab === "chat") return "chat";
  if (state.tab === "vms") return "vms";
  if (state.tab === "approvals") return "approvals";
  return "default";
}

export function selectDashboardStats(state: AppState) {
  return {
    apiOk: selectApiOk(state),
    model: selectModelLabel(state),
    running: selectRunningVmCount(state),
    total: state.vms.length,
    issues: selectIssueCount(state),
    pending: selectHasPendingApproval(state),
    toolsRun: state.toolLog.filter((t) => t.status === "done").length,
  };
}
