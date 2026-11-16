/**
 * VLSM practice (REQ-366): a block of addresses and departments that need so
 * many hosts each; the learner gives each department a subnet. Any answer
 * that follows the rules passes — the largest-first plan is shown as one.
 */
import { intToIp, ipToInt } from '../../src/utils/cidr';

export interface Department {
  readonly name: { readonly en: string; readonly ja: string };
  readonly hosts: number;
}

export interface VlsmProblem {
  /** The block to carve, e.g. 192.168.10.0/24. */
  readonly block: { readonly network: string; readonly prefix: number };
  readonly departments: readonly Department[];
}

/** One department's subnet, as the learner typed it. */
export interface Allocation {
  readonly network: string;
  readonly prefix: number;
}

export type RowProblem =
  | 'unreadable'
  | 'too-small'
  | 'wasteful'
  | 'outside-block'
  | 'not-a-network'
  | 'overlaps';

export interface RowResult {
  readonly ok: boolean;
  readonly problems: readonly RowProblem[];
  /** With `overlaps`: the departments it overlaps, by index. */
  readonly overlapsWith: readonly number[];
}

/** Usable host addresses in a subnet of this prefix (network and broadcast excluded). */
export const usableHosts = (prefix: number) => (prefix >= 31 ? 0 : 2 ** (32 - prefix) - 2);

/** The longest prefix (the smallest subnet) that still holds `hosts` hosts. */
export function smallestPrefixFor(hosts: number): number {
  for (let prefix = 30; prefix >= 1; prefix -= 1) if (usableHosts(prefix) >= hosts) return prefix;
  return 0;
}

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const readable = (ip: string) =>
  IPV4.test(ip) && ip.split('.').every((part) => Number(part) <= 255);
const size = (prefix: number) => 2 ** (32 - prefix);
const start = (allocation: Allocation) => ipToInt(allocation.network) >>> 0;
const end = (allocation: Allocation) => start(allocation) + size(allocation.prefix) - 1;

/** Check every department's subnet against the five rules. */
export function checkPlan(problem: VlsmProblem, plan: readonly (Allocation | null)[]): RowResult[] {
  const blockStart = ipToInt(problem.block.network) >>> 0;
  const blockEnd = blockStart + size(problem.block.prefix) - 1;
  return problem.departments.map((department, index) => {
    const allocation = plan[index];
    if (
      !allocation ||
      !readable(allocation.network) ||
      !(allocation.prefix >= 1 && allocation.prefix <= 30)
    ) {
      return { ok: false, problems: ['unreadable'], overlapsWith: [] };
    }
    const problems: RowProblem[] = [];
    if (usableHosts(allocation.prefix) < department.hosts) problems.push('too-small');
    else if (allocation.prefix < smallestPrefixFor(department.hosts)) problems.push('wasteful');
    if (start(allocation) % size(allocation.prefix) !== 0) problems.push('not-a-network');
    if (start(allocation) < blockStart || end(allocation) > blockEnd)
      problems.push('outside-block');
    const overlapsWith = plan.flatMap((other, otherIndex) =>
      otherIndex !== index &&
      other &&
      readable(other.network) &&
      other.prefix >= 1 &&
      other.prefix <= 30 &&
      start(other) <= end(allocation) &&
      start(allocation) <= end(other)
        ? [otherIndex]
        : [],
    );
    if (overlapsWith.length > 0) problems.push('overlaps');
    return { ok: problems.length === 0, problems, overlapsWith };
  });
}

/** One plan that follows the rules: largest department first, each packed after the last. */
export function largestFirstPlan(problem: VlsmProblem): Allocation[] {
  const order = problem.departments
    .map((department, index) => ({ index, prefix: smallestPrefixFor(department.hosts) }))
    .sort((a, b) => a.prefix - b.prefix || a.index - b.index);
  const plan: Allocation[] = new Array(problem.departments.length);
  let next = ipToInt(problem.block.network) >>> 0;
  for (const { index, prefix } of order) {
    plan[index] = { network: intToIp(next), prefix };
    next += size(prefix);
  }
  return plan;
}

const NAMES: readonly Department['name'][] = [
  { en: 'Sales', ja: '営業' },
  { en: 'Development', ja: '開発' },
  { en: 'Office', ja: '事務' },
  { en: 'Guests', ja: '来客用' },
  { en: 'Servers', ja: 'サーバ' },
];

/** A small seeded random generator, so a problem can be shown again. */
function random(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

/**
 * A problem that a largest-first plan solves: a /24 of 192.168.N.0 and three to
 * five departments, plus a point-to-point link of 2 hosts.
 */
export function generateVlsm(seed: number): VlsmProblem {
  const next = random(seed);
  const choices = [100, 60, 50, 30, 25, 20, 12, 10, 6, 5];
  for (;;) {
    const count = 3 + Math.floor(next() * 3);
    const picked = [...choices]
      .sort(() => next() - 0.5)
      .slice(0, count)
      .sort((a, b) => b - a);
    const departments: Department[] = picked.map((hosts, index) => ({
      name: NAMES[index]!,
      hosts,
    }));
    departments.push({ name: { en: 'Router link', ja: 'ルータ間リンク' }, hosts: 2 });
    const used = departments.reduce(
      (sum, department) => sum + size(smallestPrefixFor(department.hosts)),
      0,
    );
    if (used <= 256) {
      return {
        block: { network: `192.168.${10 + Math.floor(next() * 90)}.0`, prefix: 24 },
        departments,
      };
    }
  }
}
