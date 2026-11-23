import { useMemo, useState } from 'react';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { useNetlabContext } from '../../src/components/NetlabContext';
import { PacketTimeline } from '../../src/components/simulation/PacketTimeline';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import type { PacketTrace } from '../../src/types/simulation';
import { LessonCanvas, LessonPanel, LessonSplit } from '../components/LessonPanel';
import {
  LESSON_BUTTON,
  LESSON_CARD,
  LESSON_LABEL,
  LESSON_TEAL_BUTTON,
  LESSON_TEAL_BUTTON_DISABLED,
  lessonChoice,
  predictionMark,
} from '../components/lessonStyles';
import { NetlabProvider } from '../components/PhoneNetlabProvider';
import DemoShell from '../DemoShell';
import { useGalleryLocale, useT } from '../localeContext';
import {
  ICMP_CASES,
  ICMP_CODES,
  ICMP_SENDER,
  ICMP_TARGET_IP,
  ICMP_UNROUTED_IP,
  ICMP_ABSENT_IP,
  icmpTopology,
  readIcmpOutcome,
  type IcmpKind,
  type IcmpOutcome,
} from './icmpLesson';
import { buildEchoPacket } from './pmtud';

const TOPOLOGY = icmpTopology();

const KIND_WORDS: Record<IcmpKind, readonly [string, string]> = {
  'echo-reply': ['Echo Reply', 'Echo Reply（エコー応答）'],
  'time-exceeded': ['Time Exceeded', 'Time Exceeded（時間超過）'],
  'net-unreachable': [
    'Destination Unreachable — network',
    'Destination Unreachable — ネットワーク到達不能',
  ],
  'host-unreachable': [
    'Destination Unreachable — host',
    'Destination Unreachable — ホスト到達不能',
  ],
  'frag-needed': [
    'Destination Unreachable — fragmentation needed',
    'Destination Unreachable — 断片化が必要',
  ],
  nothing: ['Nothing comes back', '何も返ってこない'],
};
const KINDS: readonly IcmpKind[] = [
  'echo-reply',
  'time-exceeded',
  'net-unreachable',
  'host-unreachable',
  'frag-needed',
  'nothing',
];

const PANEL_STYLE: React.CSSProperties = {
  background: 'var(--netlab-bg-primary)',
  borderLeft: '1px solid var(--netlab-bg-surface)',
  padding: 12,
  display: 'grid',
  gap: 12,
  alignContent: 'start',
};

const codeOf = (kind: IcmpKind) =>
  kind === 'nothing' ? '' : ` (type ${ICMP_CODES[kind].type}, code ${ICMP_CODES[kind].code})`;

