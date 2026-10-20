/**
 * Grade a learner's topology against the checks of an exercise, by running
 * the real simulator on it. Any configuration that works passes; nothing is
 * compared with the reference solution.
 *
 * `gradeExercise` never rejects. Probes run one after another, each on a fresh
 * engine (`runProbe`): a grade takes tens of milliseconds, so running them
 * concurrently would buy nothing and would rest on engines sharing no state.
 */

import { differsOutside, diffSettings, isAllowed } from '../model/settings';
import type {
  CheckEvidence,
  CheckResult,
  CheckResultCode,
  Exercise,
  ExerciseCheck,
  GradeResult,
} from '../model/types';
import type { PacketTrace } from '../../../src/types/simulation';
import type { StaticRouteConfig } from '../../../src/types/routing';
import type { TopologySnapshot } from '../../../src/types/topology';
import { isInSubnet } from '../../../src/utils/cidr';
import {
  addressConflict,
  diagnose,
  reservedAddresses,
  type DiagnoseOptions,
  type ReservedAddress,
} from './diagnose';
import {
  prepare,
  routesOf,
  stpBridges,
  stpPort,
  stpRootNodeId,
  type PreparedTopology,
} from './prepare';
import { addressOf, runProbe, type ProbeFacts } from './probe';
import {
  CHANGED_ELSEWHERE_BUT_WORKS,
  explain,
  type ExplainDetail,
  type NextHopFault,
} from './reasons';
import { evidenceOf, labelOf, sourceNatOnSyn, stoppingTrace } from './traceFacts';

type GradedExercise = Pick<Exercise, 'start' | 'allowed' | 'checks'> &
  Partial<Pick<Exercise, 'kind'>>;
type ProbeCheck = Extract<ExerciseCheck, { readonly probe: unknown }>;

const VLAN_REASONS: readonly string[] = ['no-egress-in-vlan', 'vlan-ingress-violation'];

function result(
  check: ExerciseCheck,
  code: CheckResultCode,
  detail: ExplainDetail = {},
  shown: { readonly evidence?: CheckEvidence; readonly trace?: PacketTrace | null } = {},
): CheckResult {
  return {
    checkId: check.id,
    passed: code === 'ok',
    code,
    message: explain(code, detail),
    ...(shown.evidence ? { evidence: shown.evidence } : {}),
    ...(shown.trace ? { trace: shown.trace } : {}),
  };
}

function probeCode(check: ProbeCheck, facts: ProbeFacts): CheckResultCode {
  // Nothing was sent. This is a failure for EVERY probe check, including
  // must-not-reach: otherwise deleting an address would "solve" an isolation
  // exercise without the network keeping anything apart.
  if (facts.status === 'no-address' || facts.status === 'engine-error') return facts.status;

  switch (check.kind) {
    case 'reach':
      return facts.delivered ? 'ok' : 'not-delivered';

    case 'must-not-reach': {
      if (facts.requestDelivered) return 'delivered-but-forbidden';
      // The request did not arrive, so the first drop is on the request leg.
      // It must be a drop by the network, and by the stated cause when there is one.
      const reason = facts.drop?.reason;
      if (reason === undefined) return 'wrong-cause';
      if (check.because === 'vlan') return VLAN_REASONS.includes(reason) ? 'ok' : 'wrong-cause';
      if (check.because === 'acl') return reason === 'acl-deny' ? 'ok' : 'wrong-cause';
      return 'ok';
    }

    case 'path-via':
    case 'path-avoids': {
      // Judged on the request leg (`forwardNodeIds` ends at the first deliver),
      // and only when the request arrived: a path that leads nowhere is no path.
      if (!facts.requestDelivered) return 'not-delivered';
      const onPath = [
        ...(check.nodeId !== undefined ? [facts.forwardNodeIds.includes(check.nodeId)] : []),
        ...(check.edgeId !== undefined ? [facts.forwardEdgeIds.includes(check.edgeId)] : []),
      ];
      const passed = check.kind === 'path-via' ? onPath.every(Boolean) : !onPath.some(Boolean);
      return passed ? 'ok' : 'wrong-path';
    }

    case 'acl-drop':
      return facts.drop?.reason === 'acl-deny' && facts.drop.nodeId === check.nodeId
        ? 'ok'
        : 'no-acl-drop';

    case 'nat-translated':
      return sourceNatOnSyn(facts, check.nodeId) ? 'ok' : 'no-translation';
  }
}

/**
 * What is wrong with `nextHop` as the next router of a route on `routerId`,
 * or null when a neighbouring router holds it on a network both are on.
 */
