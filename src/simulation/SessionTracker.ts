import type { HookEngine } from '../hooks/HookEngine';
import type { InFlightPacket } from '../types/packets';
import type {
  HttpSessionPhase,
  NetworkSession,
  SessionEvent,
  SessionMode,
  SessionPhase,
} from '../types/session';
import type { PacketTrace } from '../types/simulation';

export type SessionTrackerListener = () => void;

interface StartSessionOptions {
  srcNodeId: string;
  dstNodeId: string;
  protocol?: string;
  requestType?: string;
  transferId?: string;
}

export class SessionTracker {
  private readonly sessions = new Map<string, NetworkSession>();
  private readonly listeners = new Set<SessionTrackerListener>();
  readonly mode: SessionMode;

  constructor(
    private readonly hookEngine: HookEngine,
    mode: SessionMode = 'legacy',
  ) {
    this.mode = mode;
    this.registerHooks();
  }

  startSession(sessionId: string, opts: StartSessionOptions): void {
    if (this.sessions.has(sessionId)) return;

    this.sessions.set(sessionId, {
      sessionId,
      srcNodeId: opts.srcNodeId,
      dstNodeId: opts.dstNodeId,
      status: 'pending',
      createdAt: Date.now(),
      events: [],
      ...(opts.protocol !== undefined ? { protocol: opts.protocol } : {}),
      ...(opts.requestType !== undefined ? { requestType: opts.requestType } : {}),
      ...(opts.transferId !== undefined ? { transferId: opts.transferId } : {}),
    });

    this.notify();
  }

  attachTrace(
    sessionId: string,
    trace: PacketTrace,
    role: 'request' | 'response',
    phase?: HttpSessionPhase,
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (role === 'request') {
      session.requestTrace = trace;
    } else {
      session.responseTrace = trace;
    }

    // HTTP mode: populate httpPhases
    if (this.mode === 'http' && phase) {
      if (!session.httpPhases) {
        session.httpPhases = {};
      }
      switch (phase) {
        case 'tcp-open':
          session.httpPhases.tcpOpen = trace;
          break;
        case 'http-request':
          session.httpPhases.httpRequest = trace;
          break;
        case 'http-response':
          session.httpPhases.httpResponse = trace;
          break;
        case 'tcp-close':
          session.httpPhases.tcpClose = trace;
          break;
      }

      // Check if all four phases are present → mark complete
      const hp = session.httpPhases;
      if (hp.tcpOpen && hp.httpRequest && hp.httpResponse && hp.tcpClose) {
        session.status = 'success';
        session.completedAt = Date.now();
      }
    }

    if (session.requestType === 'data-transfer' && role === 'request') {
      this.syncDataTransferSession(session, trace);
    }

    this.notify();
  }

  getSessions(): NetworkSession[] {
    return Array.from(this.sessions.values());
  }

  getSession(id: string): NetworkSession | undefined {
    return this.sessions.get(id);
  }

  clear(): void {
    this.sessions.clear();
    this.notify();
  }

  subscribe(listener: SessionTrackerListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private registerHooks(): void {
    this.hookEngine.on('fetch:intercept', async (ctx, next) => {
      if (ctx.sessionId) {
        const session = this.sessions.get(ctx.sessionId);
        if (session && session.status === 'pending') {
          this.addEvent(session, 'request:initiated', { nodeId: ctx.nodeId });
          this.notify();
        }
      }
      await next();
    });

    this.hookEngine.on('packet:create', async (ctx, next) => {
      const session = this.getPendingSessionByPacketId(ctx.packet.sessionId);
      if (session) {
        const phase = this.resolveCreatePhase(session, ctx.packet);
        if (phase && !session.events.some((event) => event.phase === phase)) {
          this.addEvent(session, phase, { nodeId: ctx.sourceNodeId });
          this.notify();
        }
      }
      await next();
    });

    this.hookEngine.on('packet:deliver', async (ctx, next) => {
      const session = this.getPendingSessionByPacketId(ctx.packet.sessionId);
      if (session) {
        const phase = this.resolveDeliverPhase(session, ctx.packet);
        if (phase) {
          this.addEvent(session, phase, { nodeId: ctx.destinationNodeId });
          if (phase === 'response:delivered') {
            session.status = 'success';
            session.completedAt = Date.now();
          }
          this.notify();
        }
      }
      await next();
    });

    this.hookEngine.on('packet:drop', async (ctx, next) => {
      const session = this.getPendingSessionByPacketId(ctx.packet.sessionId);
      if (session) {
        session.status = 'failed';
        session.completedAt = Date.now();
        session.error = { reason: ctx.reason, nodeId: ctx.nodeId };
        this.addEvent(session, 'drop', {
          nodeId: ctx.nodeId,
          meta: { reason: ctx.reason },
        });
        this.notify();
      }
      await next();
    });

    this.hookEngine.on('fetch:respond', async (ctx, next) => {
      if (ctx.sessionId) {
        const session = this.sessions.get(ctx.sessionId);
        if (session && session.status === 'pending') {
          this.addEvent(session, 'response:generated', {
            nodeId: ctx.nodeId,
            meta: { status: ctx.response.status },
          });
          this.notify();
        }
      }
      await next();
    });
  }

  private getPendingSessionByPacketId(sessionId: string | undefined): NetworkSession | undefined {
    if (!sessionId) return undefined;

    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'pending') return undefined;
    return session;
  }

  private resolveCreatePhase(session: NetworkSession, packet: InFlightPacket): SessionPhase | null {
    if (packet.srcNodeId === session.srcNodeId) {
      return 'request:routing';
    }
    if (packet.srcNodeId === session.dstNodeId) {
      return 'response:routing';
    }
    return null;
  }

  private resolveDeliverPhase(
    session: NetworkSession,
    packet: InFlightPacket,
  ): SessionPhase | null {
    if (packet.dstNodeId === session.dstNodeId) {
      return 'request:delivered';
    }
    if (packet.dstNodeId === session.srcNodeId) {
      return 'response:delivered';
    }
    return null;
  }

  private addEvent(
    session: NetworkSession,
    phase: SessionPhase,
    opts?: {
      nodeId?: string;
      meta?: Record<string, unknown>;
    },
  ): void {
    const event: SessionEvent = {
      phase,
      timestamp: Date.now(),
      seq: session.events.length,
      ...(opts?.nodeId !== undefined ? { nodeId: opts.nodeId } : {}),
      ...(opts?.meta !== undefined ? { meta: opts.meta } : {}),
    };
    session.events.push(event);
  }

  private syncDataTransferSession(session: NetworkSession, trace: PacketTrace): void {
    const firstHop = trace.hops[0];
    const lastHop = trace.hops[trace.hops.length - 1];

    if (!session.events.some((event) => event.phase === 'request:routing')) {
      this.addEvent(session, 'request:routing', {
        nodeId: firstHop?.nodeId ?? session.srcNodeId,
      });
    }

    if (trace.status === 'delivered') {
      if (!session.events.some((event) => event.phase === 'request:delivered')) {
        this.addEvent(session, 'request:delivered', {
          nodeId: lastHop?.nodeId ?? session.dstNodeId,
        });
      }
      session.status = 'success';
      session.completedAt = Date.now();
      delete session.error;
      return;
    }

    if (!session.events.some((event) => event.phase === 'drop')) {
      const reason = lastHop?.reason ?? 'dropped';
      const nodeId = lastHop?.nodeId ?? session.dstNodeId;
      session.error = { reason, nodeId };
      this.addEvent(session, 'drop', {
        nodeId,
        meta: { reason },
      });
    }

    session.status = 'failed';
    session.completedAt = Date.now();
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}