/** One situation at a time: predict what comes back, send, read it (REQ-368). */
function IcmpSteps() {
  const t = useT();
  const locale = useGalleryLocale();
  const { engine, isRecomputing } = useSimulation();
  const { topology } = useNetlabContext();
  const [index, setIndex] = useState(0);
  const [guess, setGuess] = useState<IcmpKind | null>(null);
  const [outcome, setOutcome] = useState<IcmpOutcome | null>(null);
  const [sending, setSending] = useState(false);
  const [right, setRight] = useState<boolean[]>([]);
  const step = ICMP_CASES[index];
  const word = (kind: IcmpKind) => KIND_WORDS[kind][locale === 'ja' ? 1 : 0];

  const send = async () => {
    if (!step || !guess) return;
    setSending(true);
    try {
      let trace: PacketTrace | null = null;
      if (step.id === 'echo') trace = await engine.ping(ICMP_SENDER, ICMP_TARGET_IP);
      else if (step.id === 'ttl')
        trace = await engine.ping(ICMP_SENDER, ICMP_TARGET_IP, { ttl: 1 });
      else if (step.id === 'no-route') trace = await engine.ping(ICMP_SENDER, ICMP_UNROUTED_IP);
      else if (step.id === 'no-host') trace = await engine.ping(ICMP_SENDER, ICMP_ABSENT_IP);
      else {
        // 1,472 bytes of data + 8 of ICMP header + 20 of IP header = 1,500, with DF set.
        const packet = buildEchoPacket(topology, true, 1472);
        if (packet) {
          await engine.send(packet);
          trace =
            engine.getState().traces.find((candidate) => candidate.packetId === packet.id) ?? null;
        }
      }
      const seen = trace ? readIcmpOutcome(trace, ICMP_SENDER) : { kind: 'nothing' as const };
      setOutcome(seen);
      setRight((previous) => [...previous, seen.kind === guess]);
    } finally {
      setSending(false);
    }
  };

  if (!step) {
    return (
      <div style={LESSON_CARD} data-testid="icmp-summary">
        <div style={LESSON_LABEL}>{t('Your predictions', '予想の結果')}</div>
        <p
          style={{ margin: 0, fontWeight: 700 }}
        >{`${right.filter(Boolean).length} / ${ICMP_CASES.length}`}</p>
        <table style={{ marginTop: 8, borderCollapse: 'collapse', width: '100%', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--netlab-text-secondary)' }}>
              <th style={{ padding: 4 }}>{t('Message', 'メッセージ')}</th>
              <th style={{ padding: 4 }}>type / code</th>
              <th style={{ padding: 4 }}>{t('Sent by', '送るのは')}</th>
            </tr>
          </thead>
          <tbody>
            {(
              [
                'echo-reply',
                'time-exceeded',
                'net-unreachable',
                'host-unreachable',
                'frag-needed',
              ] as const
            ).map((kind) => (
              <tr key={kind}>
                <td style={{ padding: 4 }}>{word(kind)}</td>
                <td
                  style={{ padding: 4, fontFamily: 'monospace' }}
                >{`${ICMP_CODES[kind].type} / ${ICMP_CODES[kind].code}`}</td>
                <td style={{ padding: 4 }}>
                  {kind === 'echo-reply'
                    ? t('the destination', '宛先')
                    : t('the router that cannot go on', '先へ進めなかったルータ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          data-testid="icmp-again"
          style={{ ...LESSON_BUTTON, marginTop: 10 }}
          onClick={() => {
            setIndex(0);
            setRight([]);
            setGuess(null);
            setOutcome(null);
          }}
        >
          {t('Start again', 'もう一度')}
        </button>
      </div>
    );
  }

  return (
    <div style={LESSON_CARD} data-testid="icmp-step" data-case={step.id}>
      <div style={LESSON_LABEL}>{`${index + 1} / ${ICMP_CASES.length}`}</div>
      <p data-testid="icmp-situation" style={{ margin: 0, lineHeight: 1.7, fontWeight: 700 }}>
        {step.situation[locale]}
      </p>
      <p style={{ margin: '8px 0', color: 'var(--netlab-text-secondary)' }}>
        {t(
          'First predict: what comes back to Host A?',
          'まず予想してください：Host A に何が返ってくる？',
        )}
      </p>
      <div
        role="radiogroup"
        aria-label={t('Your prediction', '予想')}
        style={{ display: 'grid', gap: 6 }}
      >
        {KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            role="radio"
            aria-checked={guess === kind}
            data-testid={`icmp-guess-${kind}`}
            disabled={outcome !== null}
            onClick={() => setGuess(kind)}
            style={{
              ...lessonChoice(guess === kind),
              textAlign: 'left',
              opacity: outcome !== null && guess !== kind ? 0.5 : 1,
            }}
          >
            {predictionMark(kind, guess, outcome?.kind, outcome !== null)}
            {word(kind)}
          </button>
        ))}
      </div>
      {outcome === null ? (
        <button
          type="button"
          data-testid="icmp-send"
          disabled={!guess || sending || isRecomputing}
          style={{ ...(guess ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED), marginTop: 10 }}
          onClick={() => void send()}
        >
          {guess ? t('Send it', '送ってみる') : t('Predict first', '先に予想を選んでください')}
        </button>
      ) : (
        <div
          data-testid="icmp-result"
          data-kind={outcome.kind}
          data-right={String(outcome.kind === guess)}
          role="status"
          style={{ marginTop: 10 }}
        >
          <p style={{ margin: 0, fontWeight: 700 }}>
            {outcome.kind === guess
              ? t('As you predicted. ', '予想どおりです。')
              : t('Not what you predicted. ', '予想とちがいました。')}
          </p>
          <p data-testid="icmp-message" style={{ margin: '4px 0', fontFamily: 'monospace' }}>
            {outcome.kind === 'nothing'
              ? word('nothing')
              : `${outcome.fromDevice} (${outcome.from}) → Host A: ${word(outcome.kind)}${codeOf(outcome.kind)}${outcome.mtu ? `, next-hop MTU ${outcome.mtu}` : ''}`}
          </p>
          <p style={{ margin: '4px 0 0', lineHeight: 1.7 }}>{step.explain[locale]}</p>
          <button
            type="button"
            data-testid="icmp-next"
            style={{ ...LESSON_TEAL_BUTTON, marginTop: 10 }}
            onClick={() => {
              setIndex((previous) => previous + 1);
              setGuess(null);
              setOutcome(null);
            }}
          >
            {t('Next situation', '次の場面へ')}
          </button>
        </div>
      )}
    </div>
  );
}

function IcmpLesson() {
  const t = useT();
  const topology = useMemo(() => TOPOLOGY, []);
  return (
    <NetlabProvider topology={topology}>
      {/* The main-thread engine: the DF send reads its trace back at once. */}
      <SimulationProvider useMainThread>
        <LessonSplit>
          <LessonCanvas canvas={<NetlabCanvas />} />
          <LessonPanel defaultWidth={460} maxWidth={720} style={PANEL_STYLE}>
            <div style={LESSON_CARD}>
              <div style={LESSON_LABEL}>ICMP</div>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                {t(
                  'ICMP is how the network answers back: the destination answers a ping, and a router that cannot carry a packet tells the sender why. Predict each answer, then send and read it.',
                  'ICMP は、ネットワークが「返事」をするしくみです。宛先は ping に答え、パケットを先へ運べなかったルータは、その理由を送り主に知らせます。それぞれの返事を予想してから、送って確かめてください。',
                )}
              </p>
            </div>
            <IcmpSteps />
            <PacketTimeline />
          </LessonPanel>
        </LessonSplit>
      </SimulationProvider>
    </NetlabProvider>
  );
}

export default function IcmpDemo() {
  return (
    <DemoShell
      title="ICMP and traceroute"
      desc="What the network answers back, and why: predict, send and read four ICMP messages"
    >
      <IcmpLesson />
    </DemoShell>
  );
}
