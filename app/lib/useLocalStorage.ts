"use client";

import { useEffect, useRef, useState } from "react";

/**
 * State synced to localStorage. SSR-safe: starts from `initial` on the server
 * and during the first client render, then hydrates from storage in an effect
 * to avoid hydration mismatches.
 */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const loaded = useRef(false);

  // Hydrate once on mount.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      // ignore corrupt / unavailable storage
    }
    loaded.current = true;
  }, [key]);

  // Persist after the initial hydration so we never overwrite stored data.
  useEffect(() => {
    if (!loaded.current) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore quota / unavailable storage
    }
  }, [key, value]);

  return [value, setValue] as const;
}
