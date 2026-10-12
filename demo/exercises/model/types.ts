/**
 * The exercise model. Everything here is plain JSON — no `Map`, no functions —
 * so an exercise can be stored, snapshotted in a golden test and sent across a
 * worker boundary. The one exception is `ExerciseTemplate.generate`.
 */

import type { Localised } from '../../course/examQuestions';
import type { AclRule } from '../../../src/types/acl';
import type { StaticRouteConfig } from '../../../src/types/routing';
import type { PacketTrace } from '../../../src/types/simulation';
import type { StpPortRole, TopologySnapshot } from '../../../src/types/topology';

export type { Localised };

export type ExerciseLevel = 1 | 2 | 3 | 4;

export type ExerciseKind = 'configure' | 'switch' | 'choose-design' | 'diagnose-repair';

// --- Settings ----------------------------------------------------------------

/** One thing a learner may change. The allow-list of an exercise is a list of these. */
export type SettingRef =
  | { readonly kind: 'host-ip'; readonly nodeId: string }
  | {
      readonly kind: 'iface-address';
      readonly nodeId: string;
      readonly ifaceId: string;
      /**
       * The "/number" is not what this exercise is about: the form shows the
       * address alone and writes back the prefix length the side already has,
       * and the grader refuses a topology in which the prefix length changed
       * (a learner passed by making the network bigger until it held everyone).
       */
      readonly addressOnly?: boolean;
    }
  | { readonly kind: 'static-routes'; readonly nodeId: string }
  | {
      readonly kind: 'port-vlan';
      readonly nodeId: string;
      readonly portId: string;
      /**
       * Whether the port is for one group or carries several is not what this
       * exercise is about: the form shows the number (or the list) alone, and
       * the grader refuses a topology in which the kind of port has changed.
       */
      readonly fixedMode?: boolean;
    }
  | { readonly kind: 'stp-priority'; readonly nodeId: string }
  | { readonly kind: 'stp-port'; readonly nodeId: string; readonly portId: string }
  | { readonly kind: 'link-state'; readonly edgeId: string }
  /** `network` is the CIDR of the link; it selects the `ospfConfig.areas` entry. */
  | { readonly kind: 'ospf-cost'; readonly nodeId: string; readonly network: string }
  | {
      readonly kind: 'iface-acl';
      readonly nodeId: string;
      readonly ifaceId: string;
      readonly direction: 'inbound' | 'outbound';
    }
  | { readonly kind: 'iface-nat'; readonly nodeId: string; readonly ifaceId: string };

export type SettingKind = SettingRef['kind'];

/** A setting and its new value. The whole value is replaced, never merged. */
export type SettingChange =
  /** `ip: null` leaves the host without an address. */
  | { readonly kind: 'host-ip'; readonly nodeId: string; readonly ip: string | null }
  | {
      readonly kind: 'iface-address';
      readonly nodeId: string;
      readonly ifaceId: string;
      readonly ipAddress: string;
      readonly prefixLength: number;
    }
  | {
      readonly kind: 'static-routes';
      readonly nodeId: string;
      readonly routes: readonly StaticRouteConfig[];
    }
  | {
      readonly kind: 'port-vlan';
      readonly nodeId: string;
      readonly portId: string;
      readonly vlanMode: 'access' | 'trunk';
      /** For an access port. */
      readonly accessVlan?: number;
      /** For a trunk. */
      readonly trunkAllowedVlans?: readonly number[];
    }
  | { readonly kind: 'stp-priority'; readonly nodeId: string; readonly priority: number }
  /** `enabled: false` puts the port in `stpConfig.disabledPortIds`. */
  | {
      readonly kind: 'stp-port';
      readonly nodeId: string;
      readonly portId: string;
      readonly enabled: boolean;
    }
  | { readonly kind: 'link-state'; readonly edgeId: string; readonly state: 'up' | 'down' }
  | {
      readonly kind: 'ospf-cost';
      readonly nodeId: string;
      readonly network: string;
      readonly cost: number;
    }
  | {
      readonly kind: 'iface-acl';
      readonly nodeId: string;
      readonly ifaceId: string;
      readonly direction: 'inbound' | 'outbound';
      /**
       * An empty list means "no ACL": `applyChanges` must delete the property.
       * The engine treats `inboundAcl: []` as deny-everything (see engineContract fact 3).
       */
      readonly rules: readonly AclRule[];
    }
  | {
      readonly kind: 'iface-nat';
      readonly nodeId: string;
      readonly ifaceId: string;
      readonly nat: 'inside' | 'outside' | null;
    };

