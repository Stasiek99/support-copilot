// Applies a stored theme before first paint to avoid a flash of the wrong palette.
// Kept as a static file (not inline) so a strict Content-Security-Policy can stay in place.
// The storage key must match THEME_STORAGE_KEY in src/lib/theme.ts.
try {
  var theme = localStorage.getItem('support-copilot:theme');
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.setAttribute('data-theme', theme);
  }
} catch {
  /* storage unavailable: fall back to the OS preference */
}
