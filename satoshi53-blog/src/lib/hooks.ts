import { useSyncExternalStore } from "react";

/**
 * Read a value from localStorage without causing hydration mismatches.
 * Returns null on the server and during the first client render,
 * then the actual value after hydration completes.
 */
export function useLocalStorage(key: string): string | null {
  return useSyncExternalStore(
    () => () => {},
    () => localStorage.getItem(key),
    () => null,
  );
}

/**
 * Returns true after the component has mounted on the client.
 * Use this to gate rendering of client-only content.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
