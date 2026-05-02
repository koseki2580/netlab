import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProposesBridge } from './ProposesBridge';
import type { Edit } from '../sandbox/edits';

const edit: Edit = { kind: 'noop' };

describe('ProposesBridge', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('accepts a proposal once', () => {
    const accept = vi.fn();
    const reject = vi.fn();
    const bridge = new ProposesBridge({ timeoutMs: 5000 });

    const proposal = bridge.propose(edit, { accept, reject });
    proposal.accept();
    proposal.accept();

    expect(accept).toHaveBeenCalledOnce();
    expect(accept).toHaveBeenCalledWith(edit);
    expect(reject).not.toHaveBeenCalled();
    expect(bridge.pendingCount).toBe(0);
  });

  it('rejects a proposal once with a reason', () => {
    const accept = vi.fn();
    const reject = vi.fn();
    const bridge = new ProposesBridge({ timeoutMs: 5000 });

    const proposal = bridge.propose(edit, { accept, reject });
    proposal.reject('policy');
    proposal.reject('late');

    expect(reject).toHaveBeenCalledOnce();
    expect(reject).toHaveBeenCalledWith(edit, 'policy');
    expect(accept).not.toHaveBeenCalled();
    expect(bridge.pendingCount).toBe(0);
  });

  it('ignores reject after accept', () => {
    const accept = vi.fn();
    const reject = vi.fn();
    const bridge = new ProposesBridge({ timeoutMs: 5000 });

    const proposal = bridge.propose(edit, { accept, reject });
    proposal.accept();
    proposal.reject('late');

    expect(accept).toHaveBeenCalledOnce();
    expect(reject).not.toHaveBeenCalled();
  });

  it('auto-rejects when the timeout elapses', () => {
    const accept = vi.fn();
    const reject = vi.fn();
    const timeout = vi.fn();
    const bridge = new ProposesBridge({ timeoutMs: 5000 });

    bridge.propose(edit, { accept, reject, timeout });
    vi.advanceTimersByTime(5000);

    expect(timeout).toHaveBeenCalledWith(edit);
    expect(reject).toHaveBeenCalledWith(edit, 'timeout');
    expect(accept).not.toHaveBeenCalled();
    expect(bridge.pendingCount).toBe(0);
  });

  it('clears the timeout when accepted', () => {
    const accept = vi.fn();
    const reject = vi.fn();
    const timeout = vi.fn();
    const bridge = new ProposesBridge({ timeoutMs: 5000 });

    const proposal = bridge.propose(edit, { accept, reject, timeout });
    proposal.accept();
    vi.advanceTimersByTime(5000);

    expect(timeout).not.toHaveBeenCalled();
    expect(reject).not.toHaveBeenCalled();
  });

  it('tracks multiple pending proposals', () => {
    const bridge = new ProposesBridge({ timeoutMs: 5000 });
    const first = bridge.propose(edit, { accept: vi.fn(), reject: vi.fn() });
    const second = bridge.propose(edit, { accept: vi.fn(), reject: vi.fn() });

    expect(bridge.pendingCount).toBe(2);

    first.accept();
    expect(bridge.pendingCount).toBe(1);

    second.reject();
    expect(bridge.pendingCount).toBe(0);
  });

  it('notifies pending count changes', () => {
    const onPendingChange = vi.fn();
    const bridge = new ProposesBridge({ timeoutMs: 5000, onPendingChange });

    const proposal = bridge.propose(edit, { accept: vi.fn(), reject: vi.fn() });
    proposal.accept();

    expect(onPendingChange).toHaveBeenNthCalledWith(1, 1);
    expect(onPendingChange).toHaveBeenNthCalledWith(2, 0);
  });

  it('clears all pending proposals without invoking handlers', () => {
    const accept = vi.fn();
    const reject = vi.fn();
    const timeout = vi.fn();
    const bridge = new ProposesBridge({ timeoutMs: 5000 });

    bridge.propose(edit, { accept, reject, timeout });
    bridge.clear();
    vi.advanceTimersByTime(5000);

    expect(accept).not.toHaveBeenCalled();
    expect(reject).not.toHaveBeenCalled();
    expect(timeout).not.toHaveBeenCalled();
    expect(bridge.pendingCount).toBe(0);
  });
});
