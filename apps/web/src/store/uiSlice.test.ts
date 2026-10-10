import {
  conversationSelected,
  draftChanged,
  draftCleared,
  initialUiState,
  uiReducer,
} from './uiSlice';

describe('uiSlice', () => {
  it('starts with nothing selected and an empty draft', () => {
    expect(uiReducer(undefined, { type: 'init' })).toEqual({
      selectedConversationId: null,
      draftReply: '',
    });
  });

  it('selects a conversation', () => {
    const state = uiReducer(initialUiState, conversationSelected('c-1'));
    expect(state.selectedConversationId).toBe('c-1');
  });

  it('resets the draft when another conversation is selected', () => {
    let state = uiReducer(initialUiState, conversationSelected('c-1'));
    state = uiReducer(state, draftChanged('Hello'));
    state = uiReducer(state, conversationSelected('c-2'));
    expect(state).toEqual({ selectedConversationId: 'c-2', draftReply: '' });
  });

  it('keeps the draft when the same conversation is selected again', () => {
    let state = uiReducer(initialUiState, conversationSelected('c-1'));
    state = uiReducer(state, draftChanged('Hello'));
    state = uiReducer(state, conversationSelected('c-1'));
    expect(state.draftReply).toBe('Hello');
  });

  it('clears the draft', () => {
    const state = uiReducer({ ...initialUiState, draftReply: 'Hello' }, draftCleared());
    expect(state.draftReply).toBe('');
  });
});
