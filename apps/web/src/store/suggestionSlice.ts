import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Source } from '@support-copilot/shared';
import { conversationSelected } from './uiSlice';

export type SuggestionStatus = 'idle' | 'streaming' | 'done' | 'stopped' | 'error';

export interface SuggestionState {
  status: SuggestionStatus;
  conversationId: string | null;
  text: string;
  sources: Source[];
  error: string | null;
}

export const initialSuggestionState: SuggestionState = {
  status: 'idle',
  conversationId: null,
  text: '',
  sources: [],
  error: null,
};

const suggestionSlice = createSlice({
  name: 'suggestion',
  initialState: initialSuggestionState,
  reducers: {
    suggestionStarted(_state, action: PayloadAction<string>) {
      return {
        status: 'streaming',
        conversationId: action.payload,
        text: '',
        sources: [],
        error: null,
      };
    },
    suggestionSourcesReceived(state, action: PayloadAction<Source[]>) {
      if (state.status !== 'streaming') return;
      state.sources = action.payload;
    },
    suggestionDelta(state, action: PayloadAction<string>) {
      if (state.status !== 'streaming') return;
      state.text += action.payload;
    },
    suggestionCompleted(state) {
      if (state.status === 'streaming') state.status = 'done';
    },
    suggestionStopped(state) {
      if (state.status === 'streaming') state.status = 'stopped';
    },
    suggestionFailed(state, action: PayloadAction<string>) {
      state.status = 'error';
      state.error = action.payload;
    },
    suggestionReset() {
      return initialSuggestionState;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(conversationSelected, (state, action) =>
      state.conversationId !== null && state.conversationId !== action.payload
        ? initialSuggestionState
        : state,
    );
  },
});

export const {
  suggestionStarted,
  suggestionSourcesReceived,
  suggestionDelta,
  suggestionCompleted,
  suggestionStopped,
  suggestionFailed,
  suggestionReset,
} = suggestionSlice.actions;
export const suggestionReducer = suggestionSlice.reducer;
