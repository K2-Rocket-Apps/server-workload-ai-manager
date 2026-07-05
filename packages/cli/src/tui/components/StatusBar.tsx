import { Box, Text } from "ink";

type StatusBarProps = {
  slashActive: boolean;
  loading: boolean;
  tab: string;
};

export function StatusBar({ slashActive, loading, tab }: StatusBarProps) {
  const hints = slashActive
    ? "↑↓ pick command  Tab complete  Enter run"
    : tab === "chat"
      ? "/ commands  Tab next view  Enter send"
      : tab === "vms"
        ? "r refresh  /vms  Tab next view"
        : tab === "approvals"
          ? "y approve  n deny  Tab next view"
          : "Tab next view  /tab <name>";

  return (
    <Box borderStyle="single" borderColor="gray" paddingX={1}>
      <Text dimColor>{loading ? "⏳ working…  " : ""}</Text>
      <Text dimColor>{hints}</Text>
    </Box>
  );
}
