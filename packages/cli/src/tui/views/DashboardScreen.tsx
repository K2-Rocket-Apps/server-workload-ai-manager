import { Box } from "ink";
import { DashboardView } from "../components/dashboard/DashboardView.js";
import { useTerminalLayout } from "../components/layout/AppShell.js";

export function DashboardScreen() {
  const layout = useTerminalLayout();

  return (
    <Box flexDirection="column" flexGrow={1} height={layout.mainBodyHeight}>
      <DashboardView />
    </Box>
  );
}
