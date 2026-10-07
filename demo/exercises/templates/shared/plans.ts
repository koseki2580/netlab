/**
 * Address plans. Every network here is a /24 written as its first three
 * numbers, so a beginner can be told "addresses here start with 192.168.1.".
 */

import type { Draw } from './draw';

export interface Net24 {
  /** `192.168.1.0/24`. */
  readonly cidr: string;
  /** `192.168.1.` — what every address on it starts with. */
  readonly starts: string;
  readonly at: (last: number) => string;
}

export function net24(firstThree: string): Net24 {
  return {
    cidr: `${firstThree}.0/24`,
    starts: `${firstThree}.`,
    at: (last) => `${firstThree}.${last}`,
  };
}

/** Networks for the side people sit on. */
const NEAR = ['192.168.1', '192.168.10', '192.168.30', '10.0.5', '10.10.1', '172.16.3'] as const;
/** Networks for the far side (servers, another site). */
const FAR = ['10.20.0', '172.16.50', '192.168.200', '10.99.1', '172.20.8'] as const;
/** More far networks, for exercises with several sites. */
const FAR_2 = ['10.30.0', '172.16.60', '192.168.210', '10.88.1', '172.22.4'] as const;
const FAR_3 = ['10.40.0', '172.16.70', '192.168.220', '10.77.1', '172.24.6'] as const;
/** Networks used by nobody: the "wrong" address of a fault comes from here. */
const STRANGER = ['192.168.7', '10.1.99', '172.18.4', '192.168.150'] as const;
/** Links between routers (/30: two addresses, .1 and .2). */
const LINKS = ['10.255.0', '172.31.1', '192.168.255'] as const;

export interface LinkNet {
  /** `10.255.0.0/30`. */
  readonly cidr: string;
  readonly a: string;
  readonly b: string;
}

/** The `index`-th /30 of a link block: .0/30, .4/30, .8/30. */
function link30(firstThree: string, index: number): LinkNet {
  const base = index * 4;
  return {
    cidr: `${firstThree}.${base}/30`,
    a: `${firstThree}.${base + 1}`,
    b: `${firstThree}.${base + 2}`,
  };
}

export interface AddressPlan {
  readonly near: Net24;
  readonly far: Net24;
  readonly far2: Net24;
  readonly far3: Net24;
  /** A network that exists nowhere in the exercise. */
  readonly stranger: Net24;
  /** The last number of the router on each network: 1 or 254. */
  readonly gateway: number;
  /** The last numbers of the devices people use, and of the servers. */
  readonly pcs: readonly [number, number, number];
  readonly servers: readonly [number, number, number];
  /** A last number nothing uses. */
  readonly free: number;
  readonly links: readonly [LinkNet, LinkNet, LinkNet];
}

const PC_NUMBERS = [
  [10, 11, 12],
  [21, 22, 23],
  [101, 102, 103],
  [31, 32, 33],
] as const;
const SERVER_NUMBERS = [
  [10, 20, 30],
  [5, 6, 7],
  [100, 110, 120],
] as const;

export function drawPlan(draw: Draw): AddressPlan {
  const farIndex = draw.int(FAR.length);
  const linkBlock = draw.pick(LINKS);
  return {
    near: net24(draw.pick(NEAR)),
    far: net24(FAR[farIndex] ?? FAR[0]),
    far2: net24(FAR_2[farIndex] ?? FAR_2[0]),
    far3: net24(FAR_3[farIndex] ?? FAR_3[0]),
    stranger: net24(draw.pick(STRANGER)),
    gateway: draw.pick([1, 254]),
    pcs: draw.pick(PC_NUMBERS),
    servers: draw.pick(SERVER_NUMBERS),
    free: draw.pick([50, 60, 77, 88]),
    links: [link30(linkBlock, 0), link30(linkBlock, 1), link30(linkBlock, 2)],
  };
}
