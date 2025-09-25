import { useRef } from "react";

/**
 * useEditAnalytics
 * Lightweight hook to track which fields have been edited and counts.
 * Stores counts in-memory; can be extended to persist or send to analytics backend.
 */
export default function useEditAnalytics() {
  const counterRef = useRef<Record<string, number>>({});

  function recordFieldEdit(field: string) {
    const c = counterRef.current[field] || 0;
    counterRef.current[field] = c + 1;
  }

  function getStats() {
    return { edits: { ...counterRef.current } };
  }

  function reset() {
    counterRef.current = {};
  }

  return { recordFieldEdit, getStats, reset };
}
