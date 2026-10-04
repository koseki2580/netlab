// @vitest-environment node
/**
 * The grader, on real topologies and the real engine. Each check kind has a
 * topology where it passes and one for every way it can fail; the three
 * worked examples of the plan run end to end at the bottom. TC ids are
 * allocated by the spec lane (see the plan); none exist yet.
 */

import { describe, expect, it } from 'vitest';
import type { AclRule } from '../../../src/types/acl';
import type { TopologySnapshot } from '../../../src/types/topology';
import { applyChanges } from '../model/settings';
import type { CheckResult, ExerciseCheck, Probe, SettingChange, SettingRef } from '../model/types';
import {
  DIAMOND_NETS,
  host,
  iface,
  lanBehindRouter,
  link,
  ospfDiamond,
  router,
  routerChain,
  routerDiamond,
  snapshot,
  switchNode,
  switchTriangle,
  vlanSwitch,
  withInterface,
  withLinkState,
  withNodeData,
  withOspfCost,
  withPort,
} from '../templates/shared/build';
import { gradeExercise } from './gradeExercise';
import { CODE_TEXT, dropMessage } from './reasons';

const ping = (from: string, to: string): Probe => ({ via: 'ping', from, to });
const tcp = (from: string, to: string, dstPort = 80): Probe => ({ via: 'tcp', from, to, dstPort });

/** Grade one check on a topology nobody has changed. */
async function gradeOne(topology: TopologySnapshot, check: ExerciseCheck): Promise<CheckResult> {
  const grade = await gradeExercise({ start: topology, allowed: [], checks: [check] }, topology);
  expect(grade.results).toHaveLength(1);
  const [result] = grade.results;
  if (!result) throw new Error('no result');
  expect(result.checkId).toBe(check.id);
  expect(result.passed).toBe(result.code === 'ok');
  expect(grade.passed).toBe(result.passed);
  expect(result.message.en).not.toBe('');
  expect(result.message.ja).toMatch(/[぀-ヿ一-龯]/);
  return result;
}

const denyPing: AclRule = { id: 'no-ping', priority: 5, action: 'deny', protocol: 'icmp' };
const permitAll: AclRule = { id: 'all', priority: 10, action: 'permit', protocol: 'any' };

/** pc reaches srv, but r2 has no way back. */
const forwardOnly = () =>
  withNodeData(routerChain(), 'r1', {
    staticRoutes: [{ destination: '10.0.2.0/24', nextHop: '10.0.12.2' }],
  });
const noAddress = () =>
  applyChanges(lanBehindRouter(), [{ kind: 'host-ip', nodeId: 'pc1', ip: null }]);
const pingFiltered = () =>
  withInterface(lanBehindRouter(), 'r1', 'lan', { inboundAcl: [denyPing, permitAll] });
const natLan = () =>
  withInterface(withInterface(lanBehindRouter(), 'r1', 'lan', { nat: 'inside' }), 'r1', 'wan', {
    nat: 'outside',
  });

describe('reach', () => {
  const check = (probe: Probe): ExerciseCheck => ({ id: 'c', kind: 'reach', probe });

  it('passes when the request arrives and the reply comes back, and shows the path', async () => {
    const result = await gradeOne(lanBehindRouter(), check(ping('pc1', 'srv')));
    expect(result).toMatchObject({ passed: true, code: 'ok', message: CODE_TEXT.ok });
    expect(result.evidence).toEqual({ path: ['pc1', 'sw1', 'r1', 'srv'] });
    expect(result.trace?.status).toBe('delivered');
  });

  it('fails with not-delivered when the request never arrives; the evidence says where and why', async () => {
    const result = await gradeOne(routerChain(), check(ping('pc', 'srv')));
    expect(result.code).toBe('not-delivered');
    expect(result.evidence).toEqual({
      nodeId: 'r1',
      nodeLabel: 'r1',
      dropReason: 'no-route',
      dropLeg: 'request',
      path: ['pc', 'r1'],
    });
    expect(result.message).toEqual(dropMessage('no-route', 'request', 'r1'));
    expect(result.trace?.status).toBe('dropped');
  });

  it('fails when the request arrives but the reply does not come back, and says so', async () => {
    const result = await gradeOne(forwardOnly(), check(ping('pc', 'srv')));
    expect(result.code).toBe('not-delivered');
    expect(result.evidence).toMatchObject({ dropLeg: 'reply', path: ['pc', 'r1', 'r2', 'srv'] });
    expect(result.message).toEqual(dropMessage('no-route', 'reply', 'r2'));
  });

  it('fails with no-address when an end has no address or does not exist', async () => {
    expect((await gradeOne(noAddress(), check(ping('pc1', 'srv')))).code).toBe('no-address');
    expect((await gradeOne(noAddress(), check(ping('srv', 'pc1')))).code).toBe('no-address');
    const ghost = await gradeOne(lanBehindRouter(), check(ping('nobody', 'srv')));
    expect(ghost).toMatchObject({ code: 'no-address', message: CODE_TEXT['no-address'] });
    expect(ghost).not.toHaveProperty('trace');
  });

  it('a TCP reach replays the packet that was stopped, not the SYN', async () => {
    const result = await gradeOne(natLan(), check(tcp('pc1', 'srv')));
    expect(result.code).toBe('not-delivered');
    expect(result.evidence).toMatchObject({ dropReason: 'no-nat-entry', dropLeg: 'reply' });
    expect(result.trace?.status).toBe('dropped');
  });
});

