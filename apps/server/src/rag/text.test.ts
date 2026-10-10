import { stem, tokenize } from './text';

describe('stem', () => {
  it('maps inflected forms of the same word to one stem', () => {
    expect(new Set(['charge', 'charges', 'charged'].map(stem)).size).toBe(1);
    expect(new Set(['refund', 'refunds', 'refunded'].map(stem)).size).toBe(1);
    expect(new Set(['decline', 'declined', 'declining'].map(stem)).size).toBe(1);
  });

  it('turns -ies into -y', () => {
    expect(stem('deliveries')).toBe('delivery');
  });

  it('keeps short words and double-s endings intact', () => {
    expect(stem('is')).toBe('is');
    expect(stem('address')).toBe('address');
  });
});

describe('tokenize', () => {
  it('lowercases and splits on punctuation', () => {
    expect(tokenize('Order #48213: PAID!')).toEqual(['order', '48213', 'paid']);
  });

  it('drops stopwords and single characters', () => {
    expect(tokenize('I have a problem with the card')).toEqual(['problem', 'card']);
  });

  it('keeps non-ASCII letters', () => {
    expect(tokenize('Wiśniewski')).toEqual(['wiśniewski']);
  });

  it('returns an empty list for empty or stopword-only input', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize('the and of')).toEqual([]);
  });
});
