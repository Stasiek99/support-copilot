import { Bm25Index } from './bm25';

interface Doc {
  id: string;
  text: string;
}

const index = (docs: Doc[]) => new Bm25Index(docs, (doc) => doc.text);

describe('Bm25Index', () => {
  it('matches the hand-computed score for a single document', () => {
    const [hit] = index([{ id: 'a', text: 'alpha' }]).search('alpha');
    expect(hit?.score).toBeCloseTo(Math.log(4 / 3), 10);
  });

  it('matches the hand-computed score for two documents', () => {
    const [hit] = index([
      { id: 'a', text: 'alpha' },
      { id: 'b', text: 'beta' },
    ]).search('alpha');
    expect(hit?.item.id).toBe('a');
    expect(hit?.score).toBeCloseTo(Math.log(2), 10);
  });

  it('ranks the document containing the query terms first', () => {
    const hits = index([
      { id: 'cooking', text: 'recipes for pasta and sauce' },
      { id: 'refunds', text: 'refund for a returned parcel' },
      { id: 'delivery', text: 'parcel delivery times' },
    ]).search('refund parcel');
    expect(hits.map((hit) => hit.item.id)).toEqual(['refunds', 'delivery']);
  });

  it('weights rare terms above common ones', () => {
    const hits = index([
      { id: 'common', text: 'order order order' },
      { id: 'rare', text: 'chargeback' },
      { id: 'filler-1', text: 'order status' },
      { id: 'filler-2', text: 'order history' },
    ]).search('order chargeback');
    expect(hits[0]?.item.id).toBe('rare');
  });

  it('saturates repeated terms instead of scaling linearly', () => {
    const once = index([
      { id: 'a', text: 'refund' },
      { id: 'pad', text: 'something else entirely' },
    ]).search('refund')[0]!.score;
    const many = index([
      { id: 'a', text: 'refund refund refund refund refund refund' },
      { id: 'pad', text: 'something else entirely' },
    ]).search('refund')[0]!.score;
    expect(many).toBeGreaterThan(once);
    expect(many).toBeLessThan(once * 6);
  });

  it('prefers the shorter document when term counts are equal', () => {
    const hits = index([
      { id: 'long', text: 'refund policy covers many different situations and edge cases overall' },
      { id: 'short', text: 'refund policy' },
    ]).search('refund');
    expect(hits.map((hit) => hit.item.id)).toEqual(['short', 'long']);
  });

  it('matches across inflected forms', () => {
    const hits = index([{ id: 'a', text: 'The card was charged twice' }]).search('charges');
    expect(hits).toHaveLength(1);
  });

  it('returns nothing when no term matches', () => {
    expect(index([{ id: 'a', text: 'alpha beta' }]).search('gamma')).toEqual([]);
  });

  it('returns nothing for stopword-only or empty queries', () => {
    const idx = index([{ id: 'a', text: 'alpha beta' }]);
    expect(idx.search('the and of')).toEqual([]);
    expect(idx.search('')).toEqual([]);
  });

  it('handles an empty corpus', () => {
    expect(index([]).search('anything')).toEqual([]);
  });

  it('respects the limit', () => {
    const docs = ['a', 'b', 'c', 'd'].map((id) => ({ id, text: 'refund' }));
    expect(index(docs).search('refund', 2)).toHaveLength(2);
  });

  it('breaks ties by document order', () => {
    const docs = ['first', 'second', 'third'].map((id) => ({ id, text: 'refund' }));
    expect(
      index(docs)
        .search('refund')
        .map((hit) => hit.item.id),
    ).toEqual(['first', 'second', 'third']);
  });

  it('counts a repeated query term only once', () => {
    const idx = index([{ id: 'a', text: 'refund policy' }]);
    expect(idx.search('refund refund refund')[0]?.score).toBe(idx.search('refund')[0]?.score);
  });
});
