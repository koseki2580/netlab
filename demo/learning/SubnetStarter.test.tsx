import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GalleryLocaleProvider } from '../localeContext';
import { SubnetStarter, splitAddress } from './SubnetStarter';

describe('TC-350: the subnet warm-up shows the comparison instead of describing it', () => {
  it('cuts an address where its network part ends', () => {
    expect(splitAddress('10.1.5.7/24')).toEqual({ network: '10.1.5', device: '.7', prefix: '/24' });
    expect(splitAddress('172.16.200.9/16')).toEqual({
      network: '172.16',
      device: '.200.9',
      prefix: '/16',
    });
  });

  it.each([
    ['ja', '太字の数字が同じなら、同じネットワークです。', '/24（マスク 255.255.255.0）'],
    [
      'en',
      'If the bold numbers match, the two are on the same network.',
      '/24 (mask 255.255.255.0)',
    ],
  ] as const)(
    'leads with the plain rule in %s and keeps the mask for the second line',
    (locale, lead, mask) => {
      const html = renderToStaticMarkup(
        <GalleryLocaleProvider locale={locale}>
          <SubnetStarter />
        </GalleryLocaleProvider>,
      );
      const leadAt = html.indexOf(lead);
      expect(leadAt).toBeGreaterThan(-1);
      expect(html.slice(0, leadAt)).toContain('data-testid="lesson-lead"');
      expect(html.indexOf(mask)).toBeGreaterThan(leadAt);
      // The network part is its own bold, underlined element; the machine part is not.
      expect(html).toMatch(/<strong data-part="network"[^>]*underline[^>]*>10\.1\.5<\/strong>/);
      expect(html).toMatch(/<span data-part="device"[^>]*>\.99<\/span>/);
      // Nothing is chosen yet.
      expect(html).not.toContain('aria-pressed="true"');
    },
  );
});
