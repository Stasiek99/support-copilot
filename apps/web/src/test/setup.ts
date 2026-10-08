import '@testing-library/jest-dom/vitest';
import { cancelSuggestion } from '../store/requestSuggestion';
import { server } from './server';

// Any request without a handler is a test bug, not something to let through to the network.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cancelSuggestion();
  server.resetHandlers();
});
afterAll(() => server.close());
