import { isThemePreference, THEME_PREFERENCES } from '../lib/theme';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setTheme } from '../store/themeSlice';
import styles from './ThemeToggle.module.css';

const LABELS = { system: 'System', light: 'Light', dark: 'Dark' } as const;

export function ThemeToggle() {
  const preference = useAppSelector((state) => state.theme.preference);
  const dispatch = useAppDispatch();

  return (
    <fieldset className={styles.group}>
      <legend className="visually-hidden">Theme</legend>
      {THEME_PREFERENCES.map((option) => (
        <label key={option} className={styles.option}>
          <input
            type="radio"
            name="theme"
            className={styles.input}
            value={option}
            checked={preference === option}
            onChange={(event) => {
              if (isThemePreference(event.target.value)) dispatch(setTheme(event.target.value));
            }}
          />
          <span className={styles.label}>{LABELS[option]}</span>
        </label>
      ))}
    </fieldset>
  );
}
