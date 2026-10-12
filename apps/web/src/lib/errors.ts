import type { SerializedError } from '@reduxjs/toolkit';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';

export const OFFLINE_MESSAGE = 'Cannot reach the server. Check your connection and try again.';
export const RATE_LIMITED_MESSAGE = 'Too many requests. Please wait a moment and try again.';
export const STALLED_MESSAGE = 'The suggestion is taking too long. Please try again.';

/**
 * Maps an RTK Query error to a user-facing message. Only causes the user can act on
 * (offline, rate limit) get a specific message; everything else uses the caller's fallback
 * so server internals never leak into the UI.
 */
export function describeQueryError(
  error: FetchBaseQueryError | SerializedError | undefined,
  fallback: string,
): string {
  if (!error || !('status' in error)) return fallback;
  if (error.status === 'FETCH_ERROR') return OFFLINE_MESSAGE;
  if (error.status === 429) return RATE_LIMITED_MESSAGE;
  return fallback;
}
