import { CHROME, MIN_TERMINAL_COLS, MIN_TERMINAL_ROWS } from "./constants.js";

/** Responsive layout breakpoints (terminal columns). */
export enum LayoutBreakpoint {
  /** < 80 cols — stack panels, hide sidebar */
  Compact = "compact",
  /** 80–119 cols — narrow sidebar */
  Medium = "medium",
  /** 120+ cols — full three-column layout */
  Wide = "wide",
}

export type LayoutOptions = {
  /** Show left sidebar (VM list / nav) */
  showSidebar?: boolean;
  /** Show right detail panel */
  showRightPanel?: boolean;
  /** Slash command palette visible */
  paletteOpen?: boolean;
  /** Extra rows reserved above chat (tool log strip) */
  toolLogRows?: number;
  /** Force breakpoint override */
  breakpoint?: LayoutBreakpoint;
};

export type TerminalLayout = {
  cols: number;
  rows: number;
  breakpoint: LayoutBreakpoint;

  /** Usable area after chrome */
  contentCols: number;
  contentRows: number;

  /** Panel widths (0 when hidden) */
  sidebarWidth: number;
  mainWidth: number;
  rightPanelWidth: number;
  gutter: number;

  /** Row allocations */
  headerRows: number;
  tabBarRows: number;
  statusBarRows: number;
  inputRows: number;
  paletteRows: number;
  toolLogRows: number;
  chatHeight: number;
  mainBodyHeight: number;

  /** Flags */
  sidebarVisible: boolean;
  rightPanelVisible: boolean;
  paletteVisible: boolean;
  compact: boolean;
};

