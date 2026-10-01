import { describe, expect, it } from 'vitest';
import { fragmentWorking } from './MtuFragmentationDemo';

const en = (english: string) => english;
const ja = (_english: string, japanese: string) => japanese;

// TC-283 — the notes gave the fragment count but not the sum behind it.
describe('the working behind the MTU lesson fragment count', () => {
  it('shows the sum at tunnel MTU 300, where there are 5 fragments', () => {
    expect(fragmentWorking(1200, 300, 5, en)).toBe(
      '1208 bytes to carry (1200 data + 8 ICMP header); each fragment carries 280 (MTU 300 − 20 IP header, rounded down to a multiple of 8); 1208 = 4 × 280 + 88, so 5 fragments',
    );
    expect(fragmentWorking(1200, 300, 5, ja)).toBe(
      '運ぶのは 1208 バイト (データ 1200 + ICMP ヘッダ 8)。断片 1 つが運べるのは 280 バイト (MTU 300 − IP ヘッダ 20 を 8 の倍数に切り捨て)。1208 = 4 × 280 + 88 なので、断片は 5 個',
    );
  });

  it('shows the sum at 604 (3 fragments) and at 628 (2 fragments)', () => {
    expect(fragmentWorking(1200, 604, 3, en)).toContain(
      'each fragment carries 584 (MTU 604 − 20 IP header, rounded down to a multiple of 8); 1208 = 2 × 584 + 40, so 3 fragments',
    );
    expect(fragmentWorking(1200, 628, 2, en)).toContain(
      'each fragment carries 608 (MTU 628 − 20 IP header, rounded down to a multiple of 8); 1208 = 1 × 608 + 600, so 2 fragments',
    );
    expect(fragmentWorking(1200, 628, 2, ja)).toContain('1208 = 1 × 608 + 600 なので、断片は 2 個');
  });

  it('rounds the fragment size down to a multiple of 8, and has no remainder term when it divides', () => {
    // MTU 626 leaves 606 bytes, which is not a multiple of 8.
    expect(fragmentWorking(1200, 626, 3, en)).toContain(
      'each fragment carries 600 (MTU 626 − 20 IP header, rounded down to a multiple of 8); 1208 = 2 × 600 + 8, so 3 fragments',
    );
    expect(fragmentWorking(1192, 620, 2, en)).toContain('1200 = 2 × 600, so 2 fragments');
  });

  // TC-284 — nothing was fragmented, so there is no sum to show.
  it('shows no working when nothing was fragmented', () => {
    expect(fragmentWorking(1200, 1228, 0, en)).toBeNull();
    expect(fragmentWorking(1200, undefined, 0, en)).toBeNull();
  });

  it('shows no working rather than a sum that disagrees with the trace', () => {
    expect(fragmentWorking(1200, 300, 4, en)).toBeNull();
  });
});
