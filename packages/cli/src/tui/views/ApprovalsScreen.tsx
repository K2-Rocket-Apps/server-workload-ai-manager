import { Box } from "ink";
import { ApprovalsView } from "../components/approvals/ApprovalsView.js";
import { useTerminalLayout } from "../components/layout/AppShell.js";

export function ApprovalsScreen() {
  const layout = useTerminalLayout();

  return (
    <Box flexDirection="column" flexGrow={1} height={layout.mainBodyHeight}>
      <ApprovalsView />
    </Box>
  );
}