describe('must-not-reach', () => {
  const check = (probe: Probe, because: 'vlan' | 'acl' | 'any'): ExerciseCheck => ({
    id: 'c',
    kind: 'must-not-reach',
    probe,
    because,
  });

  it('vlan: passes when the switch has no port in that VLAN, and names the switch', async () => {
    const result = await gradeOne(vlanSwitch(), check(ping('a1', 'b1'), 'vlan'));
    expect(result.code).toBe('ok');
    expect(result.evidence).toMatchObject({ nodeId: 'sw1', dropReason: 'no-egress-in-vlan' });
  });

  it('acl: passes when an ACL refuses the request', async () => {
    const result = await gradeOne(pingFiltered(), check(ping('pc1', 'srv'), 'acl'));
    expect(result.code).toBe('ok');
    expect(result.evidence).toMatchObject({ nodeId: 'r1', dropReason: 'acl-deny' });
  });

  it('any: passes for whatever the network drops on the way there', async () => {
    expect((await gradeOne(routerChain(), check(ping('pc', 'srv'), 'any'))).code).toBe('ok');
    expect((await gradeOne(vlanSwitch(), check(ping('a1', 'b1'), 'any'))).code).toBe('ok');
  });

  it.each(['vlan', 'acl', 'any'] as const)('%s: fails when it arrives', async (because) => {
    const result = await gradeOne(vlanSwitch(), check(ping('a1', 'a2'), because));
    expect(result).toMatchObject({
      code: 'delivered-but-forbidden',
      message: CODE_TEXT['delivered-but-forbidden'],
    });
  });

  it('fails when the request arrives and only the reply is lost', async () => {
    const result = await gradeOne(forwardOnly(), check(ping('pc', 'srv'), 'any'));
    expect(result.code).toBe('delivered-but-forbidden');
  });

  it('a stated cause is not satisfied by another drop reason', async () => {
    const noRoute = await gradeOne(routerChain(), check(ping('pc', 'srv'), 'vlan'));
    expect(noRoute.code).toBe('wrong-cause');
    expect(noRoute.message.en).toContain(CODE_TEXT['wrong-cause'].en);
    expect(noRoute.evidence).toMatchObject({ dropReason: 'no-route' });

    expect((await gradeOne(vlanSwitch(), check(ping('a1', 'b1'), 'acl'))).code).toBe('wrong-cause');
    expect((await gradeOne(pingFiltered(), check(ping('pc1', 'srv'), 'vlan'))).code).toBe(
      'wrong-cause',
    );
  });

  it.each(['vlan', 'acl', 'any'] as const)(
    '%s: a missing address does not count as being kept apart',
    async (because) => {
      const result = await gradeOne(noAddress(), check(ping('srv', 'pc1'), because));
      expect(result).toMatchObject({ passed: false, code: 'no-address' });
    },
  );
});

