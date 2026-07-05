import { Box, Text } from "ink";
import type { Theme } from "../../core/theme.js";
import { getTheme, messageRoleColor } from "../../core/theme.js";
import { formatRelativeTime } from "../../core/format.js";
import type { UiMessage } from "../../types.js";
import { MarkdownView } from "../../render/markdown.js";
import { SpinnerLine } from "../common/SpinnerLine.js";

export type MessageBubbleProps = {
  message: UiMessage;
  theme?: Theme;
  width?: number;
  showTimestamp?: boolean;
};

function roleLabel(role: UiMessage["role"]): string {
  switch (role) {
    case "user":
      return "You";
    case "assistant":
      return "Mistral";
    case "system":
      return "System";
    default:
      return role;
  }
}

function roleIcon(role: UiMessage["role"]): string {
  switch (role) {
    case "user":
      return "❯";
    case "assistant":
      return "◆";
    case "system":
      return "⚙";
    default:
      return "·";
  }
}

export function MessageBubble({
  message,
  theme,
  width,
  showTimestamp = true,
}: MessageBubbleProps) {
  const resolved = theme ?? getTheme();
  const color = messageRoleColor(resolved, message.role);
  const isAssistant = message.role === "assistant";

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box flexDirection="row">
        <Text bold color={color}>
          {roleIcon(message.role)} {roleLabel(message.role)}
        </Text>
        {showTimestamp ? (
          <Text color={resolved.tokens.textMuted}>
            {" "}
            · {formatRelativeTime(message.ts)}
          </Text>
        ) : null}
        {message.streaming ? (
          <Text color={resolved.tokens.warning}> · streaming</Text>
        ) : null}
      </Box>

      <Box marginLeft={2} flexDirection="column">
        {message.streaming && !message.content ? (
          <SpinnerLine label="Generating response…" theme={resolved} />
        ) : isAssistant ? (
          <MarkdownView source={message.content} theme={resolved} width={width} />
        ) : (
          <Text wrap="wrap" color={color}>
            {message.content}
          </Text>
        )}

        {message.toolCalls && message.toolCalls.length > 0 ? (
          <Box marginTop={1} flexDirection="column">
            <Text color={resolved.tokens.toolBubble} dimColor>
              tools invoked:
            </Text>
            {message.toolCalls.map((name) => (
              <Text key={name} color={resolved.tokens.toolBubble}>
                → {name}
              </Text>
            ))}
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}

export function MessageBubbleCompact({
  message,
  theme,
}: {
  message: UiMessage;
  theme?: Theme;
}) {
  const resolved = theme ?? getTheme();
  const color = messageRoleColor(resolved, message.role);
  const preview = message.content.split("\n")[0]?.slice(0, 60) ?? "";

  return (
    <Box flexDirection="row">
      <Text color={color} bold={message.role === "user"}>
        {roleLabel(message.role).slice(0, 1)}:
      </Text>
      <Text wrap="truncate-end"> {preview}</Text>
    </Box>
  );
}
