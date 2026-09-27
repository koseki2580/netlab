import { clusterNodeId } from '../../areas/areaLod';
import type { NetworkArea } from '../../types/areas';
import type { PacketHop, SimulationState } from '../../types/simulation';
import type { CanvasPacket, CanvasPacketSource } from './canvasEngine';

/**
 * What the canvas draws of a packet's journey: where the packet is, the way it
 * came, and what happened there in words.
 *
 * A learner who learns from the picture saw nothing move — only links turning
 * dashed — and the ARP question, the NAT rewrite and a drop lived in side
 * panels alone. This decides, from the simulation state, what the diagram
 * shows; the canvas only draws it. Kept free of React and the graph library so
 * the decisions can be tested on their own.
 */

/** Something that happened at a device, said in words rather than a code. */
export type HopBubbleKind = 'arpRequest' | 'arpReply' | 'nat' | 'drop';

export interface HopBubble {
  kind: HopBubbleKind;
  /** The device the bubble points at. */
  nodeId: string;
  /** Catalogue key for the sentence. */
  key: string;
  params: Record<string, string>;
}

export interface PacketStory {
  /** Identifies this showing, so the canvas replays the motion only when it changes. */
  id: string;
  /** Where the packet rests: the device of the hop being shown. */
  at: string;
  /**
   * The devices the marker travels through before resting at `at`, in order,
   * ending with `at`. One entry means it simply appears there.
   */
  route: string[];
  bubble: HopBubble | null;
}

/** Drop reasons, as the forwarding pipeline names them, to the words for them. */
const DROP_REASON_KEYS: Readonly<Record<string, string>> = {
  'no-route': 'simulation.packetStory.dropNoRoute',
  'ttl-exceeded': 'simulation.packetStory.dropTtl',
  'ttl-expired': 'simulation.packetStory.dropTtl',
  'node-down': 'simulation.packetStory.dropNodeDown',
  'link-failed': 'simulation.packetStory.dropLinkDown',
  'interface-down': 'simulation.packetStory.dropLinkDown',
  'acl-deny': 'simulation.packetStory.dropAcl',
  'acl-default-deny': 'simulation.packetStory.dropAcl',
  'acl-deny-explicit': 'simulation.packetStory.dropAcl',
  'queue-full': 'simulation.packetStory.dropQueueFull',
  'class-queue-full': 'simulation.packetStory.dropQueueFull',
  loss: 'simulation.packetStory.dropLoss',
};

const DROP_FALLBACK_KEY = 'simulation.packetStory.dropOther';

/** The sentence a hop earns on the diagram, or null when there is nothing to say. */
export function bubbleForHop(hop: PacketHop): HopBubble | null {
  const at = { nodeId: hop.nodeId };
  if (hop.event === 'drop') {
    return {
      kind: 'drop',
      ...at,
      key: DROP_REASON_KEYS[hop.reason ?? ''] ?? DROP_FALLBACK_KEY,
      params: {},
    };
  }
  const nat = hop.natTranslation;
  if (nat) {
    return nat.type === 'snat'
      ? {
          kind: 'nat',
          ...at,
          key: 'simulation.packetStory.natSource',
          params: { from: nat.preSrcIp, to: nat.postSrcIp },
        }
      : {
          kind: 'nat',
          ...at,
          key: 'simulation.packetStory.natDestination',
          params: { from: nat.preDstIp, to: nat.postDstIp },
        };
  }
  const arp = hop.arpFrame?.payload;
  if (hop.event === 'arp-request') {
    return {
      kind: 'arpRequest',
      ...at,
      key: 'simulation.packetStory.arpRequest',
      params: { ip: arp?.targetIp ?? hop.dstIp },
    };
  }
  if (hop.event === 'arp-reply') {
    return {
      kind: 'arpReply',
      ...at,
      key: 'simulation.packetStory.arpReply',
      params: { mac: arp?.senderMac ?? hop.srcMac ?? '' },
    };
  }
  return null;
}

/** An ARP exchange happens beside the packet's path, not along it. */
function isOnPath(hop: PacketHop): boolean {
  return hop.event !== 'arp-request' && hop.event !== 'arp-reply';
}

export type StoryState = Pick<
  SimulationState,
  'traces' | 'currentTraceId' | 'currentStep' | 'selectedHop'
>;

/**
 * What to draw for the current state.
 *
 * - A hop is being shown (stepped to, or picked in the timeline): the packet
 *   travels from the device it came from to that hop's device, and the hop's
 *   event is said there.
 * - A packet was sent and nobody has stepped yet — the beginner course, and
 *   lessons whose button sends at once: the packet travels the whole way and
 *   rests where it ended. What that journey is remembered for is said where it
 *   happened: a drop, else an address rewrite.
 */
export function packetStoryFrom(state: StoryState): PacketStory | null {
  const trace = state.traces.find((candidate) => candidate.packetId === state.currentTraceId);
  if (!trace || trace.hops.length === 0) return null;

  const hop =
    state.selectedHop ?? (state.currentStep >= 0 ? trace.hops[state.currentStep] : undefined);
  if (hop) {
    const from = hop.fromNodeId && hop.fromNodeId !== hop.nodeId ? hop.fromNodeId : null;
    return {
      id: `${trace.packetId}:${hop.step}`,
      at: hop.nodeId,
      route: from ? [from, hop.nodeId] : [hop.nodeId],
      bubble: bubbleForHop(hop),
    };
  }

  const route: string[] = [];
  for (const candidate of trace.hops.filter(isOnPath)) {
    if (route[route.length - 1] !== candidate.nodeId) route.push(candidate.nodeId);
  }
  const last = trace.hops[trace.hops.length - 1]!;
  if (route.length === 0) route.push(last.nodeId);
  const drop = last.event === 'drop' ? bubbleForHop(last) : null;
  const rewrite = trace.hops.find((candidate) => candidate.natTranslation);
  return {
    id: `${trace.packetId}:journey`,
    at: route[route.length - 1]!,
    route,
    bubble: drop ?? (rewrite ? bubbleForHop(rewrite) : null),
  };
}

/**
 * The story placed on what is on screen: a device folded into a collapsed area
 * is drawn as that area, and a packet whose devices are all off the drawing is
 * not drawn.
 */
export function canvasPacketFrom(
  source: CanvasPacketSource,
  drawnIds: ReadonlySet<string>,
): CanvasPacket | null {
  const story = packetStoryFrom(source.state);
  if (!story) return null;
  const drawnId = (id: string): string | null => {
    if (drawnIds.has(id)) return id;
    const area = source.areas.find((candidate: NetworkArea) => candidate.devices.includes(id));
    const cluster = area ? clusterNodeId(area.id) : null;
    return cluster && drawnIds.has(cluster) ? cluster : null;
  };
  const route: string[] = [];
  for (const id of story.route) {
    const shown = drawnId(id);
    if (shown && route[route.length - 1] !== shown) route.push(shown);
  }
  if (route.length === 0) return null;
  const bubbleAt = story.bubble ? drawnId(story.bubble.nodeId) : null;
  return {
    id: story.id,
    at: story.at,
    route,
    bubble: story.bubble && bubbleAt ? { ...story.bubble, nodeId: bubbleAt } : null,
    color: source.color,
    animate: source.animate,
  };
}