function nextHopFault(
  topology: TopologySnapshot,
  routerId: string,
  nextHop: string,
): NextHopFault | null {
  if (nextHop === 'direct') return null;
  const own = topology.nodes.find((node) => node.id === routerId)?.data.interfaces ?? [];
  if (own.some((side) => side.ipAddress === nextHop)) return 'self';
  const connected = own.map((side) => `${side.ipAddress}/${side.prefixLength}`);
  const onLink = (address: string) => connected.some((cidr) => isInSubnet(address, cidr));
  const holder = topology.nodes.find(
    (node) =>
      node.id !== routerId &&
      node.data.role === 'router' &&
      (node.data.interfaces ?? []).some((side) => side.ipAddress === nextHop),
  );
  if (onLink(nextHop)) return holder ? null : 'not-a-router';
  // A router that IS a neighbour, named by its address on another network.
  return holder && (holder.data.interfaces ?? []).some((side) => onLink(side.ipAddress))
    ? 'far-side'
    : 'far-away';
}

/** The static route `routerId` uses for `address`: the longest "/number" that covers it. */
function staticRouteFor(
  topology: TopologySnapshot,
  routerId: string,
  address: string | null,
): StaticRouteConfig | null {
  if (address === null) return null;
  const node = topology.nodes.find((entry) => entry.id === routerId);
  if (node?.data.role !== 'router') return null;
  let best: { readonly length: number; readonly route: StaticRouteConfig } | null = null;
  for (const route of node.data.staticRoutes ?? []) {
    const length = Number(route.destination.split('/')[1]);
    if (!Number.isInteger(length) || !isInSubnet(address, route.destination)) continue;
    if (best === null || length > best.length) best = { length, route };
  }
  return best?.route ?? null;
}

/** The fault of the route `routerId` uses for `address`. Null when there is none, or it is sound. */
function routeFaultFor(
  topology: TopologySnapshot,
  routerId: string,
  address: string | null,
): NextHopFault | null {
  const route = staticRouteFor(topology, routerId, address);
  return route ? nextHopFault(topology, routerId, route.nextHop) : null;
}

