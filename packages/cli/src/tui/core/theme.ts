/**
 * Semantic color tokens for the Mistral TUI.
 * Each token maps to an Ink-compatible color name or hex where supported.
 */
export interface ThemeTokens {
  /** Primary brand accent */
  primary: string;
  primaryBright: string;
  primaryDim: string;

  /** Secondary accent for highlights */
  secondary: string;
  secondaryBright: string;
  secondaryDim: string;

  /** Background layers */
  bgBase: string;
  bgElevated: string;
  bgOverlay: string;
  bgMuted: string;

  /** Text hierarchy */
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  /** Borders and dividers */
  borderDefault: string;
  borderFocus: string;
  borderMuted: string;

  /** Semantic status */
  success: string;
  successDim: string;
  warning: string;
  warningDim: string;
  error: string;
  errorDim: string;
  info: string;
  infoDim: string;

  /** Chat message roles */
  userBubble: string;
  assistantBubble: string;
  systemBubble: string;
  toolBubble: string;

  /** Tab / nav */
  tabActive: string;
  tabInactive: string;
  tabShortcut: string;

  /** Input */
  inputText: string;
  inputPlaceholder: string;
  inputCursor: string;

  /** Table / data */
  tableHeader: string;
  tableBorder: string;
  tableRowAlt: string;
  tableRowHover: string;

  /** Markdown */
  mdHeading: string;
  mdCode: string;
  mdCodeBg: string;
  mdLink: string;
  mdQuote: string;
  mdBold: string;
  mdItalic: string;

  /** Sparkline / chart */
  chartBar: string;
  chartEmpty: string;

  /** Progress */
  progressFill: string;
  progressEmpty: string;
}

export type ThemeName = "mistral" | "midnight" | "forest" | "amber" | "mono";

export interface Theme {
  name: ThemeName;
  label: string;
  description: string;
  tokens: ThemeTokens;
}

const mistral: Theme = {
  name: "mistral",
  label: "Mistral",
  description: "Default cyan accent on dark terminal",
  tokens: {
    primary: "cyan",
    primaryBright: "cyanBright",
    primaryDim: "blue",
    secondary: "magenta",
    secondaryBright: "magentaBright",
    secondaryDim: "blue",
    bgBase: "black",
    bgElevated: "blackBright",
    bgOverlay: "gray",
    bgMuted: "blackBright",
    textPrimary: "white",
    textSecondary: "whiteBright",
    textMuted: "gray",
    textInverse: "black",
    borderDefault: "cyan",
    borderFocus: "cyanBright",
    borderMuted: "gray",
    success: "green",
    successDim: "greenBright",
    warning: "yellow",
    warningDim: "yellowBright",
    error: "red",
    errorDim: "redBright",
    info: "blue",
    infoDim: "blueBright",
    userBubble: "white",
    assistantBubble: "cyan",
    systemBubble: "yellow",
    toolBubble: "magenta",
    tabActive: "cyan",
    tabInactive: "gray",
    tabShortcut: "whiteBright",
    inputText: "white",
    inputPlaceholder: "gray",
    inputCursor: "cyanBright",
    tableHeader: "cyan",
    tableBorder: "gray",
    tableRowAlt: "blackBright",
    tableRowHover: "blue",
    mdHeading: "cyanBright",
    mdCode: "green",
    mdCodeBg: "blackBright",
    mdLink: "blueBright",
    mdQuote: "yellow",
    mdBold: "whiteBright",
    mdItalic: "white",
    chartBar: "cyan",
    chartEmpty: "gray",
    progressFill: "cyan",
    progressEmpty: "gray",
  },
};

