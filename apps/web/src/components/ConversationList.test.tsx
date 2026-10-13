import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { seedConversations } from '@support-copilot/shared';
import { http, HttpResponse } from 'msw';
import { API_BASE_URL } from '../lib/config';
import { renderWithStore } from '../test/renderWithStore';
import { server } from '../test/server';
import { ConversationList } from './ConversationList';

const conversationsUrl = `${API_BASE_URL}/conversations`;

describe('ConversationList states', () => {
  it('shows a loading state while conversations are pending', async () => {
    server.use(http.get(conversationsUrl, () => new Promise(() => undefined)));
    renderWithStore(<ConversationList />);

    expect(await screen.findByText('Loading conversations…')).toBeInTheDocument();
  });

  it('shows an empty state when there are no conversations', async () => {
    server.use(http.get(conversationsUrl, () => HttpResponse.json([])));
    renderWithStore(<ConversationList />);

    expect(await screen.findByText(/No conversations yet/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('explains a network failure and recovers on retry', async () => {
    let calls = 0;
    server.use(
      http.get(conversationsUrl, () => {
        calls += 1;
        return calls === 1 ? HttpResponse.error() : HttpResponse.json(seedConversations);
      }),
    );
    renderWithStore(<ConversationList />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Cannot reach the server');

    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('button', { name: /Anna Kowalska/ })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('keeps the generic message for server errors', async () => {
    server.use(http.get(conversationsUrl, () => new HttpResponse(null, { status: 500 })));
    renderWithStore(<ConversationList />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load conversations.');
  });
});
