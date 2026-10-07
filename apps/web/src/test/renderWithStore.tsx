import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { Provider } from 'react-redux';
import { setupStore } from '../store/store';

export function renderWithStore(ui: ReactElement) {
  const store = setupStore();
  return { store, ...render(<Provider store={store}>{ui}</Provider>) };
}
