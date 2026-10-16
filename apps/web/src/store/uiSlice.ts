import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface UiState {
  selectedConversationId: string | null;
  draftReply: string;
}

export const initialUiState: UiState = {
  selectedConversationId: null,
  draftReply: '',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState: initialUiState,
  reducers: {
    conversationSelected(state, action: PayloadAction<string>) {
      if (state.selectedConversationId === action.payload) return;
      state.selectedConversationId = action.payload;
      state.draftReply = '';
    },
    draftChanged(state, action: PayloadAction<string>) {
      state.draftReply = action.payload;
    },
    draftCleared(state) {
      state.draftReply = '';
    },
  },
});

export const { conversationSelected, draftChanged, draftCleared } = uiSlice.actions;
export const uiReducer = uiSlice.reducer;
