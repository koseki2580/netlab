import type { PacketHop } from '../../types/simulation';
import type { MarkerShape } from './Marker';

export interface HopMarkerMeta {
  shape: MarkerShape;
  color: string;
  /** i18n catalog key for the marker's short label. */
  labelKey: string;
}

/** Shape + color per hop event, so timeline markers read by shape, not color alone (M6). */
const HOP_EVENT_MARKERS: Readonly<Record<PacketHop['event'], HopMarkerMeta>> = {
  create: {
    shape: 'ring',
    color: 'var(--netlab-accent-cyan)',
    labelKey: 'simulation.marker.created',
  },
  forward: {
    shape: 'circle',
    color: 'var(--netlab-accent-green)',
    labelKey: 'simulation.marker.forwarded',
  },
  deliver: {
    shape: 'diamond',
    color: 'var(--netlab-accent-green)',
    labelKey: 'simulation.marker.delivered',
  },
  drop: {
    shape: 'triangle-down',
    color: 'var(--netlab-accent-red)',
    labelKey: 'simulation.marker.dropped',
  },
  'arp-request': {
    shape: 'triangle-up',
    color: 'var(--netlab-accent-yellow)',
    labelKey: 'simulation.marker.arpRequest',
  },
  'arp-reply': {
    shape: 'triangle-up',
    color: 'var(--netlab-accent-yellow)',
    labelKey: 'simulation.marker.arpReply',
  },
};

const FALLBACK_MARKER: HopMarkerMeta = {
  shape: 'circle',
  color: 'var(--netlab-text-muted)',
  labelKey: 'simulation.marker.event',
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
  { shape: 'triangle-up', color: 'var(--netlab-accent-yellow)', labelKey: 'simulation.marker.arp' },
];
