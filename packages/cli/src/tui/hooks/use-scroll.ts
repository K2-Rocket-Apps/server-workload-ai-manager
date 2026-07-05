import { useCallback, useMemo } from "react";
import { useAppDispatch, useAppState } from "../state/context.js";
import type { UiMessage } from "../types.js";

export type ScrollState = {
  scrollOffset: number;
  visibleMessages: UiMessage[];
  atTop: boolean;
  atBottom: boolean;
  scrollUp: (amount?: number) => void;
  scrollDown: (amount?: number) => void;
  pageUp: (pageSize: number) => void;
  pageDown: (pageSize: number) => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
};

export function useScroll(viewportHeight: number): ScrollState {
  const { messages, scrollOffset } = useAppState();
  const dispatch = useAppDispatch();

  const maxOffset = Math.max(0, messages.length - 1);
  const atTop = scrollOffset <= 0;
  const atBottom = scrollOffset >= maxOffset;

  const visibleMessages = useMemo(() => {
    if (messages.length <= viewportHeight) {
      return messages;
    }
    const end = scrollOffset + 1;
    const start = Math.max(0, end - viewportHeight);
    return messages.slice(start, end);
  }, [messages, scrollOffset, viewportHeight]);

  const scrollUp = useCallback(
    (amount = 1) => dispatch({ type: "SCROLL_UP", amount }),
    [dispatch],
  );

  const scrollDown = useCallback(
    (amount = 1) => dispatch({ type: "SCROLL_DOWN", amount }),
    [dispatch],
  );

  const pageUp = useCallback(
    (pageSize: number) => dispatch({ type: "SCROLL_PAGE_UP", pageSize }),
    [dispatch],
  );

  const pageDown = useCallback(
    (pageSize: number) => dispatch({ type: "SCROLL_PAGE_DOWN", pageSize }),
    [dispatch],
  );

  const scrollToTop = useCallback(
    () => dispatch({ type: "SCROLL_TO_TOP" }),
    [dispatch],
  );

  const scrollToBottom = useCallback(
    () => dispatch({ type: "SCROLL_TO_BOTTOM" }),
    [dispatch],
  );

  return {
    scrollOffset,
    visibleMessages,
    atTop,
    atBottom,
    scrollUp,
    scrollDown,
    pageUp,
    pageDown,
    scrollToTop,
    scrollToBottom,
  };
}
