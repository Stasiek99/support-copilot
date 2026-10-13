import '@testing-library/jest-dom/vitest';
import { cancelSuggestion } from '../store/requestSuggestion';
import { server } from './server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cancelSuggestion();
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  server.resetHandlers();
});
afterAll(() => server.close());