async function gradeCheck(
  check: ExerciseCheck,
  prepared: PreparedTopology,
  exercise: GradedExercise,
  current: TopologySnapshot,
  reserved: readonly ReservedAddress[],
): Promise<CheckResult> {
  const options: DiagnoseOptions = {
    unnamed: exercise.kind === 'diagnose-repair',
    // A device whose address is on the allow-list; a side of a router counts as its router.
    editable: (nodeId) =>
      exercise.allowed.some(
        (ref) => (ref.kind === 'host-ip' || ref.kind === 'iface-address') && ref.nodeId === nodeId,
      ),
  };
  const at = (nodeId: string): { evidence: CheckEvidence } => ({
    evidence: { nodeId, nodeLabel: labelOf(prepared, nodeId) },
  });

  switch (check.kind) {
    case 'route-present': {
      const found = routesOf(prepared, check.nodeId).some(
        (route) =>
          route.destination === check.destination &&
          (check.protocol === undefined || route.protocol === check.protocol) &&
          (check.nextHop === undefined ||
            route.nextHop === check.nextHop ||
            route.equalCostNextHops?.some((hop) => hop.nextHop === check.nextHop) === true),
      );
      return result(check, found ? 'ok' : 'route-missing', {}, at(check.nodeId));
    }

    case 'stp-root': {
      const bridges = stpBridges(prepared);
      const root = stpRootNodeId(prepared);
      if (root === check.nodeId) return result(check, 'ok', {}, at(root));
      if (root === null) return result(check, 'wrong-root');
      // The evidence points at the switch that IS the root, which is what the learner must see.
      const lowest = bridges.find((bridge) => bridge.nodeId === root)?.priority;
      const wanted = bridges.find((bridge) => bridge.nodeId === check.nodeId);
      // The wanted switch has the lowest number too, and lost on the device number.
      const tie =
        wanted !== undefined && lowest !== undefined && wanted.priority === lowest
          ? { other: labelOf(prepared, check.nodeId), priority: lowest }
          : undefined;
      return result(
        check,
        'wrong-root',
        { device: labelOf(prepared, root), ...(tie ? { tie } : {}) },
        at(root),
      );
    }

    case 'stp-port-role': {
      const role = stpPort(prepared, check.nodeId, check.portId)?.role;
      return result(check, role === check.role ? 'ok' : 'wrong-role', {}, at(check.nodeId));
    }

    case 'max-changes': {
      const count = diffSettings(exercise.start, current, exercise.allowed).length;
      return result(check, count <= check.max ? 'ok' : 'too-many-changes', {
        count,
        max: check.max,
      });
    }

    case 'changed-only': {
      const elsewhere = diffSettings(exercise.start, current, exercise.allowed).filter(
        (ref) => !isAllowed(ref, check.refs),
      );
      return result(check, elsewhere.length === 0 ? 'ok' : 'changed-elsewhere');
    }

    default: {
      if (check.kind !== 'must-not-reach') {
        // An address no device may have, on an end of this probe or on a side of a router.
        const special = reserved.find(
          (entry) =>
            entry.ifaceId !== undefined ||
            entry.nodeId === check.probe.from ||
            entry.nodeId === check.probe.to,
        );
        if (special) {
          return result(
            check,
            'address-reserved',
            { reserved: special },
            { evidence: { address: special.address, relatedNodeIds: [special.nodeId] } },
          );
        }
        // Two holders of one address: whatever "arrives" has not reached the device asked for.
        const conflict = addressConflict(exercise.start, current, check.probe, options);
        if (conflict) {
          return result(
            check,
            'address-conflict',
            { diagnosis: conflict.detail },
            { evidence: conflict.evidence },
          );
        }
      }
      const facts = await runProbe(prepared, check.probe);
      const code = probeCode(check, facts);
      // Where the packet was going at the router that dropped it.
      const towards = !facts.drop
        ? null
        : facts.drop.leg === 'reply'
          ? addressOf(prepared, check.probe.from)
          : check.probe.via === 'ping' && check.probe.toIp !== undefined
            ? check.probe.toIp
            : addressOf(prepared, check.probe.to);
      // The simulator refuses a route whose next router is on no network of its
      // router (`next-hop-off-link`). One the learner wrote is told as that, at
      // the router; one there from the start is the exercise's own fault.
      if (code === 'not-delivered' && facts.drop?.reason === 'next-hop-off-link') {
        const { nodeId } = facts.drop;
        const route = staticRouteFor(current, nodeId, towards);
        const kept = exercise.start.nodes
          .find((node) => node.id === nodeId)
          ?.data.staticRoutes?.some(
            (old) => old.destination === route?.destination && old.nextHop === route.nextHop,
          );
        if (route && kept !== true) {
          return result(
            check,
            'next-hop-not-neighbour',
            { nextHop: nextHopFault(current, nodeId, route.nextHop) ?? 'far-away' },
            at(nodeId),
          );
        }
      }
      const drop = facts.drop
        ? { ...facts.drop, device: labelOf(prepared, facts.drop.nodeId) }
        : undefined;
      // A probe that did not arrive: what the topology says comes before the
      // simulator's reason, which often cannot tell (see `diagnose.ts`).
      const found =
        code === 'not-delivered' ? diagnose(exercise.start, current, check.probe, options) : null;
      // A router that had no way on: its route for where this was going may be
      // there and name a next router that cannot work, which is not "no route".
      // Every setting the learner has is the list of a trunk: the message starts there.
      const trunkOnly =
        exercise.allowed.length > 0 &&
        exercise.allowed.every(
          (ref) =>
            ref.kind === 'port-vlan' &&
            exercise.start.nodes
              .find((node) => node.id === ref.nodeId)
              ?.data.ports?.find((port) => port.id === ref.portId)?.vlanMode === 'trunk',
        );
      const wrongHop =
        code === 'not-delivered' && !found && facts.drop
          ? routeFaultFor(current, facts.drop.nodeId, towards)
          : null;
      const routesEditable = exercise.allowed.some((ref) => ref.kind === 'static-routes');
      const hasTrunk = current.nodes.some((node) =>
        (node.data.ports ?? []).some((port) => port.vlanMode === 'trunk'),
      );
      return result(
        check,
        code,
        {
          ...(drop ? { drop } : {}),
          ...(found ? { diagnosis: found.detail } : {}),
          ...(wrongHop ? { nextHop: wrongHop } : {}),
          ...(routesEditable ? { routesEditable } : {}),
          ...(hasTrunk ? { hasTrunk } : {}),
          ...(trunkOnly ? { trunkOnly } : {}),
          sent:
            check.probe.via === 'tcp'
              ? { via: 'tcp', dstPort: check.probe.dstPort }
              : { via: 'ping' },
        },
        {
          evidence: { ...evidenceOf(facts, prepared), ...found?.evidence },
          // A NAT check is about the SYN, so that is the packet to replay.
          trace: check.kind === 'nat-translated' ? facts.trace : stoppingTrace(facts),
        },
      );
    }
  }
}

export async function gradeExercise(
  exercise: GradedExercise,
  current: TopologySnapshot,
): Promise<GradeResult> {
  const invalid = (): GradeResult => ({
    passed: false,
    results: exercise.checks.map((check) => result(check, 'config-invalid')),
  });

  let prepared: PreparedTopology;
  try {
    // The page only offers the allowed settings, but the grader does not trust
    // it: a topology that differs from the start anywhere else is not graded.
    // `differsOutside` says exactly what is compared.
    if (differsOutside(exercise.start, current, exercise.allowed)) return invalid();
    prepared = prepare(current);
  } catch {
    return invalid();
  }

  const reserved = reservedAddresses(exercise.start, current);
  const results: CheckResult[] = [];
  for (const check of exercise.checks) {
    try {
      results.push(await gradeCheck(check, prepared, exercise, current, reserved));
    } catch {
      results.push(result(check, 'engine-error'));
    }
  }
  // "It arrives, but..." is only true when everything else is met.
  const others = results.filter((entry) => entry.code !== 'changed-elsewhere');
  if (others.length < results.length && others.every((entry) => entry.passed)) {
    for (const [index, entry] of results.entries()) {
      if (entry.code === 'changed-elsewhere') {
        results[index] = { ...entry, message: CHANGED_ELSEWHERE_BUT_WORKS };
      }
    }
  }
  // An exercise with no checks has verified nothing, so it is not a pass.
  return { passed: results.length > 0 && results.every((entry) => entry.passed), results };
}
