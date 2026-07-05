import { Box, Text } from "ink";
import { useAppSelector } from "../../state/context.js";
import type { Theme } from "../../core/theme.js";
import { getTheme } from "../../core/theme.js";
import type { PendingApproval } from "../../types.js";
import { EmptyState } from "../common/EmptyState.js";
import { KeyHintRow } from "../common/KeyHint.js";
import { ConfirmDialogInline } from "../common/ConfirmDialog.js";

export type ApprovalCardProps = {
  approval: PendingApproval;
  theme?: Theme;
  selected?: boolean;
};

export function ApprovalCard({ approval, theme, selected = true }: ApprovalCardProps) {
  const resolved = theme ?? getTheme();
  const argsJson = JSON.stringify(approval.args, null, 2);
  const lines = argsJson.split("\n");

  return (
    <Box
      flexDirection="column"
      borderStyle={selected ? "double" : "round"}
      borderColor={selected ? resolved.tokens.warning : resolved.tokens.borderMuted}
      paddingX={2}
      paddingY={1}
      marginBottom={1}
    >
      <Box flexDirection="row" justifyContent="space-between">
        <Text bold color={resolved.tokens.warning}>
          ⚠ {approval.name}
        </Text>
        <Text color={resolved.tokens.textMuted}>requires approval</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text color={resolved.tokens.textMuted}>Arguments:</Text>
        {lines.map((line, i) => (
          <Text key={i} color={resolved.tokens.textSecondary}>
            {line}
          </Text>
        ))}
      </Box>

      <Box marginTop={1}>
        <KeyHintRow
          theme={resolved}
          hints={[
            { keys: "y", label: "approve & run" },
            { keys: "n", label: "deny" },
          ]}
        />
      </Box>
    </Box>
  );
}

export function ApprovalsView() {
  const themeName = useAppSelector((s) => s.theme);
  const pending = useAppSelector((s) => s.pending);
  const loading = useAppSelector((s) => s.loading);
  const theme = getTheme(themeName);

  return (
    <Box flexDirection="column">
      <Text bold color={theme.tokens.primaryBright}>
        Pending Approvals
      </Text>
      <Text color={theme.tokens.textMuted}>
        Destructive VM actions (/start /stop /reboot) require explicit approval
      </Text>

      {loading ? (
        <Box marginTop={1}>
          <Text color={theme.tokens.warning}>Executing approved action…</Text>
        </Box>
      ) : null}

      <Box marginTop={1} flexDirection="column">
        {pending ? (
          <>
            <ConfirmDialogInline
              title="Confirm destructive action"
              message={`Allow ${pending.name} with the shown arguments?`}
              variant="warn"
            />
            <ApprovalCard approval={pending} theme={theme} />
          </>
        ) : (
          <EmptyState
            title="No pending approvals"
            description="When the agent requests a destructive tool, it will appear here."
            hints={["/start <vmid> — queue start", "/stop <vmid> — queue stop"]}
            theme={theme}
            icon="✓"
          />
        )}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>
          Approved actions run via ToolRegistry with approved: true flag.
        </Text>
      </Box>
    </Box>
  );
}