describe('path-via and path-avoids', () => {
  const via = (target: { nodeId?: string; edgeId?: string }): ExerciseCheck => ({
    id: 'c',
    kind: 'path-via',
    probe: ping('pc', 'srv'),
    ...target,
  });
  const avoids = (target: { nodeId?: string; edgeId?: string }): ExerciseCheck => ({
    id: 'c',
    kind: 'path-avoids',
    probe: ping('pc', 'srv'),
    ...target,
  });

  it('path-via passes for a node or an edge on the request path, fails with wrong-path otherwise', async () => {
    // Equal costs: the request goes over r2.
    expect((await gradeOne(ospfDiamond(), via({ nodeId: 'r2' }))).code).toBe('ok');
    expect((await gradeOne(ospfDiamond(), via({ edgeId: 'e-12' }))).code).toBe('ok');
    expect((await gradeOne(ospfDiamond(), via({ nodeId: 'r2', edgeId: 'e-24' }))).code).toBe('ok');

    const wrong = await gradeOne(ospfDiamond(), via({ nodeId: 'r3' }));
    expect(wrong.code).toBe('wrong-path');
    expect(wrong.evidence?.path).toEqual(['pc', 'r1', 'r2', 'r4', 'srv']);
    expect((await gradeOne(ospfDiamond(), via({ edgeId: 'e-13' }))).code).toBe('wrong-path');
    expect((await gradeOne(ospfDiamond(), via({ nodeId: 'r2', edgeId: 'e-34' }))).code).toBe(
      'wrong-path',
    );
  });

  it('path-avoids is the opposite', async () => {
    expect((await gradeOne(ospfDiamond(), avoids({ nodeId: 'r3' }))).code).toBe('ok');
    expect((await gradeOne(ospfDiamond(), avoids({ edgeId: 'e-34' }))).code).toBe('ok');
    expect((await gradeOne(ospfDiamond(), avoids({ nodeId: 'r2' }))).code).toBe('wrong-path');
    expect((await gradeOne(ospfDiamond(), avoids({ edgeId: 'e-12' }))).code).toBe('wrong-path');
  });

  it('only the request leg counts: the reply comes back over r2 and that is not "via r2"', async () => {
    // r1 prefers r3 on the way out; r4 still answers over r2 (cost is outbound only).
    const raised = withOspfCost(ospfDiamond(), 'r1', DIAMOND_NETS.top1, 50);
    expect((await gradeOne(raised, via({ nodeId: 'r3' }))).code).toBe('ok');
    expect((await gradeOne(raised, via({ nodeId: 'r2' }))).code).toBe('wrong-path');
    expect((await gradeOne(raised, avoids({ nodeId: 'r2' }))).code).toBe('ok');
  });

  it('both need the request to arrive: with no routes neither passes', async () => {
    const viaResult = await gradeOne(routerDiamond(), via({ nodeId: 'r1' }));
    expect(viaResult.code).toBe('not-delivered');
    expect(viaResult.message).toEqual(dropMessage('no-route', 'request', 'r1'));
    expect((await gradeOne(routerDiamond(), avoids({ nodeId: 'r3' }))).code).toBe('not-delivered');
  });
});

describe('route-present', () => {
  const check = (
    nodeId: string,
    destination: string,
    rest: { nextHop?: string; protocol?: 'static' | 'ospf' | 'rip' | 'connected' } = {},
  ): ExerciseCheck => ({ id: 'c', kind: 'route-present', nodeId, destination, ...rest });

  it('matches the destination, and the next hop and protocol when given', async () => {
    const topology = forwardOnly();
    expect((await gradeOne(topology, check('r1', '10.0.2.0/24'))).code).toBe('ok');
    expect(
      (
        await gradeOne(
          topology,
          check('r1', '10.0.2.0/24', { nextHop: '10.0.12.2', protocol: 'static' }),
        )
      ).code,
    ).toBe('ok');
    expect(
      (await gradeOne(topology, check('r1', '10.0.1.0/24', { protocol: 'connected' }))).code,
    ).toBe('ok');
  });

  it('fails with route-missing for a missing destination, another next hop, another protocol, an unknown router', async () => {
    const topology = forwardOnly();
    const missing = await gradeOne(topology, check('r2', '10.0.1.0/24'));
    expect(missing).toMatchObject({ code: 'route-missing', message: CODE_TEXT['route-missing'] });
    expect(missing.evidence).toEqual({ nodeId: 'r2', nodeLabel: 'r2' });
    expect(
      (await gradeOne(topology, check('r1', '10.0.2.0/24', { nextHop: '10.0.12.9' }))).code,
    ).toBe('route-missing');
    expect((await gradeOne(topology, check('r1', '10.0.2.0/24', { protocol: 'ospf' }))).code).toBe(
      'route-missing',
    );
    expect((await gradeOne(topology, check('nobody', '10.0.2.0/24'))).code).toBe('route-missing');
  });

  it('a next hop that is one of several equal-cost ones counts', async () => {
    for (const nextHop of ['10.0.12.2', '10.0.13.2']) {
      expect(
        (
          await gradeOne(
            ospfDiamond(),
            check('r1', DIAMOND_NETS.right, { nextHop, protocol: 'ospf' }),
          )
        ).code,
      ).toBe('ok');
    }
  });
});

