import { useMemo, useState } from 'react';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { SimulationProvider } from '../../src/simulation/SimulationContext';
import { LessonCanvas, LessonPanel, LessonSplit } from '../components/LessonPanel';
import {
  LESSON_BUTTON,
  LESSON_CARD,
  LESSON_LABEL,
  LESSON_TEAL_BUTTON,
  lessonChoice,
} from '../components/lessonStyles';
import { NetlabProvider } from '../components/PhoneNetlabProvider';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';
import {
  MST_INSTANCES,
  blockedLinks,
  rootPortOf,
  rstpRoles,
  rstpTopology,
  withLinkCut,
  type PortRole,
  type RstpRole,
} from './rstpLesson';

type View = { kind: 'normal' } | { kind: 'cut' } | { kind: 'mst'; instance: 1 | 2 };

const PANEL_STYLE: React.CSSProperties = {
  background: 'var(--netlab-bg-primary)',
  borderLeft: '1px solid var(--netlab-bg-surface)',
  padding: 12,
  display: 'grid',
  gap: 12,
  alignContent: 'start',
};

const ROLE_WORDS: Record<RstpRole, readonly [string, string]> = {
  root: [
    'Root port — its best way to the root bridge',
    'ルートポート：ルートブリッジへのいちばん良い道',
  ],
  designated: ['Designated port — forwards for its link', '指定ポート：その回線のために転送する'],
  alternate: [
    'Alternate port — blocked, a ready replacement',
    '代替ポート：止めてあり、すぐ代われる予備',
  ],
  disabled: ['Disabled — its link is down', '無効：回線が切れている'],
};

const SWITCH_NAMES: Record<string, string> = {
  'switch-a': 'Switch A',
  'switch-b': 'Switch B',
  'switch-c': 'Switch C',
};
const PORT_FACES: Record<string, string> = { ab: 'B', ac: 'C', ba: 'A', bc: 'C', ca: 'A', cb: 'B' };

