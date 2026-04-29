import type { PacketHop, PacketTrace } from '../../types/simulation';

export function traceEventId(trace: PacketTrace, hop: PacketHop): string {
  return hop.traceEventId ?? `${trace.packetId}:${hop.step}`;
}

export function traceEventIdFromParts(traceId: string, hopIndex: number): string {
  return `${traceId}:${hopIndex}`;
}
