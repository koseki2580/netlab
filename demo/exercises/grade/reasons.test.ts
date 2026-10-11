// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { CheckResultCode } from '../model/types';
import { CODE_TEXT, DROP_REASONS, diagnosisMessage, dropMessage, explain } from './reasons';

const JAPANESE = /[぀-ヿ一-龯]/;

const CODES: readonly CheckResultCode[] = [
  'ok',
  'not-delivered',
  'delivered-but-forbidden',
  'wrong-cause',
  'wrong-path',
  'route-missing',
  'wrong-root',
  'wrong-role',
  'no-acl-drop',
  'no-translation',
  'too-many-changes',
  'changed-elsewhere',
  'no-address',
  'config-invalid',
  'engine-error',
];

/** Every reason pinned in engineContract.test.ts, plus the ones the engine source reports. */
const ENGINE_REASONS = [
  'no-route',
  'acl-deny',
  'no-egress-in-vlan',
  'vlan-ingress-violation',
  'stp-port-blocked',
  'link-failed',
  'node-down',
  'interface-down',
  'ttl-exceeded',
  'routing-loop',
  'no-nat-entry',
  'nat-port-exhausted',
  'fragmentation-needed',
  'no-sub-interface-for-vlan',
  'hub-no-egress-port',
  'hub-no-egress-neighbor',
  'queue-full',
  'class-queue-full',
];

