import { Box } from "ink";
import { HelpView } from "../components/help/HelpView.js";
import { useTerminalLayout } from "../components/layout/AppShell.js";

export function HelpScreen() {
  const layout = useTerminalLayout();

  return (
    <Box flexDirection="column" flexGrow={1} height={layout.mainBodyHeight}>
      <HelpView />
    </Box>
  );
}
