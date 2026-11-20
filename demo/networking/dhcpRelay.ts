/**
 * The DHCP relay lesson (REQ-399): how one DHCP server serves VLANs it is not
 * on. A client's DISCOVER is a broadcast, and a router does not forward
 * broadcasts; a router interface with a helper address (a relay agent,
 * RFC 1542) unicasts it to the server instead, writing its own address on
 * that interface into `giaddr` and adding 1 to `hops`. The server picks the
 * address pool whose subnet contains `giaddr` (RFC 2131 §4.3.1) and sends
 * the OFFER back to `giaddr` on UDP port 67; the relay hands it to the client.
 * A relay may also add option 82 (RFC 3046), whose circuit ID names the
 * switch port, and the server may pick a reserved address by it.
 *
 * Simplified: only DISCOVER and OFFER are traced (REQUEST and ACK cross the
 * relay the same way); the router is the relay and the access switch is left
 * out; the server offers the first address of a pool; the relay sends from
 * its interface towards the server (some platforms send from the giaddr
 * address instead); /24 subnets only.
 */

export interface RouterInterface {
  readonly name: string;
  readonly vlan: number;
  /** The router's own address on this VLAN; it becomes `giaddr`. */
  readonly address: string;
  /** `ip helper-address`: the DHCP server to relay to, or none. */
  readonly helper: string | null;
}

export interface Pool {
  /** The /24 subnet the pool serves, as its network address. */
  readonly subnet: string;
  /** The address the server offers first. */
  readonly first: string;
}

export interface Network {
  readonly interfaces: readonly RouterInterface[];
  /** The router's address on the server's VLAN. */
  readonly upstream: string;
  readonly server: string;
  readonly pools: readonly Pool[];
  /** Fixed addresses the server hands out by option 82 circuit ID. */
  readonly reservations: Readonly<Record<string, string>>;
}

export type Leg = 'client-to-relay' | 'relay-to-server' | 'server-to-relay' | 'relay-to-client';

export interface Packet {
  readonly leg: Leg;
  readonly message: 'DISCOVER' | 'OFFER';
  readonly src: string;
  readonly srcPort: number;
  readonly dst: string;
  readonly dstPort: number;
  readonly giaddr: string;
  readonly hops: number;
  /** The address offered ('0.0.0.0' in a DISCOVER). */
  readonly yiaddr: string;
  /** The option 82 circuit ID carried, if any. */
  readonly circuitId: string | null;
}

export type Outcome = 'offered' | 'no-helper' | 'no-pool';

export interface RelayResult {
  readonly outcome: Outcome;
  readonly packets: readonly Packet[];
  readonly offered: string | null;
  /** The subnet of the pool the server used. */
  readonly pool: string | null;
  /** What decided the address: the pool containing giaddr, or a circuit ID reservation. */
  readonly selectedBy: 'giaddr' | 'circuit-id' | null;
}

export interface RelayOptions {
  /** The client asks for a broadcast reply (the BROADCAST flag). */
  readonly broadcastFlag?: boolean;
  /** The relay adds option 82 with this circuit ID (the client's switch port). */
  readonly circuitId?: string;
}

const ZERO = '0.0.0.0';
const BROADCAST = '255.255.255.255';
const SERVER_PORT = 67;
const CLIENT_PORT = 68;

/** The /24 network address of an address. */
export function subnetOf(ip: string): string {
  return `${ip.split('.').slice(0, 3).join('.')}.0`;
}

/** RFC 2131 §4.3.1: with a non-zero giaddr, the server uses the pool for giaddr's subnet. */
export function selectPool(pools: readonly Pool[], giaddr: string): Pool | null {
  return pools.find((pool) => pool.subnet === subnetOf(giaddr)) ?? null;
}

