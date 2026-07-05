import { useEffect, useState } from "react";

export type TerminalSize = {
  width: number;
  height: number;
};

const DEFAULT_WIDTH = 80;
const DEFAULT_HEIGHT = 24;
const POLL_MS = 250;

function readTerminalSize(): TerminalSize {
  return {
    width: process.stdout.columns ?? DEFAULT_WIDTH,
    height: process.stdout.rows ?? DEFAULT_HEIGHT,
  };
}

export type UseTerminalSizeOptions = {
  pollMs?: number;
  onResize?: (size: TerminalSize) => void;
};

/**
 * Tracks terminal dimensions via stdout resize events and periodic polling
 * (some terminals do not emit resize reliably).
 */
export function useTerminalSize(options: UseTerminalSizeOptions = {}): TerminalSize {
  const pollMs = options.pollMs ?? POLL_MS;
  const [size, setSize] = useState<TerminalSize>(readTerminalSize);

  useEffect(() => {
    let last = readTerminalSize();

    const apply = () => {
      const next = readTerminalSize();
      if (next.width !== last.width || next.height !== last.height) {
        last = next;
        setSize(next);
        options.onResize?.(next);
      }
    };

    process.stdout.on("resize", apply);
    const timer = setInterval(apply, pollMs);

    return () => {
      process.stdout.off("resize", apply);
      clearInterval(timer);
    };
  }, [pollMs, options.onResize]);

  return size;
}

/** Chat viewport height given chrome overhead rows. */
export function chatViewportHeight(termRows: number, chromeRows = 18): number {
  return Math.max(6, termRows - chromeRows);
}
