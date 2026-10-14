/**
 * The packet-exercise model: exercises on the packet itself, next to the
 * device exercises of `demo/exercises/` (`Exercise`). Everything here is plain
 * JSON, so an exercise can be stored and sent across a worker boundary. The
 * one exception is `PacketTemplate.generate`.
 *
 * Three kinds:
 * - `build-packet`: the learner fills in fields of a packet; it is sent on the
 *   simulator and the goals are read off what happened.
 * - `fragment`: the learner states how a router splits a packet for one narrow
 *   link; the statement is compared with the simulator's own split.
 * - `read-packet`: the learner reads a packet (and the network) and says what
 *   happens to it or why it was dropped; at higher levels they then correct it,
 *   which is judged like a build exercise.
 *
 * What the simulator can and cannot judge is in `README.md`.
 */

import type { PacketTrace } from '../../src/types/simulation';
import type { TopologySnapshot } from '../../src/types/topology';
import type { ExerciseHint, ExerciseLevel, Localised } from '../exercises/model/types';

export type { ExerciseHint, ExerciseLevel, Localised };

export type PacketKind = 'build-packet' | 'fragment' | 'read-packet';

/** What a packet carries. One choice sets both the protocol number and the payload. */
export type Carries = 'icmp' | 'tcp' | 'udp';

// --- The packet ----------------------------------------------------------------

/**
 * A packet as the exercise hands it over. `null` is a field left empty for the
 * learner. `dstNodeId` is not here on purpose: the judge derives it from the
 * destination address and never shows it.
 */
export interface PacketGiven {
  /** The node that sends. Its addresses are the source fields; they are never editable. */
  readonly from: string;
  readonly srcIp: string;
  readonly srcMac: string;
  readonly dstIp: string | null;
  /** `null`: left to the sender (the simulator resolves it). Shown only where the MAC is the question. */
  readonly dstMac: string | null;
  readonly ttl: number | null;
  /** The "do not split" mark. */
  readonly df: boolean;
  readonly carries: Carries;
  /** For TCP and UDP. */
  readonly dstPort: number | null;
  /** Bytes of data after the ICMP or UDP header. */
  readonly dataBytes: number;
}

/** A field of the packet a learner may be asked to set. */
export type FieldId = 'dstIp' | 'dstMac' | 'ttl' | 'df' | 'dstPort' | 'carries' | 'size';

export type FieldValue = string | number | boolean;

/** The learner's values, by field. Fields outside the exercise's `fields` are ignored. */
export type PacketValues = Readonly<Partial<Record<FieldId, FieldValue>>>;

export type FieldInput =
  | { readonly kind: 'address' }
  | { readonly kind: 'mac' }
  | { readonly kind: 'number'; readonly min: number; readonly max: number }
  | { readonly kind: 'flag' }
  | {
      readonly kind: 'choice';
      readonly options: readonly { readonly value: string; readonly label: Localised }[];
    };

/** One answer offered for a field or a question. */
export interface Candidate {
  /** For a field: the value. For a question: the id of what is pointed at (a node id, a field id, ...). */
  readonly value: FieldValue;
  /** What the page shows, where the bare value is not it (a device's name, a field's label). */
  readonly label?: Localised;
  /**
   * `right`, or the mistake this candidate is (`one-short`, `server-mac`, ...).
   * For the verification harness only: never show it to a learner.
   */
  readonly why: string;
}

export interface PacketField {
  readonly id: FieldId;
  /** The label the form shows. Feedback names a field by this and nothing else. */
  readonly label: Localised;
  readonly input: FieldInput;
  /**
   * Set where the value is chosen, not typed. The page orders them per attempt
   * (`demo/exercises/ui/attemptOrder.ts`); the order here says nothing.
   */
  readonly candidates?: readonly Candidate[];
}

// --- Goals ---------------------------------------------------------------------

export type DropReason = 'ttl-exceeded' | 'fragmentation-needed' | 'acl-deny' | 'no-route';

