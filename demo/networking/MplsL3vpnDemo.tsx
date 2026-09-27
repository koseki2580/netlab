import { useMemo, useState, type CSSProperties } from 'react';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { convergeLdp } from '../../src/layers/l3-network/tunneling/MplsLdp';
import { installVpnv4Route } from '../../src/layers/l3-network/tunneling/MplsVrf';
import { pushMplsLabel } from '../../src/layers/l3-network/tunneling/MplsLabelStack';
import type { NetworkTopology } from '../../src/types/topology';
import type { VrfConfig } from '../../src/types/tunneling';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';

const PANEL_STYLE: CSSProperties = {
  border: '1px solid var(--netlab-border-subtle)',
  borderRadius: 8,
  padding: 12,
};

const blue: VrfConfig = {
  name: 'blue',
  rd: { type: 0, value: '65000:10' },
  importRts: [{ type: 0x0002, value: '65000:10' }],
  exportRts: [{ type: 0x0002, value: '65000:10' }],
  attachedInterfaces: ['ce'],
};

const topology: NetworkTopology = {
  nodes: [
    {
      id: 'ce1',
      type: 'router',
      position: { x: 80, y: 250 },
      data: { label: 'CE1', role: 'router', layerId: 'l3' },
    },
    {
      id: 'pe1',
      type: 'router',
      position: { x: 250, y: 250 },
      data: { label: 'PE1', role: 'router', layerId: 'l3', vrfs: [blue] },
    },
    {
      id: 'p1',
      type: 'router',
      position: { x: 450, y: 250 },
      data: { label: 'P', role: 'router', layerId: 'l3' },
    },
    {
      id: 'pe2',
      type: 'router',
      position: { x: 650, y: 250 },
      data: { label: 'PE2', role: 'router', layerId: 'l3', vrfs: [blue] },
    },
    {
      id: 'ce2',
      type: 'router',
      position: { x: 820, y: 250 },
      data: { label: 'CE2', role: 'router', layerId: 'l3' },
    },
  ],
  edges: [
    { id: 'ce1-pe1', source: 'ce1', target: 'pe1' },
    { id: 'pe1-p1', source: 'pe1', target: 'p1' },
    { id: 'p1-pe2', source: 'p1', target: 'pe2' },
    { id: 'pe2-ce2', source: 'pe2', target: 'ce2' },
  ],
  areas: [],
  routeTables: new Map(),
};

export default function MplsL3vpnDemo() {
  return (
    <DemoShell
      title="MPLS L3VPN"
      desc="Inspect LDP labels, a VPNv4 route target import, and the two-label data-plane stack."
    >
      <MplsL3vpnDemoInner />
    </DemoShell>
  );
}

function MplsL3vpnDemoInner() {
  const t = useT();
  const [php, setPhp] = useState(true);
  const ldp = useMemo(
    () => convergeLdp({ routers: ['pe1', 'p1', 'pe2'], fec: '10.0.2.0/24', baseLabel: 16000 }),
    [],
  );
  const imported = installVpnv4Route([blue], {
    rd: blue.rd,
    prefix: '10.0.2.0/24',
    routeTargets: blue.exportRts,
    nextHopPe: '192.0.2.2',
    vpnLabel: 24010,
  });
  const labelOf = (routerId: string) =>
    ldp.mappings.find((mapping) => mapping.routerId === routerId)?.label ?? 0;
  const vpnLabel = { label: 24010, tc: 0, endOfStack: true, ttl: 64 };
  // Each link carries the label its downstream router advertised: PE1 pushes
  // P's label; P swaps it for PE2's, or — when PE2 advertised implicit null
  // (3) for PHP — pops it, so only the VPN label reaches PE2.
  const intoP = pushMplsLabel(pushMplsLabel([], vpnLabel), {
    label: labelOf('p1'),
    tc: 0,
    endOfStack: false,
    ttl: 64,
  });
  const intoPe2 = php
    ? pushMplsLabel([], { ...vpnLabel, ttl: 63 })
    : pushMplsLabel(pushMplsLabel([], vpnLabel), {
        label: labelOf('pe2'),
        tc: 0,
        endOfStack: false,
        ttl: 63,
      });
  const stackText = (stack: typeof intoP) => stack.map((label) => label.label).join(' / ');

  return (
    <NetlabProvider topology={topology}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 360px',
          gap: 16,
          minHeight: 620,
        }}
      >
        <section style={{ minHeight: 560, border: '1px solid var(--netlab-border-subtle)' }}>
          <NetlabCanvas style={{ height: 560 }} />
        </section>
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div data-testid="lesson-brief" style={{ ...PANEL_STYLE, fontSize: 12, lineHeight: 1.7 }}>
            <strong>{t('How the two labels work', '2 つのラベルのしくみ')}</strong>
            <div>
              {t(
                'LDP: each router advertises a label for the route to 10.0.2.0/24 — P 16001, PE2 16002. A router always sends a packet with the label its next router asked for, so P swaps 16001 for 16002. This outer transport label only carries the packet across the core to PE2.',
                'LDP：各ルータは 10.0.2.0/24 への経路にラベルを 1 つ決めて知らせます（P は 16001、PE2 は 16002）。パケットには常に「次のルータが指定したラベル」を付けて送るので、P は 16001 を 16002 に付け替えます。この外側のトランスポートラベルは、コアを越えて PE2 まで運ぶためだけのものです。',
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
          <button
            type="button"
            data-testid="mpls-php-disable"
            onClick={() => setPhp((value) => !value)}
          >
            {php ? t('Disable PHP', 'PHP を無効にする') : t('Enable PHP', 'PHP を有効にする')}
          </button>
          <div style={PANEL_STYLE}>
            <h3 style={{ marginTop: 0 }}>LDP</h3>
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
          <div style={PANEL_STYLE}>
            <h3 style={{ marginTop: 0 }}>L3VPN</h3>
            <div data-testid="vpnv4-route">
              VPNv4: {imported[0]?.routes[0]?.prefix} RT {blue.importRts[0]?.value}
            </div>
            <div data-testid="mpls-stack-pe1-p">
              {t('Labels PE1 → P:', 'ラベル PE1 → P:')} {stackText(intoP)}
            </div>
            <div data-testid="mpls-stack">
              {t('Labels P → PE2:', 'ラベル P → PE2:')} {stackText(intoPe2)}
            </div>
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
    </NetlabProvider>
  );
}
