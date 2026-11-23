import { useMemo, useState } from 'react';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { PacketTimeline } from '../../src/components/simulation/PacketTimeline';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import { LessonCanvas, LessonPanel, LessonSplit } from '../components/LessonPanel';
import {
  LESSON_CARD,
  LESSON_LABEL,
  LESSON_TEAL_BUTTON,
  LESSON_TEAL_BUTTON_DISABLED,
  lessonChoice,
} from '../components/lessonStyles';
import { NetlabProvider } from '../components/PhoneNetlabProvider';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';
import { POLICIES, SID, readSrPath, srTopology, type SrPolicy } from './srLesson';

const PANEL_STYLE: React.CSSProperties = {
  background: 'var(--netlab-bg-primary)',
  borderLeft: '1px solid var(--netlab-bg-surface)',
  padding: 12,
  display: 'grid',
  gap: 12,
  alignContent: 'start',
};

const PATHS = [
  { id: 'R1, R2, R4', en: 'R1 → R2 → R4', ja: 'R1 → R2 → R4' },
  { id: 'R1, R3, R4', en: 'R1 → R3 → R4', ja: 'R1 → R3 → R4' },
  { id: 'R1, R2, R3, R4', en: 'R1 → R2 → R3 → R4', ja: 'R1 → R2 → R3 → R4' },
] as const;

