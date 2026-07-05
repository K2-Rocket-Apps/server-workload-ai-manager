import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { UiMessage } from "../types.js";

export type ExportFormat = "text" | "markdown" | "json";

const EXPORT_DIR = join(homedir(), ".mistral", "exports");

function formatTimestamp(ts: number): string {
  return new Date(ts).toISOString();
}

export function messagesToText(messages: UiMessage[]): string {
  return messages
    .map((m) => {
      const label = m.role === "user" ? "You" : m.role === "assistant" ? "Mistral" : "System";
      return `[${formatTimestamp(m.ts)}] ${label}:\n${m.content}\n`;
    })
    .join("\n---\n\n");
}

export function messagesToMarkdown(messages: UiMessage[]): string {
  const lines = ["# Mistral PVE Chat Export", "", `Exported: ${new Date().toISOString()}`, ""];
  for (const m of messages) {
    const heading =
      m.role === "user" ? "## You" : m.role === "assistant" ? "## Mistral" : "## System";
    lines.push(heading, "", m.content, "", "---", "");
  }
  return lines.join("\n");
}

export function messagesToJson(messages: UiMessage[]): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      messageCount: messages.length,
      messages,
    },
    null,
    2,
  );
}

export async function exportMessages(
  messages: UiMessage[],
  format: ExportFormat = "markdown",
): Promise<string> {
  await mkdir(EXPORT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const ext = format === "json" ? "json" : format === "markdown" ? "md" : "txt";
  const path = join(EXPORT_DIR, `chat-${stamp}.${ext}`);

  const body =
    format === "json"
      ? messagesToJson(messages)
      : format === "markdown"
        ? messagesToMarkdown(messages)
        : messagesToText(messages);

  await writeFile(path, body, "utf8");
  return path;
}
