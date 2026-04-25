import { NetlabError } from '../../errors';
import { EditSession } from '../EditSession';
import type { Edit } from '../edits';
import { decodeEdit, encodeEdit } from '../urlCodec';
import { isProtocolParameterSet, type ProtocolParameterSet } from '../types';
import {
  SESSION_IMPORT_EDIT_LIMIT,
  SESSION_SCHEMA_VERSION,
  type DecodedExportedSession,
  type ExportedSession,
} from './schema';

interface EncodeSessionOptions {
  readonly scenarioId: string;
  readonly initialParameters: ProtocolParameterSet;
  readonly savedAt?: string | Date;
  readonly toolVersion?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function invalid(message: string, context?: Record<string, unknown>): never {
  throw new NetlabError({
    code: 'session-io/invalid-session',
    message,
    ...(context !== undefined ? { context } : {}),
  });
}

function isoSavedAt(savedAt: string | Date | undefined): string {
  if (savedAt instanceof Date) {
    return savedAt.toISOString();
  }
  return savedAt ?? new Date().toISOString();
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
    savedAt: isoSavedAt(options.savedAt),
    toolVersion: options.toolVersion ?? '0.1.0',
  };
}

export function decodeSession(value: unknown): EditSession {
  return readExportedSession(value).session;
}

export function readExportedSession(value: unknown): DecodedExportedSession {
  const migrated = value;
  if (!isRecord(migrated)) {
    invalid('[netlab] invalid sandbox session');
  }
  if (
    typeof migrated.schemaVersion === 'number' &&
    Number.isInteger(migrated.schemaVersion) &&
    migrated.schemaVersion !== SESSION_SCHEMA_VERSION
  ) {
    throw new NetlabError({
      code: 'session-io/unsupported-schema',
      message: `[netlab] unsupported sandbox session schema: ${migrated.schemaVersion}`,
    });
  }
  if (migrated.schemaVersion !== SESSION_SCHEMA_VERSION) {
    invalid('[netlab] invalid sandbox session');
  }

  const scenarioId =
    typeof migrated.scenarioId === 'string'
      ? migrated.scenarioId
      : typeof migrated.initialScenarioId === 'string'
        ? migrated.initialScenarioId
        : null;
  if (!scenarioId) {
    invalid('[netlab] invalid sandbox session');
  }
  if (!isProtocolParameterSet(migrated.initialParameters)) {
    invalid('[netlab] invalid sandbox session');
  }
  if (!Array.isArray(migrated.backing)) {
    invalid('[netlab] invalid sandbox session');
  }
  if (migrated.backing.length > SESSION_IMPORT_EDIT_LIMIT) {
    invalid(`[netlab] sandbox session file can contain at most ${SESSION_IMPORT_EDIT_LIMIT} edits`);
  }
  if (
    typeof migrated.head !== 'number' ||
    !Number.isInteger(migrated.head) ||
    migrated.head < 0 ||
    migrated.head > migrated.backing.length
  ) {
    invalid('[netlab] invalid sandbox session head');
  }
  const head = migrated.head;
  if (typeof migrated.savedAt !== 'string') {
    invalid('[netlab] invalid sandbox session');
  }
  if (typeof migrated.toolVersion !== 'string') {
    invalid('[netlab] invalid sandbox session');
  }

  const backing: Edit[] = [];

  migrated.backing.forEach((rawEdit, index) => {
    const edit = decodeEdit(rawEdit);
    if (edit) {
      backing.push(edit);
      return;
    }
    invalid(`[netlab] sandbox session file contains invalid edits at ${index}`);
  });

  const session = new EditSession(backing, head);
  const exported: ExportedSession = {
    schemaVersion: SESSION_SCHEMA_VERSION,
    scenarioId,
    initialScenarioId:
      typeof migrated.initialScenarioId === 'string' ? migrated.initialScenarioId : scenarioId,
    initialParameters: migrated.initialParameters,
    backing,
    head,
    savedAt: migrated.savedAt,
    toolVersion: migrated.toolVersion,
  };

  return { exported, session };
}

export function parseSessionJson(text: string): DecodedExportedSession {
  try {
    return readExportedSession(JSON.parse(text) as unknown);
  } catch (error) {
    if (error instanceof SyntaxError) {
      invalid('[netlab] sandbox session file is not valid JSON');
    }
    throw error;
  }
}