describe('stp-root and stp-port-role', () => {
  it('stp-root passes for the root and names the real root otherwise', async () => {
    const labelled = withNodeData(switchTriangle(), 'swa', { label: '受付スイッチ' });
    expect((await gradeOne(labelled, { id: 'c', kind: 'stp-root', nodeId: 'swa' })).code).toBe(
      'ok',
    );

    const wrong = await gradeOne(labelled, { id: 'c', kind: 'stp-root', nodeId: 'swb' });
    expect(wrong.code).toBe('wrong-root');
    expect(wrong.evidence).toEqual({ nodeId: 'swa', nodeLabel: '受付スイッチ' });
    expect(wrong.message.ja).toContain('受付スイッチ');
    expect(
      (await gradeOne(switchTriangle({ swb: 0 }), { id: 'c', kind: 'stp-root', nodeId: 'swb' }))
        .code,
    ).toBe('ok');
  });

  it('stp-root fails without throwing where there are no switches', async () => {
    const result = await gradeOne(routerChain(), { id: 'c', kind: 'stp-root', nodeId: 'r1' });
    expect(result).toMatchObject({ code: 'wrong-root', message: CODE_TEXT['wrong-root'] });
  });

  it('stp-port-role compares the role of one port', async () => {
    const role = (portId: string, wanted: 'ROOT' | 'DESIGNATED' | 'BLOCKED' | 'DISABLED') =>
      gradeOne(switchTriangle(), {
        id: 'c',
        kind: 'stp-port-role',
        nodeId: 'swc',
        portId,
        role: wanted,
      });
    expect((await role('to-swb', 'BLOCKED')).code).toBe('ok');
    expect((await role('to-swa', 'ROOT')).code).toBe('ok');
    expect(await role('to-swb', 'ROOT')).toMatchObject({
      code: 'wrong-role',
      message: CODE_TEXT['wrong-role'],
    });
    expect((await role('missing', 'BLOCKED')).code).toBe('wrong-role');
  });
});

describe('acl-drop', () => {
  const check = (nodeId: string, probe: Probe = ping('pc1', 'srv')): ExerciseCheck => ({
    id: 'c',
    kind: 'acl-drop',
    probe,
    nodeId,
  });

  it('passes when the named node drops the probe with acl-deny', async () => {
    const result = await gradeOne(pingFiltered(), check('r1'));
    expect(result.code).toBe('ok');
    expect(result.evidence).toMatchObject({ nodeId: 'r1', dropReason: 'acl-deny' });
  });

  it('fails with no-acl-drop when nothing is dropped, another node is named, or the drop has another reason', async () => {
    expect(await gradeOne(lanBehindRouter(), check('r1'))).toMatchObject({
      code: 'no-acl-drop',
      message: CODE_TEXT['no-acl-drop'],
    });
    expect((await gradeOne(pingFiltered(), check('sw1'))).code).toBe('no-acl-drop');
    expect((await gradeOne(pingFiltered(), check('r1', tcp('pc1', 'srv')))).code).toBe(
      'no-acl-drop',
    );
    expect((await gradeOne(routerChain(), check('r1', ping('pc', 'srv')))).code).toBe(
      'no-acl-drop',
    );
  });

  it('fails with no-address when nothing could be sent', async () => {
    expect((await gradeOne(noAddress(), check('r1'))).code).toBe('no-address');
  });
});

describe('nat-translated', () => {
  const check = (nodeId: string, probe: Probe = tcp('pc1', 'srv')): ExerciseCheck => ({
    id: 'c',
    kind: 'nat-translated',
    probe,
    nodeId,
  });

  it('passes on the SYN alone, although the handshake never completes through NAT', async () => {
    const result = await gradeOne(natLan(), check('r1'));
    expect(result.code).toBe('ok');
    // The SYN is what is replayed, not the SYN-ACK that the engine drops.
    expect(result.trace?.status).toBe('delivered');
    expect(result.trace?.hops.some((hop) => hop.natTranslation?.type === 'snat')).toBe(true);
  });

  it('fails with no-translation without NAT, at another node, with the sides swapped, or for a ping', async () => {
    expect(await gradeOne(lanBehindRouter(), check('r1'))).toMatchObject({
      code: 'no-translation',
      message: CODE_TEXT['no-translation'],
    });
    expect((await gradeOne(natLan(), check('sw1'))).code).toBe('no-translation');
    const swapped = withInterface(
      withInterface(lanBehindRouter(), 'r1', 'lan', { nat: 'outside' }),
      'r1',
      'wan',
      { nat: 'inside' },
    );
    expect((await gradeOne(swapped, check('r1'))).code).toBe('no-translation');
    expect((await gradeOne(natLan(), check('r1', ping('pc1', 'srv')))).code).toBe('no-translation');
  });

  it('fails when the SYN is translated but never arrives', async () => {
    const cut = withLinkState(natLan(), 'e-srv', 'down');
    expect((await gradeOne(cut, check('r1'))).passed).toBe(false);
  });
});

