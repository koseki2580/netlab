import { NetlabError } from '../../errors';
import { SESSION_SCHEMA_VERSION } from './schema';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function migrateExportedSession(value: unknown): unknown {
  if (!isRecord(value)) {
    return value;
  }

  const schemaVersion = value.schemaVersion;
  if (schemaVersion === SESSION_SCHEMA_VERSION) {
    return value;
  }

  if (typeof schemaVersion === 'number' && Number.isInteger(schemaVersion)) {
    throw new NetlabError({
      code: 'session-io/unsupported-schema',
      message: `[netlab] unsupported sandbox session schema version: ${schemaVersion}`,
      context: {
        schemaVersion,
        supportedSchemaVersion: SESSION_SCHEMA_VERSION,
        hint: 'Open this file in a compatible netlab version or add a migration.',
      },
    });
  }

  return value;
}
