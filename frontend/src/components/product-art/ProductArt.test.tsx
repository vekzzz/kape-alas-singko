import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { defaultOptions } from '../../lib/pricing';
import { catalog } from '../../test/menuFixture';
import { ProductArt } from './ProductArt';

describe('ProductArt', () => {
  for (const item of catalog.items) {
    for (const temperature of ['hot', 'iced'] as const) {
      it(`${item.id} (${temperature}) has unique ids and every clip-path points at a clipPath`, () => {
        const html = renderToStaticMarkup(<ProductArt item={item} options={{ ...defaultOptions(item), temperature }} />);
        const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((match) => match[1]);
        expect(ids.length).toBe(new Set(ids).size);

        for (const [, clipId] of html.matchAll(/clip-path="url\(#([^)]+)\)"/g)) {
          expect(html).toMatch(new RegExp(`<clipPath id="${clipId}"`));
        }
      });
    }
  }
});
