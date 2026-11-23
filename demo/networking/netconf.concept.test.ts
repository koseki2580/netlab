/** The netconf concept-check deck: each right answer holds in the lesson's model. */
import { describe, expect, it } from 'vitest';
import { netconf as en } from '../../src/i18n/locales/en/concept/decks/netconf';
import { netconf as ja } from '../../src/i18n/locales/ja/concept/decks/netconf';
import { DECK } from '../../src/learning/concept-check/lessonDecks/netconf';
import {
  DEFAULT_CONFIRM_TIMEOUT_S,
  cliPush,
  confirmedCommit,
  netconfPush,
  pushAll,
  startingDevices,
  uplinkChange,
} from './netconf';

const devices = startingDevices();
const r2 = devices[1]!;
const badChange = uplinkChange('uplink to core', '10.1.2.1/24', '10000');

describe('TC-2311: netconf deck facts', () => {
  it('q1: an out-of-range MTU fails validation and running is exactly as before', () => {
    const result = netconfPush(r2.running, badChange);
    expect(result.committed).toBe(false);
    expect(result.running).toEqual(r2.running);
    expect(result.errors).toEqual([
      expect.objectContaining({
        tag: 'invalid-value',
        path: "/interfaces/interface[name='eth1']/ipv4/mtu",
      }),
    ]);
  });

  it('q2: the CLI script leaves the description and address live and the MTU at 1500', () => {
    const result = cliPush(r2.running, badChange);
    expect(result.halfConfigured).toBe(true);
    expect(result.running.eth1).toMatchObject({ description: 'uplink to core', mtu: 1500 });
    expect(result.running.eth1!.addresses.map((a) => a.ip)).toEqual(['10.0.2.1', '10.1.2.1']);
  });

  it('q3: all-or-none aborts R1 and R3 when R2 is rejected, and none of them changes', () => {
    const outcomes = pushAll(
      devices,
      (name) =>
        uplinkChange(
          'uplink to core',
          `10.1.${name.slice(1)}.1/24`,
          name === 'R2' ? '10000' : '9000',
        ),
      'netconf-all-or-none',
    );
    expect(outcomes.map((o) => o.status)).toEqual(['aborted', 'rejected', 'aborted']);
    outcomes.forEach((o, at) => expect(o.running).toEqual(devices[at]!.running));
  });

  it('q4: a confirmed commit that shuts the session interface rolls back by itself at the timeout', () => {
    const result = confirmedCommit(
      r2.running,
      [{ iface: 'eth0', leaf: 'enabled', value: 'false' }],
      {
        timeoutS: DEFAULT_CONFIRM_TIMEOUT_S,
        confirmAfterS: 30,
        sessionIface: 'eth0',
      },
    );
    expect(DEFAULT_CONFIRM_TIMEOUT_S).toBe(600);
    expect(result).toMatchObject({
      committed: true,
      reachable: false,
      confirmedAtS: null,
      rolledBackAtS: 600,
    });
    expect(result.running.eth0!.enabled).toBe(true);
  });
});

describe('netconf deck strings', () => {
  it('the right option is at most 1.6x the longest wrong one, in both locales', () => {
    for (const catalog of [en, ja]) {
      for (const [q, answer] of DECK.answers) {
        const base = `learning.concept.netconf.${q}`;
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
