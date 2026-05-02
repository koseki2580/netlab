import type { Edit } from '../sandbox/edits';
import type { SandboxEditProposal } from './sandbox-mode';

export interface ProposalHandlers {
  readonly accept: (edit: Edit) => void;
  readonly reject: (edit: Edit, reason?: string) => void;
  readonly timeout?: (edit: Edit) => void;
}

export interface ProposesBridgeOptions {
  readonly timeoutMs: number;
  readonly onPendingChange?: (count: number) => void;
}

type Timer = ReturnType<typeof setTimeout>;

export class ProposesBridge {
  private readonly timeoutMs: number;
  private readonly onPendingChange: ((count: number) => void) | undefined;
  private pending = new Set<() => void>();

  constructor({ timeoutMs, onPendingChange }: ProposesBridgeOptions) {
    this.timeoutMs = timeoutMs;
    this.onPendingChange = onPendingChange;
  }

  get pendingCount(): number {
    return this.pending.size;
  }

  propose(edit: Edit, handlers: ProposalHandlers): SandboxEditProposal {
    let settled = false;
    let timer: Timer | null = null;

    const clear = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      this.pending.delete(clear);
      this.onPendingChange?.(this.pending.size);
    };

    const settle = (kind: 'accept' | 'reject' | 'timeout', reason?: string) => {
      if (settled) return;
      settled = true;
      clear();

      if (kind === 'accept') {
        handlers.accept(edit);
        return;
      }

      if (kind === 'timeout') {
        handlers.timeout?.(edit);
        handlers.reject(edit, 'timeout');
        return;
      }

      handlers.reject(edit, reason);
    };

    this.pending.add(clear);
    this.onPendingChange?.(this.pending.size);
    timer = setTimeout(() => settle('timeout'), this.timeoutMs);

    return {
      edit,
      accept: () => settle('accept'),
      reject: (reason?: string) => settle('reject', reason),
    };
  }

  clear(): void {
    for (const clear of Array.from(this.pending)) {
      clear();
    }
  }
}