// --- Probes and checks -------------------------------------------------------

/**
 * One packet exchange the grader runs. Both ends are node ids; the grader
 * resolves the addresses itself, so a host with no address is a `no-address`
 * result rather than an exception.
 */
export type Probe =
  | {
      readonly via: 'ping';
      readonly from: string;
      readonly to: string;
      /** Ping this address instead of the target node's own (e.g. a router interface). */
      readonly toIp?: string;
    }
  /** A TCP handshake. The only probe on which NAT and port-based ACL rules are visible. */
  | {
      readonly via: 'tcp';
      readonly from: string;
      readonly to: string;
      readonly dstPort: number;
      readonly srcPort?: number;
    };

export type ExerciseCheck =
  /** The request arrives and the answer comes back. */
  | { readonly id: string; readonly kind: 'reach'; readonly probe: Probe }
  /**
   * The request must not arrive. `because` narrows what may stop it, so that a
   * learner cannot pass by unplugging a cable: `vlan` and `acl` require that
   * drop reason, `any` accepts every drop.
   */
  | {
      readonly id: string;
      readonly kind: 'must-not-reach';
      readonly probe: Probe;
      readonly because: 'vlan' | 'acl' | 'any';
    }
  /** The request passes through this node or edge on its way there. */
  | {
      readonly id: string;
      readonly kind: 'path-via';
      readonly probe: Probe;
      readonly nodeId?: string;
      readonly edgeId?: string;
    }
  | {
      readonly id: string;
      readonly kind: 'path-avoids';
      readonly probe: Probe;
      readonly nodeId?: string;
      readonly edgeId?: string;
    }
  /** A router's computed table holds a route to `destination` (optionally via `nextHop`). */
  | {
      readonly id: string;
      readonly kind: 'route-present';
      readonly nodeId: string;
      readonly destination: string;
      readonly nextHop?: string;
      readonly protocol?: 'static' | 'ospf' | 'rip' | 'connected';
    }
  | { readonly id: string; readonly kind: 'stp-root'; readonly nodeId: string }
  | {
      readonly id: string;
      readonly kind: 'stp-port-role';
      readonly nodeId: string;
      readonly portId: string;
      readonly role: StpPortRole;
    }
  /** The probe is dropped by an ACL on `nodeId`. */
  | {
      readonly id: string;
      readonly kind: 'acl-drop';
      readonly probe: Probe;
      readonly nodeId: string;
    }
  /**
   * The SYN of a TCP probe reaches its target and `nodeId` rewrote its source
   * address. Judged on the SYN alone: a handshake through NAT never completes
   * in this engine (see engineContract fact 2).
   */
  | {
      readonly id: string;
      readonly kind: 'nat-translated';
      readonly probe: Probe;
      readonly nodeId: string;
    }
  /** No more than `max` settings differ from the start state. */
  | { readonly id: string; readonly kind: 'max-changes'; readonly max: number }
  /**
   * Of the allowed settings, only `refs` differ from the start state: the fix
   * was made where the fault is, not by disturbing something that was fine.
   * Its label must not name `refs` (that would point at the fault).
   */
  | { readonly id: string; readonly kind: 'changed-only'; readonly refs: readonly SettingRef[] };

