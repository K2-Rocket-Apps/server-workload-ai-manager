import type { ReactNode } from "react";
import { Box } from "ink";
import { useAppSelector } from "../../state/context.js";
import { computeLayout } from "../../core/layout.js";
import { getTheme } from "../../core/theme.js";
import { ToastStack } from "../common/ToastStack.js";
import { ConfirmDialogFromState } from "../common/ConfirmDialog.js";
import { FooterBar } from "./FooterBar.js";
import { RightPanel } from "./RightPanel.js";
import { Sidebar } from "./Sidebar.js";
import { TitleBar } from "./TitleBar.js";
import { ErrorBanner } from "./ErrorBanner.js";

export type AppShellProps = {
  children: ReactNode;
  showSidebar?: boolean;
  showRightPanel?: boolean;
  paletteOpen?: boolean;
  slashActive?: boolean;
  toolLogRows?: number;
};

export function AppShell({
  children,
  showSidebar = true,
  showRightPanel = true,
  paletteOpen = false,
  slashActive = false,
  toolLogRows = 0,
}: AppShellProps) {
  const themeName = useAppSelector((s) => s.theme);
  const terminalWidth = useAppSelector((s) => s.terminalWidth);
  const terminalHeight = useAppSelector((s) => s.terminalHeight);
  const modal = useAppSelector((s) => s.modal);
  const theme = getTheme(themeName);

  const layout = computeLayout(terminalWidth, terminalHeight, {
    showSidebar,
    showRightPanel,
    paletteOpen,
    toolLogRows,
  });

  const bodyHeight = layout.mainBodyHeight;

  return (
    <Box flexDirection="column" width={layout.cols} height={layout.rows}>
      <TitleBar />

      <ErrorBanner />

      <Box flexDirection="row" flexGrow={1} height={bodyHeight + layout.tabBarRows}>
        {layout.sidebarVisible ? (
          <>
            <Sidebar width={layout.sidebarWidth} height={bodyHeight} />
            <Box width={layout.gutter} />
          </>
        ) : null}

        <Box
          flexDirection="column"
          width={layout.mainWidth}
          height={bodyHeight}
          borderStyle="single"
          borderColor={theme.tokens.borderMuted}
          paddingX={1}
        >
          {children}
        </Box>

        {layout.rightPanelVisible ? (
          <>
            <Box width={layout.gutter} />
            <RightPanel width={layout.rightPanelWidth} height={bodyHeight} />
          </>
        ) : null}
      </Box>

      <FooterBar slashActive={slashActive} paletteOpen={paletteOpen} />

      <ToastStack />

      {modal.type === "confirm" ? <ConfirmDialogFromState /> : null}
    </Box>
  );
}

export function useTerminalLayout(options?: Parameters<typeof computeLayout>[2]) {
  const terminalWidth = useAppSelector((s) => s.terminalWidth);
  const terminalHeight = useAppSelector((s) => s.terminalHeight);
  return computeLayout(terminalWidth, terminalHeight, options);
}
