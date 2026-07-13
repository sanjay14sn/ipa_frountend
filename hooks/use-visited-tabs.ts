"use client";

import { useState } from "react";

/**
 * Tracks which tab values have been active at least once (ADM-23:
 * mount-on-first-activation, keep-alive after — switching back to a visited
 * tab must not remount/refetch it).
 *
 * Uses React's documented "adjust state during render" pattern rather than
 * an effect, so the first activation renders the panel in the same pass.
 */
export function useVisitedTabs<T extends string>(active: T): (tab: T) => boolean {
  const [visited, setVisited] = useState<readonly T[]>([active]);
  if (!visited.includes(active)) {
    setVisited([...visited, active]);
  }
  return (tab: T) => visited.includes(tab) || tab === active;
}
