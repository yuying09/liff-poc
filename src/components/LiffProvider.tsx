"use client";

import { createContext, useCallback, useEffect, useReducer, useRef } from "react";
import type { Liff } from "@line/liff";

export type Profile = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
};

type State = {
  liff: Liff | null;
  isReady: boolean;
  isLoggedIn: boolean;
  isInClient: boolean;
  profile: Profile | null;
  error: Error | null;
};

type Action =
  | { type: "INIT_SUCCESS"; liff: Liff; isLoggedIn: boolean; isInClient: boolean; profile: Profile | null }
  | { type: "INIT_ERROR"; error: Error }
  | { type: "LOGOUT" };

const initialState: State = {
  liff: null,
  isReady: false,
  isLoggedIn: false,
  isInClient: false,
  profile: null,
  error: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "INIT_SUCCESS":
      return {
        ...state,
        liff: action.liff,
        isReady: true,
        isLoggedIn: action.isLoggedIn,
        isInClient: action.isInClient,
        profile: action.profile,
      };
    case "INIT_ERROR":
      return { ...state, isReady: true, error: action.error };
    case "LOGOUT":
      return { ...state, isLoggedIn: false, profile: null };
    default:
      return state;
  }
}

export type LiffState = State & {
  login: () => void;
  logout: () => void;
};

export const LiffContext = createContext<LiffState | undefined>(undefined);

export function LiffProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const initCalled = useRef(false);

  useEffect(() => {
    if (initCalled.current) return;
    initCalled.current = true;

    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;

    async function init() {
      if (!liffId) {
        dispatch({ type: "INIT_ERROR", error: new Error("NEXT_PUBLIC_LIFF_ID is not set") });
        return;
      }
      try {
        const { getLiff } = await import("@/lib/liff");
        const liffInstance = await getLiff();
        await liffInstance.init({ liffId });

        const loggedIn = liffInstance.isLoggedIn();
        const profile = loggedIn ? await liffInstance.getProfile() : null;

        dispatch({
          type: "INIT_SUCCESS",
          liff: liffInstance,
          isLoggedIn: loggedIn,
          isInClient: liffInstance.isInClient(),
          profile,
        });
      } catch (err) {
        dispatch({ type: "INIT_ERROR", error: err instanceof Error ? err : new Error(String(err)) });
      }
    }

    init();
  }, []);

  const login = useCallback(() => {
    state.liff?.login();
  }, [state.liff]);

  const logout = useCallback(() => {
    if (!state.liff) return;
    state.liff.logout();
    dispatch({ type: "LOGOUT" });
  }, [state.liff]);

  return (
    <LiffContext.Provider value={{ ...state, login, logout }}>
      {children}
    </LiffContext.Provider>
  );
}
