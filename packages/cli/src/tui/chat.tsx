import { render } from "ink";
import { MistralApp } from "./app.js";

export function runChatTui(): Promise<void> {
  return new Promise((resolve) => {
    const { unmount } = render(<MistralApp onExit={resolve} />);
    process.on("SIGINT", () => {
      unmount();
      resolve();
    });
  });
}
