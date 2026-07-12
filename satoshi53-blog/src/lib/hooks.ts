import { useSyncExternalStore } from "react";

/**
 * Returns true after the component has mounted on the client.
 * Use this to gate redirects that depend on browser-only APIs
 * (like localStorage) so they don't fire prematurely during
 * the first client render (before useSyncExternalStore has
 * had a chance to read the real value).
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/**
 * Read a value from localStorage without causing hydration mismatches.
 * Returns null on the server and during the first client render,
 * then the actual value (or null if the key doesn't exist) after
 * hydration completes.
 *
 * IMPORTANT: Because this returns null both when the key is missing
 * AND before the client has read localStorage, you must guard any
 * redirect logic with useMounted() to avoid premature redirects.
 */
export function useLocalStorage(key: string): string | null {
  return useSyncExternalStore(
    () => () => {},
    () => localStorage.getItem(key),
    () => null,
  );
}
