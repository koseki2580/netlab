import type { NetlabErrorCode } from './codes';

const NETLAB_ERROR_BRAND = Symbol.for('netlab.NetlabError');

export interface NetlabErrorInit {
  code: NetlabErrorCode;
  message: string;
  context?: Record<string, unknown>;
  cause?: unknown;
}

export class NetlabError extends Error {
  readonly code: NetlabErrorCode;
  readonly context?: Record<string, unknown>;
  readonly cause?: unknown;
  readonly [NETLAB_ERROR_BRAND] = true;

  constructor(init: NetlabErrorInit) {
    super(init.message);
    this.name = 'NetlabError';
    this.code = init.code;
    if (init.context !== undefined) {
      this.context = init.context;
    }
    if (init.cause !== undefined) {
      this.cause = init.cause;
    }
    Object.setPrototypeOf(this, NetlabError.prototype);
  }

  static isInstance(value: unknown): value is NetlabError {
    return (
      typeof value === 'object' &&
      value !== null &&
      (value as Record<symbol, unknown>)[NETLAB_ERROR_BRAND] === true
    );
  }
}
