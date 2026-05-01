export const NETLAB_EMBED_PROTOCOL_VERSION = '1';

export type NetlabEmbedMode = 'compact' | 'minimal';
export type ParentOrigin = string | readonly string[];

export type SandboxChildEvent =
  | {
      readonly type: 'sandbox-ready';
      readonly version: string;
      readonly scenarioId: string;
      readonly editCount: number;
    }
  | {
      readonly type: 'sandbox-edit-count-changed';
      readonly count: number;
      readonly scenarioId: string;
    }
  | {
      readonly type: 'sandbox-assessment-passed';
      readonly rubricId: string;
      readonly hintsUsed: number;
      readonly durationMs: number;
    }
  | {
      readonly type: 'sandbox-session-exported';
      readonly sizeBytes: number;
      readonly scenarioId: string;
    };

export interface EmbedUrlParams {
  readonly baseUrl: string;
  readonly scenarioId: string;
  readonly sandboxEnabled?: boolean;
  readonly embedMode?: NetlabEmbedMode;
  readonly tutorialId?: string;
  readonly assessmentId?: string;
  readonly replayUrl?: string;
  readonly edits?: string;
  readonly parentOrigin?: ParentOrigin;
}
