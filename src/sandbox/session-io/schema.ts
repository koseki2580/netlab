import type { EditSession } from '../EditSession';
import type { Edit } from '../edits';
import type { ProtocolParameterSet } from '../types';

export const SESSION_SCHEMA_VERSION = 1;
export const SESSION_IMPORT_EDIT_LIMIT = 5000;
export const NETLAB_TOOL_VERSION = '0.1.0';

export interface ExportedSession {
  readonly schemaVersion: 1;
  readonly scenarioId: string;
  readonly initialScenarioId: string;
  readonly initialParameters: ProtocolParameterSet;
  readonly backing: readonly Edit[];
  readonly head: number;
  readonly savedAt: string;
  readonly toolVersion: string;
}

export interface DecodedExportedSession {
  readonly exported: ExportedSession;
  readonly session: EditSession;
}
