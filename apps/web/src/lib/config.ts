/**
 * Absolute API base URL. Same-origin `/api` by default (Vite proxy in dev, Express in prod);
 * set VITE_API_URL to point at a separately hosted API. Absolute because Node's fetch (tests)
 * rejects relative URLs.
 */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_URL ?? new URL('/api', window.location.origin).href;
