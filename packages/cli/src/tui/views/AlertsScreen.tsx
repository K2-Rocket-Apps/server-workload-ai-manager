import { Box } from "ink";
import { AlertsView } from "../components/alerts/AlertsView.js";
import { useTerminalLayout } from "../components/layout/AppShell.js";

export function AlertsScreen() {
  const layout = useTerminalLayout();

  return (
    <Box flexDirection="column" flexGrow={1} height={layout.mainBodyHeight}>
      <AlertsView />
    </Box>
  );
}