describe('learner-facing reasons', () => {
  // TC-433
  it.each(CODES)('code %s has text in both languages', (code) => {
    for (const text of [CODE_TEXT[code], explain(code)]) {
      expect(text.en.trim()).not.toBe('');
      expect(text.ja).toMatch(JAPANESE);
    }
  });

  // TC-433
  it('the code table has no code the type does not know', () => {
    expect(Object.keys(CODE_TEXT).sort()).toEqual([...CODES].sort());
  });

  // TC-433
  it.each(ENGINE_REASONS)('drop reason %s has its own text for both legs', (reason) => {
    expect(DROP_REASONS).toContain(reason);
    const unknown = dropMessage('something-new', 'request', 'R1');
    for (const leg of ['request', 'reply'] as const) {
      const text = dropMessage(reason, leg, 'R1');
      expect(text.en.trim()).not.toBe('');
      expect(text.ja).toMatch(JAPANESE);
      expect(text).not.toEqual(dropMessage('something-new', leg, 'R1'));
    }
    expect(unknown.ja).toMatch(JAPANESE);
  });

  // TC-433
  it('a reason the engine adds later still gets a sentence, in both languages', () => {
    for (const reason of ['something-new', '']) {
      const text = dropMessage(reason, 'request', 'R1');
      expect(text.en.trim()).not.toBe('');
      expect(text.ja).toMatch(JAPANESE);
    }
  });

  // TC-434
  it('no-route never names the device that reported it (it is often a bystander)', () => {
    for (const leg of ['request', 'reply'] as const) {
      const text = dropMessage('no-route', leg, 'BYSTANDER-PC');
      expect(text.en).not.toContain('BYSTANDER-PC');
      expect(text.ja).not.toContain('BYSTANDER-PC');
    }
  });

  // TC-434
  it.each(['acl-deny', 'no-egress-in-vlan', 'vlan-ingress-violation', 'stp-port-blocked'])(
    '%s names the device, by its label',
    (reason) => {
      const text = dropMessage(reason, 'request', '受付スイッチ');
      expect(text.en).toContain('受付スイッチ');
      expect(text.ja).toContain('受付スイッチ');
    },
  );

  // TC-434
  it('says when the request arrived and only the reply was lost', () => {
    const request = dropMessage('acl-deny', 'request', 'R1');
    const reply = dropMessage('acl-deny', 'reply', 'R1');
    expect(request).not.toEqual(reply);
    expect(reply.en).toMatch(/reply did not come back/);
    expect(reply.ja).toContain('返事が戻りません');
    expect(request.en).not.toMatch(/reply did not come back/);
    expect(request.ja).not.toContain('返事が戻りません');
  });

  // TC-434
  it('explain uses the drop for not-delivered and wrong-cause, and details where given', () => {
    const drop = { reason: 'acl-deny', leg: 'request', device: 'R1' } as const;
    expect(explain('not-delivered', { drop })).toEqual(dropMessage('acl-deny', 'request', 'R1'));
    expect(explain('wrong-cause', { drop }).en).toContain('R1');
    expect(explain('wrong-cause', { drop }).en).toContain(CODE_TEXT['wrong-cause'].en);
    expect(explain('wrong-root', { device: 'SW-B' }).ja).toContain('SW-B');
    expect(explain('too-many-changes', { count: 3, max: 1 }).en).toMatch(/3.*1/);
    expect(explain('too-many-changes', { count: 3, max: 1 }).ja).toMatch(/3.*1/);
  });

  // TC-560
  it('a missing route points at addresses, and at routes only where the learner can write routes', () => {
    for (const leg of ['request', 'reply'] as const) {
      const plain = dropMessage('no-route', leg, 'R1');
      const routed = dropMessage('no-route', leg, 'R1', { routesEditable: true });
      expect(plain.ja).toContain('アドレス');
      expect(plain.ja).not.toContain('経路');
      expect(routed.ja).toContain('経路');
      expect(routed.ja).not.toContain('R1');
      expect(routed.en).not.toContain('R1');
      const drop = { reason: 'no-route', leg, device: 'R1' } as const;
      expect(explain('not-delivered', { drop })).toEqual(plain);
      expect(explain('not-delivered', { drop, routesEditable: true })).toEqual(routed);
    }
  });

  // TC-560
  it('an unplugged cable is said in one short sentence, then where to look', () => {
    const text = diagnosisMessage({ kind: 'cable-down' });
    expect(text.ja).toBe('ケーブルがぬけています。赤い点線をさがしてください。');
    expect(text.en).toBe('A cable is unplugged. Look for the red dotted line.');
    // The engine's own reason for a dead link reads the same.
    expect(dropMessage('link-failed', 'request', 'R1')).toEqual(text);
  });

  // TC-560
  it('a duplicate address names the device that already has it, by its label', () => {
    const chosen = diagnosisMessage({
      kind: 'duplicate-address',
      address: '192.168.10.1',
      holder: 'レジ',
      other: 'お店のルータ',
      chosen: true,
    });
    expect(chosen.ja).toBe(
      'このアドレス（192.168.10.1）は、お店のルータがもう使っています。べつの数字をえらんでください。',
    );
    expect(chosen.en).toBe(
      'This address (192.168.10.1) is already used by お店のルータ. Choose another number.',
    );
    // Nobody chose it (the exercise started that way): both are named, neither is blamed.
    const found = diagnosisMessage({
      kind: 'duplicate-address',
      address: '192.168.10.11',
      holder: 'レジ',
      other: '事務室のパソコン',
      chosen: false,
    });
    expect(found.ja).toBe(
      'レジと事務室のパソコンが、同じアドレス（192.168.10.11）を使っています。どちらかを、べつの数字にしてください。',
    );
    expect(found.en).toContain('レジ and 事務室のパソコン use the same address (192.168.10.11)');
  });

  // TC-560
  it('an address on the wrong network says which number is off, with both values, and whose it is', () => {
    const host = diagnosisMessage({
      kind: 'wrong-network',
      address: '192.168.7.10',
      device: 'レジ',
      position: 3,
      own: 7,
      others: 1,
    });
    expect(host.ja).toBe(
      '3 つ目の数字がちがいます（7 と 1）。レジのアドレス（192.168.7.10）を、となりの機器と見くらべてください。',
    );
    expect(host.en).toBe(
      'The third number differs (7 and 1) from the devices around it. Compare the address of レジ (192.168.7.10) with its neighbours.',
    );
    const side = { en: 'side facing Switch', ja: 'スイッチのある側' };
    const router = diagnosisMessage({
      kind: 'wrong-network',
      address: '192.168.2.1',
      device: 'お店のルータ',
      side,
      position: 3,
      own: 2,
      others: 1,
    });
    expect(router.ja).toBe(
      '3 つ目の数字がちがいます（2 と 1）。お店のルータの「スイッチのある側」のアドレス（192.168.2.1）を、その側の機器と見くらべてください。',
    );
    expect(router.en).toContain('side facing Switch');
  });

  // TC-588
  it('in a find-the-fault exercise the cause is said and the device is not', () => {
    const off = diagnosisMessage({ kind: 'unnamed', cause: 'wrong-network', position: 3 });
    expect(off.ja).toBe(
      'まわりの機器とアドレスが合っていない機器があります。3 つ目の数字がちがいます。アドレスを 1 台ずつ見くらべてください。',
    );
    const twice = diagnosisMessage({ kind: 'unnamed', cause: 'duplicate-address' });
    expect(twice.ja).toContain('同じアドレスを使っている機器が 2 台あります');
    for (const text of [off, twice]) {
      expect(text.ja).not.toMatch(/レジ|\d+\.\d+\.\d+\.\d+/);
      expect(text.en).not.toMatch(/\d+\.\d+\.\d+\.\d+/);
    }
  });

  // TC-560
  it('a cause read off the topology replaces the sentence of the drop reason', () => {
    const drop = { reason: 'no-route', leg: 'request', device: 'R1' } as const;
    const diagnosis = { kind: 'cable-down' } as const;
    expect(explain('not-delivered', { drop, diagnosis })).toEqual(diagnosisMessage(diagnosis));
    // Only for a probe that did not arrive: other codes keep their own sentence.
    expect(explain('wrong-path', { diagnosis })).toEqual(CODE_TEXT['wrong-path']);
  });

  // TC-560
  it('every sentence of a Japanese message is short enough to take in at once', () => {
    const drop = (reason: string, leg: 'request' | 'reply') =>
      dropMessage(reason, leg, 'お店のルータ');
    const messages = [
      ...CODES.map((code) => CODE_TEXT[code].ja),
      ...ENGINE_REASONS.flatMap((reason) => [drop(reason, 'request').ja, drop(reason, 'reply').ja]),
      dropMessage('no-route', 'request', '', { routesEditable: true }).ja,
      dropMessage('no-route', 'reply', '', { routesEditable: true }).ja,
      diagnosisMessage({ kind: 'cable-down' }).ja,
    ];
    for (const message of messages) {
      const sentences = message.split('。').filter((sentence) => sentence !== '');
      // Observation, then what to look at; a lost reply and an ACL reply add one each.
      expect(sentences.length, message).toBeLessThanOrEqual(4);
      for (const sentence of sentences) expect(sentence.length, sentence).toBeLessThanOrEqual(60);
    }
    // Level 1 messages: at most about 35 characters a sentence.
    for (const message of [
      diagnosisMessage({ kind: 'cable-down' }).ja,
      CODE_TEXT['no-address'].ja,
      CODE_TEXT['not-delivered'].ja,
      CODE_TEXT['too-many-changes'].ja,
      drop('no-route', 'request').ja,
      drop('no-route', 'reply').ja,
    ]) {
      for (const sentence of message.split('。')) {
        expect(sentence.length, sentence).toBeLessThanOrEqual(35);
      }
    }
  });
});
