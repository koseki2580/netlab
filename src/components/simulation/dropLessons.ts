import type { DpTab } from '../NodeDetailPanel/useNodeDetailDock';

/**
 * A reference link on a drop-event lesson (M2).
 *
 * `tab` routes the dropping node's detail panel to that tab; `href` opens an
 * external page (e.g. the relevant RFC) in a new tab. The dropping node is
 * supplied by the card from the hop, so lessons stay node-agnostic.
 */
export interface DropLessonRef {
  readonly label: string;
  readonly tab?: DpTab;
  readonly href?: string;
}

/** Plain-language explanation of why a packet was dropped (M2). */
export interface DropLesson {
  /** What triggered the drop. */
  readonly cause: { readonly kind: string; readonly text: string };
  /** What the device sent back, if anything. */
  readonly response: { readonly kind: string; readonly text: string; readonly meta?: string };
  /** Plain-language "why this happens". */
  readonly why: string;
  readonly refs: readonly DropLessonRef[];
}

/**
 * Lessons keyed by the simulation's drop `reason`. The forwarding pipeline already
 * emits these reasons on `PacketHop`, so a single lesson covers every scenario that
 * drops for the same reason. Reasons without a lesson simply show no card.
 */
export const DROP_LESSONS: Readonly<Record<string, DropLesson>> = {
  'ttl-exceeded': {
    cause: { kind: 'ttl', text: 'TTL reached 0 before the packet reached its destination' },
    response: {
      kind: 'icmp',
      text: 'ICMP Time Exceeded sent back to the source',
      meta: 'type 11 · code 0',
    },
    why: 'Every router decrements the TTL; when it hits zero the packet is discarded so it cannot loop forever. The router notifies the source, which is how traceroute maps the path hop by hop.',
    refs: [
      { label: "show this router's routes", tab: 'routes' },
      { label: 'RFC 792 — Time Exceeded', href: 'https://datatracker.ietf.org/doc/html/rfc792' },
    ],
  },
  'no-route': {
    cause: { kind: 'route', text: 'No matching route for the destination address' },
    response: {
      kind: 'icmp',
      text: 'ICMP Destination Unreachable (network unreachable)',
      meta: 'type 3 · code 0',
    },
    why: 'The router had no route — not even a default — covering the destination prefix, so it cannot decide where to forward and drops the packet, signalling the source.',
    refs: [
      { label: "inspect this router's routes", tab: 'routes' },
      {
        label: 'RFC 1812 §5.2.7.1',
        href: 'https://datatracker.ietf.org/doc/html/rfc1812#section-5.2.7.1',
      },
    ],
  },
  'acl-deny': {
    cause: { kind: 'acl', text: 'Denied by an inbound ACL rule on the ingress interface' },
    // The engine sends no ICMP for a deny: the card must not claim one (TC-1543).
    response: { kind: 'none', text: 'Nothing: dropped silently' },
    why: 'An access-control rule matched this packet and blocked it. This router drops it without a word to the source.',
    refs: [{ label: 'show the matching ACL', tab: 'acl' }],
  },
};

/** Reasons that are aliases of a canonical lesson key. */
const REASON_ALIASES: Readonly<Record<string, string>> = {
  'ttl-expired': 'ttl-exceeded',
};

/**
 * Resolve the lesson for a drop `reason`, normalizing known aliases.
 * Returns `undefined` for reasons without an authored lesson.
 */
export function getDropLesson(reason: string | undefined): DropLesson | undefined {
  if (!reason) return undefined;
  const key = REASON_ALIASES[reason] ?? reason;
  return DROP_LESSONS[key];
}
