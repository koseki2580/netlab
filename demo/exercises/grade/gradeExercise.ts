/**
 * Grade a learner's topology against the checks of an exercise, by running
 * the real simulator on it. Any configuration that works passes; nothing is
 * compared with the reference solution.
 *
 * `gradeExercise` never rejects. Probes run one after another, each on a fresh
 * engine (`runProbe`): a grade takes tens of milliseconds, so running them
 * concurrently would buy nothing and would rest on engines sharing no state.
 */

import { differsOutside, diffSettings } from '../model/settings';
import type {
  CheckEvidence,
  CheckResult,
  CheckResultCode,
  Exercise,
  ExerciseCheck,
  GradeResult,
} from '../model/types';
import type { PacketTrace } from '../../../src/types/simulation';
import type { TopologySnapshot } from '../../../src/types/topology';
import { prepare, routesOf, stpPort, stpRootNodeId, type PreparedTopology } from './prepare';
import { runProbe, type ProbeFacts } from './probe';
import { explain, type ExplainDetail } from './reasons';
import { evidenceOf, labelOf, sourceNatOnSyn, stoppingTrace } from './traceFacts';

type GradedExercise = Pick<Exercise, 'start' | 'allowed' | 'checks'>;
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

async function gradeCheck(
  check: ExerciseCheck,
  prepared: PreparedTopology,
  exercise: GradedExercise,
  current: TopologySnapshot,
): Promise<CheckResult> {
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
      const root = stpRootNodeId(prepared);
      if (root === check.nodeId) return result(check, 'ok', {}, at(root));
      // The evidence points at the switch that IS the root, which is what the learner must see.
      return root === null
        ? result(check, 'wrong-root')
        : result(check, 'wrong-root', { device: labelOf(prepared, root) }, at(root));
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

    default: {
      const facts = await runProbe(prepared, check.probe);
      const code = probeCode(check, facts);
      const drop = facts.drop
        ? { ...facts.drop, device: labelOf(prepared, facts.drop.nodeId) }
        : undefined;
      return result(check, code, drop ? { drop } : {}, {
        evidence: evidenceOf(facts, prepared),
        // A NAT check is about the SYN, so that is the packet to replay.
        trace: check.kind === 'nat-translated' ? facts.trace : stoppingTrace(facts),
      });
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

  const results: CheckResult[] = [];
  for (const check of exercise.checks) {
    try {
      results.push(await gradeCheck(check, prepared, exercise, current));
    } catch {
      results.push(result(check, 'engine-error'));
    }
  }
  // An exercise with no checks has verified nothing, so it is not a pass.
  return { passed: results.length > 0 && results.every((entry) => entry.passed), results };
}