export type ExerciseCheckKind = ExerciseCheck['kind'];

// --- Exercises ---------------------------------------------------------------

/** Something a hint says about the network, that the learner's changes can make untrue. */
export type HintFact =
  /** The router has no static route for `destination`. */
  | { readonly kind: 'no-route'; readonly nodeId: string; readonly destination: string }
  /** The router has a static route for `destination` whose next router is `nextHop`. */
  | {
      readonly kind: 'route-via';
      readonly nodeId: string;
      readonly destination: string;
      readonly nextHop: string;
    };

export interface ExerciseHint {
  /** 1 = where to look, 2 = what is wrong, 3 = what to change. */
  readonly tier: 1 | 2 | 3;
  readonly text: Localised;
  /** What `text` rests on. True at the start of the exercise. */
  readonly holdsWhile?: HintFact;
  /** Shown in place of `text` once `holdsWhile` is no longer so (`model/hints.ts`). */
  readonly instead?: Localised;
}

/** One answer of a `choose-design` exercise: a set of changes over the start topology. */
export interface DesignOption {
  readonly id: string;
  readonly label: Localised;
  readonly changes: readonly SettingChange[];
  /**
   * Why this option works or does not, for showing AFTER the option was run.
   * The grader's result decides; this only explains it.
   */
  readonly explain?: Localised;
  /**
   * A start topology of its own, for an option no `SettingChange` can express
   * (e.g. another routing protocol). Absent: the option runs over `Exercise.start`.
   */
  readonly start?: TopologySnapshot;
}

export interface Exercise {
  /** `${templateId}~${seed}`. */
  readonly id: string;
  readonly templateId: string;
  readonly seed: number;
  /** Bumped when a template's output changes, so stored attempts can be told apart. */
  readonly generatorVersion: number;
  readonly level: ExerciseLevel;
  readonly kind: ExerciseKind;
  readonly title: Localised;
  /**
   * What to do, in one line: the first thing under the title. A learner who
   * reads one sentence reads this one. Absent on exercises written before
   * briefs were split (then `brief` is shown whole).
   */
  readonly task?: Localised;
  /**
   * The rule that applies, in one line, where there is one. It gives the rule
   * and never the values: those are read off the diagram.
   */
  readonly rule?: Localised;
  /** The story, the symptom and the glosses. With a `task`, shown behind "read more". */
  readonly brief: Localised;
  readonly start: TopologySnapshot;
  readonly allowed: readonly SettingRef[];
  /** Only for `choose-design`. */
  readonly options?: readonly DesignOption[];
  readonly checks: readonly ExerciseCheck[];
  readonly hints: readonly ExerciseHint[];
  /** Lesson paths that teach this, e.g. `/networking/vlan`. */
  readonly lessons: readonly string[];
  /** One configuration that passes every check. */
  readonly reference: readonly SettingChange[];
  /** Identifies the task apart from its wording; two instances with one fingerprint are the same task. */
  readonly fingerprint: string;
  /** What each check means as a goal the learner reads, by check id. */
  readonly checkLabels?: Readonly<Record<string, Localised>>;
  /**
   * The name of each device in both languages, by node id. `start` carries the
   * Japanese one; `localiseExercise` (templates/index.ts) swaps them.
   */
  readonly nodeLabels?: Readonly<Record<string, Localised>>;
  /**
   * An exercise in two steps: the learner first points at what they think is
   * at fault (on the diagram or on its card), and only that can be changed.
   * The pick can be changed until Check is pressed; Check commits it, and a
   * wrong pick is a missed Check. `faulty` are the keys that are right to
   * point at (`model/pick.ts`): node ids (two, where two devices hold one
   * address), or `node:side` keys with `by: 'side'`, where the choice is
   * between the two sides of one router. What there is to choose among are
   * the allowed settings.
   */
  readonly pickFirst?: {
    readonly faulty: readonly string[];
    readonly by?: 'device' | 'side';
  };
  /**
   * Natural wrong answers, each of which must fail the grade. For the
   * verification harness only: never show these to a learner.
   */
  readonly wrongAnswers?: readonly (readonly SettingChange[])[];
  /**
   * Changes that make traffic flow without being a sound fix (a bigger network
   * instead of the right address, a healthy port moved instead of the faulty
   * one). Each must fail the grade. They need not be reachable through the
   * form. For the verification harness only.
   */
  readonly unsoundPasses?: readonly (readonly SettingChange[])[];
  /**
   * Set when the brief states a value that is the answer, on purpose: the
   * reason, for a reviewer. Without it the verification harness refuses a
   * brief a learner could pass by copying from. Never shown to a learner.
   */
  readonly answerInBrief?: string;
}