describe('max-changes and the allow-list', () => {
  const start = lanBehindRouter();
  const allowed: SettingRef[] = [
    { kind: 'host-ip', nodeId: 'pc1' },
    { kind: 'host-ip', nodeId: 'pc2' },
  ];
  const checks: ExerciseCheck[] = [
    { id: 'reach', kind: 'reach', probe: ping('pc1', 'srv') },
    { id: 'few', kind: 'max-changes', max: 1 },
  ];
  const move = (nodeId: string, ip: string): SettingChange => ({ kind: 'host-ip', nodeId, ip });
  const codes = async (current: TopologySnapshot, list = allowed) =>
    (await gradeExercise({ start, allowed: list, checks }, current)).results.map((r) => r.code);

  it('counts the allowed settings that differ from the start; undoing one does not count', async () => {
    expect(await codes(start)).toEqual(['ok', 'ok']);
    expect(await codes(applyChanges(start, [move('pc1', '192.168.1.50')]))).toEqual(['ok', 'ok']);
    const undone = applyChanges(start, [
      move('pc1', '192.168.1.50'),
      move('pc2', '192.168.1.51'),
      move('pc2', '192.168.1.11'),
    ]);
    expect(await codes(undone)).toEqual(['ok', 'ok']);
  });

  it('fails with too-many-changes above the limit, and says how many', async () => {
    const two = applyChanges(start, [move('pc1', '192.168.1.50'), move('pc2', '192.168.1.51')]);
    const grade = await gradeExercise({ start, allowed, checks }, two);
    expect(grade.passed).toBe(false);
    expect(grade.results.map((r) => r.code)).toEqual(['ok', 'too-many-changes']);
    expect(grade.results[1]?.message.en).toMatch(/2 settings.*allows 1/);
  });

  it('a change outside the allow-list fails every check with config-invalid', async () => {
    const outside = applyChanges(start, [move('pc2', '192.168.1.51')]);
    const grade = await gradeExercise(
      { start, allowed: [{ kind: 'host-ip', nodeId: 'pc1' }], checks },
      outside,
    );
    expect(grade.passed).toBe(false);
    expect(grade.results).toEqual([
      {
        checkId: 'reach',
        passed: false,
        code: 'config-invalid',
        message: CODE_TEXT['config-invalid'],
      },
      {
        checkId: 'few',
        passed: false,
        code: 'config-invalid',
        message: CODE_TEXT['config-invalid'],
      },
    ]);
  });

  it('so are a pulled cable, a removed device and a hand-written deny-all ACL', async () => {
    const invalid = ['config-invalid', 'config-invalid'];
    expect(await codes(withLinkState(start, 'e-pc2', 'down'))).toEqual(invalid);
    expect(
      await codes({ ...start, nodes: start.nodes.filter((node) => node.id !== 'pc2') }),
    ).toEqual(invalid);
    expect(await codes(withInterface(start, 'r1', 'wan', { inboundAcl: [] }))).toEqual(invalid);
  });
});

describe('never rejects', () => {
  const everyKind: ExerciseCheck[] = [
    { id: 'reach', kind: 'reach', probe: ping('ghost', 'nobody') },
    { id: 'apart', kind: 'must-not-reach', probe: ping('ghost', 'nobody'), because: 'any' },
    { id: 'via', kind: 'path-via', probe: ping('ghost', 'nobody'), nodeId: 'ghost' },
    { id: 'avoids', kind: 'path-avoids', probe: tcp('ghost', 'nobody'), edgeId: 'ghost' },
    { id: 'route', kind: 'route-present', nodeId: 'ghost', destination: 'not-a-cidr' },
    { id: 'root', kind: 'stp-root', nodeId: 'ghost' },
    { id: 'role', kind: 'stp-port-role', nodeId: 'ghost', portId: 'ghost', role: 'ROOT' },
    { id: 'acl', kind: 'acl-drop', probe: tcp('ghost', 'nobody'), nodeId: 'ghost' },
    { id: 'nat', kind: 'nat-translated', probe: tcp('ghost', 'nobody'), nodeId: 'ghost' },
    { id: 'few', kind: 'max-changes', max: -1 },
  ];
  const ghostAllowed: SettingRef[] = [
    { kind: 'host-ip', nodeId: 'ghost' },
    { kind: 'link-state', edgeId: 'ghost' },
    { kind: 'ospf-cost', nodeId: 'ghost', network: 'ghost' },
  ];

  it.each([
    ['an empty topology', snapshot([], [])],
    ['a real topology', lanBehindRouter()],
  ])(
    'node ids that do not exist, on %s: every check fails and nothing throws',
    async (_, topology) => {
      const grade = await gradeExercise(
        { start: topology, allowed: ghostAllowed, checks: everyKind },
        topology,
      );
      expect(grade.passed).toBe(false);
      expect(grade.results.map((r) => r.checkId)).toEqual(everyKind.map((check) => check.id));
      expect(Object.fromEntries(grade.results.map((r) => [r.checkId, r.code]))).toEqual({
        reach: 'no-address',
        apart: 'no-address',
        via: 'no-address',
        avoids: 'no-address',
        route: 'route-missing',
        root: 'wrong-root',
        role: 'wrong-role',
        acl: 'no-address',
        nat: 'no-address',
        few: 'too-many-changes',
      });
    },
  );

  it('a topology the simulator cannot prepare fails every check with config-invalid', async () => {
    const broken = { nodes: [{ id: 'x' }], edges: [], areas: [] } as unknown as TopologySnapshot;
    const grade = await gradeExercise({ start: broken, allowed: [], checks: everyKind }, broken);
    expect(grade.passed).toBe(false);
    expect(new Set(grade.results.map((r) => r.code))).toEqual(new Set(['config-invalid']));
  });

  it('garbage in place of a topology is config-invalid too', async () => {
    const garbage = {} as unknown as TopologySnapshot;
    const grade = await gradeExercise(
      { start: lanBehindRouter(), allowed: [], checks: everyKind },
      garbage,
    );
    expect(new Set(grade.results.map((r) => r.code))).toEqual(new Set(['config-invalid']));
  });

  it('an exercise with no checks is not a pass', async () => {
    const topology = lanBehindRouter();
    expect(await gradeExercise({ start: topology, allowed: [], checks: [] }, topology)).toEqual({
      passed: false,
      results: [],
    });
  });

  it('grading does not change the topologies it is given', async () => {
    const start = natLan();
    const before = JSON.stringify(start);
    await gradeExercise({ start, allowed: [], checks: everyKind }, start);
    expect(JSON.stringify(start)).toBe(before);
  });
});

