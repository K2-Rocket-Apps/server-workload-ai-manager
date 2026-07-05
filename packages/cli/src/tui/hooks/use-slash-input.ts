import { useCallback, useMemo } from "react";
import {
  autocompleteInput,
  filterCommands,
  shouldShowPalette,
  type SlashCommand,
} from "../commands/registry.js";
import { useAppDispatch, useAppState } from "../state/context.js";

export type SlashInputState = {
  slashActive: boolean;
  matches: SlashCommand[];
  selectedIndex: number;
  showPalette: boolean;
  handleTab: () => void;
  handleUp: () => void;
  handleDown: () => void;
  resetIndex: () => void;
};

export function useSlashInput(): SlashInputState {
  const { tab, input, slashSelectedIndex } = useAppState();
  const dispatch = useAppDispatch();

  const slashActive = tab === "chat" && input.startsWith("/");

  const matches = useMemo(
    () => (slashActive ? filterCommands(input) : []),
    [slashActive, input],
  );

  const showPalette = slashActive && shouldShowPalette(input) && matches.length > 0;

  const handleUp = useCallback(() => {
    if (!matches.length) return;
    const next = slashSelectedIndex <= 0 ? matches.length - 1 : slashSelectedIndex - 1;
    dispatch({ type: "SET_SLASH_SELECTED_INDEX", index: next });
  }, [dispatch, matches.length, slashSelectedIndex]);

  const handleDown = useCallback(() => {
    if (!matches.length) return;
    const next = (slashSelectedIndex + 1) % matches.length;
    dispatch({ type: "SET_SLASH_SELECTED_INDEX", index: next });
  }, [dispatch, matches.length, slashSelectedIndex]);

  const handleTab = useCallback(() => {
    if (!matches.length) return;
    const next = autocompleteInput(input, slashSelectedIndex, matches);
    dispatch({ type: "SET_INPUT", input: next });
    dispatch({ type: "RESET_SLASH_SELECTED_INDEX" });
  }, [dispatch, input, matches, slashSelectedIndex]);

  const resetIndex = useCallback(() => {
    dispatch({ type: "RESET_SLASH_SELECTED_INDEX" });
  }, [dispatch]);

  return {
    slashActive,
    matches,
    selectedIndex: slashSelectedIndex,
    showPalette,
    handleTab,
    handleUp,
    handleDown,
    resetIndex,
  };
}
