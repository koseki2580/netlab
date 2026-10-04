// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { CheckResultCode } from '../model/types';
import { CODE_TEXT, DROP_REASONS, dropMessage, explain } from './reasons';

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
  it.each(CODES)('code %s has text in both languages', (code) => {
    for (const text of [CODE_TEXT[code], explain(code)]) {
      expect(text.en.trim()).not.toBe('');
      expect(text.ja).toMatch(JAPANESE);
    }
  });

  it('the code table has no code the type does not know', () => {
    expect(Object.keys(CODE_TEXT).sort()).toEqual([...CODES].sort());
  });

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

  it('a reason the engine adds later still gets a sentence, in both languages', () => {
    for (const reason of ['something-new', '']) {
      const text = dropMessage(reason, 'request', 'R1');
      expect(text.en.trim()).not.toBe('');
      expect(text.ja).toMatch(JAPANESE);
    }
  });

  it('no-route never names the device that reported it (it is often a bystander)', () => {
    for (const leg of ['request', 'reply'] as const) {
      const text = dropMessage('no-route', leg, 'BYSTANDER-PC');
      expect(text.en).not.toContain('BYSTANDER-PC');
      expect(text.ja).not.toContain('BYSTANDER-PC');
    }
  });

  it.each(['acl-deny', 'no-egress-in-vlan', 'vlan-ingress-violation', 'stp-port-blocked'])(
    '%s names the device, by its label',
    (reason) => {
      const text = dropMessage(reason, 'request', '受付スイッチ');
      expect(text.en).toContain('受付スイッチ');
      expect(text.ja).toContain('受付スイッチ');
    },
  );

  it('says whether the request never arrived or the reply did not come back', () => {
    const request = dropMessage('acl-deny', 'request', 'R1');
    const reply = dropMessage('acl-deny', 'reply', 'R1');
    expect(request).not.toEqual(reply);
    expect(request.en).toMatch(/never arrived/);
    expect(reply.en).toMatch(/reply did not come back/);
    expect(reply.ja).toContain('返事');
  });

  it('explain uses the drop for not-delivered and wrong-cause, and details where given', () => {
    const drop = { reason: 'acl-deny', leg: 'request', device: 'R1' } as const;
    expect(explain('not-delivered', { drop })).toEqual(dropMessage('acl-deny', 'request', 'R1'));
    expect(explain('wrong-cause', { drop }).en).toContain('R1');
    expect(explain('wrong-cause', { drop }).en).toContain(CODE_TEXT['wrong-cause'].en);
    expect(explain('wrong-root', { device: 'SW-B' }).ja).toContain('SW-B');
    expect(explain('too-many-changes', { count: 3, max: 1 }).en).toMatch(/3.*1/);
    expect(explain('too-many-changes', { count: 3, max: 1 }).ja).toMatch(/3.*1/);
  });
});
