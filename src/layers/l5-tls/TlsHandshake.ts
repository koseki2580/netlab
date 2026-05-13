import type { TlsConnectionContext } from '../../types/tls';
import type { TlsAlertDescription } from '../../types/tls';
import { appendTranscriptHash } from './TlsKeySchedule';

export type TlsEvent =
  | { readonly type: 'start'; readonly bytes?: Uint8Array }
  | {
      readonly type: 'recvServerHello';
      readonly selectedAlpn?: string;
      readonly bytes?: Uint8Array;
    }
  | { readonly type: 'recvCertificate'; readonly bytes?: Uint8Array }
  | { readonly type: 'recvCertificateVerify'; readonly bytes?: Uint8Array }
  | {
      readonly type: 'recvFinished';
      readonly who: 'client' | 'server';
      readonly bytes?: Uint8Array;
    }
  | { readonly type: 'recvAppData'; readonly bytes: Uint8Array }
  | { readonly type: 'recvAlert'; readonly description: TlsAlertDescription }
  | { readonly type: 'tickStep' };

export const INITIAL_TLS_CONTEXT: TlsConnectionContext = {
  state: 'init',
  transcriptHash: new Uint8Array(32),
  clientSeqNum: 0n,
  serverSeqNum: 0n,
};

function closeUnexpected(ctx: TlsConnectionContext): TlsConnectionContext {
  return { ...ctx, state: 'closed', alert: { level: 'fatal', description: 'unexpected_message' } };
}

function append(ctx: TlsConnectionContext, bytes: Uint8Array | undefined): Uint8Array {
  return bytes ? appendTranscriptHash(ctx.transcriptHash, bytes) : ctx.transcriptHash;
}

export function transitionTls(ctx: TlsConnectionContext, event: TlsEvent): TlsConnectionContext {
  if (event.type === 'recvAlert') {
    return { ...ctx, state: 'closed', alert: { level: 'warning', description: event.description } };
  }
  if (event.type === 'tickStep') return ctx;
  if (ctx.state === 'closed') return ctx;

  switch (ctx.state) {
    case 'init':
      if (event.type !== 'start') return closeUnexpected(ctx);
      return { ...ctx, state: 'wait_sh', transcriptHash: append(ctx, event.bytes) };
    case 'wait_sh':
      if (event.type !== 'recvServerHello') return closeUnexpected(ctx);
      return {
        ...ctx,
        state: 'wait_ee_etc',
        ...(event.selectedAlpn !== undefined ? { negotiatedAlpn: event.selectedAlpn } : {}),
        transcriptHash: append(ctx, event.bytes),
      };
    case 'wait_ee_etc':
      if (event.type === 'recvCertificate' || event.type === 'recvCertificateVerify') {
        return { ...ctx, transcriptHash: append(ctx, event.bytes) };
      }
      if (event.type === 'recvFinished') {
        return {
          ...ctx,
          state: event.who === 'server' ? 'connected' : ctx.state,
          transcriptHash: append(ctx, event.bytes),
        };
      }
      return closeUnexpected(ctx);
    case 'connected':
      if (event.type === 'recvAppData') {
        return {
          ...ctx,
          transcriptHash: append(ctx, event.bytes),
          clientSeqNum: ctx.clientSeqNum + 1n,
        };
      }
      if (event.type === 'recvFinished' && event.who === 'client') {
        return { ...ctx, transcriptHash: append(ctx, event.bytes) };
      }
      return closeUnexpected(ctx);
  }
}
