/** The portsecurity concept-check deck: each right answer holds in the lesson's model. */
import { describe, expect, it } from 'vitest';
import { portsecurity as en } from '../../src/i18n/locales/en/concept/decks/portsecurity';
import { portsecurity as ja } from '../../src/i18n/locales/ja/concept/decks/portsecurity';
import { DECK } from '../../src/learning/concept-check/lessonDecks/portsecurity';
import {
  DEVICES,
  GUEST_VLAN,
  SNOOP_FRAMES,
  UPLINK,
  authenticate,
  inspect,
  portForwards,
  portSecurity,
  unauthorisedPasses,
} from './accessSecurity';

const HUB_MACS = ['aa:bb:cc:00:00:01', 'aa:bb:cc:00:00:02', 'aa:bb:cc:00:00:03'];

describe('TC-2314: portsecurity deck facts', () => {
  it('q1: an unauthorised 802.1X port forwards only EAPOL, not even DHCP', () => {
    expect(unauthorisedPasses()).toEqual(['eapol']);
    expect(portForwards('unauthorised', 'dhcp')).toBe(false);
  });

  it('q2: a known printer without a supplicant gets in by MAB after 90 s, into VLAN 40', () => {
    const printer = DEVICES.find((d) => d.id === 'printer')!;
    expect(authenticate(printer, GUEST_VLAN)).toMatchObject({
      method: 'MAB',
      radius: 'Access-Accept',
      portState: 'authorised',
      vlan: 40,
      guest: false,
      waitS: 90,
    });
  });

  it('q3: with 1 MAC allowed and shutdown, the port is err-disabled and no device has access', () => {
    expect(portSecurity(1, 'shutdown', HUB_MACS)).toMatchObject({
      port: 'err-disabled',
      withAccess: 0,
    });
    // protect would have kept the first device.
    expect(portSecurity(1, 'protect', HUB_MACS).withAccess).toBe(1);
  });

  it('q4: DAI drops the static host’s ARP because no binding matches it', () => {
    const { decisions, bindings } = inspect(SNOOP_FRAMES, [UPLINK]);
    const at = SNOOP_FRAMES.findIndex((f) => f.kind === 'arp' && f.senderIp === '10.0.10.50');
    expect(decisions[at]).toEqual({ action: 'drop', reason: 'no-binding' });
    expect(bindings.some((b) => b.ip === '10.0.10.50')).toBe(false);
  });
});

describe('portsecurity deck strings', () => {
  it('the right option is at most 1.6x the longest wrong one, in both locales', () => {
    for (const catalog of [en, ja]) {
      for (const [q, answer] of DECK.answers) {
        const base = `learning.concept.portsecurity.${q}`;
        const right = catalog[`${base}.${answer}`]!.length;
        const wrong = Math.max(
          ...(['a', 'b', 'c'] as const)
            .filter((letter) => letter !== answer)
            .map((letter) => catalog[`${base}.${letter}`]!.length),
        );
        expect(right / wrong, base).toBeLessThanOrEqual(1.6);
      }
    }
  });

  it('the right answer letter varies across the deck', () => {
    expect(new Set(DECK.answers.map(([, answer]) => answer)).size).toBeGreaterThan(1);
  });
});
