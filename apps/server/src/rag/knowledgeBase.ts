import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Source } from '@support-copilot/shared';
import { Bm25Index } from './bm25';
import { chunkMarkdown } from './chunker';

export interface KnowledgeBase {
  search(query: string, limit?: number): Source[];
}

const RELATIVE_SCORE_CUTOFF = 0.5;

export function createKnowledgeBase(chunks: readonly Source[]): KnowledgeBase {
  const index = new Bm25Index(chunks, (chunk) => `${chunk.title} ${chunk.title} ${chunk.text}`);

  return {
    search(query, limit = 3) {
      const hits = index.search(query, limit);
      const best = hits[0]?.score ?? 0;
      return hits.filter((hit) => hit.score >= best * RELATIVE_SCORE_CUTOFF).map((hit) => hit.item);
    },
  };
}

export async function loadKnowledgeBase(directory: string): Promise<KnowledgeBase> {
  const files = (await readdir(directory)).filter((file) => file.endsWith('.md')).sort();
  if (files.length === 0) throw new Error(`No Markdown files found in knowledge dir: ${directory}`);

  const chunks: Source[] = [];
  for (const file of files) {
    const markdown = await readFile(path.join(directory, file), 'utf8');
    chunks.push(...chunkMarkdown(file, markdown));
  }
  return createKnowledgeBase(chunks);
}
