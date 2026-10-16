import { fileURLToPath } from 'node:url';
import { seedConversations, sourceSchema } from '@support-copilot/shared';
import { createKnowledgeBase, loadKnowledgeBase, type KnowledgeBase } from './knowledgeBase';
import { buildKnowledgeQuery } from './query';

const knowledgeDir = fileURLToPath(new URL('../../../../knowledge', import.meta.url));

describe('createKnowledgeBase', () => {
  const kb = createKnowledgeBase([
    { id: 'a#1', title: 'Refunds', text: 'Refunds take five business days.' },
    { id: 'a#2', title: 'Shipping', text: 'Parcels ship within one day and refunds are separate.' },
    { id: 'a#3', title: 'Accounts', text: 'Reset your password from the login page.' },
  ]);

  it('returns relevant chunks, best first', () => {
    expect(kb.search('refund').map((source) => source.id)).toEqual(['a#1', 'a#2']);
  });

  it('drops weak matches relative to the best hit', () => {
    expect(kb.search('refund').map((source) => source.id)).not.toContain('a#3');
    const strict = kb.search('password refund');
    expect(strict.length).toBeLessThanOrEqual(3);
  });

  it('returns an empty list when nothing matches', () => {
    expect(kb.search('xylophone')).toEqual([]);
  });

  it('honours the limit', () => {
    expect(kb.search('refund', 1)).toHaveLength(1);
  });
});

describe('loadKnowledgeBase', () => {
  it('rejects a directory without Markdown files', async () => {
    await expect(loadKnowledgeBase(fileURLToPath(new URL('.', import.meta.url)))).rejects.toThrow(
      /No Markdown files/,
    );
  });
});

describe('the bundled FAQ', () => {
  let kb: KnowledgeBase;
  beforeAll(async () => {
    kb = await loadKnowledgeBase(knowledgeDir);
  });

  const topSourceFor = (conversationId: string) => {
    const conversation = seedConversations.find((c) => c.id === conversationId)!;
    return kb.search(buildKnowledgeQuery(conversation));
  };

  it('produces valid sources within the size budget', () => {
    const sources = kb.search('refund return payment delivery password account', 50);
    expect(sources.length).toBeGreaterThan(0);
    for (const source of sources) expect(sourceSchema.safeParse(source).success).toBe(true);
  });

  it.each([
    ['c-1001', 'payments#declined-card-payments'],
    ['c-1002', 'payments#duplicate-charges'],
    ['c-1003', 'delivery#parcel-delayed-or-not-arriving'],
    ['c-1004', 'delivery#changing-the-delivery-address'],
    ['c-1006', 'returns#return-window'],
    ['c-1007', 'account#password-reset'],
    ['c-1008', 'account#account-and-data-deletion'],
  ])('ranks the right article first for %s', (conversationId, expectedId) => {
    expect(topSourceFor(conversationId)[0]?.id).toBe(expectedId);
  });

  it('finds the damaged-item article for the damaged blender conversation', () => {
    const ids = topSourceFor('c-1005').map((source) => source.id);
    expect(ids).toContain('returns#damaged-or-defective-items');
  });

  it('does not let an injected instruction pull in unrelated articles', () => {
    const ids = topSourceFor('c-1008').map((source) => source.id);
    expect(ids.every((id) => id.startsWith('account#'))).toBe(true);
  });
});
