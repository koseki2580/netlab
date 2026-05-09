import { parseSessionJson } from '../sandbox/session-io/codec';
import type { DecodedExportedSession } from '../sandbox/session-io/schema';

export function decodeSessionInput(text: string): DecodedExportedSession {
  return parseSessionJson(text);
}