/** Sends h1's ping with one stack and shows what each router did to it. */
function SrRun({ policy }: { policy: SrPolicy }) {
  const t = useT();
  const { engine, isRecomputing } = useSimulation();
  const [guess, setGuess] = useState<string | null>(null);
  const [seen, setSeen] = useState<ReturnType<typeof readSrPath> | null>(null);
  const stack = POLICIES[policy].join(' | ');

  return (
    <div style={LESSON_CARD} data-testid={`sr-run-${policy}`}>
      <div style={LESSON_LABEL}>{t(`R1 pushes: ${stack}`, `R1 が積むラベル：${stack}`)}</div>
      {policy === 'shortest' ? (
        <p style={{ margin: '0 0 8px', lineHeight: 1.7 }} data-testid="sr-tie-note">
          {t(
            'With one SID, R1 follows its route to R4, which goes via R2 (in this lesson R1’s table prefers R2; a real IGP would pick the lower-cost path or share both).',
            'SID が 1 つのとき、R1 は R4 への自分の経路に従い、その経路は R2 を通ります（このレッスンでは R1 の経路表が R2 を選ぶようにしてあります。実際の IGP なら、コストの低い道を選ぶか、両方に分散します）。',
          )}
        </p>
      ) : null}
      <p style={{ margin: '0 0 8px', fontWeight: 700 }}>
        {t(
          'h1 pings h4. Which routers does it cross on the way?',
          'h1 が h4 に ping します。行きに通るルータは？',
        )}
      </p>
      <div
        role="radiogroup"
        aria-label={t('Your prediction', '予想')}
        style={{ display: 'grid', gap: 6 }}
      >
        {PATHS.map((path) => (
          <button
            key={path.id}
            type="button"
            role="radio"
            aria-checked={guess === path.id}
            data-testid={`sr-guess-${policy}-${path.id.replace(/\W+/g, '')}`}
            disabled={seen !== null}
            onClick={() => setGuess(path.id)}
            style={{ ...lessonChoice(guess === path.id), textAlign: 'left' }}
          >
            {guess === path.id ? '✓ ' : ''}
            {t(path.en, path.ja)}
          </button>
        ))}
      </div>
      {seen === null ? (
        <button
          type="button"
          data-testid={`sr-send-${policy}`}
          disabled={!guess || isRecomputing}
          style={{ ...(guess ? LESSON_TEAL_BUTTON : LESSON_TEAL_BUTTON_DISABLED), marginTop: 8 }}
          onClick={() =>
            void engine.ping('h1', '10.4.0.10').then((trace) => setSeen(readSrPath(trace)))
          }
        >
          {guess
            ? t('Send the ping', 'ping を送る')
            : t('Predict first', '先に予想を選んでください')}
        </button>
      ) : (
        <div
          data-testid={`sr-result-${policy}`}
          data-path={seen.routers.join(', ')}
          data-right={String(guess === seen.routers.join(', '))}
          role="status"
          style={{ marginTop: 8 }}
        >
          <p style={{ margin: 0, fontWeight: 700 }}>
            {guess === seen.routers.join(', ')
              ? t('As you predicted: ', '予想どおり：')
              : t('Not what you predicted: ', '予想とちがいました：')}
            {seen.routers.join(' → ')}
          </p>
          <ul style={{ margin: '4px 0 0', paddingLeft: 20, fontFamily: 'monospace', fontSize: 13 }}>
            {seen.labels.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function SrLesson() {
  const t = useT();
  const [policy, setPolicy] = useState<SrPolicy>('shortest');
  const topology = useMemo(() => srTopology(policy), [policy]);
  return (
    <NetlabProvider key={policy} topology={topology}>
      <SimulationProvider useMainThread>
        <LessonSplit>
          <LessonCanvas canvas={<NetlabCanvas />} />
          <LessonPanel defaultWidth={460} maxWidth={720} style={PANEL_STYLE}>
            <div style={LESSON_CARD}>
              <div style={LESSON_LABEL}>
                {t('Segment routing (SR-MPLS)', 'セグメントルーティング（SR-MPLS）')}
              </div>
              <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
                {t(
                  'Every router has a node SID, a label every router knows: “take me to this router”. The first router writes the path into the packet as a stack of SIDs; each router reads only the top one, and pops it when it is its own. The routers in between keep nothing per path. (This lesson turns penultimate-hop popping off; with it on, the SR-MPLS default, the hop before the owner pops the SID instead.)',
                  '各ルータには、全員が知っている「このルータまで連れていって」というラベル、ノード SID があります。最初のルータが、通る道を SID の積み重ねとしてパケットに書き込み、各ルータはいちばん上だけを読み、自分の SID なら外します。途中のルータは、経路ごとの状態を何も持ちません（このレッスンでは PHP を無効にしています。既定の PHP ありでは、SID を持つルータの 1 つ手前で外されます）。',
                )}
              </p>
              <table
                data-testid="sr-sids"
                style={{ borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: 13 }}
              >
                <tbody>
                  {Object.entries(SID).map(([router, sid]) => (
                    <tr key={router}>
                      <td style={{ padding: '2px 12px 2px 0' }}>{router.toUpperCase()}</td>
                      <td>{sid}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div role="tablist" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(['shortest', 'via-r3'] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={policy === id}
                  data-testid={`sr-policy-${id}`}
                  onClick={() => setPolicy(id)}
                  style={lessonChoice(policy === id)}
                >
                  {id === 'shortest'
                    ? t('One SID: R4', 'SID 1 つ：R4')
                    : t('Two SIDs: R3, then R4', 'SID 2 つ：R3、続けて R4')}
                </button>
              ))}
            </div>
            <SrRun key={policy} policy={policy} />
            <div style={LESSON_CARD}>
              <p style={{ margin: 0, lineHeight: 1.7, color: 'var(--netlab-text-secondary)' }}>
                {t(
                  'Only R1’s stack changes between the two: steering traffic onto another path (traffic engineering) needs no signalling and no state in the core, unlike RSVP-TE tunnels. SRv6 does the same with IPv6 addresses as SIDs, carried in a routing header.',
                  '2 つで変わるのは R1 が積むラベルだけです。通信を別の道へ振り向ける（トラフィックエンジニアリング）のに、RSVP-TE のトンネルと違って、シグナリングも途中のルータの状態もいりません。SRv6 は同じことを、IPv6 アドレスを SID にして、ルーティングヘッダに載せて行います。',
                )}
              </p>
            </div>
            <PacketTimeline />
          </LessonPanel>
        </LessonSplit>
      </SimulationProvider>
    </NetlabProvider>
  );
}

export default function SegmentRoutingDemo() {
  return (
    <DemoShell
      title="Segment routing"
      desc="The path written into the packet as a stack of labels, with no per-path state in the core"
    >
      <SrLesson />
    </DemoShell>
  );
}
