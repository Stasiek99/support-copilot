export const API_BASE_URL: string =
  import.meta.env.VITE_API_URL ?? new URL('/api', window.location.origin).href;
