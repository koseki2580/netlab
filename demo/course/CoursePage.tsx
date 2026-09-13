import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { RouteTable } from '../../src/components/controls/RouteTable';
import { buildUdpPacket } from '../../src/layers/l4-transport/udpPacketBuilder';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import { useViewport } from '../../src/utils/useViewport';
import DemoShell from '../DemoShell';
import { COURSE_STEPS, type CourseLocale, type CourseStep } from './courseSteps';

const PROGRESS_KEY = 'netlab-course-step';
const LOCALE_KEY = 'netlab-locale';

interface CourseUiCopy {
  readonly shellTitle: string;
  readonly shellDesc: string;
  readonly step: string;
  readonly of: string;
  readonly send: string;
  readonly sending: string;
  readonly again: string;
  readonly next: string;
  readonly finishTitle: string;
  readonly finishBody: string;
  readonly toGallery: string;
  readonly restart: string;
  readonly arrived: string;
  readonly notArrived: string;
  readonly unexpected: string;
  readonly expectFail: string;
}

const UI_COPY: Record<CourseLocale, CourseUiCopy> = {
  en: {
    shellTitle: 'Getting started',
    shellDesc: 'Six small networks, in order, one thing to do in each',
    step: 'Step',
    of: 'of',
    send: 'Send a packet',
    sending: 'Sending…',
    again: 'Send again',
    next: 'Next step',
    finishTitle: 'That is the whole idea',
    finishBody:
      'You have seen a wire, a switch, why one network cannot reach another, and the router that joins them. Every lesson in the gallery is one of these ideas taken further.',
    toGallery: 'Open the gallery',
    restart: 'Start over',
    arrived: 'Arrived',
    notArrived: 'Did not arrive — as expected',
    unexpected: 'This did not go as the step expected.',
    expectFail: 'This packet is meant to fail.',
  },
  ja: {
    shellTitle: '入門コース',
    shellDesc: '小さなネットワークを6つ、順番に。各ステップでやることは1つだけです',
    step: 'ステップ',
    of: '/',
    send: 'パケットを送る',
    sending: '送信中…',
    again: 'もう一度送る',
    next: '次のステップへ',
    finishTitle: '仕組みはこれで一通りです',
    finishBody:
      'ケーブル1本、スイッチ、ネットワークが違うと届かないこと、そしてそれをつなぐルータを見てきました。ギャラリーのレッスンは、どれもこの続きです。',
    toGallery: 'ギャラリーを開く',
    restart: 'もう一度はじめから',
    arrived: '届きました',
    notArrived: '届きませんでした（想定どおり）',
    unexpected: 'このステップの想定とは違う結果になりました。',
    expectFail: 'このパケットは失敗する例です。',
  },
};

function readLocale(): CourseLocale {
  if (typeof window === 'undefined') return 'en';
  try {
    return window.localStorage.getItem(LOCALE_KEY) === 'ja' ? 'ja' : 'en';
  } catch {
    return 'en';
  }
}

function readStoredStep(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = Number(window.localStorage.getItem(PROGRESS_KEY));
    return Number.isInteger(raw) && raw >= 0 && raw < COURSE_STEPS.length ? raw : 0;
  } catch {
    return 0;
  }
}

const CARD: CSSProperties = {
  background: 'var(--netlab-bg-panel)',
  border: '1px solid var(--netlab-border-subtle)',
  borderRadius: 12,
  padding: 16,
  color: 'var(--netlab-text-primary)',
  fontFamily: 'monospace',
};

const BUTTON: CSSProperties = {
  padding: '10px 16px',
  borderRadius: 8,
  border: '1px solid transparent',
  background: 'var(--netlab-accent-blue)',
  color: '#f8fafc',
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontSize: 13,
  fontWeight: 700,
  position: 'relative',
};

/** The one action a step offers, and what it produced. */
function StepRunner({
  step,
  locale,
  onOutcome,
}: {
  step: CourseStep;
  locale: CourseLocale;
  onOutcome: (arrived: boolean) => void;
}) {
  const { sendPacket, state } = useSimulation();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const ui = UI_COPY[locale];

  const send = useCallback(async () => {
    const source = step.topology.nodes.find((node) => node.id === step.from);
    const destination = step.topology.nodes.find((node) => node.id === step.to);
    if (!source?.data.ip || !destination?.data.ip) return;
    setSending(true);
    await sendPacket(
      buildUdpPacket({
        srcNodeId: step.from,
        dstNodeId: step.to,
        srcIp: source.data.ip,
        dstIp: destination.data.ip,
        srcPort: 40000,
        dstPort: 7,
        payload: { layer: 'raw', data: 'course' },
      }),
    );
    setSending(false);
    setSent(true);
  }, [sendPacket, step]);

  const lastTrace = state.traces[state.traces.length - 1];
  const lastHop = lastTrace?.hops[lastTrace.hops.length - 1];
  const arrived = lastHop?.event === 'deliver';

  // The step is finished the moment a hop comes back, whichever way it went:
  // a packet that failed as the step predicted has taught what it came to
  // teach, so "next" unlocks either way.
  const finished = sent && lastHop !== undefined;
  useEffect(() => {
    if (finished) onOutcome(arrived);
  }, [arrived, finished, onOutcome]);

  const asExpected = step.expect === (arrived ? 'deliver' : 'drop');

  return (
    <>
      {step.expect === 'drop' && !sent ? (
        <p data-testid="course-warning" style={{ color: 'var(--netlab-accent-orange)', margin: 0 }}>
          {ui.expectFail}
        </p>
      ) : null}
      <button type="button" data-testid="course-send" onClick={() => void send()} style={BUTTON}>
        {sending ? ui.sending : sent ? ui.again : ui.send}
      </button>
      {sent && lastHop ? (
        <div
          data-testid="course-outcome"
          data-arrived={arrived ? 'yes' : 'no'}
          style={{
            ...CARD,
            borderColor: asExpected ? 'var(--netlab-accent-green)' : 'var(--netlab-accent-orange)',
          }}
        >
          <strong>{arrived ? ui.arrived : ui.notArrived}</strong>
          <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
            {asExpected ? step.copy[locale].takeaway : ui.unexpected}
          </p>
        </div>
      ) : null}
    </>
  );
}

