/**
 * The spine-leaf lesson (REQ-385): a fabric where every leaf links to every
 * spine. Counted, not drawn by hand: links, leaf-to-leaf paths and switch
 * hops, each leaf's uplink capacity and oversubscription, and what a failed
 * spine costs.
 */
export interface Fabric {
  readonly leaves: number;
  readonly spines: number;
  /** Spines that have failed (their routes withdrawn, as BGP would). */
  readonly failed: number;
}

/** Each leaf: 48 host ports at 25 Gbit/s, one 100 Gbit/s uplink per spine. */
export const HOST_PORTS = 48;
export const HOST_GBPS = 25;
export const UPLINK_GBPS = 100;

export const links = (fabric: Fabric) => fabric.leaves * fabric.spines;

const alive = (fabric: Fabric) => Math.max(0, fabric.spines - fabric.failed);

/** Equal-cost paths from one leaf to another: one through each working spine. */
export const leafToLeafPaths = (fabric: Fabric) => alive(fabric);

/** Switches a packet crosses between hosts on two different leaves: leaf, spine, leaf. */
export const leafToLeafHops = (fabric: Fabric) => (alive(fabric) > 0 ? 3 : null);

/** Each leaf's uplink capacity, Gbit/s. */
export const uplinkGbps = (fabric: Fabric) => alive(fabric) * UPLINK_GBPS;

/** Share of the uplink capacity left, %. */
export const capacityLeftPct = (fabric: Fabric) =>
  Math.round((alive(fabric) / fabric.spines) * 1000) / 10;

/** Host bandwidth a leaf can take in over what it can send up: 3 means 3:1. */
export const oversubscription = (fabric: Fabric) =>
  alive(fabric) === 0 ? null : (HOST_PORTS * HOST_GBPS) / uplinkGbps(fabric);