/** Trace a DISCOVER from a client on `clientVlan` and the OFFER that answers it. */
export function relay(
  network: Network,
  clientVlan: number,
  options: RelayOptions = {},
): RelayResult {
  const circuitId = options.circuitId ?? null;
  const discover: Packet = {
    leg: 'client-to-relay',
    message: 'DISCOVER',
    src: ZERO,
    srcPort: CLIENT_PORT,
    dst: BROADCAST,
    dstPort: SERVER_PORT,
    giaddr: ZERO,
    hops: 0,
    yiaddr: ZERO,
    circuitId: null,
  };
  const ingress = network.interfaces.find((entry) => entry.vlan === clientVlan);
  if (!ingress?.helper) {
    // The broadcast reaches the router and stops there.
    return {
      outcome: 'no-helper',
      packets: [discover],
      offered: null,
      pool: null,
      selectedBy: null,
    };
  }
  const relayed: Packet = {
    ...discover,
    leg: 'relay-to-server',
    src: network.upstream,
    srcPort: SERVER_PORT,
    dst: ingress.helper,
    giaddr: ingress.address,
    hops: discover.hops + 1,
    circuitId,
  };
  const pool = selectPool(network.pools, relayed.giaddr);
  if (!pool) {
    // The server has no address for that subnet, so it stays silent.
    return {
      outcome: 'no-pool',
      packets: [discover, relayed],
      offered: null,
      pool: null,
      selectedBy: null,
    };
  }
  const reserved = circuitId === null ? undefined : network.reservations[circuitId];
  const byPort = reserved !== undefined && subnetOf(reserved) === pool.subnet;
  const offered = byPort ? reserved : pool.first;
  const offer: Packet = {
    leg: 'server-to-relay',
    message: 'OFFER',
    src: network.server,
    srcPort: SERVER_PORT,
    dst: relayed.giaddr,
    dstPort: SERVER_PORT,
    giaddr: relayed.giaddr,
    // RFC 2131 Table 3: a server's reply carries hops 0.
    hops: 0,
    yiaddr: offered,
    // The server echoes option 82 back to the relay.
    circuitId,
  };
  const delivered: Packet = {
    ...offer,
    leg: 'relay-to-client',
    src: ingress.address,
    dst: options.broadcastFlag ? BROADCAST : offered,
    dstPort: CLIENT_PORT,
    // RFC 3046: the relay removes option 82 before the reply goes to the client.
    circuitId: null,
  };
  return {
    outcome: 'offered',
    packets: [discover, relayed, offer, delivered],
    offered,
    pool: pool.subnet,
    selectedBy: byPort ? 'circuit-id' : 'giaddr',
  };
}

const SERVER = '10.0.100.5';

const iface = (vlan: number, helper: boolean): RouterInterface => ({
  name: `Vlan${vlan}`,
  vlan,
  address: `10.0.${vlan}.1`,
  helper: helper ? SERVER : null,
});

/** The server's pools: VLAN 10 and VLAN 20, nothing for VLAN 30. */
export const POOLS: readonly Pool[] = [
  { subnet: '10.0.10.0', first: '10.0.10.100' },
  { subnet: '10.0.20.0', first: '10.0.20.100' },
];

/** A port whose device always gets the same address. */
export const RESERVATIONS: Readonly<Record<string, string>> = { 'Gi1/0/7': '10.0.20.50' };

function network(helpers: {
  readonly 10: boolean;
  readonly 20: boolean;
  readonly 30: boolean;
}): Network {
  return {
    interfaces: [iface(10, helpers[10]), iface(20, helpers[20]), iface(30, helpers[30])],
    upstream: '10.0.100.1',
    server: SERVER,
    pools: POOLS,
    reservations: RESERVATIONS,
  };
}

export type ScenarioId = 'working' | 'no-relay' | 'vlan10-only' | 'no-pool';

export interface Scenario {
  readonly id: ScenarioId;
  readonly network: Network;
  readonly clientVlan: number;
}

export const SCENARIOS: readonly Scenario[] = [
  { id: 'working', network: network({ 10: true, 20: true, 30: true }), clientVlan: 20 },
  { id: 'no-relay', network: network({ 10: false, 20: false, 30: false }), clientVlan: 20 },
  { id: 'vlan10-only', network: network({ 10: true, 20: false, 30: false }), clientVlan: 20 },
  { id: 'no-pool', network: network({ 10: true, 20: true, 30: true }), clientVlan: 30 },
];

export function scenario(id: ScenarioId): Scenario {
  return SCENARIOS.find((entry) => entry.id === id)!;
}
