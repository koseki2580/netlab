import type { InFlightPacket } from '../types/packets';
import type { PacketTrace } from '../types/simulation';

export interface PrecomputeOptions {
  suppressGeneratedIcmp?: boolean;
  /**
   * The packet is a what-if probe whose trace is never committed, so it must
   * leave no mark on state that outlives a trace (the routers' flow caches).
   */
  probe?: boolean;
}

export interface PrecomputeResult {
  trace: PacketTrace;
  nodeArpTables: Record<string, Record<string, string>>;
  snapshots: InFlightPacket[];
}
