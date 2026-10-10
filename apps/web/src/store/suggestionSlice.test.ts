import {
  initialSuggestionState,
  suggestionCompleted,
  suggestionDelta,
  suggestionFailed,
  suggestionReducer,
  suggestionReset,
  suggestionSourcesReceived,
  suggestionStarted,
  suggestionStopped,
} from './suggestionSlice';
import { conversationSelected } from './uiSlice';

describe('suggestionSlice', () => {
  it('starts streaming with empty text for the given conversation', () => {
    const state = suggestionReducer(initialSuggestionState, suggestionStarted('c-1'));
    expect(state).toEqual({
      status: 'streaming',
      conversationId: 'c-1',
      text: '',
      sources: [],
      error: null,
    });
  });

  const source = { id: 'a#b', title: 'A: B', text: 'Body.' };

  it('stores the sources received while streaming', () => {
    let state = suggestionReducer(initialSuggestionState, suggestionStarted('c-1'));
    state = suggestionReducer(state, suggestionSourcesReceived([source]));
    expect(state.sources).toEqual([source]);
  });

  it('ignores sources that arrive after the stream ended', () => {
    let state = suggestionReducer(initialSuggestionState, suggestionStarted('c-1'));
    state = suggestionReducer(state, suggestionStopped());
    state = suggestionReducer(state, suggestionSourcesReceived([source]));
    expect(state.sources).toEqual([]);
  });

  it('clears the sources when a new suggestion starts', () => {
    let state = suggestionReducer(initialSuggestionState, suggestionStarted('c-1'));
    state = suggestionReducer(state, suggestionSourcesReceived([source]));
    state = suggestionReducer(state, suggestionStarted('c-1'));
    expect(state.sources).toEqual([]);
  });

  it('appends deltas while streaming', () => {
    let state = suggestionReducer(initialSuggestionState, suggestionStarted('c-1'));
    state = suggestionReducer(state, suggestionDelta('Hello '));
    state = suggestionReducer(state, suggestionDelta('world'));
    expect(state.text).toBe('Hello world');
  });

  it('ignores deltas after the stream was stopped', () => {
    let state = suggestionReducer(initialSuggestionState, suggestionStarted('c-1'));
    state = suggestionReducer(state, suggestionDelta('Hello'));
    state = suggestionReducer(state, suggestionStopped());
    state = suggestionReducer(state, suggestionDelta(' late'));
    expect(state).toMatchObject({ status: 'stopped', text: 'Hello' });
  });

  it('completes only a streaming suggestion', () => {
    const streaming = suggestionReducer(initialSuggestionState, suggestionStarted('c-1'));
    expect(suggestionReducer(streaming, suggestionCompleted()).status).toBe('done');
    expect(suggestionReducer(initialSuggestionState, suggestionCompleted()).status).toBe('idle');
  });

  it('keeps partial text when the stream fails', () => {
    let state = suggestionReducer(initialSuggestionState, suggestionStarted('c-1'));
    state = suggestionReducer(state, suggestionDelta('Partial'));
    state = suggestionReducer(state, suggestionFailed('Boom'));
    expect(state).toMatchObject({ status: 'error', text: 'Partial', error: 'Boom' });
  });

  it('starting again discards the previous text and error', () => {
    let state = suggestionReducer(initialSuggestionState, suggestionStarted('c-1'));
    state = suggestionReducer(state, suggestionFailed('Boom'));
    state = suggestionReducer(state, suggestionStarted('c-1'));
    expect(state).toEqual({
      status: 'streaming',
      conversationId: 'c-1',
      text: '',
      sources: [],
      error: null,
    });
  });

  it('resets when another conversation is selected', () => {
    let state = suggestionReducer(initialSuggestionState, suggestionStarted('c-1'));
    state = suggestionReducer(state, suggestionDelta('Hi'));
    state = suggestionReducer(state, conversationSelected('c-2'));
    expect(state).toEqual(initialSuggestionState);
  });

  it('survives selecting the same conversation again', () => {
    let state = suggestionReducer(initialSuggestionState, suggestionStarted('c-1'));
    state = suggestionReducer(state, suggestionDelta('Hi'));
    expect(suggestionReducer(state, conversationSelected('c-1'))).toBe(state);
  });

  it('resets on demand', () => {
    const state = suggestionReducer(
      suggestionReducer(initialSuggestionState, suggestionStarted('c-1')),
      suggestionReset(),
    );
    expect(state).toEqual(initialSuggestionState);
  });
});
