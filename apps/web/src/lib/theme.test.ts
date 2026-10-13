import { applyTheme, persistTheme, readStoredTheme, THEME_STORAGE_KEY } from './theme';

describe('theme persistence', () => {
  it('defaults to the system preference', () => {
    expect(readStoredTheme()).toBe('system');
  });

  it.each(['light', 'dark'] as const)('round-trips %s', (preference) => {
    persistTheme(preference);
    expect(readStoredTheme()).toBe(preference);
  });

  it('forgets the override when switching back to system', () => {
    persistTheme('dark');
    persistTheme('system');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(readStoredTheme()).toBe('system');
  });

  it('ignores a corrupted stored value', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'neon');
    expect(readStoredTheme()).toBe('system');
  });

  it('survives unavailable storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(readStoredTheme()).toBe('system');
    expect(() => persistTheme('dark')).not.toThrow();
    vi.restoreAllMocks();
  });
});

describe('applyTheme', () => {
  it('sets an explicit theme on the root element', () => {
    applyTheme('dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    applyTheme('light');
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it('removes the override for system so the media query decides', () => {
    applyTheme('dark');
    applyTheme('system');
    expect(document.documentElement).not.toHaveAttribute('data-theme');
  });
});
