import { describe, expect, it } from 'vitest';
import { FakeDeterministicProvider } from '../../../crypto/FakeDeterministicProvider';
import { WpaFourWayHandshake } from './WpaFourWayHandshake';

describe('WpaFourWayHandshake', () => {
  it('derives replayable PTK material through CryptoProvider', async () => {
    const handshake = new WpaFourWayHandshake(new FakeDeterministicProvider());

    const first = await handshake.run({
      ssid: 'netlab-wifi',
      psk: 'correct horse battery staple',
      apMac: '02:00:00:00:aa:01',
      stationMac: '02:00:00:00:bb:01',
      seed: 7,
    });
    const second = await handshake.run({
      ssid: 'netlab-wifi',
      psk: 'correct horse battery staple',
      apMac: '02:00:00:00:aa:01',
      stationMac: '02:00:00:00:bb:01',
      seed: 7,
    });

    expect(first.status).toBe('connected');
    expect(first.messages.map((message) => message.type)).toEqual(['M1', 'M2', 'M3', 'M4']);
    expect(first.ptkHex).toBe(second.ptkHex);
  });
});