// --- The three worked examples of the plan ----------------------------------

describe('worked example 1: the till with the wrong address (l1-host-address)', () => {
  // レジ (192.168.2.50) — SW — router (192.168.1.1 | 203.0.113.1) — 在庫サーバ; a second PC shares the LAN.
  const start = withNodeData(
    withNodeData(lanBehindRouter(), 'pc1', { ip: '192.168.2.50', label: 'レジ' }),
    'srv',
    { label: '在庫サーバ' },
  );
  const exercise = {
    start,
    allowed: [{ kind: 'host-ip', nodeId: 'pc1' }] satisfies SettingRef[],
    checks: [
      { id: 'till', kind: 'reach', probe: ping('pc1', 'srv') },
      { id: 'other-pc', kind: 'reach', probe: ping('pc2', 'srv') },
    ] satisfies ExerciseCheck[],
  };
  const withTillAt = (ip: string | null) =>
    gradeExercise(exercise, applyChanges(start, [{ kind: 'host-ip', nodeId: 'pc1', ip }]));

  it('the start fails: the till cannot reach the server, and the message does not blame a bystander', async () => {
    const grade = await gradeExercise(exercise, start);
    expect(grade.passed).toBe(false);
    const till = grade.results[0];
    expect(till).toMatchObject({ code: 'not-delivered' });
    // The engine reports this drop at pc2, a bystander (engineContract fact 5).
    expect(till?.evidence).toMatchObject({ nodeId: 'pc2', dropReason: 'no-route' });
    expect(till?.message.ja).not.toContain('pc2');
    expect(till?.message.ja).toContain('アドレスの最初の部分');
    expect(grade.results[1]?.code).toBe('ok');
  });

  it.each(['192.168.1.50', '192.168.1.77', '192.168.1.2', '192.168.1.254'])(
    'any free address on the shop network passes: %s',
    async (ip) => {
      expect((await withTillAt(ip)).passed).toBe(true);
    },
  );

  it.each(['10.0.0.50', '172.16.1.50', '192.168.2.51'])(
    'an address on another network fails: %s',
    async (ip) => {
      const grade = await withTillAt(ip);
      expect(grade.passed).toBe(false);
      expect(grade.results[0]?.code).toBe('not-delivered');
    },
  );

  it('the address of the other PC fails: the till loses its replies', async () => {
    const grade = await withTillAt('192.168.1.11');
    expect(grade.passed).toBe(false);
    expect(grade.results[0]).toMatchObject({ code: 'not-delivered' });
    expect(grade.results[0]?.evidence).toMatchObject({ dropLeg: 'reply' });
  });

  it('the address of the router fails: the till breaks only itself', async () => {
    const grade = await withTillAt('192.168.1.1');
    expect(grade.passed).toBe(false);
    expect(grade.results.map((r) => r.code)).toEqual(['not-delivered', 'ok']);
    expect(grade.results[0]?.evidence).toMatchObject({
      dropReason: 'routing-loop',
      dropLeg: 'reply',
    });
  });

  it('no address at all fails with no-address', async () => {
    expect((await withTillAt(null)).results[0]?.code).toBe('no-address');
  });
});

