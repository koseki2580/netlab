import { useEffect, useState } from 'react';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { NetlabProvider } from '../components/PhoneNetlabProvider';
import { convergeLdp } from '../../src/layers/l3-network/tunneling/MplsLdp';
import { installVpnv4Route } from '../../src/layers/l3-network/tunneling/MplsVrf';
import { PacketStructureViewer } from '../../src/components/simulation/PacketStructureViewer';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import type { RouterInterface } from '../../src/types/routing';
import type { NetlabNode, NetworkTopology } from '../../src/types/topology';
import type { MplsTables, VrfConfig } from '../../src/types/tunneling';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';
import { LESSON_PANEL } from '../components/lessonStyles';

const blue: VrfConfig = {
  name: 'blue',
  rd: { type: 0, value: '65000:10' },
  importRts: [{ type: 0x0002, value: '65000:10' }],
  exportRts: [{ type: 0x0002, value: '65000:10' }],
  attachedInterfaces: ['ce'],
};

interface Route {
  destination: string;
  nextHop: string;
  metric: number;
}
const direct = (destination: string): Route => ({ destination, nextHop: 'direct', metric: 0 });
const via = (destination: string, nextHop: string): Route => ({ destination, nextHop, metric: 10 });
const iface = (
  id: string,
  ipAddress: string,
  prefixLength: number,
  macAddress: string,
): RouterInterface => ({
  id,
  name: id,
  ipAddress,
  prefixLength,
  macAddress,
});

const toCe2 = convergeLdp({ routers: ['pe1', 'p1', 'pe2'], fec: '10.0.2.0/24', baseLabel: 16000 });
const toCe1 = convergeLdp({ routers: ['pe2', 'p1', 'pe1'], fec: '10.0.1.0/24', baseLabel: 16010 });
const labelIn = (ldp: typeof toCe2, routerId: string) =>
  ldp.mappings.find((mapping) => mapping.routerId === routerId)?.label ?? 0;
const VPN_TO_CE2 = 24010;
const VPN_TO_CE1 = 24020;

/**
 * CE1 — PE1 — P — PE2 — CE2. The labels come from LDP and the VPN routes from BGP,
 * both worked out here (not signalled on the wire); the engine then pushes, swaps
 * and pops them (REQ-334). P has no route to either customer: it forwards by label.
 */
export function mplsTopology(php: boolean, pHasLabels = true): NetworkTopology {
  const pop = (ldp: typeof toCe2, egress: string, nextHop: string) =>
    php
      ? { inLabel: labelIn(ldp, 'p1'), action: 'pop' as const, nextHop }
      : {
          inLabel: labelIn(ldp, 'p1'),
          action: 'swap' as const,
          outLabel: labelIn(ldp, egress),
          nextHop,
        };
  const router = (
    id: string,
    label: string,
    x: number,
    interfaces: RouterInterface[],
    staticRoutes: Route[],
    mpls: MplsTables,
  ): NetlabNode => ({
    id,
    type: 'router',
    position: { x, y: 250 },
    data: {
      label,
      role: 'router',
      layerId: 'l3',
      interfaces,
      staticRoutes,
      mpls,
      ...(id.startsWith('pe') ? { vrfs: [blue] } : {}),
    },
  });
  return {
    nodes: [
      {
        id: 'ce1',
        type: 'client',
        position: { x: 80, y: 250 },
        data: { label: 'CE1', role: 'client', layerId: 'l7', ip: '10.0.1.10' },
      },
      router(
        'pe1',
        'PE1',
        250,
        [
          iface('pe1-c', '10.0.1.1', 24, '02:00:00:00:01:01'),
          iface('pe1-p', '10.255.12.1', 30, '02:00:00:00:01:02'),
        ],
        [direct('10.0.1.0/24'), direct('10.255.12.0/30'), via('10.255.23.0/30', '10.255.12.2')],
        {
          ftn: [
            {
              prefix: '10.0.2.0/24',
              push: [labelIn(toCe2, 'p1'), VPN_TO_CE2],
              nextHop: '10.255.12.2',
            },
          ],
          lfib: [
            { inLabel: labelIn(toCe1, 'pe1'), action: 'pop' },
            { inLabel: VPN_TO_CE1, action: 'pop' },
          ],
        },
      ),
      router(
        'p1',
        'P',
        450,
        [
          iface('p-1', '10.255.12.2', 30, '02:00:00:00:09:01'),
          iface('p-2', '10.255.23.1', 30, '02:00:00:00:09:02'),
        ],
        [direct('10.255.12.0/30'), direct('10.255.23.0/30')],
        {
          lfib: pHasLabels
            ? [pop(toCe2, 'pe2', '10.255.23.2'), pop(toCe1, 'pe1', '10.255.12.1')]
            : [],
        },
      ),
      router(
        'pe2',
        'PE2',
        650,
        [
          iface('pe2-p', '10.255.23.2', 30, '02:00:00:00:02:02'),
          iface('pe2-c', '10.0.2.1', 24, '02:00:00:00:02:01'),
        ],
        [direct('10.0.2.0/24'), direct('10.255.23.0/30'), via('10.255.12.0/30', '10.255.23.1')],
        {
          ftn: [
            {
              prefix: '10.0.1.0/24',
              push: [labelIn(toCe1, 'p1'), VPN_TO_CE1],
              nextHop: '10.255.23.1',
            },
          ],
          lfib: [
            { inLabel: labelIn(toCe2, 'pe2'), action: 'pop' },
            { inLabel: VPN_TO_CE2, action: 'pop' },
          ],
        },
      ),
      {
        id: 'ce2',
        type: 'server',
        position: { x: 820, y: 250 },
        data: { label: 'CE2', role: 'server', layerId: 'l7', ip: '10.0.2.10' },
      },
    ],
    edges: [
      { id: 'ce1-pe1', source: 'ce1', target: 'pe1', targetHandle: 'pe1-c' },
      { id: 'pe1-p1', source: 'pe1', target: 'p1', sourceHandle: 'pe1-p', targetHandle: 'p-1' },
      { id: 'p1-pe2', source: 'p1', target: 'pe2', sourceHandle: 'p-2', targetHandle: 'pe2-p' },
      { id: 'pe2-ce2', source: 'pe2', target: 'ce2', sourceHandle: 'pe2-c' },
    ],
    areas: [],
    routeTables: new Map(),
  };
}

