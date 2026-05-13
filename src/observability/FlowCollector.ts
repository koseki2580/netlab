import type { NetflowRecord, SflowSample } from '../types/observability';

export interface FlowCollectorOptions {
  readonly maxRecords?: number;
}

export type FlowEvent =
  | { readonly kind: 'netflow'; readonly record: NetflowRecord }
  | { readonly kind: 'sflow'; readonly sample: SflowSample };

export type FlowSubscriber = (event: FlowEvent) => void;

export interface FlowCollectorFilter {
  readonly deviceId?: string;
  readonly since?: number;
  readonly limit?: number;
  readonly kind?: FlowEvent['kind'];
}

const DEFAULT_MAX_RECORDS = 1000;

function eventDeviceId(event: FlowEvent): string {
  return event.kind === 'netflow' ? event.record.samplerRouterId : event.sample.samplerSwitchId;
}

function eventStep(event: FlowEvent): number {
  return event.kind === 'netflow' ? event.record.lastStep : event.sample.step;
}

export class FlowCollector {
  private readonly maxRecords: number;
  private readonly events: FlowEvent[] = [];
  private readonly listeners = new Set<FlowSubscriber>();

  constructor(options: FlowCollectorOptions = {}) {
    this.maxRecords = Math.max(1, Math.floor(options.maxRecords ?? DEFAULT_MAX_RECORDS));
  }

  add(event: FlowEvent): void {
    if (this.events.length >= this.maxRecords) {
      this.events.shift();
    }
    this.events.push(event);
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  list(filter: FlowCollectorFilter = {}): readonly FlowEvent[] {
    const result = this.events
      .filter((event) => filter.kind === undefined || event.kind === filter.kind)
      .filter((event) => filter.deviceId === undefined || eventDeviceId(event) === filter.deviceId)
      .filter((event) => filter.since === undefined || eventStep(event) >= filter.since)
      .slice()
      .reverse();
    return filter.limit === undefined ? result : result.slice(0, filter.limit);
  }

  clear(): void {
    this.events.length = 0;
  }

  subscribe(listener: FlowSubscriber): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  isFull(): boolean {
    return this.events.length >= this.maxRecords;
  }

  size(): number {
    return this.events.length;
  }

  subscribers(): number {
    return this.listeners.size;
  }
}