/** What must be true of the packet after it was sent. `label` is the goal in the learner's words. */
export type PacketGoal = { readonly id: string; readonly label: Localised } & (
  | { readonly kind: 'delivered'; readonly to: string }
  /** The packet arrives with exactly this TTL left (1: no smaller TTL would have arrived). */
  | { readonly kind: 'ttl-left'; readonly value: number }
  /** `nodeId` drops it for `reason`, and answers with an ICMP error where the reason has one. */
  | { readonly kind: 'dropped'; readonly at: string; readonly reason: DropReason }
  /** Compared with the MAC the simulator resolves itself; never judged by delivery. */
  | { readonly kind: 'first-hop-mac' }
  /** A router cut it on the way and the destination put it together again. */
  | { readonly kind: 'fragmented' }
  | { readonly kind: 'not-fragmented' }
  /** It arrives whole, and one byte more would not have. */
  | { readonly kind: 'largest-whole' }
  /** No more than `max` fields differ from the packet as given. */
  | { readonly kind: 'max-changes'; readonly max: number }
);

export type PacketGoalKind = PacketGoal['kind'];

// --- Exercises -----------------------------------------------------------------

interface PacketExerciseBase {
  /** `${templateId}~${seed}`. */
  readonly id: string;
  readonly templateId: string;
  readonly seed: number;
  readonly generatorVersion: number;
  readonly level: ExerciseLevel;
  readonly title: Localised;
  /** What to do, in one line. */
  readonly task: Localised;
  /** The rule that applies, in one line: the rule, never the values. */
  readonly rule: Localised;
  /** The story, behind "read more". */
  readonly brief: Localised;
  readonly topology: TopologySnapshot;
  /** The name of each device in both languages, by node id. `topology` carries the Japanese one. */
  readonly nodeLabels: Readonly<Record<string, Localised>>;
  /** Where to look; what rule applies; almost the answer (never the answer value). */
  readonly hints: readonly ExerciseHint[];
  /** Lesson paths that teach this (routes of `demo/main.tsx`). */
  readonly lessons: readonly string[];
  /** Identifies the task apart from its wording and its digits. */
  readonly fingerprint: string;
}

/** The part of an exercise in which fields are set and the packet is sent. */
export interface BuildPart {
  /** The editable fields, in the order the form shows them. */
  readonly fields: readonly PacketField[];
  readonly goals: readonly PacketGoal[];
  /** One set of values that meets every goal. */
  readonly reference: PacketValues;
  /** Natural wrong answers with the result code each must fail with. Harness only. */
  readonly wrongAnswers?: readonly {
    readonly values: PacketValues;
    readonly code: PacketResultCode;
    readonly note: string;
  }[];
}

export interface BuildExercise extends PacketExerciseBase, BuildPart {
  readonly kind: 'build-packet';
  readonly packet: PacketGiven;
}

/** One fragment as stated. `offset` and `mf` are present only where the exercise asks for them. */
export interface FragmentRow {
  /** The whole fragment in bytes, IP header included. */
  readonly size: number;
  /** In the exercise's `offsetUnit`. */
  readonly offset?: number;
  /** The "more pieces follow" mark. */
  readonly mf?: boolean;
}

export interface FragmentExercise extends PacketExerciseBase {
  readonly kind: 'fragment';
  /** The packet before the narrow link: DF clear, `dataBytes` of data. */
  readonly packet: PacketGiven & { readonly dstIp: string };
  /** Bytes of data the packet carries (the ICMP or UDP header comes on top). */
  readonly payloadBytes: number;
  readonly mtu: number;
  /** The one narrow cable, and the router that sends onto it. */
  readonly narrowEdgeId: string;
  readonly cutBy: string;
  /** What each row states besides its size. */
  readonly asks: {
    readonly offsets: boolean;
    readonly flags: boolean;
  };
  /** The unit `FragmentRow.offset` is asked in; the task line says which. */
  readonly offsetUnit: 'units8' | 'bytes';
  readonly goals: readonly FragmentGoal[];
  /** The split, as the simulator makes it. */
  readonly reference: readonly FragmentRow[];
}

export interface FragmentGoal {
  readonly id: 'count' | 'sizes' | 'offsets' | 'flags';
  readonly label: Localised;
}

export type QuestionAsk =
  /** Which device the packet arrives at (`nowhere`: none). */
  | 'arrives-at'
  /** Which of the packets arrive (`a`, `b`, `both`, `neither`). */
  | 'which-arrive'
  /** At which device the packet stops: the router that drops it, or the destination. */
  | 'stops-at'
  /** Which field made the device drop it. */
  | 'cause';

export interface ReadQuestion {
  readonly id: string;
  readonly ask: QuestionAsk;
  readonly prompt: Localised;
  readonly candidates: readonly Candidate[];
  /** The `value` of the right candidate. The judge reads it off the simulator; this is the key it must agree with. */
  readonly answer: string;
}

