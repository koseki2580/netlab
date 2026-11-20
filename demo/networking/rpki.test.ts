/** REQ-397 — RPKI route origin validation (TC-2010..TC-2016). */
import { describe, expect, it } from 'vitest';
import {
  ANNOUNCEMENTS,
  COMPETING,
  ROAS,
  forward,
  parsePrefix,
  validate,
  type Announcement,
} from './rpki';

const announcement = (id: string) => ANNOUNCEMENTS.find((a) => a.id === id)!;
const state = (prefix: string, originAs: number, roas = ROAS) =>
  validate({ id: 'x', prefix, originAs }, roas).state;

describe('TC-2010: the right origin at an allowed length is Valid', () => {
  it('192.0.2.0/24 from AS64500 matches its ROA', () => {
    const result = validate(announcement('own-24'), ROAS);
    expect(result.state).toBe('Valid');
    expect(result.matched).toEqual(ROAS[0]);
  });
});

describe('TC-2011: a covered prefix with another origin is Invalid', () => {
  it('192.0.2.0/24 from AS64511 is Invalid because of the origin', () => {
    expect(validate(announcement('other-origin-24'), ROAS)).toMatchObject({
      state: 'Invalid',
      reason: 'wrong-origin',
    });
  });
});

describe('TC-2012: a more-specific with another origin is Invalid, not NotFound', () => {
  it('192.0.2.0/25 from AS64511 is covered by the /24 ROA, so it is Invalid', () => {
    const result = validate(announcement('other-origin-25'), ROAS);
    expect(result.state).toBe('Invalid');
    expect(result.covering).toEqual([ROAS[0]]);
  });
});

describe('TC-2013: maxLength decides whether a more-specific from the right origin is Valid', () => {
  it('a /24 inside the /22 ROA (maxLength 24) is Valid; a /25 is Invalid as too long', () => {
    expect(validate(announcement('within-max'), ROAS).state).toBe('Valid');
    expect(validate(announcement('beyond-max'), ROAS)).toMatchObject({
      state: 'Invalid',
      reason: 'too-long',
    });
  });
  it('the boundary is inclusive: with maxLength 25 the /25 becomes Valid, /26 stays Invalid', () => {
    const loose = [ROAS[0]!, { ...ROAS[1]!, maxLength: 25 }];
    expect(state('198.51.100.0/25', 64501, loose)).toBe('Valid');
    expect(state('198.51.100.0/26', 64501, loose)).toBe('Invalid');
    expect(state('198.51.100.0/23', 64501, loose)).toBe('Valid');
  });
});

describe('TC-2014: a prefix no ROA covers is NotFound', () => {
  it('203.0.113.0/24 is NotFound; so is a less-specific of a ROA prefix', () => {
    expect(validate(announcement('no-roa'), ROAS).state).toBe('NotFound');
    expect(state('192.0.0.0/16', 64500)).toBe('NotFound');
    expect(state('198.51.96.0/21', 64501)).toBe('NotFound');
  });
  it('a prefix outside the ROA but next to it is not covered', () => {
    expect(state('198.51.104.0/24', 64501)).toBe('NotFound');
  });
});

describe('TC-2015: without ROV the more-specific wins by longest prefix match; dropping Invalid restores the /24', () => {
  it('to 192.0.2.10: accept-all uses the /25 from AS64511, drop-invalid uses the /24 from AS64500', () => {
    const open = forward(COMPETING, ROAS, '192.0.2.10', 'accept-all');
    expect(open.installed).toHaveLength(2);
    expect(open.chosen).toMatchObject({
      prefix: '192.0.2.0/25',
      originAs: 64511,
      state: 'Invalid',
    });
    const rov = forward(COMPETING, ROAS, '192.0.2.10', 'drop-invalid');
    expect(rov.installed.map((r) => r.prefix)).toEqual(['192.0.2.0/24']);
    expect(rov.chosen).toMatchObject({ prefix: '192.0.2.0/24', originAs: 64500, state: 'Valid' });
  });
  it('to 192.0.2.200, outside the /25, the /24 is used either way', () => {
    expect(forward(COMPETING, ROAS, '192.0.2.200', 'accept-all').chosen?.originAs).toBe(64500);
    expect(forward(COMPETING, ROAS, '192.0.2.200', 'drop-invalid').chosen?.originAs).toBe(64500);
  });
});

describe('TC-2016: NotFound routes are kept by a drop-Invalid policy', () => {
  it('203.0.113.0/24 is still installed and used', () => {
    const routes: Announcement[] = [announcement('no-roa')];
    const result = forward(routes, ROAS, '203.0.113.5', 'drop-invalid');
    expect(result.chosen).toMatchObject({ prefix: '203.0.113.0/24', state: 'NotFound' });
  });
  it('a prefix is parsed to its network address', () => {
    expect(parsePrefix('192.0.2.77/24')).toEqual({ address: 0xc0000200, length: 24 });
  });
});