describe('worked example 2: splitting one switch into two VLANs (l2-vlan-separate)', () => {
  // Sales a1, a2 and accounting b1, b2 on one switch, all in VLAN 10 at the start.
  const start = withPort(withPort(vlanSwitch(), 'sw1', 'p3', { accessVlan: 10 }), 'sw1', 'p4', {
    accessVlan: 10,
  });
  const ports = ['p1', 'p2', 'p3', 'p4'].map(
    (portId): SettingRef => ({ kind: 'port-vlan', nodeId: 'sw1', portId }),
  );
  const checks: ExerciseCheck[] = [
    { id: 'sales', kind: 'reach', probe: ping('a1', 'a2') },
    { id: 'accounting', kind: 'reach', probe: ping('b1', 'b2') },
    { id: 'apart-1', kind: 'must-not-reach', probe: ping('a1', 'b1'), because: 'vlan' },
    { id: 'apart-2', kind: 'must-not-reach', probe: ping('b2', 'a2'), because: 'vlan' },
  ];
  const access = (portId: string, accessVlan: number): SettingChange => ({
    kind: 'port-vlan',
    nodeId: 'sw1',
    portId,
    vlanMode: 'access',
    accessVlan,
  });
  const codes = async (changes: SettingChange[], allowed: SettingRef[] = ports) =>
    (await gradeExercise({ start, allowed, checks }, applyChanges(start, changes))).results.map(
      (r) => r.code,
    );

  it('the start fails exactly the two must-not-reach checks', async () => {
    expect(await codes([])).toEqual([
      'ok',
      'ok',
      'delivered-but-forbidden',
      'delivered-but-forbidden',
    ]);
  });

  it('the reference passes, and so does any other pair of VLAN numbers', async () => {
    expect(await codes([access('p3', 20), access('p4', 20)])).toEqual(['ok', 'ok', 'ok', 'ok']);
    expect(await codes([access('p1', 20), access('p2', 20)])).toEqual(['ok', 'ok', 'ok', 'ok']);
  });

  it('"put everything in VLAN 20" fails the isolation checks', async () => {
    expect(await codes(['p1', 'p2', 'p3', 'p4'].map((portId) => access(portId, 20)))).toEqual([
      'ok',
      'ok',
      'delivered-but-forbidden',
      'delivered-but-forbidden',
    ]);
  });

  it('"give every PC its own VLAN" keeps them apart but fails the reach checks', async () => {
    expect(await codes([access('p2', 20), access('p4', 20)])).toEqual([
      'not-delivered',
      'not-delivered',
      'delivered-but-forbidden',
      'delivered-but-forbidden',
    ]);
  });

  it('"remove an address" does not pass the isolation checks, even where addresses may be changed', async () => {
    const withAddresses: SettingRef[] = [
      ...ports,
      { kind: 'host-ip', nodeId: 'b1' },
      { kind: 'host-ip', nodeId: 'b2' },
    ];
    expect(
      await codes(
        [
          { kind: 'host-ip', nodeId: 'b1', ip: null },
          { kind: 'host-ip', nodeId: 'b2', ip: null },
        ],
        withAddresses,
      ),
    ).toEqual(['ok', 'no-address', 'no-address', 'no-address']);
  });

  it('where addresses may NOT be changed, removing one is caught as config-invalid', async () => {
    const current = applyChanges(start, [{ kind: 'host-ip', nodeId: 'b1', ip: null }]);
    const grade = await gradeExercise({ start, allowed: ports, checks }, current);
    expect(new Set(grade.results.map((r) => r.code))).toEqual(new Set(['config-invalid']));
  });
});

