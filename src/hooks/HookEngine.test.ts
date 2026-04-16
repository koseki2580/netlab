import { describe, expect, it, vi } from 'vitest';
import { HookEngine } from './HookEngine';

function makeSwitchLearnContext() {
  return {
    nodeId: 'sw1',
    mac: '00:11:22:33:44:55',
    port: 'port-1',
  };
}

describe('HookEngine', () => {
  describe('on', () => {
    it('registers a handler and returns unsubscribe function', async () => {
      const engine = new HookEngine();
      const handler = vi.fn(async (_ctx, next) => {
        await next();
      });

      const unsubscribe = engine.on('switch:learn', handler);

      await engine.emit('switch:learn', makeSwitchLearnContext());

      expect(handler).toHaveBeenCalledOnce();
      expect(unsubscribe).toEqual(expect.any(Function));
    });

    it('unsubscribe removes the handler from subsequent emits', async () => {
      const engine = new HookEngine();
      const handler = vi.fn(async (_ctx, next) => {
        await next();
      });

      const unsubscribe = engine.on('switch:learn', handler);
      unsubscribe();

      await engine.emit('switch:learn', makeSwitchLearnContext());

      expect(handler).not.toHaveBeenCalled();
    });

    it('unsubscribe is idempotent (calling twice does not throw)', () => {
      const engine = new HookEngine();
      const unsubscribe = engine.on('switch:learn', async (_ctx, next) => {
        await next();
      });

      unsubscribe();

      expect(() => unsubscribe()).not.toThrow();
    });
  });

  describe('emit', () => {
    it('calls registered handler with context', async () => {
      const engine = new HookEngine();
      const handler = vi.fn(async (_ctx, next) => {
        await next();
      });
      const ctx = makeSwitchLearnContext();

      engine.on('switch:learn', handler);
      await engine.emit('switch:learn', ctx);

      expect(handler).toHaveBeenCalledWith(ctx, expect.any(Function));
    });

    it('calls multiple handlers in registration order', async () => {
      const engine = new HookEngine();
      const order: string[] = [];

      engine.on('switch:learn', async (_ctx, next) => {
        order.push('first');
        await next();
      });
      engine.on('switch:learn', async (_ctx, next) => {
        order.push('second');
        await next();
      });
      engine.on('switch:learn', async (_ctx, next) => {
        order.push('third');
        await next();
      });

      await engine.emit('switch:learn', makeSwitchLearnContext());

      expect(order).toEqual(['first', 'second', 'third']);
    });

    it('handler receives context and can call next()', async () => {
      const engine = new HookEngine();
      const visited: string[] = [];

      engine.on('switch:learn', async (ctx, next) => {
        visited.push(ctx.nodeId);
        await next();
      });
      engine.on('switch:learn', async (ctx, next) => {
        visited.push(ctx.port);
        await next();
      });

      await engine.emit('switch:learn', makeSwitchLearnContext());

      expect(visited).toEqual(['sw1', 'port-1']);
    });

    it('handler that does not call next() stops the chain', async () => {
      const engine = new HookEngine();
      const second = vi.fn(async (_ctx, next) => {
        await next();
      });

      engine.on('switch:learn', async () => {});
      engine.on('switch:learn', second);

      await engine.emit('switch:learn', makeSwitchLearnContext());

      expect(second).not.toHaveBeenCalled();
    });

    it('resolves immediately when no handlers registered', async () => {
      const engine = new HookEngine();

      await expect(
        engine.emit('switch:learn', makeSwitchLearnContext()),
      ).resolves.toBeUndefined();
    });

    it('propagates async handler results', async () => {
      const engine = new HookEngine();
      const order: string[] = [];

      engine.on('switch:learn', async (_ctx, next) => {
        order.push('before');
        await Promise.resolve();
        await next();
        order.push('after');
      });
      engine.on('switch:learn', async (_ctx, next) => {
        order.push('inner');
        await next();
      });

      await engine.emit('switch:learn', makeSwitchLearnContext());

      expect(order).toEqual(['before', 'inner', 'after']);
    });
  });

  describe('compose', () => {
    it('throws error when next() is called multiple times', async () => {
      const engine = new HookEngine();

      engine.on('switch:learn', async (_ctx, next) => {
        await next();
        await next();
      });

      await expect(
        engine.emit('switch:learn', makeSwitchLearnContext()),
      ).rejects.toThrow('[netlab] next() called multiple times');
    });

    it('handlers can mutate context object', async () => {
      const engine = new HookEngine();
      const seenNodeIds: string[] = [];

      engine.on('switch:learn', async (ctx, next) => {
        ctx.nodeId = 'sw2';
        await next();
      });
      engine.on('switch:learn', async (ctx, next) => {
        seenNodeIds.push(ctx.nodeId);
        await next();
      });

      await engine.emit('switch:learn', makeSwitchLearnContext());

      expect(seenNodeIds).toEqual(['sw2']);
    });
  });

  describe('isolation', () => {
    it('different hook points do not interfere with each other', async () => {
      const engine = new HookEngine();
      const switchHandler = vi.fn(async (_ctx, next) => {
        await next();
      });
      const routerHandler = vi.fn(async (_ctx, next) => {
        await next();
      });

      engine.on('switch:learn', switchHandler);
      engine.on('router:lookup', routerHandler);

      await engine.emit('switch:learn', makeSwitchLearnContext());

      expect(switchHandler).toHaveBeenCalledOnce();
      expect(routerHandler).not.toHaveBeenCalled();
    });
  });
});
