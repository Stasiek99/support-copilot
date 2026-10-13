export const API_BASE_URL: string =
  import.meta.env.VITE_API_URL ?? new URL('/api', window.location.origin).href;

/** Max silence between stream events before a suggestion is considered stalled. */
export const STREAM_STALL_TIMEOUT_MS = 30_000;
