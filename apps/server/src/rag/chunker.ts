import type { Source } from '@support-copilot/shared';

export function chunkMarkdown(fileName: string, markdown: string): Source[] {
  const baseId = fileName.replace(/\.md$/i, '');
  let documentTitle = baseId;
  const chunks: Source[] = [];
  let section: { title: string; lines: string[] } | null = null;

  const flush = () => {
    if (!section) return;
    const text = section.lines.join('\n').replace(/\s+/g, ' ').trim();
    if (text) {
      chunks.push({
        id: `${baseId}#${slugify(section.title)}`,
        title: `${documentTitle}: ${section.title}`,
        text,
      });
    }
    section = null;
  };

  for (const line of markdown.split(/\r?\n/)) {
    const heading = /^(#{1,2})\s+(.+?)\s*$/.exec(line);
    if (heading?.[1] === '#') {
      documentTitle = heading[2] ?? documentTitle;
    } else if (heading?.[1] === '##') {
      flush();
      section = { title: heading[2] ?? '', lines: [] };
    } else {
      section?.lines.push(line);
    }
  }
  flush();
  return chunks;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}
