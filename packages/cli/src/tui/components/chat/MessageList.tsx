import { Box, Text } from "ink";
import { useAppSelector } from "../../state/context.js";
import { getTheme } from "../../core/theme.js";
import { useScroll } from "../../hooks/use-scroll.js";
import { innerBoxHeight } from "../../core/layout.js";
import { EmptyState } from "../common/EmptyState.js";
import { ScrollIndicator } from "../common/ScrollBox.js";
import { MessageBubble } from "./MessageBubble.js";

export type MessageListProps = {
  height: number;
  width?: number;
  showScrollIndicator?: boolean;
};

export function MessageList({
  height,
  width,
  showScrollIndicator = true,
}: MessageListProps) {
  const themeName = useAppSelector((s) => s.theme);
  const messages = useAppSelector((s) => s.messages);
  const theme = getTheme(themeName);

  const viewportHeight = Math.max(4, innerBoxHeight(height));
  const { visibleMessages, scrollOffset, atTop, atBottom } = useScroll(viewportHeight);

  if (messages.length === 0) {
    return (
      <Box height={height} justifyContent="center">
        <EmptyState
          title="Start a conversation"
          description="Ask about your Proxmox cluster, VM health, or type / for slash commands."
          hints={["/report — health report", "/vms — VM list", "/help — all commands"]}
          theme={theme}
          icon="💬"
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height={height} overflow="hidden">
      {showScrollIndicator && messages.length > viewportHeight ? (
        <Box marginBottom={0}>
          <ScrollIndicator
            offset={scrollOffset}
            total={messages.length}
            viewport={viewportHeight}
            theme={theme}
          />
          {!atTop ? (
            <Text color={theme.tokens.textMuted}> ▲ older messages above</Text>
          ) : null}
        </Box>
      ) : null}

      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        {visibleMessages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} theme={theme} width={width} />
        ))}
      </Box>

      {!atBottom && messages.length > viewportHeight ? (
        <Text color={theme.tokens.textMuted} dimColor>
          ▼ newer messages below · End to jump
        </Text>
      ) : null}
    </Box>
  );
}
