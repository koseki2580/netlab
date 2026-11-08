import type { GreHeader } from '../../types/tunneling';
import type { HeaderValues } from '../pack/types';

/** A `GreHeader` (src/types/tunneling.ts) as a header object. */
export function greHeaderToValues(header: GreHeader): HeaderValues {
  return {
    c: header.hasChecksum ? 1 : 0,
    k: header.hasKey ? 1 : 0,
    s: header.hasSequence ? 1 : 0,
    ver: header.version,
    protocolType: header.protocolType,
    ...(header.hasChecksum ? { checksum: header.checksum ?? 0 } : {}),
    ...(header.hasKey ? { key: header.key ?? 0 } : {}),
    ...(header.hasSequence ? { sequence: header.sequence ?? 0 } : {}),
  };
}
