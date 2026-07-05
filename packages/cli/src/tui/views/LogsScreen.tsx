import { Box } from "ink";
import { LogsView } from "../components/logs/LogsView.js";
import { useTerminalLayout } from "../components/layout/AppShell.js";

export function LogsScreen() {
  const layout = useTerminalLayout();

  return (
    <Box flexDirection="column" flexGrow={1} height={layout.mainBodyHeight}>
      <LogsView />
    </Box>
  );
}
