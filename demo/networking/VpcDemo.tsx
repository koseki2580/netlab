import { useState } from 'react';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { PacketTimeline } from '../../src/components/simulation/PacketTimeline';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import { LessonCanvas, LessonPanel, LessonSplit } from '../components/LessonPanel';
import {
  LESSON_BUTTON,
  LESSON_CARD,
  LESSON_LABEL,
  LESSON_TEAL_BUTTON,
  LESSON_TEAL_BUTTON_DISABLED,
  lessonChoice,
} from '../components/lessonStyles';
import { NetlabProvider } from '../components/PhoneNetlabProvider';
import DemoShell from '../DemoShell';
import { useGalleryLocale, useT } from '../localeContext';
import { VPC_CASES, readVpcTrace, vpcSyn, vpcTopology } from './vpcLesson';

const TOPOLOGY = vpcTopology();

const PANEL_STYLE: React.CSSProperties = {
  background: 'var(--netlab-bg-primary)',
  borderLeft: '1px solid var(--netlab-bg-surface)',
  padding: 12,
  display: 'grid',
  gap: 12,
  alignContent: 'start',
};

const TERMS: readonly (readonly [string, string, string])[] = [
  [
    'VPC 10.0.0.0/16',
    'Your private network in the cloud',
    'クラウドの中の、自分だけのネットワーク',
  ],
  [
    'Subnet',
    'A piece of it: public (10.0.1.0/24) or private (10.0.2.0/24)',
    'その一部。公開（10.0.1.0/24）と非公開（10.0.2.0/24）',
  ],
  [
    'Route table',
    'Where each subnet sends what is not local (here, the routes on the gateways)',
    '各サブネットが、外への通信をどこへ送るか（ここではゲートウェイの経路）',
  ],
  [
    'Internet gateway',
    'The way in and out of the internet; maps public addresses to private ones',
    'インターネットとの出入口。公開アドレスとプライベートアドレスを対応づける',
  ],
  [
    'NAT gateway',
    'Lets a private subnet reach out, while nothing outside can reach in',
    '非公開サブネットが外へ出られるようにする。外からは入れない',
  ],
  [
    'Security group',
    'A stateful firewall in front of an instance (here, on the gateway’s outside)',
    'インスタンスの前のファイアウォール（ここではゲートウェイの外側）',
  ],
];

