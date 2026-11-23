import { useCallback, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useNetlabTheme } from '../../src/hooks/useNetlabTheme';
import { useViewport } from '../../src/utils/useViewport';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { PacketTimeline } from '../../src/components/simulation/PacketTimeline';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import { TERMINAL_WEB_SITES, terminalNetwork } from '../../src/terminal/terminalNetwork';
import type { ServerApp, WebSites } from '../../src/terminal/types';
import { NetlabProvider } from '../components/PhoneNetlabProvider';
import { LessonCanvas, LessonPanel, LessonSplit } from '../components/LessonPanel';
import { LESSON_BUTTON, LESSON_CARD, LESSON_LABEL } from '../components/lessonStyles';
import DemoShell from '../DemoShell';
import { useGalleryLocale, useT } from '../localeContext';
import { TerminalPanel } from '../terminal/TerminalPanel';
import { ServerAppCard, type WwwMode } from './ServerAppCard';
import { CAUSES, FAULTS, causeOf, type CauseId, type Fault } from './terminalFaults';
import { MISSIONS, completedBy, type TerminalRun } from './terminalMissions';

const TOPOLOGY = terminalNetwork();

/** Names Tab completes after a command: the devices' and the DNS zone's. */
const NAMES = [
  ...TOPOLOGY.nodes.map((node) => node.data.label),
  ...TOPOLOGY.nodes.flatMap((node) => node.data.dnsServer?.zones.map((zone) => zone.name) ?? []),
  'http://www.example.test/',
];

const SUGGESTIONS = [
  'ping -c 2 www',
  'traceroute www',
  'nslookup www.example.test',
  'dig www.example.test',
  'curl http://www.example.test/',
  'curl -v http://www/about',
  'ip addr',
  'ip route',
  'arp -a',
];

const PANEL_STYLE: React.CSSProperties = {
  background: 'var(--netlab-bg-primary)',
  borderLeft: '1px solid var(--netlab-bg-surface)',
  padding: 12,
  display: 'grid',
  gap: 12,
  alignContent: 'start',
};

/** The devices a terminal can open on: the hosts and servers, not the switches or the router. */
const DEVICES = TOPOLOGY.nodes.filter(
  (node) => node.data.role !== 'switch' && node.data.role !== 'router',
);

const DONE_KEY = 'netlab-terminal-missions';

function readDone(): Set<string> {
  try {
    const saved = JSON.parse(window.localStorage.getItem(DONE_KEY) ?? '[]') as unknown;
    return new Set(
      Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : [],
    );
  } catch {
    return new Set();
  }
}

function saveDone(done: ReadonlySet<string>) {
  try {
    window.localStorage.setItem(DONE_KEY, JSON.stringify([...done]));
  } catch {
    /* no storage: the tasks are kept for this visit only */
  }
}

