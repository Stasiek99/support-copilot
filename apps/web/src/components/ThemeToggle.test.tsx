import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { THEME_STORAGE_KEY } from '../lib/theme';
import { renderWithStore } from '../test/renderWithStore';
import { ThemeToggle } from './ThemeToggle';

describe('ThemeToggle', () => {
  it('is a labelled radio group that starts on System', () => {
    renderWithStore(<ThemeToggle />);

    expect(screen.getByRole('group', { name: 'Theme' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'System' })).toBeChecked();
  });

  it('applies and persists the chosen theme', async () => {
    renderWithStore(<ThemeToggle />);

    await userEvent.click(screen.getByRole('radio', { name: 'Dark' }));

    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('returns control to the OS when System is chosen again', async () => {
    renderWithStore(<ThemeToggle />);
    await userEvent.click(screen.getByRole('radio', { name: 'Light' }));
    await userEvent.click(screen.getByRole('radio', { name: 'System' }));

    expect(document.documentElement).not.toHaveAttribute('data-theme');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('restores the stored choice on startup', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    renderWithStore(<ThemeToggle />);

    expect(screen.getByRole('radio', { name: 'Light' })).toBeChecked();
  });

  it('is operable with the arrow keys', async () => {
    renderWithStore(<ThemeToggle />);

    await userEvent.tab();
    await userEvent.keyboard('{ArrowRight}');

    expect(screen.getByRole('radio', { name: 'Light' })).toBeChecked();
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });
});
