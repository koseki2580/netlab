import type { InFlightPacket } from '../types/packets';
import type { PacketTrace } from '../types/simulation';

export interface PrecomputeOptions {
  suppressGeneratedIcmp?: boolean;
}

export interface PrecomputeResult {
  trace: PacketTrace;
  nodeArpTables: Record<string, Record<string, string>>;
  snapshots: InFlightPacket[];
}
