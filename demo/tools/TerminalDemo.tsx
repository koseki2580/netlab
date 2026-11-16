import { useState } from 'react';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { PacketTimeline } from '../../src/components/simulation/PacketTimeline';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import { TERMINAL_WEB_SITES, terminalNetwork } from '../../src/terminal/terminalNetwork';
import { NetlabProvider } from '../components/PhoneNetlabProvider';
import { LessonCanvas, LessonPanel, LessonSplit } from '../components/LessonPanel';
import { LESSON_BUTTON, LESSON_CARD, LESSON_LABEL } from '../components/lessonStyles';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';
import { TerminalPanel } from '../terminal/TerminalPanel';

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

function TerminalSide() {
  const t = useT();
  const { engine } = useSimulation();
  const [pending, setPending] = useState<{ line: string; id: number } | null>(null);
  return (
    <>
      <div style={LESSON_CARD}>
        <div style={LESSON_LABEL}>{t('A terminal on the client', 'client の端末')}</div>
        <p style={{ margin: 0, lineHeight: 1.6 }}>
          {t(
            'Type the commands you would type on a real machine. They run on the simulator: the packets move on the diagram, and the servers that answer — DNS, the web server www and DHCP — run in this page.',
            '実機で打つのと同じコマンドを打ってください。コマンドはシミュレータの上で動きます。パケットは図の上を動き、答えるサーバ（DNS、Web サーバの www、DHCP）もこのページの中で動いています。',
          )}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
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
      <TerminalPanel
        engine={engine}
        nodeId="client"
        host="client"
        web={TERMINAL_WEB_SITES}
        names={NAMES}
        pending={pending}
      />
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
            'The simulator has no clock, so the output shows no times. The laptop gets its address with dhclient; this terminal is on the client.',
            'シミュレータには時計がないので、出力に時間は出ません。laptop は dhclient でアドレスをもらう機器です（この端末は client の端末です）。',
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
        'Run ping, traceroute, dig and curl on a client; DNS, web and DHCP servers answer inside the page',
        'client で ping・traceroute・dig・curl を打つと、ページの中の DNS・Web・DHCP サーバが答えます',
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