/** The tasks (REQ-363): met by the commands the learner runs, each then explained. */
function Missions({ done }: { done: ReadonlySet<string> }) {
  const t = useT();
  const locale = useGalleryLocale();
  return (
    <div style={LESSON_CARD} data-testid="terminal-missions">
      <div style={LESSON_LABEL}>
        {t('Try it', 'やってみよう')} {`${done.size} / ${MISSIONS.length}`}
      </div>
      <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 8 }}>
        {MISSIONS.map((mission) => {
          const met = done.has(mission.id);
          return (
            <li
              key={mission.id}
              data-testid={`terminal-mission-${mission.id}`}
              data-done={String(met)}
            >
              <span aria-hidden>{met ? '✓ ' : ''}</span>
              <span style={{ fontWeight: met ? 400 : 700 }}>{mission.goal[locale]}</span>
              {met ? (
                <span style={HIDDEN_TEXT}>{t(' (done)', '（できました）')}</span>
              ) : (
                <span style={{ color: 'var(--netlab-text-secondary)' }}>
                  {t(' — hint: ', ' — ヒント：')}
                  {mission.hint[locale]}
                </span>
              )}
              {met ? (
                <p
                  data-testid={`terminal-mission-${mission.id}-explain`}
                  style={{
                    margin: '4px 0 0',
                    lineHeight: 1.6,
                    color: 'var(--netlab-text-secondary)',
                  }}
                >
                  {mission.explain[locale]}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
      {/* What was seen here, kept: the deck drills the same lines on a schedule (REQ-365). */}
      <p data-testid="terminal-review" style={{ margin: '10px 0 0', lineHeight: 1.6 }}>
        {t('To keep it: ', '忘れないために：')}
        <Link to="/learning/protocols" style={{ color: 'var(--netlab-accent-cyan)' }}>
          {t(
            'review the “Reading command output” deck',
            '「コマンドの出力を読む」のデッキで復習する',
          )}
        </Link>
        {t(
          ' — the same lines, asked again over the following days.',
          '（同じ出力を、日をおいて何度か問います）。',
        )}
      </p>
    </div>
  );
}

const HIDDEN_TEXT: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
};

function TerminalSide({
  web,
  faults,
  onCommand,
}: {
  web: WebSites;
  /** The fault-finding card, whose state lives above the network it breaks. */
  faults: React.ReactNode;
  onCommand: () => void;
}) {
  const t = useT();
  const { engine } = useSimulation();
  const [pending, setPending] = useState<{ line: string; id: number } | null>(null);
  const [deviceId, setDeviceId] = useState('client');
  const [wwwMode, setWwwMode] = useState<WwwMode>('built-in');
  const [wwwApp, setWwwApp] = useState<ServerApp | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const appCard = useRef<HTMLDivElement>(null);
  // While the learner's app is in charge of www (running or stopped), www's built-in pages are gone.
  const servedWeb = useMemo(() => {
    if (wwwMode === 'built-in') return web;
    const { www: _builtIn, ...rest } = web;
    return rest;
  }, [web, wwwMode]);
  const apps = useMemo(() => (wwwApp ? { www: wwwApp } : undefined), [wwwApp]);
  const [done, setDone] = useState<Set<string>>(readDone);
  const device = DEVICES.find((node) => node.id === deviceId) ?? DEVICES[0];
  const phone = useViewport().isNarrow;
  const { colorMode } = useNetlabTheme();
  const onRun = useCallback(
    (run: TerminalRun) => {
      onCommand();
      setDone((previous) => {
        const met = completedBy(run, previous);
        if (met.length === 0) return previous;
        const next = new Set([...previous, ...met]);
        saveDone(next);
        return next;
      });
    },
    [onCommand],
  );
  return (
    <>
      <div style={LESSON_CARD}>
        <div style={LESSON_LABEL}>{t('A terminal on a device', '機器の端末')}</div>
        <p style={{ margin: 0, lineHeight: 1.6 }}>
          {t(
            'Type the commands you would type on a real machine. They run on the simulator: the packets move on the diagram, and the servers that answer — DNS, the web server www and DHCP — run in this page.',
            '実機で打つのと同じコマンドを打ってください。コマンドはシミュレータの上で動きます。パケットは図の上を動き、答えるサーバ（DNS、Web サーバの www、DHCP）もこのページの中で動いています。',
          )}
        </p>
      </div>
      {/* On a phone the terminal comes first: below the cards it was a long scroll away. */}
      {phone ? null : faults}
      {phone ? null : <Missions done={done} />}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {t('Terminal on', '端末を開く機器')}
          <select
            data-testid="terminal-device"
            value={deviceId}
            onChange={(event) => setDeviceId(event.target.value)}
            // 16px: iOS zooms into a smaller field when it is tapped. Theme colours, not white in dark.
            style={{
              minHeight: 44,
              fontSize: 16,
              background: 'var(--netlab-bg-surface)',
              color: 'var(--netlab-text-primary)',
              border: '1px solid var(--netlab-border-strong)',
              borderRadius: 6,
              colorScheme: colorMode,
            }}
          >
            {DEVICES.map((node) => (
              <option key={node.id} value={node.id}>
                {node.data.label}
              </option>
            ))}
          </select>
        </label>
        {/* The app card sits below the terminal, out of sight: this brings it up. */}
        <button
          type="button"
          data-testid="server-app-jump"
          style={{ ...LESSON_BUTTON, minHeight: 44, marginLeft: 'auto' }}
          onClick={() => {
            appCard.current?.scrollIntoView({ block: 'start' });
            appCard.current?.querySelector('textarea')?.focus({ preventScroll: true });
          }}
        >
          {t('Write www’s server ↓', 'www のサーバを書く ↓')}
        </button>
      </div>
      <TerminalPanel
        engine={engine}
        nodeId={device?.id ?? 'client'}
        host={device?.data.label ?? 'client'}
        web={servedWeb}
        {...(apps ? { apps } : {})}
        names={NAMES}
        pending={pending}
        focusRequest={focusRequest}
        onRun={onRun}
      />
      {phone ? faults : null}
      <ServerAppCard
        cardRef={appCard}
        onChange={(mode, app) => {
          setWwwMode(mode);
          setWwwApp(app);
          // Started: the keyboard goes to the terminal, ready for curl.
          if (mode === 'app') setFocusRequest((count) => count + 1);
        }}
      />
      {phone ? <Missions done={done} /> : null}
      <div style={LESSON_CARD}>
        <div style={LESSON_LABEL}>{t('Examples', 'コマンドの例')}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {SUGGESTIONS.map((line) => (
            <button
              key={line}
              type="button"
              data-testid={`terminal-suggest-${line.replace(/[^a-z0-9]+/gi, '-')}`}
              style={{ ...LESSON_BUTTON, fontFamily: 'monospace' }}
              onClick={() => setPending({ line, id: Date.now() })}
            >
              <code>{line}</code>
            </button>
          ))}
        </div>
      </div>
      <div style={LESSON_CARD} data-testid="terminal-web-pages">
        <div style={LESSON_LABEL}>{t('What www serves', 'www が返すページ')}</div>
        {Object.entries(TERMINAL_WEB_SITES.www?.pages ?? {}).map(([path, page]) => (
          <div key={path} style={{ marginTop: 6 }}>
            <code>{`http://www.example.test${path}`}</code>
            <pre style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap', fontSize: 12 }}>
              {page.body}
            </pre>
          </div>
        ))}
        <p style={{ margin: '8px 0 0', color: 'var(--netlab-text-secondary)', fontSize: 13 }}>
          {t(
            'The simulator has no clock, so the output shows no times. The laptop has no address until it asks DHCP: open its terminal and run dhclient.',
            'シミュレータには時計がないので、出力に時間は出ません。laptop は DHCP に頼むまでアドレスがありません。laptop の端末を開いて dhclient を打ってください。',
          )}
        </p>
      </div>
    </>
  );
}

/** The fault-finding card (REQ-364): one symptom, commands to find why, then a pick. */
function FaultCard({
  fault,
  runs,
  picked,
  onStart,
  onPick,
  onEnd,
}: {
  fault: Fault | null;
  runs: number;
  picked: readonly CauseId[];
  onStart: () => void;
  onPick: (cause: CauseId) => void;
  onEnd: () => void;
}) {
  const t = useT();
  const locale = useGalleryLocale();
  const last = picked[picked.length - 1];
  const solved = fault !== null && last === fault.cause;
  return (
    <div style={LESSON_CARD} data-testid="terminal-faults">
      <div style={LESSON_LABEL}>{t('Find the fault', '故障を探す')}</div>
      {fault === null ? (
        <>
          <p style={{ margin: '0 0 8px', lineHeight: 1.6 }}>
            {t(
              'Break the network in one of four ways, without being told which. Then find out why the page will not open, with commands.',
              'ネットワークを 4 通りのどれかで壊します（どれかは伏せます）。Web ページが開かない理由を、コマンドで突き止めてください。',
            )}
          </p>
          <button
            type="button"
            data-testid="terminal-fault-start"
            style={LESSON_BUTTON}
            onClick={onStart}
          >
            {t('Break something', '故障を起こす')}
          </button>
        </>
      ) : (
        <>
          <p
            data-testid="terminal-fault-symptom"
            style={{ margin: '0 0 8px', lineHeight: 1.6, fontWeight: 700 }}
          >
            {t(
              'On the client, http://www.example.test/ will not open. Why? Find out with commands, then choose.',
              'client で http://www.example.test/ が開きません。なぜでしょう。コマンドで調べてから選んでください。',
            )}
          </p>
          {runs === 0 ? (
            <p style={{ margin: '0 0 8px', color: 'var(--netlab-text-secondary)' }}>
              {t('Run at least one command first.', 'まずコマンドを 1 つ以上打ってください。')}
            </p>
          ) : null}
          <div style={{ display: 'grid', gap: 6 }}>
            {CAUSES.map((cause) => (
              <button
                key={cause.id}
                type="button"
                data-testid={`terminal-fault-pick-${cause.id}`}
                disabled={runs === 0 || solved}
                aria-pressed={picked.includes(cause.id)}
                style={{
                  ...LESSON_BUTTON,
                  textAlign: 'left',
                  // Not yet to be chosen: before a command, or once solved.
                  ...(runs === 0 || solved ? { opacity: 0.45, cursor: 'not-allowed' } : {}),
                }}
                onClick={() => onPick(cause.id)}
              >
                {cause.label[locale]}
              </button>
            ))}
          </div>
          {last !== undefined ? (
            <p
              data-testid="terminal-fault-feedback"
              data-correct={String(solved)}
              role="status"
              style={{ margin: '8px 0 0', lineHeight: 1.6 }}
            >
              {solved
                ? `${t('Right.', '正解です。')} ${causeOf(last).explain[locale]}`
                : `${t('Not that.', 'ちがいます。')} ${causeOf(last).wouldShow[locale]} ${t('Check again with commands.', 'もう一度コマンドで確かめてください。')}`}
            </p>
          ) : null}
          <button
            type="button"
            data-testid="terminal-fault-end"
            style={{ ...LESSON_BUTTON, marginTop: 8 }}
            onClick={onEnd}
          >
            {solved
              ? t('Fix it and go back', '直して元に戻す')
              : t('Give up and fix it', 'あきらめて元に戻す')}
          </button>
        </>
      )}
    </div>
  );
}

export default function TerminalDemo() {
  const t = useT();
  // `?fault=f2` opens with that fault: a link a teacher can hand out, and a fixed case for tests.
  const search = useLocation().search;
  const [faultIndex, setFaultIndex] = useState<number | null>(() => {
    const index = FAULTS.findIndex(
      (candidate) => candidate.id === new URLSearchParams(search).get('fault'),
    );
    return index === -1 ? null : index;
  });
  const [runs, setRuns] = useState(0);
  const [picked, setPicked] = useState<CauseId[]>([]);
  const fault = faultIndex === null ? null : (FAULTS[faultIndex] ?? null);
  const topology = useMemo(() => (fault ? fault.apply(TOPOLOGY) : TOPOLOGY), [fault]);
  const web = useMemo(() => (fault ? fault.web(TERMINAL_WEB_SITES) : TERMINAL_WEB_SITES), [fault]);
  const onCommand = useCallback(() => setRuns((count) => count + 1), []);
  const faults = (
    <FaultCard
      fault={fault}
      runs={runs}
      picked={picked}
      onStart={() => {
        // A different fault each time, without saying which.
        const next = Math.floor(Math.random() * FAULTS.length);
        setFaultIndex(next === faultIndex ? (next + 1) % FAULTS.length : next);
        setRuns(0);
        setPicked([]);
      }}
      onPick={(cause) => setPicked((previous) => [...previous, cause])}
      onEnd={() => {
        setFaultIndex(null);
        setRuns(0);
        setPicked([]);
      }}
    />
  );
  return (
    <DemoShell
      title={t('Terminal and simulated servers', '端末と模擬サーバ')}
      desc={t(
        'Run ping, traceroute, dig, curl and dhclient on a device; DNS, web and DHCP servers answer inside the page',
        '機器で ping・traceroute・dig・curl・dhclient を打つと、ページの中の DNS・Web・DHCP サーバが答えます',
      )}
    >
      <NetlabProvider key={fault?.id ?? 'working'} topology={topology}>
        <SimulationProvider>
          <LessonSplit>
            <LessonCanvas canvas={<NetlabCanvas />} />
            <LessonPanel defaultWidth={520} maxWidth={760} style={PANEL_STYLE}>
              <TerminalSide web={web} faults={faults} onCommand={onCommand} />
              <PacketTimeline />
            </LessonPanel>
          </LessonSplit>
        </SimulationProvider>
      </NetlabProvider>
    </DemoShell>
  );
}
