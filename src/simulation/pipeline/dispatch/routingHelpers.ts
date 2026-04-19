import { IGMP_PROTOCOL } from '../../../types/multicast';
import type { IpPacket, TcpSegment, UdpDatagram } from '../../../types/packets';
import type { RouteEntry } from '../../../types/routing';
import type { RoutingCandidate, RoutingDecision } from '../../../types/simulation';
import { isInSubnet, prefixLength } from '../../../utils/cidr';
import { getRequired } from '../../../utils/typedAccess';

export function bestRoute(dstIp: string, routes: RouteEntry[]): RouteEntry | null {
  const sorted = [...routes].sort(
    (a, b) => prefixLength(b.destination) - prefixLength(a.destination),
  );
  return sorted.find((r) => isInSubnet(dstIp, r.destination)) ?? null;
}

function sameRoute(
  left: RouteEntry | null | undefined,
  right: RouteEntry | null | undefined,
): boolean {
  if (!left || !right) return false;
  return (
    left.destination === right.destination &&
    left.nextHop === right.nextHop &&
    left.protocol === right.protocol &&
    left.adminDistance === right.adminDistance &&
    left.metric === right.metric &&
    left.nodeId === right.nodeId
  );
}

export function buildRoutingDecision(
  dstIp: string,
  routes: RouteEntry[],
  selectedRoute?: RouteEntry | null,
): RoutingDecision {
  const selectionProvided = arguments.length >= 3;
  const sorted = [...routes].sort(
    (a, b) => prefixLength(b.destination) - prefixLength(a.destination),
  );
  const lpmWinner = sorted.find((route) => isInSubnet(dstIp, route.destination)) ?? null;
  const candidates: RoutingCandidate[] = sorted.map((r) => {
    const matched = isInSubnet(dstIp, r.destination);
    return {
      destination: r.destination,
      nextHop: r.nextHop,
      metric: r.metric,
      protocol: r.protocol,
      adminDistance: r.adminDistance,
      matched,
      selectedByLpm: false,
    };
  });

  if (lpmWinner) {
    const idx = candidates.findIndex(
      (c) =>
        c.destination === lpmWinner.destination &&
        c.nextHop === lpmWinner.nextHop &&
        c.protocol === lpmWinner.protocol &&
        c.adminDistance === lpmWinner.adminDistance &&
        c.metric === lpmWinner.metric,
    );
    if (idx >= 0) {
      getRequired(candidates, idx, {
        dstIp,
        reason: 'routing-lpm-candidate',
      }).selectedByLpm = true;
    }
  }

  const activeRoute = selectedRoute ?? null;
  const selectedCandidate = activeRoute
    ? (candidates.find(
        (candidate) =>
          candidate.destination === activeRoute.destination &&
          candidate.nextHop === activeRoute.nextHop &&
          candidate.protocol === activeRoute.protocol &&
          candidate.adminDistance === activeRoute.adminDistance &&
          candidate.metric === activeRoute.metric,
      ) ?? null)
    : null;

  if (selectedCandidate && lpmWinner && !sameRoute(activeRoute, lpmWinner)) {
    selectedCandidate.selectedByFailover = true;
  }

  const winner = selectionProvided
    ? selectedCandidate
    : (candidates.find((candidate) => candidate.selectedByLpm) ?? null);

  let explanation: string;
  if (selectedCandidate) {
    if (lpmWinner && !sameRoute(activeRoute, lpmWinner)) {
      explanation =
        `Fallback via ${selectedCandidate.destination} (${selectedCandidate.nextHop})` +
        ` — primary route ${lpmWinner.destination} (${lpmWinner.nextHop}) unreachable`;
    } else {
      explanation =
        `Matched ${selectedCandidate.destination} via ${selectedCandidate.nextHop}` +
        ` (${selectedCandidate.protocol}, AD=${selectedCandidate.adminDistance})`;
    }
  } else if (selectionProvided && candidates.some((candidate) => candidate.matched)) {
    explanation = `No reachable route for ${dstIp} — matching routes are unavailable`;
  } else {
    explanation = `No matching route for ${dstIp} — packet will be dropped`;
  }

  return { dstIp, candidates, winner, explanation };
}

export function protocolName(num: number): string {
  if (num === 1) return 'ICMP';
  if (num === IGMP_PROTOCOL) return 'IGMP';
  if (num === 6) return 'TCP';
  if (num === 17) return 'UDP';
  return String(num);
}

export function isPortBearingPayload(
  payload: IpPacket['payload'],
): payload is TcpSegment | UdpDatagram {
  return 'srcPort' in payload && 'dstPort' in payload;
}
