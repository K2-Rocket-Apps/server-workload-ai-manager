import { Box, Text } from "ink";
import { useAppSelector } from "../../state/context.js";
import { CHAT, LOG_DIR } from "../../core/constants.js";
import { getTheme } from "../../core/theme.js";
import { Divider } from "../common/Divider.js";
import { EmptyState } from "../common/EmptyState.js";
import { ScrollIndicator } from "../common/ScrollBox.js";
import { ToolCallList } from "../chat/ToolCallCard.js";

export function LogsView() {
  const themeName = useAppSelector((s) => s.theme);
  const toolLog = useAppSelector((s) => s.toolLog);
  const scrollOffset = useAppSelector((s) => s.scrollOffset);
  const theme = getTheme(themeName);

  const viewport = 16;
  const start = Math.max(0, toolLog.length - viewport - scrollOffset);
  const visible = toolLog.slice(start, start + viewport);

  return (
    <Box flexDirection="column">
      <Text bold color={theme.tokens.primaryBright}>
        Logs
      </Text>
      <Text color={theme.tokens.textMuted}>
        Tool execution log and daemon log locations
      </Text>

      <Divider label="Tool Execution Log" theme={theme} width={55} />

      {toolLog.length === 0 ? (
        <EmptyState
          title="No tool calls yet"
          description="Agent tool invocations appear here during chat sessions."
          theme={theme}
          icon="📜"
        />
      ) : (
        <Box flexDirection="column">
          <ScrollIndicator
            offset={scrollOffset}
            total={toolLog.length}
            viewport={viewport}
            theme={theme}
          />
          <ToolCallList entries={visible} theme={theme} maxItems={viewport} />
          {toolLog.length > CHAT.maxToolLogLines ? (
            <Text color={theme.tokens.textMuted}>
              Showing recent {CHAT.maxToolLogLines} max entries
            </Text>
          ) : null}
        </Box>
      )}

      <Divider label="Daemon & System Logs" theme={theme} width={55} />

      <Box flexDirection="column">
        <Text bold color={theme.tokens.secondary}>
          On the PVE host:
        </Text>
        <Text>journalctl -u mistral-daemon -f</Text>
        <Text>journalctl -u mistral-web -f</Text>
        <Text>{LOG_DIR}/daemon.log</Text>
        <Text>{LOG_DIR}/checks.log</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text color={theme.tokens.textMuted} dimColor>
          Tool log is in-memory for this session. Daemon logs persist on disk.
        </Text>
        <Text color={theme.tokens.textMuted} dimColor>
          /daemon status · /check · Ctrl+R reload config
        </Text>
      </Box>
    </Box>
  );
}
