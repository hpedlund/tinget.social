"use client";

import { useCallback, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("popstate", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("popstate", listener);
  };
}

/**
 * The page's query string as state. Static export has no request-time
 * searchParams: the server snapshot is "" so hydration matches the
 * prerendered default view, then React re-renders with the real URL.
 * `push` adds one history entry per change (Back undoes it); Next.js
 * integrates native pushState with its router, so nothing is fetched.
 */
export function useSearchState(): [search: string, push: (search: string) => void] {
  const search = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => "",
  );
  const push = useCallback((next: string) => {
    if (next === window.location.search) return;
    const { pathname, hash } = window.location;
    window.history.pushState(null, "", `${pathname}${next}${hash}`);
    listeners.forEach((listener) => listener());
  }, []);
  return [search, push];
}
