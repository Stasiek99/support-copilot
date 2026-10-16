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

/** WCAG 2.x relative luminance and contrast ratio for #rrggbb colours. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const channel = parseInt(hex.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter! + 0.05) / (darker! + 0.05);
}

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

  it.each([
    ['light', light],
    ['dark', darkAttribute],
  ])('keeps control borders at 3:1 against every surface in the %s palette', (_name, palette) => {
    const border = palette.get('--color-control-border')!;
    for (const surface of ['--color-surface', '--color-bg', '--color-surface-muted']) {
      expect(contrast(border, palette.get(surface)!)).toBeGreaterThanOrEqual(3);
    }
  });
});
