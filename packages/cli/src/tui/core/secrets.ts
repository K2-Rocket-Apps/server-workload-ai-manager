/** Redact secrets from slash commands shown in chat history. */
export function redactSlashCommand(line: string): string {
  const trimmed = line.trim();
  if (!trimmed.startsWith("/")) return line;

  const body = trimmed.slice(1).trim();
  const space = body.indexOf(" ");
  const name = (space === -1 ? body : body.slice(0, space)).toLowerCase();
  const rest = space === -1 ? "" : body.slice(space + 1);

  const secretCommands = new Set(["apikey", "key"]);
  if (secretCommands.has(name) && rest) {
    return `/${name} ****`;
  }

  return line;
}

export function isSecretSlashCommand(line: string): boolean {
  const redacted = redactSlashCommand(line);
  return redacted !== line.trim();
}
