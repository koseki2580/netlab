import type { TraceAnnotationEdit } from '../annotations/types';
import type { EditSession } from '../EditSession';
import type { Edit } from '../edits';
import type { NamedSnapshot } from '../snapshots/types';
import { isNamedSnapshot } from '../snapshots/edits';
import { encodeEdit } from '../urlCodec';
import type { ProtocolParameterSet } from '../types';
import { NETLAB_TOOL_VERSION, SESSION_SCHEMA_VERSION, type ExportedSession } from './schema';

export interface EncodeSessionOptions {
  readonly scenarioId: string;
  readonly initialParameters: ProtocolParameterSet;
  readonly savedAt?: string | Date;
  readonly toolVersion?: string;
}

function isoSavedAt(savedAt: string | Date | undefined): string {
  if (savedAt instanceof Date) {
    return savedAt.toISOString();
  }
  return savedAt ?? new Date().toISOString();
}

function orphanedSnapshotsFromBacking(backing: readonly Edit[]): readonly NamedSnapshot[] {
  return backing
    .filter(
      (edit): edit is Extract<Edit, { readonly kind: 'snapshot.delete' }> =>
        edit.kind === 'snapshot.delete' && edit.orphaned === true && isNamedSnapshot(edit.before),
    )
    .map((edit) => edit.before);
}

export function normalizeImportedTraceAnnotationEdit(
  edit: TraceAnnotationEdit,
): TraceAnnotationEdit {
  switch (edit.kind) {
    case 'trace.annotate.add':
      return {
        ...edit,
        annotation: { ...edit.annotation, author: 'user' },
      };
    case 'trace.annotate.remove':
      return {
        ...edit,
        before: { ...edit.before, author: 'user' },
      };
    case 'trace.annotate.edit':
      return edit;
  }
}

export function encodeSession(
  session: EditSession,
  options: EncodeSessionOptions,
): ExportedSession {
  return {
    schemaVersion: SESSION_SCHEMA_VERSION,
    scenarioId: options.scenarioId,
    initialScenarioId: options.scenarioId,
    initialParameters: options.initialParameters,
    backing: session.backing.map((edit) => encodeEdit(edit) as Edit),
    head: session.head,
    orphanedSnapshots: orphanedSnapshotsFromBacking(session.backing),
    savedAt: isoSavedAt(options.savedAt),
    toolVersion: options.toolVersion ?? NETLAB_TOOL_VERSION,
  };
}