const midnight: Theme = {
  name: "midnight",
  label: "Midnight",
  description: "Deep blue palette for low-light sessions",
  tokens: {
    primary: "blue",
    primaryBright: "blueBright",
    primaryDim: "blue",
    secondary: "magenta",
    secondaryBright: "magentaBright",
    secondaryDim: "blueBright",
    bgBase: "black",
    bgElevated: "blackBright",
    bgOverlay: "blue",
    bgMuted: "blackBright",
    textPrimary: "whiteBright",
    textSecondary: "white",
    textMuted: "gray",
    textInverse: "black",
    borderDefault: "blue",
    borderFocus: "blueBright",
    borderMuted: "blueBright",
    success: "greenBright",
    successDim: "green",
    warning: "yellowBright",
    warningDim: "yellow",
    error: "redBright",
    errorDim: "red",
    info: "cyan",
    infoDim: "cyanBright",
    userBubble: "whiteBright",
    assistantBubble: "blueBright",
    systemBubble: "yellowBright",
    toolBubble: "magentaBright",
    tabActive: "blueBright",
    tabInactive: "gray",
    tabShortcut: "blue",
    inputText: "whiteBright",
    inputPlaceholder: "gray",
    inputCursor: "blueBright",
    tableHeader: "blueBright",
    tableBorder: "blue",
    tableRowAlt: "blackBright",
    tableRowHover: "blue",
    mdHeading: "blueBright",
    mdCode: "cyan",
    mdCodeBg: "blackBright",
    mdLink: "magentaBright",
    mdQuote: "blue",
    mdBold: "whiteBright",
    mdItalic: "white",
    chartBar: "blueBright",
    chartEmpty: "blue",
    progressFill: "blueBright",
    progressEmpty: "blue",
  },
};

const forest: Theme = {
  name: "forest",
  label: "Forest",
  description: "Green tones inspired by terminal classics",
  tokens: {
    primary: "green",
    primaryBright: "greenBright",
    primaryDim: "green",
    secondary: "yellow",
    secondaryBright: "yellowBright",
    secondaryDim: "greenBright",
    bgBase: "black",
    bgElevated: "blackBright",
    bgOverlay: "green",
    bgMuted: "blackBright",
    textPrimary: "greenBright",
    textSecondary: "green",
    textMuted: "gray",
    textInverse: "black",
    borderDefault: "green",
    borderFocus: "greenBright",
    borderMuted: "green",
    success: "greenBright",
    successDim: "green",
    warning: "yellow",
    warningDim: "yellowBright",
    error: "red",
    errorDim: "redBright",
    info: "cyan",
    infoDim: "cyanBright",
    userBubble: "white",
    assistantBubble: "greenBright",
    systemBubble: "yellow",
    toolBubble: "cyan",
    tabActive: "greenBright",
    tabInactive: "gray",
    tabShortcut: "green",
    inputText: "greenBright",
    inputPlaceholder: "green",
    inputCursor: "greenBright",
    tableHeader: "greenBright",
    tableBorder: "green",
    tableRowAlt: "blackBright",
    tableRowHover: "green",
    mdHeading: "greenBright",
    mdCode: "yellow",
    mdCodeBg: "blackBright",
    mdLink: "cyanBright",
    mdQuote: "green",
    mdBold: "greenBright",
    mdItalic: "green",
    chartBar: "greenBright",
    chartEmpty: "green",
    progressFill: "greenBright",
    progressEmpty: "green",
  },
};

const amber: Theme = {
  name: "amber",
  label: "Amber",
  description: "Warm amber/orange retro terminal feel",
  tokens: {
    primary: "yellow",
    primaryBright: "yellowBright",
    primaryDim: "red",
    secondary: "redBright",
    secondaryBright: "redBright",
    secondaryDim: "yellow",
    bgBase: "black",
    bgElevated: "blackBright",
    bgOverlay: "red",
    bgMuted: "blackBright",
    textPrimary: "yellowBright",
    textSecondary: "yellow",
    textMuted: "gray",
    textInverse: "black",
    borderDefault: "yellow",
    borderFocus: "yellowBright",
    borderMuted: "red",
    success: "green",
    successDim: "greenBright",
    warning: "yellowBright",
    warningDim: "yellow",
    error: "redBright",
    errorDim: "red",
    info: "blueBright",
    infoDim: "blue",
    userBubble: "yellowBright",
    assistantBubble: "yellow",
    systemBubble: "redBright",
    toolBubble: "magenta",
    tabActive: "yellowBright",
    tabInactive: "gray",
    tabShortcut: "yellow",
    inputText: "yellowBright",
    inputPlaceholder: "red",
    inputCursor: "yellowBright",
    tableHeader: "yellowBright",
    tableBorder: "yellow",
    tableRowAlt: "blackBright",
    tableRowHover: "red",
    mdHeading: "yellowBright",
    mdCode: "redBright",
    mdCodeBg: "blackBright",
    mdLink: "blueBright",
    mdQuote: "red",
    mdBold: "yellowBright",
    mdItalic: "yellow",
    chartBar: "yellowBright",
    chartEmpty: "red",
    progressFill: "yellowBright",
    progressEmpty: "red",
  },
};

