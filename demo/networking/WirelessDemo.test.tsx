/* @vitest-environment jsdom */
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { lossPctFromRssi, rssiDbm } from '../../src/utils/pathLoss';
import WirelessDemo from './WirelessDemo';

describe('WirelessDemo', () => {
  it('renders wireless radio, association, and hidden-node panels', () => {
    const html = renderToString(
      <MemoryRouter>
        <WirelessDemo />
      </MemoryRouter>,
    );

    expect(html).toContain('Wireless 802.11');
    expect(html).toContain('Radio model');
    expect(html).toContain('Association');
    expect(html).toContain('CSMA/CA');
  });
});

/** Render the lesson in the learner's language, as the shell reads it. */
function renderIn(locale: 'en' | 'ja'): string {
  if (locale === 'ja') window.localStorage.setItem('netlab-locale', 'ja');
  try {
    return renderToString(
      <MemoryRouter>
        <WirelessDemo />
      </MemoryRouter>,
    );
  } finally {
    window.localStorage.removeItem('netlab-locale');
  }
}

describe('WirelessDemo radio model note (TC-260)', () => {
  it('states the path-loss and loss rules with the constants the model uses', () => {
    const html = renderIn('en');

    expect(html).toContain('data-testid="wireless-radio-model-note"');
    expect(html).toContain('20 dBm');
    expect(html).toContain('2437 MHz');
    expect(html).toContain('20 dB weaker for every tenfold distance');
    expect(html).toContain('0% down to −65 dBm');
    expect(html).toContain('100% at −90 dBm');
    expect(html).toContain('4 points per dB');
  });

  it('says the loss line is a simplification and −66 dBm is healthy on real Wi-Fi', () => {
    const html = renderIn('en');

    expect(html).toContain('this lesson’s simplification');
    expect(html).toContain('−66 dBm is a healthy signal');
    expect(html).toContain('noise, interference and the data rate');
  });

  it('says the same in Japanese', () => {
    const html = renderIn('ja');

    expect(html).toContain('距離が 10 倍になるごとに 20 dB 弱く');
    expect(html).toContain('−65 dBm までは 0%');
    expect(html).toContain('−90 dBm で 100%');
    expect(html).toContain('このレッスンだけの単純化');
    expect(html).toContain('−66 dBm は十分に強い電波');
  });

  it('quotes constants that match the model', () => {
    const tenfold = rssiDbm({ distanceMeters: 10, frequencyMhz: 2437, txPowerDbm: 20 });
    const hundredfold = rssiDbm({ distanceMeters: 100, frequencyMhz: 2437, txPowerDbm: 20 });

    expect(tenfold - hundredfold).toBeCloseTo(20);
    expect(lossPctFromRssi(-65)).toBe(0);
    expect(lossPctFromRssi(-66)).toBe(4);
    expect(lossPctFromRssi(-90)).toBe(100);
  });
});

describe('WirelessDemo rounding note (TC-291)', () => {
  it('says the values shown are rounded, with the 200 m reading worked through', () => {
    const html = renderIn('en');

    expect(html).toContain('RSSI to one decimal place and loss to a whole percent');
    expect(html).toContain('1.2 × 4 = 4.8%, shown as 5%');
  });

  it('says the same in Japanese', () => {
    const html = renderIn('ja');

    expect(html).toContain('RSSI は小数第 1 位まで、損失率は整数のパーセント');
    expect(html).toContain('1.2 × 4 ＝ 4.8% になり、表示は 5% です');
  });

  it('works the example from what the model gives at 200 m', () => {
    const rssi = rssiDbm({ distanceMeters: 200, frequencyMhz: 2437, txPowerDbm: 20 });

    expect(rssi.toFixed(1)).toBe('-66.2');
    expect(((-65 - rssi) * 4).toFixed(1)).toBe('4.8');
    expect(lossPctFromRssi(rssi)).toBe(5);
  });
});
