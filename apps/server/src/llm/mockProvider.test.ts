import { analysisSchema, seedConversations, type Conversation } from '@support-copilot/shared';
import { MockProvider } from './mockProvider';

const callOptions = () => ({ signal: new AbortController().signal, sources: [] });
const provider = new MockProvider({ tokenDelayMs: 0, analysisDelayMs: 0 });
const anna = seedConversations[0]!;
const injection = seedConversations.find((c) => c.id === 'c-1008')!;

async function collect(iterable: AsyncIterable<string>): Promise<string[]> {
  const chunks: string[] = [];
  for await (const chunk of iterable) chunks.push(chunk);
  return chunks;
}

describe('MockProvider.suggestReply', () => {
  it('streams several chunks that join into one suggestion', async () => {
    const chunks = await collect(provider.suggestReply(anna, callOptions()));
    expect(chunks.length).toBeGreaterThan(10);
    expect(chunks.join('')).toContain('order #48213');
  });

  it('is deterministic', async () => {
    const run = async () => (await collect(provider.suggestReply(anna, callOptions()))).join('');
    expect(await run()).toBe(await run());
  });

  it('addresses the customer by first name', async () => {
    const text = (await collect(provider.suggestReply(anna, callOptions()))).join('');
    expect(text).toMatch(/^Hi Anna,/);
  });

  it('does not follow instructions embedded in customer messages', async () => {
    const text = (await collect(provider.suggestReply(injection, callOptions()))).join('');
    expect(text).toContain("can't mark the request as completed");
  });

  it('falls back to a category template for unknown conversations', async () => {
    const unknown: Conversation = { ...anna, id: 'c-unknown', customerName: 'Zoe Adams' };
    const text = (await collect(provider.suggestReply(unknown, callOptions()))).join('');
    expect(text).toMatch(/^Hi Zoe,/);
  });

  it('stops when the signal is aborted', async () => {
    const controller = new AbortController();
    const iterator = provider
      .suggestReply(anna, { signal: controller.signal, sources: [] })
      [Symbol.asyncIterator]();

    await iterator.next();
    controller.abort();

    await expect(iterator.next()).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('MockProvider.analyze', () => {
  it('returns a valid analysis for every seed conversation', async () => {
    for (const conversation of seedConversations) {
      const analysis = await provider.analyze(conversation, {
        signal: new AbortController().signal,
      });
      expect(analysisSchema.safeParse(analysis).success).toBe(true);
    }
  });

  it('maps the category to an intent for unknown conversations', async () => {
    const unknown: Conversation = { ...anna, id: 'c-unknown' };
    const analysis = await provider.analyze(unknown, callOptions());
    expect(analysis.intent).toBe('payment_issue');
  });

  it('detects negative sentiment from the last customer message', async () => {
    const angry: Conversation = {
      ...anna,
      id: 'c-unknown',
      messages: [{ ...anna.messages[0]!, text: 'This is unacceptable!' }],
    };
    const analysis = await provider.analyze(angry, callOptions());
    expect(analysis.sentiment).toBe('negative');
  });

  it('rejects when already aborted', async () => {
    await expect(provider.analyze(anna, { signal: AbortSignal.abort() })).rejects.toBeDefined();
  });
});
