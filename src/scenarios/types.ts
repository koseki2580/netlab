import type { NetworkTopology } from '../types/topology';
import type { TraceAnnotation } from '../sandbox/annotations/types';
import type { AssessmentRubric } from '../assessments/types';
import type { Edit } from '../sandbox/edits';
import type { ProtocolParameterSet } from '../sandbox/types';

export interface ScenarioMetadata {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly objective: string;
  readonly difficulty: 'intro' | 'core' | 'advanced';
  readonly protocols: readonly string[];
  readonly prerequisiteIds: readonly string[];
}

export interface ScenarioSampleFlow {
  readonly from: string;
  readonly to: string;
  readonly note?: string;
}

/** A prerequisite skill referenced by a scenario brief (M1). */
export interface BriefPrereq {
  readonly id: string;
  readonly label: string;
  /** Whether the learner is assumed to have already covered this. */
  readonly done: boolean;
}

/** A point in the timeline the learner should watch for (M1). */
export interface BriefWatchPoint {
  /** 1-indexed step the watch-point refers to. */
  readonly step: number;
  /** Category key — drives the marker color in the brief card. */
  readonly kind: string;
  readonly label: string;
}

/** An action offered on the final-step conclusion card (M1). */
export interface BriefConclusionAction {
  readonly id: string;
  readonly label: string;
  /** `'primary'` renders the emphasized button; omit for secondary. */
  readonly kind?: 'primary';
}

/** The closing summary shown when the timeline reaches the final step (M1). */
export interface BriefConclusion {
  readonly headline: string;
  readonly detail: string;
  readonly actions: readonly BriefConclusionAction[];
}

/**
 * Pre-flight brief shown when a scenario is first opened (M1).
 *
 * Renders as a full overlay card for first-time learners, a compact strip on
 * repeat visits or for `audience=pro`, and a conclusion card on the final step.
 */
export interface ScenarioBrief {
  /** One-line plain-language goal. */
  readonly goal: string;
  /** Optional time-estimate label, e.g. `'~3 min'`. */
  readonly est?: string;
  readonly prereq: readonly BriefPrereq[];
  readonly watchPoints: readonly BriefWatchPoint[];
  readonly conclusion: BriefConclusion;
}

export interface Scenario {
  readonly metadata: ScenarioMetadata;
  readonly topology: NetworkTopology;
  readonly parameters?: ProtocolParameterSet;
  readonly sampleFlows?: readonly ScenarioSampleFlow[];
  /** Pre-flight brief (M1). When omitted, no brief overlay is shown. */
  readonly brief?: ScenarioBrief;
  readonly preseedEdits?: readonly Edit[];
  readonly preseedAnnotations?: readonly TraceAnnotation[];
  readonly assessmentRubric?: AssessmentRubric;
  readonly authoring?: {
    readonly preseedStrategy: 'as-initial' | 'as-delta';
  };
}