function RolesTable({ roles, testId }: { roles: readonly PortRole[]; testId: string }) {
  const t = useT();
  return (
    <table data-testid={testId} style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
      <tbody>
        {roles.map((port) => (
          <tr
            key={`${port.switchId}:${port.portId}`}
            data-port={`${port.switchId}:${port.portId}`}
            data-role={port.role}
          >
            <td style={{ padding: 4, whiteSpace: 'nowrap' }}>
              {`${SWITCH_NAMES[port.switchId]} → ${PORT_FACES[port.portId] ?? '?'}`}
            </td>
            <td style={{ padding: 4 }}>{t(...ROLE_WORDS[port.role])}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** The lesson, inside DemoShell so it reads the page's language (L023). */
function RstpLesson() {
  const t = useT();
  const [view, setView] = useState<View>({ kind: 'normal' });
  const [guess, setGuess] = useState<string | null>(null);
  const normal = useMemo(() => rstpTopology(), []);
  const cut = useMemo(() => withLinkCut('switch-c', 'ca'), []);
  const topology =
    view.kind === 'normal'
      ? normal
      : view.kind === 'cut'
        ? cut
        : rstpTopology(MST_INSTANCES[view.instance - 1]!.priorities);
  const roles = useMemo(() => rstpRoles(topology), [topology]);
  const normalRoles = useMemo(() => rstpRoles(normal), [normal]);
  const cutRoles = useMemo(() => rstpRoles(cut), [cut]);
  const newRoot = rootPortOf(cutRoles, 'switch-c');
  const key = view.kind === 'mst' ? `mst-${view.instance}` : view.kind;

  return (
    <NetlabProvider key={key} topology={topology}>
      <SimulationProvider>
        <LessonSplit>
          <LessonCanvas canvas={<NetlabCanvas />} />
          <LessonPanel defaultWidth={460} maxWidth={720} style={PANEL_STYLE}>
            <div style={LESSON_CARD}>
              <div style={LESSON_LABEL}>{t('RSTP port roles', 'RSTP のポートの役割')}</div>
              <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
                {t(
                  'Spanning tree breaks the loop of three switches by blocking one port. RSTP (802.1w) names that port an alternate port: it already knows a second way to the root, so it can take over at once. Switch A has the lowest priority and is the root bridge.',
                  'スパニングツリーは、3 台のスイッチのループを、1 つのポートを止めて断ち切ります。RSTP（802.1w）はそのポートを「代替ポート」と呼びます。ルートへの 2 本目の道をすでに知っているので、すぐに代わりを務められます。優先度がいちばん小さい Switch A がルートブリッジです。',
                )}
              </p>
              <RolesTable roles={normalRoles} testId="rstp-roles" />
            </div>

            <div style={LESSON_CARD} data-testid="rstp-cut">
              <div style={LESSON_LABEL}>
                {t('When the root port’s link fails', 'ルートポートの回線が切れたら')}
              </div>
              <p style={{ margin: '0 0 8px', lineHeight: 1.7, fontWeight: 700 }}>
                {t(
                  'The link between Switch A and Switch C is cut. Which port becomes Switch C’s way to the root?',
                  'Switch A と Switch C のあいだの回線が切れます。Switch C のルートへの道になるのは、どのポートでしょう？',
                )}
              </p>
              <div
                role="radiogroup"
                aria-label={t('Your prediction', '予想')}
                style={{ display: 'grid', gap: 6 }}
              >
                {[
                  {
                    id: 'cb',
                    en: 'Switch C’s port toward Switch B',
                    ja: 'Switch C の、Switch B 側のポート',
                  },
                  {
                    id: 'ch',
                    en: 'Switch C’s port toward its host',
                    ja: 'Switch C の、ホスト側のポート',
                  },
                  { id: 'none', en: 'None: Switch C is cut off', ja: 'ない：Switch C は孤立する' },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={guess === option.id}
                    data-testid={`rstp-guess-${option.id}`}
                    disabled={view.kind === 'cut'}
                    onClick={() => setGuess(option.id)}
                    style={{ ...lessonChoice(guess === option.id), textAlign: 'left' }}
                  >
                    {guess === option.id ? '✓ ' : ''}
                    {t(option.en, option.ja)}
                  </button>
                ))}
              </div>
              {view.kind === 'cut' ? (
                <div
                  data-testid="rstp-cut-result"
                  data-right={String(guess === newRoot)}
                  role="status"
                  style={{ marginTop: 10 }}
                >
                  <p style={{ margin: 0, fontWeight: 700 }}>
                    {guess === newRoot
                      ? t('As you predicted.', '予想どおりです。')
                      : t('Not what you predicted.', '予想とちがいました。')}
                  </p>
                  <RolesTable roles={cutRoles} testId="rstp-roles-after" />
                  <p style={{ margin: '8px 0 0', lineHeight: 1.7 }}>
                    {t(
                      'Switch C’s alternate path, through Switch B, is now its root port, and nothing needs blocking. With RSTP the alternate port moves to forwarding at once — well under a second on a real switch. Classic 802.1D spanning tree has no alternate role: after a failure it waits through listening and learning (15 s each by default, plus up to 20 s of max age when the failure is not seen directly), 30 to 50 seconds with no traffic. The simulator has no clock: these times are the standards’ defaults.',
                      'Switch C の代わりの道（Switch B 経由）がルートポートになり、止めるポートはなくなりました。RSTP では、代替ポートがすぐに転送を始めます（実機では 1 秒もかかりません）。昔の 802.1D のスパニングツリーには代替ポートの役割がなく、障害のあと listening と learning をそれぞれ待ち（既定で 15 秒ずつ、障害を直接検知できないときはさらに max age の最大 20 秒）、30〜50 秒のあいだ通信が止まります。シミュレータには時計がないので、これらの時間は規格の既定値です。',
                    )}
                  </p>
                  <button
                    type="button"
                    data-testid="rstp-restore"
                    style={{ ...LESSON_BUTTON, marginTop: 8 }}
                    onClick={() => {
                      setView({ kind: 'normal' });
                      setGuess(null);
                    }}
                  >
                    {t('Reconnect the link', '回線をつなぎ直す')}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  data-testid="rstp-cut-link"
                  disabled={!guess}
                  style={{ ...LESSON_TEAL_BUTTON, marginTop: 10, opacity: guess ? 1 : 0.5 }}
                  onClick={() => setView({ kind: 'cut' })}
                >
                  {guess
                    ? t('Cut the A–C link', 'A–C の回線を切る')
                    : t('Predict first', '先に予想を選んでください')}
                </button>
              )}
            </div>

            <div style={LESSON_CARD} data-testid="rstp-mst">
              <div style={LESSON_LABEL}>MSTP (802.1s)</div>
              <p style={{ margin: '0 0 8px', lineHeight: 1.7 }}>
                {t(
                  'One spanning tree leaves one link idle for every VLAN. MSTP runs several trees (instances), each for a group of VLANs, and each can have a different root, so different links rest in different instances and every link carries traffic for someone.',
                  'スパニングツリーが 1 つだと、どの VLAN でも同じ回線が休んだままになります。MSTP は、VLAN のまとまりごとに複数のツリー（インスタンス）を動かし、それぞれのルートを変えられます。インスタンスごとに休む回線が変わるので、どの回線もどこかの VLAN の通信を運びます。',
                )}
              </p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {MST_INSTANCES.map((instance) => (
                  <button
                    key={instance.id}
                    type="button"
                    data-testid={`rstp-mst-${instance.id}`}
                    aria-pressed={view.kind === 'mst' && view.instance === instance.id}
                    style={lessonChoice(view.kind === 'mst' && view.instance === instance.id)}
                    onClick={() => setView({ kind: 'mst', instance: instance.id })}
                  >
                    {t(
                      `Instance ${instance.id} (VLAN ${instance.vlans})`,
                      `インスタンス ${instance.id}（VLAN ${instance.vlans}）`,
                    )}
                  </button>
                ))}
              </div>
              {view.kind === 'mst' ? (
                <p data-testid="rstp-mst-blocked" style={{ margin: '8px 0 0' }}>
                  {t(
                    `Root: ${view.instance === 1 ? 'Switch A' : 'Switch B'}. Resting link: ${blockedLinks(roles).join(', ')}.`,
                    `ルート：${view.instance === 1 ? 'Switch A' : 'Switch B'}。休んでいる回線：${blockedLinks(roles).join('、')}。`,
                  )}
                </p>
              ) : null}
            </div>
          </LessonPanel>
        </LessonSplit>
      </SimulationProvider>
    </NetlabProvider>
  );
}

export default function RstpDemo() {
  return (
    <DemoShell
      title="RSTP and MSTP"
      desc="Alternate ports that take over at once, and one spanning tree per group of VLANs"
    >
      <RstpLesson />
    </DemoShell>
  );
}
