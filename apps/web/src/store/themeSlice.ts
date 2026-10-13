import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { applyTheme, persistTheme, readStoredTheme, type ThemePreference } from '../lib/theme';
import type { AppThunk } from './store';

export interface ThemeState {
  preference: ThemePreference;
}

const themeSlice = createSlice({
  name: 'theme',
  initialState: (): ThemeState => ({ preference: readStoredTheme() }),
  reducers: {
    themeChanged(state, action: PayloadAction<ThemePreference>) {
      state.preference = action.payload;
    },
  },
});

export const { themeChanged } = themeSlice.actions;
export const themeReducer = themeSlice.reducer;

export const setTheme =
  (preference: ThemePreference): AppThunk =>
  (dispatch) => {
    dispatch(themeChanged(preference));
    applyTheme(preference);
    persistTheme(preference);
  };
