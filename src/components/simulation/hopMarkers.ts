import type { PacketHop } from '../../types/simulation';
import type { MarkerShape } from './Marker';

export interface HopMarkerMeta {
  shape: MarkerShape;
  color: string;
  label: string;
}

/** Shape + color per hop event, so timeline markers read by shape, not color alone (M6). */
const HOP_EVENT_MARKERS: Readonly<Record<PacketHop['event'], HopMarkerMeta>> = {
  create: { shape: 'ring', color: 'var(--netlab-accent-cyan)', label: 'created' },
  forward: { shape: 'circle', color: 'var(--netlab-accent-green)', label: 'forwarded' },
  deliver: { shape: 'diamond', color: 'var(--netlab-accent-green)', label: 'delivered' },
  drop: { shape: 'triangle-down', color: 'var(--netlab-accent-red)', label: 'dropped' },
  'arp-request': {
    shape: 'triangle-up',
    color: 'var(--netlab-accent-yellow)',
    label: 'ARP request',
  },
  'arp-reply': { shape: 'triangle-up', color: 'var(--netlab-accent-yellow)', label: 'ARP reply' },
};

const FALLBACK_MARKER: HopMarkerMeta = {
  shape: 'circle',
  color: 'var(--netlab-text-muted)',
  label: 'event',
};

export function hopEventMarker(event: PacketHop['event']): HopMarkerMeta {
  return HOP_EVENT_MARKERS[event] ?? FALLBACK_MARKER;
}

/** Distinct markers shown in the legend (ARP request/reply share one shape). */
export const LEGEND_MARKERS: readonly HopMarkerMeta[] = [
  HOP_EVENT_MARKERS.create,
  HOP_EVENT_MARKERS.forward,
  HOP_EVENT_MARKERS.deliver,
  HOP_EVENT_MARKERS.drop,
  { shape: 'triangle-up', color: 'var(--netlab-accent-yellow)', label: 'ARP' },
];