const mono: Theme = {
  name: "mono",
  label: "Mono",
  description: "Grayscale minimal theme",
  tokens: {
    primary: "whiteBright",
    primaryBright: "whiteBright",
    primaryDim: "gray",
    secondary: "white",
    secondaryBright: "whiteBright",
    secondaryDim: "gray",
    bgBase: "black",
    bgElevated: "blackBright",
    bgOverlay: "gray",
    bgMuted: "blackBright",
    textPrimary: "whiteBright",
    textSecondary: "white",
    textMuted: "gray",
    textInverse: "black",
    borderDefault: "white",
    borderFocus: "whiteBright",
    borderMuted: "gray",
    success: "whiteBright",
    successDim: "white",
    warning: "white",
    warningDim: "gray",
    error: "whiteBright",
    errorDim: "gray",
    info: "white",
    infoDim: "gray",
    userBubble: "whiteBright",
    assistantBubble: "white",
    systemBubble: "gray",
    toolBubble: "whiteBright",
    tabActive: "whiteBright",
    tabInactive: "gray",
    tabShortcut: "white",
    inputText: "whiteBright",
    inputPlaceholder: "gray",
    inputCursor: "whiteBright",
    tableHeader: "whiteBright",
    tableBorder: "gray",
    tableRowAlt: "blackBright",
    tableRowHover: "white",
    mdHeading: "whiteBright",
    mdCode: "white",
    mdCodeBg: "blackBright",
    mdLink: "whiteBright",
    mdQuote: "gray",
    mdBold: "whiteBright",
    mdItalic: "white",
    chartBar: "whiteBright",
    chartEmpty: "gray",
    progressFill: "whiteBright",
    progressEmpty: "gray",
  },
};

const THEMES: Record<ThemeName, Theme> = {
  mistral,
  midnight,
  forest,
  amber,
  mono,
};

const DEFAULT_THEME: ThemeName = "mistral";

/** Resolve theme by name; falls back to mistral for unknown names. */
export function getTheme(name?: string | null): Theme {
  if (!name) return THEMES[DEFAULT_THEME];
  const key = name.toLowerCase() as ThemeName;
  return THEMES[key] ?? THEMES[DEFAULT_THEME];
}

/** List all registered themes for settings UI. */
export function listThemeNames(): ThemeName[] {
  return Object.keys(THEMES) as ThemeName[];
}

export function listThemes(): Theme[] {
  return Object.values(THEMES);
}

/** Get a single token from the active theme. */
export function themeColor(name: ThemeName | undefined, token: keyof ThemeTokens): string {
  return getTheme(name).tokens[token];
}

/** Map semantic token to Ink Text color prop. */
export function applyThemeToInkColor(
  theme: Theme | ThemeName,
  token: keyof ThemeTokens,
): string {
  const resolved = typeof theme === "string" ? getTheme(theme) : theme;
  return resolved.tokens[token];
}

/** Pick role-based bubble color from theme. */
export function messageRoleColor(
  theme: Theme,
  role: "user" | "assistant" | "system" | "tool",
): string {
  switch (role) {
    case "user":
      return theme.tokens.userBubble;
    case "assistant":
      return theme.tokens.assistantBubble;
    case "system":
      return theme.tokens.systemBubble;
    case "tool":
      return theme.tokens.toolBubble;
    default:
      return theme.tokens.textPrimary;
  }
}

/** Border color for focused vs unfocused panels. */
export function panelBorderColor(theme: Theme, focused: boolean): string {
  return focused ? theme.tokens.borderFocus : theme.tokens.borderMuted;
}

/** Status severity → theme token */
export function severityColor(
  theme: Theme,
  severity: "ok" | "warn" | "crit" | "info" | "unknown",
): string {
  switch (severity) {
    case "ok":
      return theme.tokens.success;
    case "warn":
      return theme.tokens.warning;
    case "crit":
      return theme.tokens.error;
    case "info":
      return theme.tokens.info;
    default:
      return theme.tokens.textMuted;
  }
}

export { THEMES, DEFAULT_THEME };