/** One situation at a time: predict whether it gets through, send, read why (REQ-374). */
function VpcSteps() {
  const t = useT();
  const locale = useGalleryLocale();
  const { engine, isRecomputing } = useSimulation();
  const [index, setIndex] = useState(0);
  const [guess, setGuess] = useState<boolean | null>(null);
  const [result, setResult] = useState<ReturnType<typeof readVpcTrace> | null>(null);
  const [right, setRight] = useState<boolean[]>([]);
  const step = VPC_CASES[index];

  if (!step) {
    return (
      <div style={LESSON_CARD} data-testid="vpc-summary">
        <div style={LESSON_LABEL}>{t('Your predictions', '予想の結果')}</div>
        <p
          style={{ margin: 0, fontWeight: 700 }}
        >{`${right.filter(Boolean).length} / ${VPC_CASES.length}`}</p>
        <button
          type="button"
          data-testid="vpc-again"
          style={{ ...LESSON_BUTTON, marginTop: 8 }}
          onClick={() => {
            setIndex(0);
            setRight([]);
          }}
        >
          {t('Start again', 'もう一度')}
        </button>
      </div>
    );
  }

  const send = async () => {
    const packet = vpcSyn(step);
    await engine.send(packet);
    const trace = engine.getState().traces.find((candidate) => candidate.packetId === packet.id);
    if (!trace) return;
    const seen = readVpcTrace(trace);
    setResult(seen);
    setRight((previous) => [...previous, seen.arrived === guess]);
  };

  const reasonText =
    result?.reason === 'acl-deny'
      ? t('the security group denied it', 'セキュリティグループが拒否')
      : result?.reason === 'no-nat-entry'
        ? t('no address mapping', 'アドレスの対応づけがない')
        : (result?.reason ?? '');

  return (
    <div style={LESSON_CARD} data-testid="vpc-step" data-case={step.id}>
      <div style={LESSON_LABEL}>{`${index + 1} / ${VPC_CASES.length}`}</div>
      <p style={{ margin: 0, lineHeight: 1.7, fontWeight: 700 }}>{step.situation[locale]}</p>
      <div
        role="radiogroup"
        aria-label={t('Your prediction', '予想')}
        style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}
      >
        {[true, false].map((value) => (
          <button
            key={String(value)}
            type="button"
            role="radio"
            aria-checked={guess === value}
            data-testid={`vpc-guess-${value ? 'arrives' : 'stopped'}`}
            disabled={result !== null}
            onClick={() => setGuess(value)}
            style={lessonChoice(guess === value)}
          >
            {guess === value ? '✓ ' : ''}
            {value ? t('It gets through', '届く') : t('It is stopped', '止められる')}
          </button>
        ))}
      </div>
      {result === null ? (
        <button
          type="button"
          data-testid="vpc-send"
          disabled={guess === null || isRecomputing}
          style={{
            ...(guess === null ? LESSON_TEAL_BUTTON_DISABLED : LESSON_TEAL_BUTTON),
            marginTop: 10,
          }}
          onClick={() => void send()}
        >
          {guess === null
            ? t('Predict first', '先に予想を選んでください')
            : t('Send it', '送ってみる')}
        </button>
      ) : (
        <div
          data-testid="vpc-result"
          data-arrived={String(result.arrived)}
          data-right={String(result.arrived === guess)}
          data-reason={result.reason ?? undefined}
          role="status"
          style={{ marginTop: 10 }}
        >
          <p style={{ margin: 0, fontWeight: 700 }}>
            {result.arrived === guess
              ? t('As you predicted. ', '予想どおりです。')
              : t('Not what you predicted. ', '予想とちがいました。')}
            {result.arrived
              ? t(`It reached ${result.endedAt}.`, `${result.endedAt} に届きました。`)
              : t(
                  `Stopped at ${result.endedAt} (${reasonText}).`,
                  `${result.endedAt} で止められました（${reasonText}）。`,
                )}
          </p>
          {result.rewrites.length > 0 && !result.arrived ? (
            <div style={{ ...LESSON_LABEL, marginTop: 6 }}>
              {t('Rewritten before it was stopped:', '止められる前の書き換え：')}
            </div>
          ) : null}
          {result.rewrites.length > 0 ? (
            <ul
              data-testid="vpc-rewrites"
              style={{ margin: '4px 0', paddingLeft: 20, fontFamily: 'monospace', fontSize: 13 }}
            >
              {result.rewrites.map((rewrite) => (
                <li key={rewrite}>{rewrite}</li>
              ))}
            </ul>
          ) : null}
          <p style={{ margin: '4px 0 0', lineHeight: 1.7 }}>{step.explain[locale]}</p>
          <button
            type="button"
            data-testid="vpc-next"
            style={{ ...LESSON_TEAL_BUTTON, marginTop: 10 }}
            onClick={() => {
              setIndex((previous) => previous + 1);
              setGuess(null);
              setResult(null);
            }}
          >
            {t('Next situation', '次の場面へ')}
          </button>
        </div>
      )}
    </div>
  );
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function VpcLesson() {
  const t = useT();
  return (
    <NetlabProvider topology={TOPOLOGY}>
      <SimulationProvider useMainThread>
        <LessonSplit>
          <LessonCanvas canvas={<NetlabCanvas />} />
          <LessonPanel defaultWidth={480} maxWidth={760} style={PANEL_STYLE}>
            <div style={LESSON_CARD}>
              <div style={LESSON_LABEL}>
                {t('A cloud network, as devices', 'クラウドのネットワークを機器で見る')}
              </div>
              <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
                {t(
                  'A cloud provider builds your network from software, but it behaves like routers, NAT and a firewall. Each cloud term below is drawn here as the device that does its job.',
                  'クラウドのネットワークはソフトウェアで作られていますが、ふるまいはルータ・NAT・ファイアウォールと同じです。下のクラウドの用語は、それぞれの仕事をする機器として図に描いてあります。',
                )}
              </p>
              <table
                data-testid="vpc-terms"
                style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}
              >
                <tbody>
                  {TERMS.map(([term, en, ja]) => (
                    <tr key={term}>
                      <td
                        style={{
                          padding: 4,
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          verticalAlign: 'top',
                        }}
                      >
                        {term}
                      </td>
                      <td style={{ padding: 4 }}>{t(en, ja)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <VpcSteps />
            <PacketTimeline />
          </LessonPanel>
        </LessonSplit>
      </SimulationProvider>
    </NetlabProvider>
  );
}

export default function VpcDemo() {
  return (
    <DemoShell
      title="Cloud networks (VPC)"
      desc="Subnets, gateways and a security group, as the devices that do their jobs"
    >
      <VpcLesson />
    </DemoShell>
  );
}
