import type { UdpDatagram } from "./packets";

/** Re-export alias: `UdpSegment` is the same type as `UdpDatagram`. */
export type UdpSegment = UdpDatagram;

export const UDP_PROTOCOL = 17;
export const UDP_MIN_PORT = 0;
export const UDP_MAX_PORT = 65535;
export const UDP_EPHEMERAL_PORT_MIN = 49152;
export const UDP_EPHEMERAL_PORT_MAX = 65535;

/** A single UDP binding entry for display in NodeDetailPanel. */
export interface UdpBinding {
  ip: string;
  port: number;
  owner: string;
  kind: "listening" | "ephemeral";
}

/** Aggregate UDP bindings for a node. */
export interface UdpBindings {
  listening: Array<{ ip: string; port: number; owner: string }>;
  ephemeral: Array<{ ip: string; port: number }>;
}
