import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Read from disk: the Vitest config sets `css: false`, which would blank a `?raw` CSS import.
const tokens = readFileSync(join(import.meta.dirname, 'tokens.css'), 'utf8');

function declarations(block: string): Map<string, string> {
  return new Map(
    [...block.matchAll(/(--[\w-]+|color-scheme):\s*([^;]+);/g)].map(([, name, value]) => [
      name!,
      value!.trim(),
    ]),
  );
}

function blockBody(selectorPattern: RegExp): string {
  const match = selectorPattern.exec(tokens);
  if (!match) throw new Error(`Block not found: ${selectorPattern}`);
  return match[1]!;
}

const light = declarations(blockBody(/^:root\s*\{([^}]*)}/m));
const darkMedia = declarations(
  blockBody(
    /@media \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-theme='light']\)\s*\{([^}]*)}/,
  ),
);
const darkAttribute = declarations(blockBody(/:root\[data-theme='dark']\s*\{([^}]*)}/));

describe('theme tokens', () => {
  it('keeps the OS-driven and the explicit dark palettes identical', () => {
    expect(darkMedia.size).toBeGreaterThan(0);
    expect(Object.fromEntries(darkMedia)).toEqual(Object.fromEntries(darkAttribute));
  });

  it('overrides every colour token of the light palette', () => {
    const colourTokens = [...light.keys()].filter((name) =>
      /^--(color|badge|sentiment)-/.test(name),
    );
    expect(colourTokens.length).toBeGreaterThan(0);
    expect(colourTokens.filter((name) => !darkAttribute.has(name))).toEqual([]);
  });

  it('only overrides colour tokens in dark mode', () => {
    const extras = [...darkAttribute.keys()].filter(
      (name) => name !== 'color-scheme' && !/^--(color|badge|sentiment)-/.test(name),
    );
    expect(extras).toEqual([]);
  });

  it('switches native controls and scrollbars with the palette', () => {
    expect(light.get('color-scheme')).toBe('light');
    expect(darkAttribute.get('color-scheme')).toBe('dark');
    expect(darkMedia.get('color-scheme')).toBe('dark');
  });
});
