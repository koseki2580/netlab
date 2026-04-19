import { NetlabError } from '../errors';
import type { HookFn, HookMap, HookPoint } from '../types/hooks';

type HookContextOf<K extends HookPoint> = Parameters<HookMap[K]>[0];

function compose<T>(fns: HookFn<T>[]): (ctx: T) => Promise<void> {
  return async (ctx: T) => {
    let index = -1;
    async function dispatch(i: number): Promise<void> {
      if (i <= index)
        throw new NetlabError({
          code: 'invariant/next-called-twice',
          message: '[netlab] next() called multiple times',
        });
      index = i;
      const fn = fns[i];
      if (!fn) return;
      await fn(ctx, () => dispatch(i + 1));
    }
    await dispatch(0);
  };
}

export class HookEngine {
  private registry = new Map<HookPoint, HookFn<unknown>[]>();

  /**
   * Register a handler for a hook point.
   * Returns an unsubscribe function.
   */
  on<K extends HookPoint>(point: K, fn: HookMap[K]): () => void {
    const list = this.registry.get(point) ?? [];
    const wrapped = fn as HookFn<unknown>;
    list.push(wrapped);
    this.registry.set(point, list);

    return () => {
      const current = this.registry.get(point);
      if (!current) return;
      const idx = current.indexOf(wrapped);
      if (idx !== -1) current.splice(idx, 1);
    };
  }

  /**
   * Execute all handlers for a hook point in registration order.
   */
  async emit<K extends HookPoint>(point: K, ctx: HookContextOf<K>): Promise<void> {
    const fns = (this.registry.get(point) ?? []) as HookFn<HookContextOf<K>>[];
    await compose(fns)(ctx);
  }
}

// Shared instance for use outside React (e.g., fetch interceptor)
export const hookEngine = new HookEngine();
