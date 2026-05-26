/* @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOAST_EMIT_EVENT, toast, ToastBus, type ToastEmitDetail } from './ToastBus';

beforeEach(() => {
  ToastBus._reset();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  ToastBus._reset();
});

describe('ToastBus auto-dismiss', () => {
  it('dismisses info/success after 4s', () => {
    toast.info('hi');
    toast.success('done');
    expect(ToastBus.list()).toHaveLength(2);
    vi.advanceTimersByTime(3999);
    expect(ToastBus.list()).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(ToastBus.list()).toHaveLength(0);
  });

  it('dismisses warn after 6s', () => {
    toast.warn('careful');
    vi.advanceTimersByTime(4000);
    expect(ToastBus.list()).toHaveLength(1);
    vi.advanceTimersByTime(2000);
    expect(ToastBus.list()).toHaveLength(0);
  });

  it('keeps error sticky', () => {
    toast.error('boom');
    vi.advanceTimersByTime(60_000);
    expect(ToastBus.list()).toHaveLength(1);
    expect(ToastBus.list()[0]?.sticky).toBe(true);
  });

  it('honors an explicit sticky override on info', () => {
    toast.info('stay', { sticky: true });
    vi.advanceTimersByTime(60_000);
    expect(ToastBus.list()).toHaveLength(1);
  });
});

describe('ToastBus dismiss', () => {
  it('dismiss(id) removes a specific toast', () => {
    const id = toast.info('one');
    toast.info('two');
    ToastBus.dismiss(id);
    expect(ToastBus.list().map((t) => t.message)).toEqual(['two']);
  });

  it('dismissTopNonSticky removes the latest non-sticky, leaving sticky ones', () => {
    toast.error('err'); // sticky
    toast.info('info'); // non-sticky, latest
    ToastBus.dismissTopNonSticky();
    expect(ToastBus.list().map((t) => t.message)).toEqual(['err']);
    // nothing left to dismiss but the sticky error → no-op
    ToastBus.dismissTopNonSticky();
    expect(ToastBus.list()).toHaveLength(1);
  });
});

describe('ToastBus events + subscription', () => {
  it('dispatches a netlab:toast-emit event with the message', () => {
    const seen: ToastEmitDetail[] = [];
    const handler = (e: Event) => seen.push((e as CustomEvent<ToastEmitDetail>).detail);
    window.addEventListener(TOAST_EMIT_EVENT, handler);
    toast.success('saved');
    window.removeEventListener(TOAST_EMIT_EVENT, handler);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ level: 'success', message: 'saved' });
  });

  it('notifies subscribers with the current entries and on unsubscribe stops', () => {
    const calls: number[] = [];
    const unsub = ToastBus.subscribe((entries) => calls.push(entries.length));
    expect(calls).toEqual([0]); // immediate replay
    toast.info('x');
    expect(calls).toEqual([0, 1]);
    unsub();
    toast.info('y');
    expect(calls).toEqual([0, 1]); // no further notifications
  });
});
