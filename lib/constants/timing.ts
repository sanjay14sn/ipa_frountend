/**
 * lib/constants/timing.ts — Shared timing constants for React Query and polling.
 *
 * Centralizing these prevents the same magic numbers from being scattered across
 * hooks files and makes it easy to tune caching behaviour in one place.
 */

/** Reference-data that almost never changes (programs, kits, level kits). */
export const STATIC_STALE_TIME = Number.POSITIVE_INFINITY;
/** Keep static reference data in the cache for up to 30 minutes of inactivity. */
export const STATIC_GC_TIME = 30 * 60 * 1000;

/** Live lists that should be considered stale after 60 seconds. */
export const LIST_STALE_TIME = 60 * 1000;

/** Dashboard/monitoring data polled every 30 seconds. */
export const DASHBOARD_REFETCH_INTERVAL = 30 * 1000;

/** Notification unread count — stays fresh for 60 seconds before a background refetch. */
export const NOTIFICATIONS_STALE_TIME = 60 * 1000;

/** Debounce delay for search-input driven queries (milliseconds). */
export const SEARCH_DEBOUNCE_MS = 300;
