import { Box } from "ink";
import { SettingsView } from "../components/settings/SettingsView.js";
import { useTerminalLayout } from "../components/layout/AppShell.js";

export function SettingsScreen() {
  const layout = useTerminalLayout();

  return (
    <Box flexDirection="column" flexGrow={1} height={layout.mainBodyHeight}>
      <SettingsView height={layout.mainBodyHeight} />
    </Box>
  );
}
