import { useEffect } from "react";
import { useAppDispatch } from "../state/context.js";
import { useTerminalSize } from "./use-terminal-size.js";

/** Sync polled terminal dimensions into global app state. */
export function useTerminalDispatch(): void {
  const dispatch = useAppDispatch();
  const size = useTerminalSize();

  useEffect(() => {
    dispatch({ type: "SET_TERMINAL_SIZE", width: size.width, height: size.height });
  }, [dispatch, size.width, size.height]);
}
