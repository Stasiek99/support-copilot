import { chunkMarkdown } from './chunker';

const sample = `# Returns FAQ

Intro text that belongs to no section.

## Return window

Items can be returned within 30 days.
They must be unused.

## Empty section

## Refunds & timing!

Issued within 5 business days.
`;

describe('chunkMarkdown', () => {
  const chunks = chunkMarkdown('returns.md', sample);

  it('creates one chunk per non-empty section', () => {
    expect(chunks).toHaveLength(2);
  });

  it('prefixes section titles with the document title', () => {
    expect(chunks.map((chunk) => chunk.title)).toEqual([
      'Returns FAQ: Return window',
      'Returns FAQ: Refunds & timing!',
    ]);
  });

  it('builds stable, URL-safe ids from the file name and section title', () => {
    expect(chunks.map((chunk) => chunk.id)).toEqual([
      'returns#return-window',
      'returns#refunds-timing',
    ]);
  });

  it('collapses whitespace and line breaks in the text', () => {
    expect(chunks[0]?.text).toBe('Items can be returned within 30 days. They must be unused.');
  });

  it('ignores text before the first section', () => {
    expect(chunks.some((chunk) => chunk.text.includes('Intro text'))).toBe(false);
  });

  it('handles CRLF line endings', () => {
    const crlf = chunkMarkdown('a.md', '# A\r\n\r\n## One\r\n\r\nText here.\r\n');
    expect(crlf).toEqual([{ id: 'a#one', title: 'A: One', text: 'Text here.' }]);
  });

  it('falls back to the file name when there is no title', () => {
    const [chunk] = chunkMarkdown('faq.md', '## Only\n\nBody.');
    expect(chunk?.title).toBe('faq: Only');
  });

  it('returns no chunks for a document without sections', () => {
    expect(chunkMarkdown('a.md', '# Title only')).toEqual([]);
  });
});
