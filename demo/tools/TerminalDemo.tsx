import { useCallback, useState } from 'react';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { PacketTimeline } from '../../src/components/simulation/PacketTimeline';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import { TERMINAL_WEB_SITES, terminalNetwork } from '../../src/terminal/terminalNetwork';
import { NetlabProvider } from '../components/PhoneNetlabProvider';
import { LessonCanvas, LessonPanel, LessonSplit } from '../components/LessonPanel';
import { LESSON_BUTTON, LESSON_CARD, LESSON_LABEL } from '../components/lessonStyles';
import DemoShell from '../DemoShell';
import { useGalleryLocale, useT } from '../localeContext';
import { TerminalPanel } from '../terminal/TerminalPanel';
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

function TerminalSide() {
  const t = useT();
  const { engine } = useSimulation();
  const [pending, setPending] = useState<{ line: string; id: number } | null>(null);
  const [deviceId, setDeviceId] = useState('client');
  const [done, setDone] = useState<Set<string>>(readDone);
  const device = DEVICES.find((node) => node.id === deviceId) ?? DEVICES[0];
  const onRun = useCallback((run: TerminalRun) => {
    setDone((previous) => {
      const met = completedBy(run, previous);
      if (met.length === 0) return previous;
      const next = new Set([...previous, ...met]);
      saveDone(next);
      return next;
    });
  }, []);
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
      <Missions done={done} />
      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {t('Terminal on', '端末を開く機器')}
        <select
          data-testid="terminal-device"
          value={deviceId}
          onChange={(event) => setDeviceId(event.target.value)}
          style={{ minHeight: 44, fontSize: 15 }}
        >
          {DEVICES.map((node) => (
            <option key={node.id} value={node.id}>
              {node.data.label}
            </option>
          ))}
        </select>
      </label>
      <TerminalPanel
        engine={engine}
        nodeId={device?.id ?? 'client'}
        host={device?.data.label ?? 'client'}
        web={TERMINAL_WEB_SITES}
        names={NAMES}
        pending={pending}
        onRun={onRun}
      />
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

export default function TerminalDemo() {
  const t = useT();
  return (
    <DemoShell
      title={t('Terminal and simulated servers', '端末と模擬サーバ')}
      desc={t(
        'Run ping, traceroute, dig, curl and dhclient on a device; DNS, web and DHCP servers answer inside the page',
        '機器で ping・traceroute・dig・curl・dhclient を打つと、ページの中の DNS・Web・DHCP サーバが答えます',
      )}
    >
      <NetlabProvider topology={TOPOLOGY}>
        <SimulationProvider>
          <LessonSplit>
            <LessonCanvas canvas={<NetlabCanvas />} />
            <LessonPanel defaultWidth={520} maxWidth={760} style={PANEL_STYLE}>
              <TerminalSide />
              <PacketTimeline />
            </LessonPanel>
          </LessonSplit>
        </SimulationProvider>
      </NetlabProvider>
    </DemoShell>
  );
}
