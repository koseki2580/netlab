import { useCallback, useState } from 'react';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { useNetlabContext } from '../../src/components/NetlabContext';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { ResizableSidebar } from '../../src/components/ResizableSidebar';
import { buildUdpPacket } from '../../src/layers/l4-transport/udpPacketBuilder';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import type { NetworkTopology } from '../../src/types/topology';
import { useT } from '../localeContext';

/**
 * The one task a small lesson sets, with the answer it produced.
 *
 * The three shapes lessons — two devices, a switched LAN, a star — were a
 * picture and nothing else: a beginner opened the lesson tagged "はじめて" and
 * found no button, no instruction and no result. This is the course's own
 * shape (goal → one action → what it means) lifted out so those lessons can
 * use it: a lesson that says what to try, does it, and explains what happened.
 */
/** A sentence in both languages; the task panel shows the chosen one. */
export interface Bilingual {
  en: string;
  ja: string;
}

export interface LessonTaskProps {
  /** One line: what the learner is about to see. */
  goal: Bilingual;
  /** Device the packet leaves from, and the one it is addressed to. */
  from: string;
  to: string;
  /** Plain-language explanation shown once the packet has run. */
  takeaway: Bilingual;
}

const CARD: React.CSSProperties = {
  background: 'var(--netlab-bg-primary)',
  border: '1px solid var(--netlab-bg-surface)',
  borderRadius: 10,
  padding: 12,
  color: 'var(--netlab-text-primary)',
  fontFamily: 'monospace',
  fontSize: 12,
  lineHeight: 1.7,
};

const BUTTON: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid #0f766e',
  background: '#115e59',
  color: '#ecfeff',
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontSize: 13,
  fontWeight: 700,
  width: '100%',
};

export function LessonTask({ goal, from, to, takeaway }: LessonTaskProps) {
  const t = useT();
  const { topology } = useNetlabContext();
  const { sendPacket, state, engine } = useSimulation();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const send = useCallback(async () => {
    const source = topology.nodes.find((node) => node.id === from);
    const destination = topology.nodes.find((node) => node.id === to);
    if (!source?.data.ip || !destination?.data.ip) return;
    engine.reset();
    setSending(true);
    await sendPacket(
      buildUdpPacket({
        srcNodeId: from,
        dstNodeId: to,
        srcIp: source.data.ip,
        dstIp: destination.data.ip,
        srcPort: 40000,
        dstPort: 7,
        payload: { layer: 'raw', data: 'hello' },
        ...(typeof source.data.mac === 'string' ? { srcMac: source.data.mac } : {}),
        ...(typeof destination.data.mac === 'string' ? { dstMac: destination.data.mac } : {}),
      }),
    );
    setSending(false);
    setSent(true);
  }, [engine, from, sendPacket, to, topology.nodes]);

  const trace = state.traces[state.traces.length - 1];
  const lastHop = trace?.hops[trace.hops.length - 1];
  const arrived = lastHop?.event === 'deliver';
  // The devices the packet itself went through, in order. A hop count would
  // say "6" on a three-device diagram, and the trace also records the address
  // lookup that goes back and forth first; neither is what the learner sees.
  const path = (trace?.hops ?? [])
    .filter((hop) => hop.event !== 'arp-request' && hop.event !== 'arp-reply')
    .map((hop) => hop.nodeLabel)
    .filter((label, index, labels) => Boolean(label) && label !== labels[index - 1]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={CARD} data-testid="lesson-task-goal">
        {t(goal.en, goal.ja)}
      </div>
      <button
        type="button"
        data-testid="demo-primary-action"
        onClick={() => void send()}
        disabled={sending}
        style={BUTTON}
      >
        {sending
          ? t('Sending…', '送信中…')
          : sent
            ? t('Send again', 'もう一度送る')
            : t('Send a packet', 'パケットを送る')}
      </button>
      {sent && lastHop ? (
        <div
          data-testid="lesson-task-outcome"
          data-arrived={arrived ? 'yes' : 'no'}
          style={{
            ...CARD,
            borderColor: arrived ? 'var(--netlab-accent-green)' : 'var(--netlab-accent-orange)',
          }}
        >
          <strong>
            {arrived
              ? t('It arrived.', '届きました。')
              : t('It did not arrive.', '届きませんでした。')}
          </strong>
          <div data-testid="lesson-task-path" style={{ color: 'var(--netlab-text-secondary)' }}>
            {t('Path: ', '通った機器: ')}
            {path.join(' → ')}
          </div>
          <p style={{ margin: '8px 0 0' }}>{t(takeaway.en, takeaway.ja)}</p>
        </div>
      ) : null}
    </div>
  );
}

/**
 * A small lesson laid out the way the others are: the diagram, and beside it
 * the one task it sets. Rendered inside `DemoShell`, so the task reads the
 * learner's language.
 */
export function TaskLesson({ topology, ...task }: LessonTaskProps & { topology: NetworkTopology }) {
  return (
    <NetlabProvider topology={topology}>
      <SimulationProvider>
        <div style={{ display: 'flex', height: '100%' }}>
          <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
            <NetlabCanvas />
          </div>
          <ResizableSidebar defaultWidth={340}>
            <div style={{ padding: 12 }}>
              <LessonTask {...task} />
            </div>
          </ResizableSidebar>
        </div>
      </SimulationProvider>
    </NetlabProvider>
  );
}