function resolveBreakpoint(cols: number, override?: LayoutBreakpoint): LayoutBreakpoint {
  if (override) return override;
  if (cols < 80) return LayoutBreakpoint.Compact;
  if (cols < 120) return LayoutBreakpoint.Medium;
  return LayoutBreakpoint.Wide;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sidebarWidthForBreakpoint(bp: LayoutBreakpoint, cols: number): number {
  switch (bp) {
    case LayoutBreakpoint.Compact:
      return 0;
    case LayoutBreakpoint.Medium:
      return clamp(Math.floor(cols * 0.22), CHROME.sidebarMinWidth, 28);
    case LayoutBreakpoint.Wide:
      return clamp(Math.floor(cols * 0.18), CHROME.sidebarMinWidth, CHROME.sidebarMaxWidth);
    default:
      return 0;
  }
}

function rightPanelWidthForBreakpoint(
  bp: LayoutBreakpoint,
  cols: number,
  show: boolean,
): number {
  if (!show) return 0;
  switch (bp) {
    case LayoutBreakpoint.Compact:
      return 0;
    case LayoutBreakpoint.Medium:
      return clamp(Math.floor(cols * 0.28), CHROME.rightPanelMinWidth, 32);
    case LayoutBreakpoint.Wide:
      return clamp(Math.floor(cols * 0.24), CHROME.rightPanelMinWidth, CHROME.rightPanelMaxWidth);
    default:
      return 0;
  }
}

/**
 * Compute terminal layout dimensions from column/row counts.
 * Uses fixed chrome constants and responsive breakpoints.
 */
export function computeLayout(
  cols: number,
  rows: number,
  options: LayoutOptions = {},
): TerminalLayout {
  const safeCols = Math.max(cols, MIN_TERMINAL_COLS);
  const safeRows = Math.max(rows, MIN_TERMINAL_ROWS);

  const {
    showSidebar = true,
    showRightPanel = true,
    paletteOpen = false,
    toolLogRows = 0,
    breakpoint: breakpointOverride,
  } = options;

  const breakpoint = resolveBreakpoint(safeCols, breakpointOverride);
  const compact = breakpoint === LayoutBreakpoint.Compact;
  const gutter = CHROME.gutter;

  const headerRows = CHROME.headerRows;
  const tabBarRows = CHROME.tabBarRows;
  const statusBarRows = CHROME.statusBarRows;
  const inputRows = CHROME.inputRows;
  const paletteRows = paletteOpen ? CHROME.paletteMaxRows : 0;
  const safeToolLogRows = Math.max(0, toolLogRows);

  const chromeRows =
    headerRows + tabBarRows + statusBarRows + inputRows + paletteRows + safeToolLogRows;

  const contentRows = Math.max(1, safeRows - chromeRows);
  const chatHeight = Math.max(4, contentRows);

  let sidebarWidth = showSidebar ? sidebarWidthForBreakpoint(breakpoint, safeCols) : 0;
  let rightPanelWidth = rightPanelWidthForBreakpoint(breakpoint, safeCols, showRightPanel);

  const gutters = (sidebarWidth > 0 ? gutter : 0) + (rightPanelWidth > 0 ? gutter : 0);
  let mainWidth = safeCols - sidebarWidth - rightPanelWidth - gutters;

  /** Collapse sidebar if main would be too narrow */
  if (mainWidth < 36 && sidebarWidth > 0) {
    sidebarWidth = 0;
    mainWidth = safeCols - rightPanelWidth - (rightPanelWidth > 0 ? gutter : 0);
  }

  if (mainWidth < 28 && rightPanelWidth > 0) {
    rightPanelWidth = 0;
    mainWidth = safeCols - sidebarWidth - (sidebarWidth > 0 ? gutter : 0);
  }

  mainWidth = Math.max(20, mainWidth);

  const sidebarVisible = sidebarWidth > 0;
  const rightPanelVisible = rightPanelWidth > 0;

  return {
    cols: safeCols,
    rows: safeRows,
    breakpoint,
    contentCols: safeCols,
    contentRows,
    sidebarWidth,
    mainWidth,
    rightPanelWidth,
    gutter,
    headerRows,
    tabBarRows,
    statusBarRows,
    inputRows,
    paletteRows,
    toolLogRows: safeToolLogRows,
    chatHeight,
    mainBodyHeight: chatHeight,
    sidebarVisible,
    rightPanelVisible,
    paletteVisible: paletteOpen,
    compact,
  };
}

/** Read live terminal size from stdout. */
export function readTerminalSize(): { cols: number; rows: number } {
  return {
    cols: process.stdout.columns ?? MIN_TERMINAL_COLS,
    rows: process.stdout.rows ?? MIN_TERMINAL_ROWS,
  };
}

/** Compute layout from current terminal dimensions. */
export function computeCurrentLayout(options?: LayoutOptions): TerminalLayout {
  const { cols, rows } = readTerminalSize();
  return computeLayout(cols, rows, options);
}

/** Inner width for a bordered box (accounts for left/right borders). */
export function innerBoxWidth(outerWidth: number, paddingX = 0): number {
  return Math.max(1, outerWidth - 2 - paddingX * 2);
}

/** Inner height for a bordered box. */
export function innerBoxHeight(outerHeight: number, paddingY = 0): number {
  return Math.max(1, outerHeight - 2 - paddingY * 2);
}

/** Split main area into chat + optional bottom strip. */
export function splitVertical(
  totalHeight: number,
  topRatio: number,
  minTop = 4,
  minBottom = 2,
): { top: number; bottom: number } {
  const top = clamp(Math.floor(totalHeight * topRatio), minTop, totalHeight - minBottom);
  const bottom = Math.max(minBottom, totalHeight - top);
  return { top, bottom };
}

/** Column positions for three-pane layout (inclusive start, exclusive end). */
export function columnRegions(layout: TerminalLayout): {
  sidebar: { start: number; width: number } | null;
  main: { start: number; width: number };
  right: { start: number; width: number } | null;
} {
  let x = 0;
  const sidebar = layout.sidebarVisible
    ? { start: x, width: layout.sidebarWidth }
    : null;
  if (sidebar) x += layout.sidebarWidth + layout.gutter;

  const main = { start: x, width: layout.mainWidth };
  x += layout.mainWidth;

  const right = layout.rightPanelVisible
    ? { start: x + layout.gutter, width: layout.rightPanelWidth }
    : null;

  return { sidebar, main, right };
}

export function isLayoutCompact(layout: TerminalLayout): boolean {
  return layout.compact || layout.breakpoint === LayoutBreakpoint.Compact;
}

export function describeLayout(layout: TerminalLayout): string {
  return [
    `${layout.cols}×${layout.rows}`,
    layout.breakpoint,
    `main=${layout.mainWidth}`,
    layout.sidebarVisible ? `sidebar=${layout.sidebarWidth}` : "no-sidebar",
    layout.rightPanelVisible ? `right=${layout.rightPanelWidth}` : "no-right",
    `chat=${layout.chatHeight}`,
  ].join(" ");
}
