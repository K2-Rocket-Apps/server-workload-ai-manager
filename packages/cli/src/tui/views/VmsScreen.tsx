import { Box } from "ink";
import { VmDashboard } from "../components/vm/VmDashboard.js";
import { useTerminalLayout } from "../components/layout/AppShell.js";

export function VmsScreen() {
  const layout = useTerminalLayout();

  return (
    <Box flexDirection="column" flexGrow={1} height={layout.mainBodyHeight}>
      <VmDashboard height={layout.mainBodyHeight} />
    </Box>
  );
}
