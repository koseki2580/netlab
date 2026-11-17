/** REQ-378 — ECH: what an observer reads in the first TLS bytes (TC-1840..TC-1842). */
import { describe, expect, it } from 'vitest';
import { PUBLIC_NAME, SITE, firstFlight, openSealed, readable } from './ech';

describe('TC-1840: without ECH, the site’s name is readable in the ClientHello', () => {
  it('an observer reads clinic.example and nothing else that names a site', async () => {
    const flight = await firstFlight(false);
    expect(readable(flight.onTheWire)).toEqual([SITE]);
  });
});

describe('TC-1841: with ECH, the observer reads only the provider’s public name', () => {
  it('cdn.example is readable; clinic.example appears nowhere on the wire', async () => {
    const flight = await firstFlight(true);
    const seen = readable(flight.onTheWire);
    expect(seen).toContain(PUBLIC_NAME);
    expect(seen.join(' ')).not.toContain('clinic');
    expect(new TextDecoder('latin1').decode(flight.onTheWire)).not.toContain(SITE);
  });
});

describe('TC-1842: the provider, holding the key, opens the sealed hello and finds the real site', () => {
  it('decrypting the inner hello gives back clinic.example; tampering with the outer one fails', async () => {
    const flight = await firstFlight(true);
    expect(readable(await openSealed(flight))).toEqual([SITE]);
    const tampered = flight.onTheWire.slice();
    tampered[10] = (tampered[10] ?? 0) ^ 1;
    await expect(openSealed({ onTheWire: tampered, sealed: flight.sealed })).rejects.toThrow();
  });
});
