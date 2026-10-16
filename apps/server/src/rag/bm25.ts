import { tokenize } from './text';

export interface Bm25Options {
  k1?: number;
  b?: number;
}

export interface Bm25Hit<T> {
  item: T;
  score: number;
}

interface IndexedDocument<T> {
  item: T;
  termFrequency: Map<string, number>;
  length: number;
}

export class Bm25Index<T> {
  private readonly documents: IndexedDocument<T>[];
  private readonly documentFrequency = new Map<string, number>();
  private readonly averageLength: number;
  private readonly k1: number;
  private readonly b: number;

  constructor(items: readonly T[], getText: (item: T) => string, options: Bm25Options = {}) {
    this.k1 = options.k1 ?? 1.5;
    this.b = options.b ?? 0.75;

    this.documents = items.map((item) => {
      const tokens = tokenize(getText(item));
      const termFrequency = new Map<string, number>();
      for (const token of tokens) termFrequency.set(token, (termFrequency.get(token) ?? 0) + 1);
      for (const token of termFrequency.keys()) {
        this.documentFrequency.set(token, (this.documentFrequency.get(token) ?? 0) + 1);
      }
      return { item, termFrequency, length: tokens.length };
    });

    const totalLength = this.documents.reduce((sum, document) => sum + document.length, 0);
    this.averageLength = this.documents.length > 0 ? totalLength / this.documents.length : 0;
  }

  search(query: string, limit = 3): Bm25Hit<T>[] {
    const terms = [...new Set(tokenize(query))];
    const hits: (Bm25Hit<T> & { index: number })[] = [];

    this.documents.forEach((document, index) => {
      const score = terms.reduce((sum, term) => sum + this.termScore(term, document), 0);
      if (score > 0) hits.push({ item: document.item, score, index });
    });

    return hits
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .slice(0, limit)
      .map(({ item, score }) => ({ item, score }));
  }

  private termScore(term: string, document: IndexedDocument<T>): number {
    const frequency = document.termFrequency.get(term);
    if (!frequency) return 0;

    const matching = this.documentFrequency.get(term) ?? 0;
    const idf = Math.log(1 + (this.documents.length - matching + 0.5) / (matching + 0.5));
    const lengthNorm = 1 - this.b + (this.b * document.length) / this.averageLength;
    return (idf * frequency * (this.k1 + 1)) / (frequency + this.k1 * lengthNorm);
  }
}
