import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { renderWithStore } from './test/renderWithStore';

describe('App', () => {
  it('renders the heading and landmarks', async () => {
    renderWithStore(<App />);

    expect(screen.getByRole('heading', { level: 1, name: 'Support Copilot' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Conversations' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Agent assist' })).toBeInTheDocument();
    expect(await screen.findAllByRole('button', { name: /Anna Kowalska/ })).toHaveLength(1);
  });

  it('lists all seed conversations', async () => {
    renderWithStore(<App />);

    const nav = screen.getByRole('navigation', { name: 'Conversations' });
    expect(await within(nav).findAllByRole('listitem')).toHaveLength(8);
  });

  it('shows an empty state until a conversation is selected', async () => {
    renderWithStore(<App />);

    expect(screen.getByRole('heading', { name: 'No conversation selected' })).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: /Anna Kowalska/ }));

    expect(screen.queryByRole('heading', { name: 'No conversation selected' })).toBeNull();
    const messages = screen.getByRole('list', { name: 'Messages' });
    expect(within(messages).getAllByRole('listitem')).toHaveLength(3);
  });

  it('marks the selected conversation with aria-current', async () => {
    renderWithStore(<App />);

    const button = await screen.findByRole('button', { name: /Sofia Rossi/ });
    expect(button).not.toHaveAttribute('aria-current');
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-current', 'true');
  });

  it('sends a reply and appends it to the conversation', async () => {
    renderWithStore(<App />);
    await userEvent.click(await screen.findByRole('button', { name: /Tomasz Nowak/ }));

    const send = screen.getByRole('button', { name: 'Send' });
    expect(send).toBeDisabled();

    await userEvent.type(screen.getByRole('textbox', { name: 'Reply' }), 'Yes, we can update it.');
    expect(send).toBeEnabled();
    await userEvent.click(send);

    const messages = screen.getByRole('list', { name: 'Messages' });
    expect(within(messages).getAllByRole('listitem')).toHaveLength(2);
    expect(within(messages).getByText(/Yes, we can update it\./)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Reply' })).toHaveValue('');
  });

  it('keeps send disabled for whitespace-only drafts', async () => {
    renderWithStore(<App />);
    await userEvent.click(await screen.findByRole('button', { name: /Tomasz Nowak/ }));

    await userEvent.type(screen.getByRole('textbox', { name: 'Reply' }), '   ');
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });
});
