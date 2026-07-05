import { useCallback, useMemo } from "react";
import { useInput } from "ink";
import { fuzzyFilterMulti } from "../core/fuzzy.js";
import { SLASH_COMMANDS } from "../commands/registry.js";
import { useAppDispatch, useAppSelector } from "../state/context.js";

export function useCommandPaletteKeyboard(onRun: (line: string) => void): void {
  const modal = useAppSelector((s) => s.modal);
  const dispatch = useAppDispatch();

  const active = modal.type === "commandPalette";
  const query = active ? modal.query : "";
  const selectedIndex = active ? modal.selectedIndex : 0;

  const results = useMemo(
    () =>
      fuzzyFilterMulti(
        SLASH_COMMANDS,
        query,
        [
          (c) => c.name,
          (c) => c.usage,
          (c) => c.description,
          (c) => c.category,
          (c) => (c.aliases ?? []).join(" "),
        ],
        50,
      ),
    [query],
  );

  const runSelected = useCallback(() => {
    if (!active) return;
    const item = results[selectedIndex]?.item ?? results[0]?.item;
    if (!item) return;
    dispatch({ type: "CLOSE_MODAL" });
    dispatch({ type: "CLEAR_INPUT" });
    onRun(item.usage.startsWith("/") ? item.usage : `/${item.name}`);
  }, [active, dispatch, onRun, results, selectedIndex]);

  useInput(
    (input, key) => {
      if (!active) return;

      if (key.escape) {
        dispatch({ type: "CLOSE_MODAL" });
        return;
      }

      if (key.return) {
        runSelected();
        return;
      }

      if (key.upArrow) {
        const next = selectedIndex <= 0 ? Math.max(0, results.length - 1) : selectedIndex - 1;
        dispatch({
          type: "SET_MODAL",
          modal: { type: "commandPalette", query, selectedIndex: next },
        });
        return;
      }

      if (key.downArrow) {
        const next = results.length ? (selectedIndex + 1) % results.length : 0;
        dispatch({
          type: "SET_MODAL",
          modal: { type: "commandPalette", query, selectedIndex: next },
        });
        return;
      }

      if (key.backspace || key.delete) {
        dispatch({
          type: "SET_MODAL",
          modal: {
            type: "commandPalette",
            query: query.slice(0, -1),
            selectedIndex: 0,
          },
        });
        return;
      }

      if (input && input.length === 1 && input >= " " && !key.ctrl && !key.meta) {
        dispatch({
          type: "SET_MODAL",
          modal: {
            type: "commandPalette",
            query: query + input,
            selectedIndex: 0,
          },
        });
      }
    },
    { isActive: active },
  );
}

export function openCommandPalette(dispatch: ReturnType<typeof useAppDispatch>): void {
  dispatch({ type: "OPEN_COMMAND_PALETTE", query: "" });
}