describe('worked example 3: which design takes the fast path (l3-choose-rip-ospf)', () => {
  // Head office pc — r1 ══ r2 — srv branch: one slow direct link (e-slow), or
  // two fast links over r3. The fast path is the one through r3.
  const NETS = {
    office: '10.0.1.0/24',
    slow: '10.0.12.0/30',
    fast1: '10.0.13.0/30',
    fast2: '10.0.32.0/30',
    branch: '10.0.2.0/24',
  };
  const wiring = () =>
    snapshot(
      [
        host('pc', '10.0.1.10'),
        router('r1', [
          iface('lan', '10.0.1.1/24'),
          iface('slow', '10.0.12.1/30'),
          iface('fast', '10.0.13.1/30'),
        ]),
        router('r3', [iface('to-r1', '10.0.13.2/30'), iface('to-r2', '10.0.32.1/30')]),
        router('r2', [
          iface('slow', '10.0.12.2/30'),
          iface('fast', '10.0.32.2/30'),
          iface('lan', '10.0.2.1/24'),
        ]),
        host('srv', '10.0.2.10', { role: 'server' }),
      ],
      [
        link('e-pc', 'pc', 'r1:lan'),
        link('e-slow', 'r1:slow', 'r2:slow'),
        link('e-fast1', 'r1:fast', 'r3:to-r1'),
        link('e-fast2', 'r3:to-r2', 'r2:fast'),
        link('e-srv', 'r2:lan', 'srv'),
      ],
    );
  const networksOf: Record<string, string[]> = {
    r1: [NETS.office, NETS.slow, NETS.fast1],
    r3: [NETS.fast1, NETS.fast2],
    r2: [NETS.slow, NETS.fast2, NETS.branch],
  };
  const ospf = Object.entries(networksOf).reduce(
    (topology, [nodeId, networks], index) =>
      withNodeData(topology, nodeId, {
        ospfConfig: {
          routerId: `${index + 1}.${index + 1}.${index + 1}.${index + 1}`,
          areas: networks.map((network) => ({ areaId: '0.0.0.0', networks: [network] })),
        },
      }),
    wiring(),
  );
  const rip = Object.entries(networksOf).reduce(
    (topology, [nodeId, networks]) =>
      withNodeData(topology, nodeId, { ripConfig: { version: 2, networks } }),
    wiring(),
  );
  const cost = (nodeId: string, network: string): SettingChange => ({
    kind: 'ospf-cost',
    nodeId,
    network,
    cost: 50,
  });
  const allowed: SettingRef[] = [
    { kind: 'ospf-cost', nodeId: 'r1', network: NETS.slow },
    { kind: 'ospf-cost', nodeId: 'r2', network: NETS.slow },
    { kind: 'ospf-cost', nodeId: 'r1', network: NETS.fast1 },
    { kind: 'ospf-cost', nodeId: 'r3', network: NETS.fast2 },
  ];
  const checks: ExerciseCheck[] = [
    { id: 'arrives', kind: 'reach', probe: ping('pc', 'srv') },
    { id: 'fast', kind: 'path-via', probe: ping('pc', 'srv'), nodeId: 'r3' },
  ];
  const option = async (start: TopologySnapshot, changes: SettingChange[]) => {
    const grade = await gradeExercise({ start, allowed, checks }, applyChanges(start, changes));
    return {
      codes: grade.results.map((r) => r.code),
      path: grade.results[1]?.evidence?.path,
    };
  };
  const SLOW_PATH = ['pc', 'r1', 'r2', 'srv'];
  const FAST_PATH = ['pc', 'r1', 'r3', 'r2', 'srv'];

  it('B, OSPF with equal costs: arrives over the slow shortcut', async () => {
    expect(await option(ospf, [])).toEqual({ codes: ['ok', 'wrong-path'], path: SLOW_PATH });
  });

  it('C, OSPF with a high cost on the slow link: arrives over the fast path and passes', async () => {
    expect(await option(ospf, [cost('r1', NETS.slow), cost('r2', NETS.slow)])).toEqual({
      codes: ['ok', 'ok'],
      path: FAST_PATH,
    });
    // The request path is decided by r1 alone (cost is outbound only).
    expect((await option(ospf, [cost('r1', NETS.slow)])).codes).toEqual(['ok', 'ok']);
  });

  it('D, OSPF with a high cost on the fast links: arrives over the slow link', async () => {
    expect(await option(ospf, [cost('r1', NETS.fast1), cost('r3', NETS.fast2)])).toEqual({
      codes: ['ok', 'wrong-path'],
      path: SLOW_PATH,
    });
  });

  it('A, RIP: arrives over the slow shortcut (fewest hops)', async () => {
    expect(await option(rip, [])).toEqual({ codes: ['ok', 'wrong-path'], path: SLOW_PATH });
  });

  it('A cannot be an option over the OSPF start: no SettingChange switches the routing protocol', async () => {
    // Differs from the plan: "use RIP" needs a start topology of its own (or a
    // new setting kind). Graded against the OSPF start it is outside the allow-list.
    const grade = await gradeExercise({ start: ospf, allowed, checks }, rip);
    expect(grade.results.map((r) => r.code)).toEqual(['config-invalid', 'config-invalid']);
  });
});

it('a switch with no ports does not stop a grade', async () => {
  const topology = snapshot(
    [host('a', '10.0.0.1'), host('b', '10.0.0.2'), switchNode('sw', [])],
    [link('e', 'a', 'b')],
  );
  const grade = await gradeExercise(
    { start: topology, allowed: [], checks: [{ id: 'c', kind: 'reach', probe: ping('a', 'b') }] },
    topology,
  );
  expect(grade.results).toHaveLength(1);
  expect(grade.results[0]?.passed).toBe(grade.passed);
});
