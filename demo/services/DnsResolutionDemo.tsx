import { useState } from 'react';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { dnsLabTopology } from '../../src/services/dnsFixture';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import { LessonCanvas, LessonPanel, LessonSplit } from '../components/LessonPanel';
import { LESSON_CARD, LESSON_LABEL, LESSON_TEAL_BUTTON } from '../components/lessonStyles';
import { NetlabProvider } from '../components/PhoneNetlabProvider';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';
import { describeStep, dnsSteps, type DnsStep } from './dnsResolutionLesson';

const TOPOLOGY = dnsLabTopology();

const TEXT: React.CSSProperties = {
  color: 'var(--netlab-text-primary)',
  fontFamily: 'monospace',
  fontSize: 12,
  lineHeight: 1.6,
};
const NOTE: React.CSSProperties = { ...TEXT, color: 'var(--netlab-text-secondary)' };

const LOOKUPS = [
  { id: 'first', client: 'client', name: 'www.example.com' },
  { id: 'cached', client: 'client-b', name: 'www.example.com' },
  { id: 'missing', client: 'client', name: 'nope.example.com' },
  { id: 'missing-cached', client: 'client-b', name: 'nope.example.com' },
] as const;

function ResolutionPanel() {
  const t = useT();
  const { engine, simulateDns, isRecomputing } = useSimulation();
  const [steps, setSteps] = useState<DnsStep[] | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (client: string, name: string) => {
    setBusy(true);
    try {
      engine.clearTraces();
      await simulateDns(client, name);
      setSteps(
        dnsSteps(engine.getTopology(), engine.getState().traces, (id) =>
          engine.exportPcapRecords(id),
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  const label = (id: string) =>
    ({
      first: t('PC looks up www.example.com', 'PC が www.example.com を引く'),
      cached: t('then PC-B looks it up too', '続けて PC-B も引く'),
      missing: t('PC looks up nope.example.com', 'PC が nope.example.com を引く'),
      'missing-cached': t('then PC-B looks that up too', '続けて PC-B もそれを引く'),
    })[id] ?? id;

  return (
    <>
      <div style={LESSON_CARD}>
        <div style={LESSON_LABEL}>{t('How a name is found', '名前の見つけ方')}</div>
        <div style={NOTE} data-testid="dns-intro">
          {t(
            'A PC asks its resolver and waits (RD 1: “find it for me”). The resolver asks the root, which does not know the name but refers it to the com servers, giving their addresses (glue). The com server refers it to example.com’s own server, which answers with authority (AA 1). The resolver keeps every answer for its TTL, so the next PC is answered at once, with the TTL that is left. A name that does not exist gets NXDOMAIN, which is kept too, for the time the zone’s SOA allows.',
            'PC はリゾルバに問い合わせて待ちます（RD 1：「代わりに探して」）。リゾルバはまずルートに聞きます。ルートは名前を知りませんが、com のサーバーに回し、そのアドレス（グルー）を添えます。com のサーバーは example.com のサーバーに回し、そこが権威を持って答えます（AA 1）。リゾルバは答えを TTL のあいだ覚えておくので、次の PC にはすぐ答え、TTL は残りの秒数になります。存在しない名前には NXDOMAIN が返り、これもゾーンの SOA が許す時間だけ覚えておきます。',
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {LOOKUPS.map((lookup) => (
            <button
              key={lookup.id}
              type="button"
              data-testid={`dns-lookup-${lookup.id}`}
              style={LESSON_TEAL_BUTTON}
              disabled={busy || isRecomputing}
              onClick={() => void run(lookup.client, lookup.name)}
            >
              {label(lookup.id)}
            </button>
          ))}
        </div>
      </div>
      <div style={LESSON_CARD}>
        <div style={LESSON_LABEL}>{t('Messages on the wire', '実際に流れたメッセージ')}</div>
        {steps === null ? (
          <div style={NOTE}>{t('Nothing looked up yet.', 'まだ何も引いていません。')}</div>
        ) : (
          <ol data-testid="dns-steps" style={{ ...TEXT, margin: 0, paddingLeft: 20 }}>
            {steps.map((step, index) => (
              <li key={`${index}-${step.from}`} data-testid={`dns-step-${index + 1}`}>
                {describeStep(step, t)}
              </li>
            ))}
          </ol>
        )}
        {steps !== null ? (
          <div data-testid="dns-step-count" style={{ ...NOTE, marginTop: 6 }}>
            {steps.length <= 2
              ? t(
                  'The resolver asked nobody: it answered from its cache.',
                  'リゾルバはだれにも聞かず、キャッシュから答えました。',
                )
              : t(
                  `The resolver asked ${(steps.length - 2) / 2} servers.`,
                  `リゾルバは ${(steps.length - 2) / 2} 台のサーバーに聞きました。`,
                )}
          </div>
        ) : null}
        <div style={{ ...NOTE, marginTop: 6 }}>
          {t(
            'The cache is kept for the life of this page. Real resolvers also retry, use TCP for large answers and check DNSSEC; this one does not.',
            'キャッシュはこのページを開いているあいだ残ります。実際のリゾルバは再送や、大きな答えのための TCP、DNSSEC の検証もしますが、ここでは扱いません。',
          )}
        </div>
      </div>
    </>
  );
}

export default function DnsResolutionDemo() {
  return (
    <DemoShell
      title="DNS Resolution and Caching"
      desc="From the root to the authoritative server, then from the cache"
    >
      <NetlabProvider topology={TOPOLOGY}>
        {/* The main-thread engine: the steps are read from its packet capture. */}
        <SimulationProvider useMainThread>
          <LessonSplit>
            <LessonCanvas canvas={<NetlabCanvas />} />
            <LessonPanel
              defaultWidth={480}
              maxWidth={760}
              style={{
                background: 'var(--netlab-bg-primary)',
                borderLeft: '1px solid var(--netlab-bg-surface)',
                padding: 12,
                display: 'grid',
                gap: 12,
                alignContent: 'start',
                overflowY: 'auto',
              }}
            >
              <ResolutionPanel />
            </LessonPanel>
          </LessonSplit>
        </SimulationProvider>
      </NetlabProvider>
    </DemoShell>
  );
}