export default function CoursePage() {
  // Below the shell's own breakpoint the panel goes under the diagram rather
  // than beside it: a fixed 380px side column leaves a phone barely a hundred
  // pixels of network to look at.
  const { isNarrow } = useViewport();
  const [locale, setLocale] = useState<CourseLocale>(readLocale);
  const [index, setIndex] = useState<number>(readStoredStep);
  const [finished, setFinished] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const ui = UI_COPY[locale];
  const step = COURSE_STEPS[index];

  // The gallery owns the language choice; the course follows it, including
  // when another tab changes it.
  useEffect(() => {
    const sync = () => setLocale(readLocale());
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(PROGRESS_KEY, String(index));
    } catch {
      /* a course that cannot remember where it was is still usable */
    }
  }, [index]);

  const unlock = useCallback(() => setUnlocked(true), []);

  const advance = useCallback(() => {
    setUnlocked(false);
    if (index + 1 >= COURSE_STEPS.length) {
      setFinished(true);
      return;
    }
    setIndex(index + 1);
  }, [index]);

  const restart = useCallback(() => {
    setFinished(false);
    setUnlocked(false);
    setIndex(0);
  }, []);

  const body = useMemo(() => (step ? step.copy[locale] : null), [locale, step]);

  if (finished || !step || !body) {
    return (
      <DemoShell title={ui.shellTitle} desc={ui.shellDesc}>
        <div style={{ padding: 32, maxWidth: 640 }}>
          <div data-testid="course-finished" style={CARD}>
            <h2 style={{ margin: 0, fontSize: 20 }}>{ui.finishTitle}</h2>
            <p style={{ lineHeight: 1.8 }}>{ui.finishBody}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <a href="#/" style={{ ...BUTTON, textDecoration: 'none', display: 'inline-block' }}>
                {ui.toGallery}
              </a>
              <button
                type="button"
                data-testid="course-restart"
                onClick={restart}
                style={{ ...BUTTON, background: 'var(--netlab-bg-surface)' }}
              >
                {ui.restart}
              </button>
            </div>
          </div>
        </div>
      </DemoShell>
    );
  }

  return (
    <DemoShell title={ui.shellTitle} desc={ui.shellDesc}>
      <div
        style={{
          display: 'flex',
          flexDirection: isNarrow ? 'column' : 'row',
          height: '100%',
          overflow: isNarrow ? 'auto' : 'hidden',
        }}
      >
        {/* A step is its own network, so remounting on `key` is the point:
            nothing from the previous step's run carries over. */}
        <NetlabProvider key={step.id} topology={step.topology}>
          <SimulationProvider>
            {/* The panel is a column beside the diagram rather than a sheet on
                top of it. Overlaid, it covered the machine the learner was
                sending to, which is the one thing they need to see. */}
            <div
              style={{
                flex: 1,
                position: 'relative',
                minWidth: 0,
                minHeight: isNarrow ? 320 : 0,
              }}
            >
              <NetlabCanvas />
              {step.id === 'how-it-decides' ? <RouteTable /> : null}
            </div>
            <aside
              style={{
                width: isNarrow ? '100%' : 380,
                flexShrink: 0,
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                overflowY: 'auto',
                background: 'var(--netlab-bg-primary)',
                borderTop: isNarrow ? '1px solid var(--netlab-border-subtle)' : 'none',
                borderLeft: isNarrow ? 'none' : '1px solid var(--netlab-border-subtle)',
              }}
            >
              <div
                data-testid="course-progress"
                style={{
                  color: 'var(--netlab-text-secondary)',
                  fontFamily: 'monospace',
                  fontSize: 12,
                }}
              >
                {ui.step} {index + 1} {ui.of} {COURSE_STEPS.length}
              </div>
              <h2 data-testid="course-title" style={{ margin: 0, fontSize: 20 }}>
                {body.title}
              </h2>
              <p
                data-testid="course-goal"
                style={{ margin: 0, lineHeight: 1.8, color: 'var(--netlab-text-secondary)' }}
              >
                {body.goal}
              </p>
              <p data-testid="course-task" style={{ ...CARD, margin: 0, lineHeight: 1.8 }}>
                {body.task}
              </p>
              <StepRunner step={step} locale={locale} onOutcome={unlock} />
              {unlocked ? (
                <button
                  type="button"
                  data-testid="course-next"
                  onClick={advance}
                  style={{ ...BUTTON, background: 'var(--netlab-accent-green)', color: '#04220f' }}
                >
                  {ui.next}
                </button>
              ) : null}
            </aside>
          </SimulationProvider>
        </NetlabProvider>
      </div>
    </DemoShell>
  );
}
