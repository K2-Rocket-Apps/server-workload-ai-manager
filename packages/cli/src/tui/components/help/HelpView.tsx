import { Box, Text } from "ink";
import { useAppSelector } from "../../state/context.js";
import { formatHelpText } from "../../commands/registry.js";
import { formatBindingsHelp, listBindings } from "../../core/keybindings.js";
import { getTheme } from "../../core/theme.js";
import { DataTable, type DataTableColumn } from "../../render/table.js";
import { Divider } from "../common/Divider.js";
import { KeyHintRow } from "../common/KeyHint.js";

type BindingRow = {
  context: string;
  keys: string;
  description: string;
};

const BINDING_COLUMNS: DataTableColumn<BindingRow>[] = [
  { key: "context", header: "Context", width: 12 },
  { key: "keys", header: "Key", width: 14 },
  { key: "description", header: "Action", width: 36 },
];

export function HelpView() {
  const themeName = useAppSelector((s) => s.theme);
  const modal = useAppSelector((s) => s.modal);
  const theme = getTheme(themeName);

  const bindingRows: BindingRow[] = listBindings().map((b) => ({
    context: b.context ?? "global",
    keys: b.label,
    description: b.description,
  }));

  const showKeyOverlay = modal.type === "keybindingsOverlay";

  return (
    <Box flexDirection="column">
      <Text bold color={theme.tokens.primaryBright}>
        Help
      </Text>
      <Text color={theme.tokens.textMuted}>
        Slash commands, keybindings, and quick reference
      </Text>

      <KeyHintRow
        theme={theme}
        hints={[
          { keys: "?", label: "this tab" },
          { keys: "F1", label: "key overlay" },
          { keys: "/", label: "command palette" },
        ]}
      />

      <Divider label="Slash Commands" theme={theme} width={60} />

      <Box flexDirection="column" marginTop={0}>
        {formatHelpText()
          .split("\n")
          .slice(0, 24)
          .map((line, i) => (
            <Text key={i} color={line.endsWith(":") ? theme.tokens.primary : undefined}>
              {line || " "}
            </Text>
          ))}
        <Text dimColor>… type /help in chat for full list</Text>
      </Box>

      <Divider label="Keybindings" theme={theme} width={60} />

      <DataTable
        columns={BINDING_COLUMNS}
        rows={bindingRows.slice(0, 18)}
        theme={theme}
        maxRows={18}
        zebra
      />

      {showKeyOverlay ? (
        <Box
          marginTop={1}
          borderStyle="double"
          borderColor={theme.tokens.borderFocus}
          paddingX={1}
        >
          <Text bold color={theme.tokens.primary}>
            Keybindings Overlay
          </Text>
          {formatBindingsHelp()
            .split("\n")
            .map((line, i) => (
              <Text key={i}>{line}</Text>
            ))}
        </Box>
      ) : null}

      <Box marginTop={1}>
        <Text color={theme.tokens.textMuted} dimColor>
          Esc exit · Tab next screen · 1-8 jump tabs
        </Text>
      </Box>
    </Box>
  );
}