export interface ExerciseTemplate {
  readonly id: string;
  readonly level: ExerciseLevel;
  readonly kind: ExerciseKind;
  readonly generatorVersion: number;
  /** The kind of task, for lists: "Fix an address". */
  readonly title: Localised;
  /** Deterministic: the same seed always gives the same exercise. */
  readonly generate: (seed: number) => Exercise;
}

// --- Grading -----------------------------------------------------------------

export type CheckResultCode =
  | 'ok'
  | 'not-delivered'
  | 'delivered-but-forbidden'
  /** A must-not-reach probe was stopped, but not by what the exercise asks for. */
  | 'wrong-cause'
  | 'wrong-path'
  | 'route-missing'
  | 'wrong-root'
  | 'wrong-role'
  | 'no-acl-drop'
  | 'no-translation'
  | 'too-many-changes'
  /** A setting that was fine at the start was changed (`changed-only`). */
  | 'changed-elsewhere'
  /**
   * A route the learner wrote names a next router that is not on a network
   * its router is connected to. The simulator forwards to it; a real router
   * would not accept the line.
   */
  | 'next-hop-not-neighbour'
  | 'no-address'
  | 'config-invalid'
  | 'engine-error';

/** Where and why a probe stopped; what the learner needs to see to fix it. */
export interface CheckEvidence {
  readonly nodeId?: string;
  /** The label of `nodeId`, for messages and for the page. */
  readonly nodeLabel?: string;
  readonly edgeId?: string;
  /** The engine's drop reason, verbatim (`no-route`, `acl-deny`, `vlan-ingress-violation`, ...). */
  readonly dropReason?: string;
  /** `request` = stopped on the way there, `reply` = the answer did not come back. */
  readonly dropLeg?: 'request' | 'reply';
  /** Node ids the request visited, in order. */
  readonly path?: readonly string[];
  /**
   * What the grader found by reading the topology, when that explains the
   * failure better than the drop reason does (see `grade/diagnose.ts`). The
   * message leads with it. `cable-down` comes with `edgeId` (the cable to
   * plug in); the other two with `address` and `relatedNodeIds`.
   */
  readonly diagnosis?: 'cable-down' | 'duplicate-address' | 'wrong-network';
  /** `duplicate-address`: the address two devices hold. `wrong-network`: the address that is off. */
  readonly address?: string;
  /**
   * Devices to point at on the diagram. `duplicate-address`: every device
   * holding `address` (the one the check is about first). `wrong-network`:
   * the one device whose address does not match its neighbours'.
   */
  readonly relatedNodeIds?: readonly string[];
}

export interface CheckResult {
  readonly checkId: string;
  readonly passed: boolean;
  readonly code: CheckResultCode;
  /** Why, in the learner's words. Filled from `grade/reasons.ts`. */
  readonly message: Localised;
  readonly evidence?: CheckEvidence;
  /** The trace to replay on the canvas, so page and grader never disagree. */
  readonly trace?: PacketTrace;
}

export interface GradeResult {
  readonly passed: boolean;
  readonly results: readonly CheckResult[];
}
