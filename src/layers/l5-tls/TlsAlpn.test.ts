import { describe, expect, it } from 'vitest';
import { negotiateAlpn } from './TlsAlpn';

describe('negotiateAlpn', () => {
  it('honors client preference order', () => {
    expect(negotiateAlpn(['h2', 'http/1.1'], ['http/1.1'])).toEqual({ selected: 'http/1.1' });
  });

  it('returns no_application_protocol when there is no overlap', () => {
    expect(negotiateAlpn(['h2'], ['http/1.1'])).toEqual({
      fatalAlert: 'no_application_protocol',
    });
  });
});
