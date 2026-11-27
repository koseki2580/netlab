import type { Challenge } from '../components/LessonChallenges';
import { innerSizes, type OuterFamily } from './mobileCore';

/** REQ-449 — the 5G mobile-core lesson's challenges, checked by its model. */

export interface MobileCoreChallengeState {
  readonly outer: OuterFamily;
  /** Whether the PDU Session Container is carried. */
  readonly container: boolean;
  readonly transportMtu: number;
}

const UE_MTU = 1500;
/** The slider's step: the transport MTU moves 4 bytes at a time. */
const STEP = 4;

export function mobileCoreChallenges(state: MobileCoreChallengeState): Challenge[] {
  const { outer, container, transportMtu } = state;
  const now = innerSizes(transportMtu, outer, container);
  const below = innerSizes(transportMtu - STEP, outer, container);
  const v4 = innerSizes(transportMtu, 'ipv4', true);
  // The inner MTU the lesson starts from: a 1500-byte IPv4 transport with the container.
  const lessonMtu = innerSizes(1500, 'ipv4', true).innerMtu;
  const v4Overhead = innerSizes(0, 'ipv4', true).overhead.total;
  const family = outer === 'ipv4' ? 'IPv4' : 'IPv6';

  return [
    {
      id: 'ue-keeps-1500',
      goal: {
        en: `Keep the PDU Session Container on, and find the smallest transport MTU on which the UE can still send ${UE_MTU}-byte packets.`,
        ja: `PDU Session Container は付けたまま、UE が ${UE_MTU} バイトのパケットを送れる、いちばん小さいトランスポートの MTU を見つけてください。`,
      },
      hint: {
        en: 'The transport must carry the UE’s packet plus every tunnel header. Which outer IP costs less?',
        ja: 'トランスポートは、UE のパケットにトンネルのヘッダを全部足した大きさを運ぶ必要があります。外側の IP はどちらが小さいでしょう。',
      },
      reached: container && outer === 'ipv4' && now.innerMtu >= UE_MTU && below.innerMtu < UE_MTU,
      why: {
        en: `${transportMtu} − ${now.overhead.total} bytes of tunnel (${family} ${now.overhead.outerIp}, UDP ${now.overhead.udp}, GTP-U ${now.overhead.gtpMandatory + now.overhead.gtpOptional}, container ${now.overhead.pduSessionContainer}) = ${now.innerMtu}. With an outer IPv6 header, 20 bytes larger, it would take ${UE_MTU + innerSizes(0, 'ipv6', true).overhead.total}.`,
        ja: `${transportMtu} からトンネルの ${now.overhead.total} バイト（${family} ${now.overhead.outerIp}、UDP ${now.overhead.udp}、GTP-U ${now.overhead.gtpMandatory + now.overhead.gtpOptional}、コンテナ ${now.overhead.pduSessionContainer}）を引くと ${now.innerMtu} です。外側を 20 バイト大きい IPv6 にすると、${UE_MTU + innerSizes(0, 'ipv6', true).overhead.total} が必要になります。`,
      },
    },
    {
      id: 'ipv6-same-mtu',
      goal: {
        en: `Move the transport to IPv6 with the container on, and give the UE the same inner MTU as before, ${lessonMtu}, by changing the transport MTU.`,
        ja: `トランスポートを IPv6 にし、コンテナを付けたまま、トランスポートの MTU を変えて UE の内側の MTU を元の ${lessonMtu} にしてください。`,
      },
      hint: {
        en: 'Only the outer header changed. How much larger is an IPv6 header than an IPv4 one?',
        ja: '変わったのは外側のヘッダだけです。IPv6 のヘッダは IPv4 より何バイト大きいでしょう。',
      },
      reached: container && outer === 'ipv6' && now.innerMtu === lessonMtu,
      why: {
        en: `The outer IPv6 header is ${now.overhead.outerIp} bytes instead of ${v4.overhead.outerIp}, so the tunnel costs ${now.overhead.total} instead of ${v4Overhead}: ${transportMtu} − ${now.overhead.total} = ${now.innerMtu}, and the TCP MSS is again ${now.tcpMss}. The transport has to grow by exactly the extra ${now.overhead.total - v4Overhead} bytes.`,
        ja: `外側の IPv6 ヘッダは ${v4.overhead.outerIp} バイトではなく ${now.overhead.outerIp} バイトなので、トンネルは ${v4Overhead} ではなく ${now.overhead.total} バイトかかります。${transportMtu} − ${now.overhead.total} = ${now.innerMtu} で、TCP の MSS もまた ${now.tcpMss} です。トランスポートは、増えた ${now.overhead.total - v4Overhead} バイトちょうどだけ大きくする必要があります。`,
      },
    },
  ];
}
