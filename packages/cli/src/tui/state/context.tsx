import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { AppDispatch } from "./actions.js";
import { appReducer, createInitialState } from "./reducer.js";
import type { AppState } from "../types.js";

type AppStateContextValue = {
  state: AppState;
  dispatch: AppDispatch;
};

const AppStateContext = createContext<AppStateContextValue | null>(null);

export type AppStateProviderProps = {
  children: ReactNode;
  initialState?: Partial<AppState>;
};

export function AppStateProvider({ children, initialState }: AppStateProviderProps) {
  const [state, dispatch] = useReducer(
    appReducer,
    initialState,
    (partial) => createInitialState(partial),
  );

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error("useAppState must be used within AppStateProvider");
  }
  return ctx.state;
}

export function useAppDispatch(): AppDispatch {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error("useAppDispatch must be used within AppStateProvider");
  }
  return ctx.dispatch;
}

export function useAppSelector<T>(selector: (state: AppState) => T): T {
  const state = useAppState();
  return useMemo(() => selector(state), [state, selector]);
}

export function useAppStore(): AppStateContextValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error("useAppStore must be used within AppStateProvider");
  }
  return ctx;
}

/** Convenience hook for tab + input slices. */
export function useChatInput() {
  const state = useAppState();
  const dispatch = useAppDispatch();

  const setInput = useCallback(
    (input: string) => dispatch({ type: "SET_INPUT", input }),
    [dispatch],
  );

  const setTab = useCallback(
    (tab: AppState["tab"]) => dispatch({ type: "SET_TAB", tab }),
    [dispatch],
  );

  return {
    tab: state.tab,
    input: state.input,
    loading: state.loading,
    setInput,
    setTab,
  };
}
