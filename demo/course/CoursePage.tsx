import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { useNetlabContext } from '../../src/components/NetlabContext';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { buildUdpPacket } from '../../src/layers/l4-transport/udpPacketBuilder';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import { useOptionalProgress } from '../../src/progress';
import { isInSubnet } from '../../src/utils/cidr';
import { useViewport } from '../../src/utils/useViewport';
import DemoShell from '../DemoShell';
import {
  CARD,
  CourseCaption,
  CourseRouteTable,
  Emphasis,
  StepResult,
  type CourseRouteRow,
  type ResultTone,
} from './CourseParts';
import { diagramCss, labelOf, localizedTopology } from './courseDiagram';
import { COURSE_STEPS, courseProgressId, type CourseLocale, type CourseStep } from './courseSteps';
import { usePacketTravel } from './usePacketTravel';

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
  readonly finish: string;
  readonly back: string;
  readonly finishTitle: string;
  readonly finishBody: string;
  readonly toExam: string;
  readonly toGallery: string;
  readonly restart: string;
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
    finish: 'Finish the course',
    back: '← Previous step',
    finishTitle: 'That is the whole idea',
    finishBody:
      'You have seen a wire, a switch, why one network cannot reach another, and the router that joins them. Every lesson in the gallery is one of these ideas taken further.',
    toExam: 'What to learn next, and the final test →',
    toGallery: 'Open the gallery',
    restart: 'Start over',
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
    finish: 'コースを終える',
    back: '← 前のステップ',
    finishTitle: '仕組みはこれで一通りです',
    finishBody:
      'ケーブル1本、スイッチ、ネットワークが違うと届かないこと、そしてそれをつなぐルータを見てきました。ギャラリーのレッスンは、どれもこの続きです。',
    toExam: '次に学ぶことと修了テストへ →',
    toGallery: 'ギャラリーを開く',
    restart: 'もう一度はじめから',
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

/** Height the "next" bar keeps at the bottom of the panel, which a result must clear. */
const NEXT_BAR = 72;

/**
 * Brings the result into view inside the panel, and only inside it. The page
 * itself is never scrolled: `scrollIntoView` moved every scrollable ancestor,
 * which on a phone pushed the diagram off the screen while the packet was
 * still crossing it.
 */
function revealInPanel(panel: HTMLElement, target: HTMLElement): void {
  const panelBox = panel.getBoundingClientRect();
  const box = target.getBoundingClientRect();
  const room = panelBox.height - NEXT_BAR;
  const top = box.top - panelBox.top;
  // A result that fits is shown whole; one that does not is shown from its top,
  // because its first line is the one that has to be read.
  const delta = box.height + 12 <= room ? top + box.height + 12 - room : top - 12;
  if (delta <= 0) return;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  panel.scrollTo?.({ top: panel.scrollTop + delta, behavior: reduced ? 'auto' : 'smooth' });
}

/** The router's table as the course shows it, with the row the last packet used. */
function useRouteRows(step: CourseStep, usedDestination: string | null): CourseRouteRow[] {
  const { routeTable } = useNetlabContext();
  return useMemo(() => {
    const router = step.topology.nodes.find((node) => node.data.role === 'router');
    if (!router) return [];
    return (routeTable.get(router.id) ?? []).map((route) => ({
      destination: route.destination,
      nextHop: route.nextHop,
      side:
        router.data.interfaces?.find((face) => isInSubnet(face.ipAddress, route.destination))
          ?.ipAddress ?? null,
      adminDistance: route.adminDistance ?? 0,
      used: route.destination === usedDestination,
    }));
  }, [routeTable, step, usedDestination]);
}

/**
 * One step: its network, the one thing to press, and what pressing it showed.
 * The diagram and the panel are one component because they tell one story —
 * the panel waits for the packet on the diagram to come to rest before it says
 * how it went.
 */
