import type { TranslatorFn } from '../../i18n/types';
import type { FloodCopy, PacketHop } from '../../types/simulation';

const FATE_KEYS: Readonly<Record<FloodCopy['outcome'], string>> = {
  discarded: 'simulation.flood.discarded',
  flooded: 'simulation.flood.flooded',
  forwarded: 'simulation.flood.forwarded',
  dropped: 'simulation.flood.dropped',
};

/** The timeline's note for a hop at which a switch copied the frame: how many copies. */
export function floodNote(hop: PacketHop, t: TranslatorFn): string | null {
  const count = hop.flood?.copies.length ?? 0;
  return count > 0 ? t('simulation.flood.copied', { count }) : null;
}

/** Each copy, the device it reached and what became of it, for the hop's details. */
export function floodCopiesText(
  hop: PacketHop,
  label: (nodeId: string) => string,
  t: TranslatorFn,
): string | null {
  const copies = hop.flood?.copies ?? [];
  if (copies.length === 0) return null;
  return copies.map((copy) => `${label(copy.toNodeId)}: ${t(FATE_KEYS[copy.outcome])}`).join(', ');
}
