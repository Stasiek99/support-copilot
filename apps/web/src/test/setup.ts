import '@testing-library/jest-dom/vitest';
import { cancelSuggestion } from '../store/requestSuggestion';
import { server } from './server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cancelSuggestion();
  server.resetHandlers();
});
afterAll(() => server.close());
