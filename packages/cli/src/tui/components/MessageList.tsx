import { Box, Text } from "ink";
import type { UiMessage } from "../types.js";

type MessageListProps = {
  messages: UiMessage[];
  height: number;
};

function roleColor(role: UiMessage["role"]): string {
  if (role === "user") return "green";
  if (role === "assistant") return "white";
  return "yellow";
}

function roleLabel(role: UiMessage["role"]): string {
  if (role === "user") return "you";
  if (role === "assistant") return "mistral";
  return "system";
}

export function MessageList({ messages, height }: MessageListProps) {
  const visible = messages.slice(-height);

  return (
    <Box flexDirection="column" height={height} overflow="hidden">
      {visible.length === 0 && (
        <Text dimColor>
          Ask anything about your PVE host, or type / for commands (model, vms, config, …)
        </Text>
      )}
      {visible.map((m, i) => (
        <Box key={`${i}-${m.ts ?? i}`} flexDirection="column" marginBottom={0}>
          <Text color={roleColor(m.role)} bold={m.role === "user"}>
            {roleLabel(m.role)}
          </Text>
          <Text wrap="wrap" color={roleColor(m.role)}>
            {m.content}
          </Text>
        </Box>
      ))}
    </Box>
  );
}