function StepStage({
  step,
  index,
  locale,
  isNarrow,
  onArrived,
  onAdvance,
  onBack,
}: {
  step: CourseStep;
  index: number;
  locale: CourseLocale;
  isNarrow: boolean;
  onArrived: () => void;
  onAdvance: () => void;
  onBack: () => void;
}) {
  const { sendPacket, state } = useSimulation();
  const ui = UI_COPY[locale];
  const body = step.copy[locale];
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const diagramRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const outcomeRef = useRef<HTMLDivElement | null>(null);

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
  const devices = useMemo(
    () => new Set(lastTrace?.hops.map((hop) => hop.nodeId) ?? []).size,
    [lastTrace],
  );

  // The packet is drawn crossing the diagram after the simulation has already
  // worked out how it ends. The result is what the learner reads, so it waits
  // for the packet they are watching.
  const run = sent && lastTrace && lastHop ? `${state.traces.length}:${lastTrace.packetId}` : null;
  const phase = usePacketTravel(diagramRef, run, Math.max(1, devices - 1));

  // Once a result has been shown it stays while the packet is sent again. The
  // step is finished the moment the first packet comes to rest, whichever way
  // it went: a packet that failed as the step predicted has taught what it
  // came to teach, so "next" unlocks either way.
  const [finished, setFinished] = useState(false);
  useEffect(() => {
    if (phase === 'arrived') setFinished(true);
  }, [phase]);
  useEffect(() => {
    if (finished) onArrived();
  }, [finished, onArrived]);

  // The explanation under the result is the lesson, and on a phone it starts
  // below the fold. Bring it into view once it exists, inside the panel only.
  useEffect(() => {
    if (!finished || !panelRef.current || !outcomeRef.current) return;
    revealInPanel(panelRef.current, outcomeRef.current);
  }, [finished]);

  const tone: ResultTone =
    step.expect !== (arrived ? 'deliver' : 'drop')
      ? 'unexpected'
      : arrived
        ? 'success'
        : 'planned-failure';
  const usedDestination =
    phase === 'arrived'
      ? (lastTrace?.hops.find((hop) => hop.routingDecision?.winner)?.routingDecision?.winner
          ?.destination ?? null)
      : null;
  const routeRows = useRouteRows(step, usedDestination);
  const isLast = index + 1 >= COURSE_STEPS.length;
  // `/24` is drawn after each address once the text that explains it is open.
  const showPrefix = moreOpen && body.more.some((line) => line.includes('/24'));

  return (
    <>
      {/* The panel is a column beside the diagram rather than a sheet on top
          of it. Overlaid, it covered the machine the learner was sending to,
          which is the one thing they need to see. */}
      <div
        ref={diagramRef}
        data-testid="course-diagram"
        data-course-diagram=""
        data-prefix={showPrefix ? '' : undefined}
        style={{
          position: 'relative',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          // On a narrow screen, a fixed share of it that never scrolls:
          // whatever the panel below does, the network stays where it was.
          ...(isNarrow ? { flex: '0 0 38%', minHeight: 220 } : { flex: 1, minHeight: 0 }),
        }}
      >
        <style>{diagramCss(step)}</style>
        <CourseCaption
          phase={phase}
          delivered={arrived}
          from={labelOf(step, step.from, locale)}
          to={labelOf(step, step.to, locale)}
          at={labelOf(step, lastHop?.nodeId ?? step.to, locale)}
          locale={locale}
        />
        <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
          <NetlabCanvas />
        </div>
      </div>
      <aside
        ref={panelRef}
        data-testid="course-panel"
        style={{
          width: isNarrow ? '100%' : 380,
          flex: isNarrow ? '1 1 0' : '0 0 auto',
          minHeight: 0,
          padding: isNarrow ? '14px 16px 0' : '20px 20px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: isNarrow ? 12 : 14,
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
          {index > 0 ? (
            <button
              type="button"
              data-testid="course-back"
              onClick={onBack}
              style={{
                marginLeft: 12,
                background: 'none',
                border: '1px solid var(--netlab-border)',
                borderRadius: 6,
                padding: '2px 8px',
                color: 'var(--netlab-text-secondary)',
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontSize: 12,
              }}
            >
              {ui.back}
            </button>
          ) : null}
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
        <p
          data-testid="course-task"
          style={{ ...CARD, margin: 0, lineHeight: 1.8, ...(isNarrow ? { padding: 12 } : {}) }}
        >
          <Emphasis text={body.task} />
        </p>
        {/* In the panel, in normal flow: floated over the diagram it covered
            four of the five devices on a phone. */}
        {step.id === 'how-it-decides' && routeRows.length > 0 ? (
          <CourseRouteTable rows={routeRows} locale={locale} detailed={moreOpen} />
        ) : null}
        {step.expect === 'drop' && !sent ? (
          <p
            data-testid="course-warning"
            style={{ color: 'var(--netlab-accent-orange)', margin: 0 }}
          >
            {ui.expectFail}
          </p>
        ) : null}
        <button
          type="button"
          data-testid="course-send"
          onClick={() => void send()}
          style={{ ...BUTTON, flexShrink: 0 }}
        >
          {sending || phase === 'travelling' ? ui.sending : sent ? ui.again : ui.send}
        </button>
        {finished && lastHop ? (
          <div ref={outcomeRef} style={{ flexShrink: 0 }}>
            <StepResult
              copy={body}
              locale={locale}
              arrived={arrived}
              tone={tone}
              moreOpen={moreOpen}
              onToggleMore={() => setMoreOpen((open) => !open)}
            />
          </div>
        ) : null}
        {/* Kept at the bottom of the panel, above the navigation bar, so going
            on never needs a swipe; a long result scrolls under it. */}
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            marginTop: 'auto',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            padding: finished ? '10px 0 14px' : '0 0 14px',
            background: 'var(--netlab-bg-primary)',
          }}
        >
          {finished ? (
            <button
              type="button"
              data-testid="course-next"
              data-last={isLast ? 'yes' : 'no'}
              onClick={onAdvance}
              // The page colour reads on the theme's green in both themes; a fixed
              // dark green was 2.4:1 on the light theme's darker green.
              style={{
                ...BUTTON,
                background: 'var(--netlab-accent-green)',
                color: 'var(--netlab-bg-primary)',
              }}
            >
              {isLast ? ui.finish : ui.next}
            </button>
          ) : null}
        </div>
      </aside>
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

  // A step whose packet has come to rest is a finished step, and it is recorded
  // as such, so the gallery's progress counts the course like any lesson.
  const { recordCompletion } = useOptionalProgress();
  const stepId = step?.id;
  const stepTitle = step?.copy.en.title;
  const record = useCallback(() => {
    if (stepId) {
      recordCompletion({
        kind: 'tutorial',
        id: courseProgressId(stepId),
        ...(stepTitle ? { label: stepTitle } : {}),
      });
    }
  }, [recordCompletion, stepId, stepTitle]);

  const advance = useCallback(() => {
    if (index + 1 >= COURSE_STEPS.length) {
      setFinished(true);
      return;
    }
    setIndex(index + 1);
  }, [index]);

  // A learner who pressed on past a result could not read it again: the course
  // only went forward, and a reload resumed at the furthest step.
  const goBack = useCallback(() => {
    if (index === 0) return;
    setIndex(index - 1);
  }, [index]);

  const restart = useCallback(() => {
    setFinished(false);
    setIndex(0);
  }, []);

  // The boxes are named in the learner's language, like the text beside them,
  // and stand closer together where the screen is narrow.
  const topology = useMemo(
    () => (step ? localizedTopology(step, locale, isNarrow) : null),
    [isNarrow, locale, step],
  );

  if (finished || !step || !topology) {
    return (
      <DemoShell title={ui.shellTitle} desc={ui.shellDesc}>
        <div style={{ padding: isNarrow ? 16 : 32, maxWidth: 640 }}>
          <div data-testid="course-finished" style={CARD}>
            <h2 style={{ margin: 0, fontSize: 20 }}>{ui.finishTitle}</h2>
            <p style={{ lineHeight: 1.8 }}>{ui.finishBody}</p>
            <div
              data-testid="course-finish-actions"
              style={{
                display: 'flex',
                gap: 8,
                // Three buttons in one row wrapped their text to three lines on
                // a phone; stacked, each is one line and a full-width target.
                flexDirection: isNarrow ? 'column' : 'row',
                textAlign: 'center',
              }}
            >
              {/* The course is the first stop on the path the final test covers;
                  finishing it leads on to the rest of that path and the test. */}
              <a
                href="#/course/exam"
                data-testid="course-to-exam"
                style={{ ...BUTTON, textDecoration: 'none', display: 'inline-block' }}
              >
                {ui.toExam}
              </a>
              <a
                href="#/"
                data-testid="course-to-gallery"
                style={{
                  ...BUTTON,
                  textDecoration: 'none',
                  display: 'inline-block',
                  background: 'var(--netlab-bg-surface)',
                }}
              >
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
          // Nothing here scrolls as a whole: on a narrow screen the diagram
          // keeps its place and only the panel under it scrolls.
          overflow: 'hidden',
        }}
      >
        {/* A step is its own network, so remounting on `key` is the point:
            nothing from the previous step's run carries over. */}
        <NetlabProvider
          key={`${step.id}:${locale}:${isNarrow ? 'narrow' : 'wide'}`}
          topology={topology}
        >
          <SimulationProvider>
            <StepStage
              step={step}
              index={index}
              locale={locale}
              isNarrow={isNarrow}
              onArrived={record}
              onAdvance={advance}
              onBack={goBack}
            />
          </SimulationProvider>
        </NetlabProvider>
      </div>
    </DemoShell>
  );
}
