import { Box, Text } from "ink";
import type { ConfigStatus, TabId } from "../types.js";

type HeaderProps = {
  tab: TabId;
  config: ConfigStatus | null;
};

const TABS: TabId[] = ["chat", "vms", "alerts", "settings", "approvals"];

export function Header({ tab, config }: HeaderProps) {
  const api = config?.apiKeySet ? "● api" : "○ api";
  const apiColor = config?.apiKeySet ? "green" : "red";

  return (
    <Box flexDirection="column">
      <Box borderStyle="round" borderColor="cyan" paddingX={1}>
        <Text bold color="cyan">
          Mistral PVE
        </Text>
        <Text>  </Text>
        <Text dimColor>
          {config ? `${config.provider}/${config.model}` : "loading…"}
        </Text>
        <Text>  </Text>
        <Text color={apiColor}>{api}</Text>
        <Text>  </Text>
        <Text dimColor>Esc exit</Text>
      </Box>
      <Box marginTop={0}>
        {TABS.map((t) => (
          <Text key={t} color={t === tab ? "cyan" : "gray"} bold={t === tab}>
            {t === tab ? ` [${t}] ` : `  ${t}  `}
          </Text>
        ))}
      </Box>
    </Box>
  );
}
