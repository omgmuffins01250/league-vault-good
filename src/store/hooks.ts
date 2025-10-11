import { useCallback } from "react";
import { useSyncExternalStore } from "react";
import { initialState, type LeagueState } from "./leagueSlice";
import { store } from "./store";

export function useLeagueSelector<T>(selector: (state: LeagueState) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(initialState)
  );
}

export function useLeagueDispatch() {
  return useCallback(store.dispatch, []);
}
