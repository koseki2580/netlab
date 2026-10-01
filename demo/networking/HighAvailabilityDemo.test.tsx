/* @vitest-environment jsdom */
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import HighAvailabilityDemo from './HighAvailabilityDemo';

describe('HighAvailabilityDemo', () => {
  it('renders VRRP and LACP teaching panels', () => {
    const html = renderToString(
      <MemoryRouter>
        <HighAvailabilityDemo />
      </MemoryRouter>,
    );

    expect(html).toContain('Gateway HA And Link Aggregation');
    expect(html).toContain('VRRP first-hop gateway');
    expect(html).toContain('LACP port-channel');
  });
});

/** Render the lesson in the learner's language, as the shell reads it. */
function renderIn(locale: 'en' | 'ja'): string {
  if (locale === 'ja') window.localStorage.setItem('netlab-locale', 'ja');
  try {
    return renderToString(
      <MemoryRouter>
        <HighAvailabilityDemo />
      </MemoryRouter>,
    );
  } finally {
    window.localStorage.removeItem('netlab-locale');
  }
}

describe('HighAvailabilityDemo VRRP group (TC-264)', () => {
  it('names VRRP group 10 in the brief and explains the virtual MAC from it', () => {
    const html = renderIn('en');

    expect(html).toContain('VRRP group 10');
    expect(html).toContain('data-testid="virtual-mac-note"');
    expect(html).toContain('00:00:5e:00:01 followed by the group number in hexadecimal');
    expect(html).toContain('group 10 is 0a');
    expect(html).toContain('00:00:5e:00:01:0a');
  });

  it('says the same in Japanese', () => {
    const html = renderIn('ja');

    expect(html).toContain('VRRP グループ 10');
    expect(html).toContain('00:00:5e:00:01 の後ろにグループ番号を 16 進数で');
    expect(html).toContain('グループ 10 は 0a');
  });
});
