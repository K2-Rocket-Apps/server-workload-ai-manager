import { useCallback, useMemo } from "react";
import { useAppDispatch, useAppState } from "../state/context.js";

export type InputHistoryNav = {
  historyUp: () => string | null;
  historyDown: () => string | null;
  resetNav: () => void;
  pushLine: (line: string) => void;
  canNavigate: boolean;
};

/**
 * Navigate submitted input lines with Up/Down arrows.
 * Returns the line to set in the input field, or null if unchanged.
 */
export function useInputHistory(): InputHistoryNav {
  const { inputHistory, inputHistoryIndex } = useAppState();
  const dispatch = useAppDispatch();

  const canNavigate = inputHistory.length > 0;

  const historyUp = useCallback((): string | null => {
    if (!inputHistory.length) return null;

    const atStart = inputHistoryIndex < 0;
    const nextIndex = atStart
      ? inputHistory.length - 1
      : Math.max(0, inputHistoryIndex - 1);

    dispatch({ type: "SET_INPUT_HISTORY_INDEX", index: nextIndex });
    return inputHistory[nextIndex] ?? null;
  }, [dispatch, inputHistory, inputHistoryIndex]);

  const historyDown = useCallback((): string | null => {
    if (!inputHistory.length || inputHistoryIndex < 0) return null;

    if (inputHistoryIndex >= inputHistory.length - 1) {
      dispatch({ type: "RESET_INPUT_HISTORY_NAV" });
      return "";
    }

    const nextIndex = inputHistoryIndex + 1;
    dispatch({ type: "SET_INPUT_HISTORY_INDEX", index: nextIndex });
    return inputHistory[nextIndex] ?? null;
  }, [dispatch, inputHistory, inputHistoryIndex]);

  const resetNav = useCallback(() => {
    dispatch({ type: "RESET_INPUT_HISTORY_NAV" });
  }, [dispatch]);

  const pushLine = useCallback(
    (line: string) => {
      dispatch({ type: "PUSH_INPUT_HISTORY", line });
    },
    [dispatch],
  );

  return useMemo(
    () => ({
      historyUp,
      historyDown,
      resetNav,
      pushLine,
      canNavigate,
    }),
    [historyUp, historyDown, resetNav, pushLine, canNavigate],
  );
}

/** Current draft when browsing history (for display hints). */
export function useInputHistoryDraft(): { index: number; total: number; current: string } {
  const { inputHistory, inputHistoryIndex, input } = useAppState();
  return {
    index: inputHistoryIndex,
    total: inputHistory.length,
    current: input,
  };
}
