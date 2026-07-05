import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ChatMessage } from "@mistral/core";
import type { TabId, UiMessage } from "../types.js";

export type SessionSnapshot = {
  version: 1;
  sessionId: string;
  savedAt: string;
  tab: TabId;
  messages: UiMessage[];
  chatHistory: ChatMessage[];
};

export function sessionsDir(): string {
  return join(homedir(), ".mistral", "sessions");
}

export function sessionFilePath(sessionId: string): string {
  const safe = sessionId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return join(sessionsDir(), `${safe}.json`);
}

export async function ensureSessionsDir(): Promise<string> {
  const dir = sessionsDir();
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function saveSession(snapshot: SessionSnapshot): Promise<string> {
  await ensureSessionsDir();
  const path = sessionFilePath(snapshot.sessionId);
  const payload: SessionSnapshot = {
    ...snapshot,
    version: 1,
    savedAt: new Date().toISOString(),
  };
  await writeFile(path, JSON.stringify(payload, null, 2), "utf8");
  return path;
}

export async function loadSession(sessionId: string): Promise<SessionSnapshot | null> {
  try {
    const raw = await readFile(sessionFilePath(sessionId), "utf8");
    const data = JSON.parse(raw) as SessionSnapshot;
    if (data.version !== 1) return null;
    return data;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

export async function listSessions(): Promise<Array<{ sessionId: string; savedAt: string; path: string }>> {
  const dir = await ensureSessionsDir();
  const files = await readdir(dir);
  const out: Array<{ sessionId: string; savedAt: string; path: string }> = [];

  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const raw = await readFile(join(dir, file), "utf8");
      const data = JSON.parse(raw) as SessionSnapshot;
      out.push({
        sessionId: data.sessionId,
        savedAt: data.savedAt,
        path: join(dir, file),
      });
    } catch {
      // skip corrupt files
    }
  }

  return out.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function buildSessionSnapshot(
  sessionId: string,
  tab: TabId,
  messages: UiMessage[],
  chatHistory: ChatMessage[],
): SessionSnapshot {
  return {
    version: 1,
    sessionId,
    savedAt: new Date().toISOString(),
    tab,
    messages,
    chatHistory,
  };
}

export async function saveCurrentSession(
  sessionId: string,
  tab: TabId,
  messages: UiMessage[],
  chatHistory: ChatMessage[],
): Promise<string> {
  const snapshot = buildSessionSnapshot(sessionId, tab, messages, chatHistory);
  return saveSession(snapshot);
}

export async function loadLatestSession(): Promise<SessionSnapshot | null> {
  const sessions = await listSessions();
  if (!sessions.length) return null;
  return loadSession(sessions[0]!.sessionId);
}
