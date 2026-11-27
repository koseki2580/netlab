import type { Challenge } from '../components/LessonChallenges';
import { lanPrefix, subnetCount } from './ipv6Addressing';

/** REQ-449 — the IPv6 addressing lesson's challenges, checked by its model. */

export interface Ipv6AddressingChallengeState {
  /** The delegated prefix chosen, e.g. `2001:db8:1234:5600::/56`. */
  readonly delegated: string;
  /** The LAN shown (1-based, within what the delegation holds). */
  readonly lan: number;
}

const TARGET = '2001:db8:1234:5610::/64';
const NEEDED_LANS = 12;

/** The prefix lengths the lesson offers, shortest (largest delegation) first. */
const OFFERED = [48, 56, 60] as const;

export function ipv6AddressingChallenges(state: Ipv6AddressingChallengeState): Challenge[] {
  const { delegated, lan } = state;
  const length = Number(delegated.split('/')[1]);
  const prefix = lanPrefix(delegated, lan);
  const subnetBits = 64 - length;
  const subnetId = lan - 1;
  const subnetHex = subnetId.toString(16);
  const count = subnetCount(length, 64);
  // The longest offered prefix (the smallest delegation) that still has room for the LANs.
  const smallest = [...OFFERED].reverse().find((len) => subnetCount(len, 64) >= NEEDED_LANS)!;

  return [
    {
      id: 'subnet-10',
      goal: {
        en: `Give a LAN the prefix ${TARGET}.`,
        ja: `ある LAN に ${TARGET} が割り当てられるようにしてください。`,
      },
      hint: {
        en: 'The subnet ID is written in hex, and LAN 1 has subnet ID 0.',
        ja: 'サブネット ID は 16 進で書かれ、LAN 1 のサブネット ID は 0 です。',
      },
      reached: prefix === TARGET,
      why: {
        en: `LAN ${lan} has subnet ID ${lan} − 1 = ${subnetId}, which is ${subnetHex} in hex; it fills the ${subnetBits} subnet bits after the /${length}, giving ${prefix}. Reading “10” as decimal would point at LAN 11 instead.`,
        ja: `LAN ${lan} のサブネット ID は ${lan} − 1 = ${subnetId} で、16 進では ${subnetHex} です。これが /${length} の後ろの ${subnetBits} ビットに入り、${prefix} になります。「10」を 10 進と読むと LAN 11 になってしまいます。`,
      },
    },
    {
      id: 'smallest-for-12',
      goal: {
        en: `A home has ${NEEDED_LANS} LANs. Choose the smallest delegation offered that still fits them all, and show LAN ${NEEDED_LANS}’s prefix.`,
        ja: `家庭に LAN が ${NEEDED_LANS} 個あります。全部が入る範囲でいちばん小さい委任を選び、LAN ${NEEDED_LANS} のプレフィックスを表示してください。`,
      },
      hint: {
        en: 'Every bit between the delegated length and /64 doubles the number of LANs. How many bits does 12 need?',
        ja: '委任の長さから /64 までの 1 ビットごとに、LAN の数は 2 倍になります。12 個には何ビット要るでしょう。',
      },
      reached: length === smallest && lan === NEEDED_LANS,
      why: {
        en: `A /${length} leaves ${subnetBits} subnet bits, room for ${count} LANs, enough for ${NEEDED_LANS}; one bit fewer (a /${length + 1}) would hold only ${subnetCount(length + 1, 64)}. LAN ${lan} is subnet ID ${subnetId}, ${subnetHex} in hex: ${prefix}.`,
        ja: `/${length} ならサブネット ID は ${subnetBits} ビットで、LAN は ${count} 個まで入り、${NEEDED_LANS} 個に足ります。1 ビット少ない /${length + 1} では ${subnetCount(length + 1, 64)} 個しか入りません。LAN ${lan} はサブネット ID ${subnetId}、16 進で ${subnetHex} なので、${prefix} です。`,
      },
    },
  ];
}
