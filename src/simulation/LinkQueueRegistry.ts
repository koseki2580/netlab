import type { LinkQosConfig } from '../types/link';
import { hasActiveLinkQos } from '../types/link';
import { LinkQueue } from './LinkQueue';

export class LinkQueueRegistry {
  private readonly queues = new Map<string, LinkQueue>();

  getOrCreate(edgeId: string, cfg: LinkQosConfig | null | undefined): LinkQueue | null {
    if (!hasActiveLinkQos(cfg)) return null;
    const existing = this.queues.get(edgeId);
    if (existing) return existing;
    const queue = new LinkQueue(cfg ?? {});
    this.queues.set(edgeId, queue);
    return queue;
  }

  clear(): void {
    this.queues.clear();
  }
}
