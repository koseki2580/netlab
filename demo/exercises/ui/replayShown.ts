/**
 * What the diagram shows and says when it replays a Check.
 *
 * The canvas draws a sentence where a packet was dropped, chosen by the
 * simulator's reason: 「ここで捨てられました：宛先への経路がありません」. In an
 * exercise the feedback beside it is the grader's, and the grader often knows
 * better (a cable is out; an address does not match), so the two disagreed.
 * Here the diagram says only that it stopped, which is always true, and leaves
 * the reason to the feedback.
 *
 * And the place: with its way out gone, a host addresses the frame to another
 * host's MAC, and the simulator reports the drop at that host. It has nothing
 * to do with the fault, so the replay ends where the frame was last on its own
 * way.
 */

import { en } from '../../../src/i18n/locales/en';
import { ja } from '../../../src/i18n/locales/ja';
import type { PacketHop, PacketTrace } from '../../../src/types/simulation';
import type { TopologySnapshot } from '../../../src/types/topology';

type Catalog = typeof en;

const STOPPED = { en: 'It stopped here', ja: 'ここで止まりました' } as const;

const OWN_WORDS = {
  en: {
    'simulation.linkState.down': 'unplugged cable',
    'simulation.linkState.downHint': 'This cable is unplugged. Nothing crosses it.',
    'simulation.packetStory.marker': 'Where it is now',
  },
  ja: {
    'simulation.linkState.down': 'ぬけているケーブル',
    'simulation.linkState.downHint': 'このケーブルはぬけていて、何も通りません。',
    'simulation.packetStory.marker': '送ったものの現在地',
  },
} as const;

const catalogs = new Map<'en' | 'ja', Catalog>();

/** The library's catalogue with the exercise page's own words for cables and for a replay that stops. */
export function diagramWords(locale: 'en' | 'ja'): Catalog {
  const cached = catalogs.get(locale);
  if (cached) return cached;
  const base: Catalog = locale === 'ja' ? ja : en;
  const drops = Object.fromEntries(
    Object.keys(base)
      .filter((key) => key.startsWith('simulation.packetStory.drop'))
      .map((key) => [key, STOPPED[locale]]),
  );
  const catalog = { ...base, ...drops, ...OWN_WORDS[locale] } as Catalog;
  catalogs.set(locale, catalog);
  return catalog;
}

/**
 * The trace as the diagram replays it. Unchanged, except when the first drop
 * is a `no-route` reported by a host that is not the sender: then the replay
 * ends at the device before it, which is marked as where it stopped.
 */
export function shownTrace(
  trace: PacketTrace,
  topology: Pick<TopologySnapshot, 'nodes'>,
): PacketTrace {
  const at = trace.hops.findIndex((hop) => hop.event === 'drop');
  const drop = trace.hops[at];
  const before = trace.hops[at - 1];
  if (!drop || !before || drop.reason !== 'no-route') return trace;
  const role = topology.nodes.find((node) => node.id === drop.nodeId)?.data.role;
  const bystander = role !== 'router' && role !== 'switch' && drop.nodeId !== trace.hops[0]?.nodeId;
  if (!bystander) return trace;
  const { activeEdgeId: _towardsBystander, ...rest } = before;
  const stopped: PacketHop = { ...rest, event: 'drop', reason: 'no-route' };
  return { ...trace, hops: [...trace.hops.slice(0, at - 1), stopped] };
}