export default function MplsL3vpnDemo() {
  const [php, setPhp] = useState(true);
  const [pHasLabels, setPHasLabels] = useState(true);
  return (
    <DemoShell
      title="MPLS L3VPN"
      desc="Send a packet across an MPLS provider: LDP labels, a VPN label, and PHP, pushed, swapped and popped by the engine."
    >
      <NetlabProvider key={`${php}-${pHasLabels}`} topology={mplsTopology(php, pHasLabels)}>
        <SimulationProvider>
          <MplsL3vpnDemoInner
            php={php}
            onPhp={setPhp}
            pHasLabels={pHasLabels}
            onPLabels={setPHasLabels}
          />
        </SimulationProvider>
      </NetlabProvider>
    </DemoShell>
  );
}

function MplsL3vpnDemoInner({
  php,
  onPhp,
  pHasLabels,
  onPLabels,
}: {
  php: boolean;
  onPhp: (php: boolean) => void;
  pHasLabels: boolean;
  onPLabels: (has: boolean) => void;
}) {
  const t = useT();
  const { engine } = useSimulation();
  const [run, setRun] = useState<{ intoP: number[]; intoPe2: number[]; delivered: boolean } | null>(
    null,
  );
  const ldp = toCe2;
  const imported = installVpnv4Route([blue], {
    rd: blue.rd,
    prefix: '10.0.2.0/24',
    routeTargets: blue.exportRts,
    nextHopPe: '192.0.2.2',
    vpnLabel: VPN_TO_CE2,
  });

  // The stacks on each link are what the engine put on the wire.
  const send = async () => {
    engine.clear();
    const trace = await engine.ping('ce1', '10.0.2.10');
    const after = (nodeId: string) =>
      trace.hops.find((hop) => hop.nodeId === nodeId && hop.mpls)?.mpls?.after ?? [];
    const onCable = trace.hops.find(
      (hop) => hop.nodeId === 'pe1' && hop.event === 'forward' && !hop.mpls,
    );
    engine.selectTrace(trace.packetId);
    if (onCable) engine.selectHop(onCable.step);
    setRun({ intoP: after('pe1'), intoPe2: after('p1'), delivered: trace.status === 'delivered' });
  };
  useEffect(() => {
    void send();
    // Each topology is a new engine; send once on it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);
  const stackText = (labels: readonly number[] | undefined) =>
    labels?.length ? labels.join(' / ') : '—';

  return (
    <div
      data-lesson-grid=""
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 360px',
        gap: 16,
        minHeight: 620,
      }}
    >
      <section style={{ minHeight: 560, border: '1px solid var(--netlab-border-subtle)' }}>
        <NetlabCanvas style={{ height: 300 }} />
        <div data-testid="mpls-hex">
          <PacketStructureViewer />
        </div>
      </section>
      <aside style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div data-testid="lesson-brief" style={{ ...LESSON_PANEL, fontSize: 12, lineHeight: 1.7 }}>
          <strong>{t('How the two labels work', '2 つのラベルのしくみ')}</strong>
          {/* The default screen has PHP on, where P pops; "P always swaps"
                contradicted the stack shown below it. */}
          <div data-testid="mpls-ldp-brief">
            {php
              ? t(
                  'LDP: each router advertises a label for the route to 10.0.2.0/24. P advertises 16001; PE2, with PHP on as now, advertises label 3 (implicit null). A router sends a packet with the label its next router asked for, so PE1 sends 16001 to P, and P pops the transport label instead of swapping it. This outer transport label only carries the packet across the core to PE2.',
                  'LDP：各ルータは 10.0.2.0/24 への経路にラベルを 1 つ決めて知らせます。P は 16001 です。いまは PHP が有効なので、PE2 はラベル 3（implicit null）を知らせます。パケットには「次のルータが指定したラベル」を付けて送るので、PE1 は P へ 16001 を付けて送り、P はトランスポートラベルを付け替えずに外します。この外側のトランスポートラベルは、コアを越えて PE2 まで運ぶためだけのものです。',
                )
              : t(
                  'LDP: each router advertises a label for the route to 10.0.2.0/24 — P 16001, PE2 16002. A router sends a packet with the label its next router asked for, so with PHP off P swaps 16001 for 16002. This outer transport label only carries the packet across the core to PE2.',
                  'LDP：各ルータは 10.0.2.0/24 への経路にラベルを 1 つ決めて知らせます（P は 16001、PE2 は 16002）。パケットには「次のルータが指定したラベル」を付けて送るので、PHP が無効なら P は 16001 を 16002 に付け替えます。この外側のトランスポートラベルは、コアを越えて PE2 まで運ぶためだけのものです。',
                )}
          </div>
          <div>
            {t(
              'VPN: PE2 learned customer blue’s route over BGP (VPNv4) and gave it label 24010. PE1 puts 24010 underneath; it is untouched in the core, and PE2 uses it to pick the VRF (blue) to deliver into.',
              'VPN：PE2 は顧客 blue の経路を BGP（VPNv4）で知らせ、ラベル 24010 を付けました。PE1 はこの 24010 を内側に付けます。コアでは触られず、PE2 はこれを見て届け先の VRF（blue）を選びます。',
            )}
          </div>
          <div>
            {t(
              'PHP (penultimate hop popping): PE2 advertises the reserved label 3, “implicit null”, meaning “pop it before me”. P then removes the transport label, and only 24010 reaches PE2 — one lookup fewer. Label 3 itself never appears on a link.',
              'PHP（最後から 2 番目のホップでの取り外し）：PE2 は予約ラベル 3「implicit null」（手前で外して、という意味）を知らせます。すると P がトランスポートラベルを外し、PE2 には 24010 だけが届くので、検索が 1 回減ります。3 というラベル自体が回線に流れることはありません。',
            )}
          </div>
        </div>
        <button type="button" data-testid="mpls-php-disable" onClick={() => onPhp(!php)}>
          {php ? t('Disable PHP', 'PHP を無効にする') : t('Enable PHP', 'PHP を有効にする')}
        </button>
        <div style={LESSON_PANEL}>
          <h3 style={{ marginTop: 0 }}>
            {t('LDP (worked out, not sent)', 'LDP（計算のみ、送信はしない）')}
          </h3>
          <div data-testid="mpls-ldp">
            {ldp.converged
              ? t(`LDP: converged in ${ldp.steps} steps`, `LDP: ${ldp.steps} ステップで収束`)
              : t(`LDP: pending in ${ldp.steps} steps`, `LDP: ${ldp.steps} ステップ時点で未収束`)}
          </div>
          <div data-testid="mpls-mapping">
            {t('Label mapping:', 'ラベルの割り当て:')}{' '}
            {ldp.mappings
              .map((m) =>
                php && m.routerId === 'pe2'
                  ? `${m.routerId}:3 (implicit null)`
                  : `${m.routerId}:${m.label}`,
              )
              .join(' ')}
          </div>
        </div>
        <div style={LESSON_PANEL}>
          <h3 style={{ marginTop: 0 }}>L3VPN</h3>
          <div data-testid="vpnv4-route">
            VPNv4: {imported[0]?.routes[0]?.prefix} RT {blue.importRts[0]?.value}
          </div>
          <div data-testid="mpls-stack-pe1-p">
            {t('Labels PE1 → P:', 'ラベル PE1 → P:')} {stackText(run?.intoP)}
          </div>
          <div data-testid="mpls-stack">
            {t('Labels P → PE2:', 'ラベル P → PE2:')} {stackText(run?.intoPe2)}
          </div>
          <div data-testid="mpls-status">
            {!run
              ? '—'
              : run.delivered
                ? t(
                    'Delivered to CE2 by labels across the core',
                    'ラベルでコアを越え、CE2 に届きました',
                  )
                : t(
                    'Dropped at P: it has no entry for the label',
                    'P で捨てられました：そのラベルの登録がありません',
                  )}
          </div>
          <button
            type="button"
            data-testid="mpls-remove-p-labels"
            onClick={() => onPLabels(!pHasLabels)}
          >
            {pHasLabels
              ? t('Remove P’s label table', 'P のラベル表を消す')
              : t('Restore P’s label table', 'P のラベル表を戻す')}
          </button>
          <div data-testid="mpls-php">
            {php
              ? t(
                  'PHP active: penultimate hop pops transport label',
                  'PHP 有効: 最後から2番目のホップがトランスポートラベルを外します',
                )
              : t(
                  'PHP disabled: transport label remains',
                  'PHP 無効: トランスポートラベルは残ります',
                )}
          </div>
        </div>
      </aside>
    </div>
  );
}
