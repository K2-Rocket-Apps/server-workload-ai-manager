import { Box } from "ink";
import { ChatView } from "../components/chat/ChatView.js";
import { useTerminalLayout } from "../components/layout/AppShell.js";

export type ChatScreenProps = {
  onSubmit: (value: string) => void;
};

export function ChatScreen({ onSubmit }: ChatScreenProps) {
  const layout = useTerminalLayout();

  return (
    <Box flexDirection="column" flexGrow={1} width="100%">
      <ChatView onSubmit={onSubmit} height={layout.chatHeight} />
    </Box>
  );
}