export interface ReadExercise extends PacketExerciseBase {
  readonly kind: 'read-packet';
  /** The packet(s) as captured where they left the sender. Two only for `which-arrive`. */
  readonly packets: readonly (PacketGiven & { readonly dstIp: string; readonly ttl: number })[];
  /** What the simulator does with `packets[0]`, for the page to show once the questions are answered. */
  readonly outcome: {
    readonly deliveredTo: string | null;
    readonly dropAt: string | null;
    readonly reason: DropReason | null;
  };
  readonly questions: readonly ReadQuestion[];
  /** Higher levels: correct `packets[0]` so that it gets through. Judged by sending it. */
  readonly fix?: BuildPart;
}

export type PacketExercise = BuildExercise | FragmentExercise | ReadExercise;

export interface PacketTemplate {
  readonly id: string;
  readonly level: ExerciseLevel;
  readonly kind: PacketKind;
  readonly generatorVersion: number;
  /** The kind of task, for lists. */
  readonly title: Localised;
  /** Deterministic: the same seed always gives the same exercise. */
  readonly generate: (seed: number) => PacketExercise;
}

// --- Answers and results ---------------------------------------------------------

export interface FragmentAnswer {
  readonly rows: readonly FragmentRow[];
}

export interface ReadAnswer {
  /** The chosen candidate's `value`, by question id. */
  readonly picks: Readonly<Record<string, string>>;
  /** For an exercise with a `fix`. */
  readonly values?: PacketValues;
}

export type PacketResultCode =
  | 'ok'
  /** An editable field is empty or is not a value of its kind. */
  | 'not-filled'
  | 'invalid-value'
  /** The destination address is the sender's own, or no device on the diagram has it. */
  | 'own-address'
  | 'nobody-has-address'
  | 'delivered-elsewhere'
  | 'ttl-ran-out'
  | 'ttl-to-spare'
  | 'filter-refused'
  | 'too-big-not-split'
  | 'no-route'
  /** The frame was handed to a device that is not the destination (a neighbour's MAC). */
  | 'handed-to-wrong-device'
  | 'not-dropped'
  | 'dropped-elsewhere'
  | 'was-split'
  | 'was-not-split'
  | 'not-largest'
  | 'wrong-mac'
  | 'too-many-changes'
  | 'wrong-pick'
  | 'no-pick'
  // fragment statements
  | 'wrong-count'
  | 'not-multiple-of-8'
  | 'ip-header-forgotten'
  | 'transport-header-forgotten'
  | 'over-mtu'
  | 'wrong-sizes'
  | 'offsets-in-bytes'
  | 'offsets-in-units'
  | 'wrong-offsets'
  | 'mf-on-last'
  | 'mf-cleared-middle'
  | 'engine-error';

/** What the learner needs to see; nothing here states an answer value. */
export interface PacketEvidence {
  /** The device the message is about, and its label. */
  readonly nodeId?: string;
  readonly nodeLabel?: Localised;
  /** The simulator's drop reason, verbatim. */
  readonly dropReason?: string;
  /** Node ids the packet visited, in order. */
  readonly path?: readonly string[];
  /** The field the message is about. */
  readonly field?: FieldId;
  /** The TTL the packet arrived with. */
  readonly ttlLeft?: number;
  /** The ICMP error that came back: who sent it and what it says. */
  readonly icmp?: {
    readonly fromNodeId: string;
    readonly type: number;
    readonly code: number;
    readonly nextHopMtu: number | null;
  };
  /** Whose MAC the learner wrote. */
  readonly macOwner?:
    | 'right'
    | 'destination'
    | 'neighbour'
    | 'sender'
    | 'gateway'
    | 'router-far-side'
    | 'switch'
    | 'nobody';
  /** Fragment statements: the rows the message is about, counted from 1. */
  readonly rows?: readonly number[];
  /** Fragment statements: whether the stated pieces can be put together again at all. */
  readonly reassembles?: boolean;
}

export interface PacketGoalResult {
  /** A goal id, or a question id. */
  readonly goalId: string;
  readonly passed: boolean;
  readonly code: PacketResultCode;
  /** Why, in the learner's words: the cause first, then what to look at. */
  readonly message: Localised;
  readonly evidence?: PacketEvidence;
}

export interface PacketGrade {
  readonly passed: boolean;
  readonly results: readonly PacketGoalResult[];
  /** The trace of the packet that was sent, to replay on the diagram. Absent when nothing was sent. */
  readonly trace?: PacketTrace;
}
