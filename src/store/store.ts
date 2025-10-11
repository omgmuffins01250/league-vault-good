import { leagueReducer, initialState, loadInitialState, persistState, type LeagueAction, type LeagueState } from "./leagueSlice";

type Listener = () => void;

type Reducer<S, A> = (state: S | undefined, action: A) => S;

type Store<S, A> = {
  getState: () => S;
  dispatch: (action: A) => A;
  subscribe: (listener: Listener) => () => void;
  replaceState: (nextState: S) => void;
};

function createStore<S, A>(reducer: Reducer<S, A>, preloadedState: S): Store<S, A> {
  let currentState = preloadedState;
  const listeners = new Set<Listener>();

  const getState = () => currentState;

  const dispatch = (action: A) => {
    currentState = reducer(currentState, action);
    listeners.forEach((listener) => listener());
    return action;
  };

  const subscribe = (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const replaceState = (nextState: S) => {
    currentState = nextState;
    listeners.forEach((listener) => listener());
  };

  return { getState, dispatch, subscribe, replaceState };
}

const preloadedState: LeagueState = typeof window !== "undefined" ? loadInitialState() : initialState;

export const store: Store<LeagueState, LeagueAction> = createStore(leagueReducer, preloadedState);

store.subscribe(() => {
  persistState(store.getState());
});

export function resetStoreForTests(state: LeagueState = initialState) {
  store.replaceState(state);
}

export type { LeagueAction, LeagueState, Store };
export { createStore };
