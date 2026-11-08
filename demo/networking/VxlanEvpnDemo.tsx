import { useState } from 'react';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { PacketStructureViewer } from '../../src/components/simulation/PacketStructureViewer';
import { answerArpFromEvpnCache } from '../../src/layers/l3-network/tunneling/ArpSuppression';
import {
  advertiseType2,
  advertiseType5,
  learnType2,
} from '../../src/layers/l3-network/tunneling/EvpnControlPlane';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import type { RouterInterface } from '../../src/types/routing';
import type { HopTunnel } from '../../src/types/simulation';
import type { NetlabNode, NetworkTopology } from '../../src/types/topology';
import { NetlabProvider } from '../components/PhoneNetlabProvider';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';
import { LESSON_PANEL } from '../components/lessonStyles';

const VNI = 10000;
const OTHER_VNI = 20000;
const HOST_B_MAC = '02:00:00:00:00:0b';

const iface = (
  id: string,
  ipAddress: string,
  prefixLength: number,
  macAddress: string,
): RouterInterface => ({ id, name: id, ipAddress, prefixLength, macAddress });

interface Route {
  destination: string;
  nextHop: string;
  metric: number;
}
const direct = (destination: string): Route => ({ destination, nextHop: 'direct', metric: 0 });
const via = (destination: string, nextHop: string): Route => ({ destination, nextHop, metric: 10 });

const leaf = (
  id: string,
  label: string,
  x: number,
  lan: [string, string],
  up: string,
  mac: string,
  vni: number,
  peer: string,
  staticRoutes: Route[],
): NetlabNode => ({
  id,
  type: 'router',
  position: { x, y: 220 },
  data: {
    label,
    role: 'router',
    layerId: 'l3',
    interfaces: [
      iface(`${id}-lan`, lan[0], 24, `${mac}:01`),
      iface(`${id}-up`, up, 30, `${mac}:02`),
    ],
    vtep: { vni, sourceVtepIp: up, peerVtepIps: [peer], arpSuppression: true },
    staticRoutes: [direct(lan[1]), ...staticRoutes],
  },
});

/** Host A — Leaf1 VTEP — Spine — Leaf2 VTEP — Host B: an EVPN fabric routing between leaves. */
export function vxlanTopology(leaf2Vni: number): NetworkTopology {
  return {
    nodes: [
      {
        id: 'host-a',
        type: 'client',
        position: { x: 180, y: 390 },
        data: { label: 'Host A', role: 'client', layerId: 'l7', ip: '10.10.0.10' },
      },
      leaf(
        'leaf1',
        'Leaf1 VTEP',
        180,
        ['10.10.0.1', '10.10.0.0/24'],
        '192.0.2.1',
        '02:00:00:00:01',
        VNI,
        '192.0.2.5',
        [
          direct('192.0.2.0/30'),
          via('192.0.2.4/30', '192.0.2.2'),
          via('10.20.0.0/24', '192.0.2.5'),
        ],
      ),
      {
        id: 'spine',
        type: 'router',
        position: { x: 430, y: 220 },
        data: {
          label: 'Spine',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            iface('s1', '192.0.2.2', 30, '02:00:00:00:09:01'),
            iface('s2', '192.0.2.6', 30, '02:00:00:00:09:02'),
          ],
          staticRoutes: [direct('192.0.2.0/30'), direct('192.0.2.4/30')],
        },
      },
      leaf(
        'leaf2',
        'Leaf2 VTEP',
        680,
        ['10.20.0.1', '10.20.0.0/24'],
        '192.0.2.5',
        '02:00:00:00:02',
        leaf2Vni,
        '192.0.2.1',
        [
          direct('192.0.2.4/30'),
          via('192.0.2.0/30', '192.0.2.6'),
          via('10.10.0.0/24', '192.0.2.1'),
        ],
      ),
      {
        id: 'host-b',
        type: 'server',
        position: { x: 680, y: 390 },
        data: { label: 'Host B', role: 'server', layerId: 'l7', ip: '10.20.0.10', mac: HOST_B_MAC },
      },
    ],
    edges: [
      { id: 'host-a-leaf1', source: 'host-a', target: 'leaf1', targetHandle: 'leaf1-lan' },
      {
        id: 'leaf1-spine',
        source: 'leaf1',
        target: 'spine',
        sourceHandle: 'leaf1-up',
        targetHandle: 's1',
      },
      {
        id: 'spine-leaf2',
        source: 'spine',
        target: 'leaf2',
        sourceHandle: 's2',
        targetHandle: 'leaf2-up',
      },
      { id: 'host-b-leaf2', source: 'leaf2', target: 'host-b', sourceHandle: 'leaf2-lan' },
    ],
    areas: [],
    routeTables: new Map(),
  };
}

export default function VxlanEvpnDemo() {
  const [leaf2Vni, setLeaf2Vni] = useState(VNI);
  return (
    <DemoShell
      title="VXLAN EVPN"
      desc="Send a ping across a VXLAN fabric and read its UDP/4789 bytes."
    >
      <NetlabProvider key={leaf2Vni} topology={vxlanTopology(leaf2Vni)}>
        <SimulationProvider>
          <VxlanEvpnDemoInner leaf2Vni={leaf2Vni} onChangeVni={setLeaf2Vni} />
        </SimulationProvider>
      </NetlabProvider>
    </DemoShell>
  );
}

function VxlanEvpnDemoInner({
  leaf2Vni,
  onChangeVni,
}: {
  leaf2Vni: number;
  onChangeVni: (vni: number) => void;
}) {
  const t = useT();
  const { engine } = useSimulation();
  const [result, setResult] = useState<{ tunnel: HopTunnel; delivered: boolean } | null>(null);
  const [suppression, setSuppression] = useState(true);

  // EVPN, worked out by the lesson rather than sent on the wire.
  const rd = { type: 0 as const, value: '65000:10000' };
  const type2 = advertiseType2({
    rd,
    vni: VNI,
    mac: HOST_B_MAC,
    ip: '10.20.0.10',
    originVtepIp: '192.0.2.5',
  });
  const type5 = advertiseType5({
    rd,
    vni: VNI,
    prefix: '10.20.0.0/24',
    gatewayIp: '10.20.0.1',
    originVtepIp: '192.0.2.5',
  });
  const arp = suppression
    ? answerArpFromEvpnCache([learnType2(type2)], { vni: VNI, targetIp: '10.20.0.10' })
    : { action: 'flood' as const };

  const send = async () => {
    engine.clear();
    const trace = await engine.ping('host-a', '10.20.0.10');
    const wrap = trace.hops.find((hop) => hop.tunnel?.stage === 'encap');
    const spine = trace.hops.find((hop) => hop.nodeId === 'spine' && hop.dstPort === 4789);
    engine.selectTrace(trace.packetId);
    if (spine) engine.selectHop(spine.step);
    if (wrap?.tunnel) setResult({ tunnel: wrap.tunnel, delivered: trace.status === 'delivered' });
  };

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
        <div data-testid="vxlan-hex">
          <PacketStructureViewer />
        </div>
      </section>
      <aside style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div data-testid="lesson-brief" style={{ ...LESSON_PANEL, fontSize: 12, lineHeight: 1.7 }}>
          <strong>{t('What you are looking at', 'この画面の見方')}</strong>
          <div>
            {t(
              'Host A (10.10.0.0/24) and Host B (10.20.0.0/24) sit behind two leaves of a routed fabric. Each leaf is a VTEP (VXLAN tunnel endpoint). Send a ping: Leaf1 (192.0.2.1) routes it, wraps it in an Ethernet frame from its own MAC to Leaf2’s, and sends that in UDP to port 4789 across the spine to Leaf2 (192.0.2.5), which unwraps it and routes it to Host B. The VNI, 10000, names the network the frame belongs to — like a VLAN number, but 24 bits. This is symmetric IRB: both leaves route.',
              'Host A（10.10.0.0/24）と Host B（10.20.0.0/24）は、ルーティングされたファブリックの 2 台のリーフの先にいます。各リーフは VTEP（VXLAN トンネルの端点）です。ping を送ると、Leaf1（192.0.2.1）はそれをルーティングし、自分の MAC から Leaf2 の MAC への Ethernet フレームで包み、UDP のポート 4789 あてにしてスパイン越しに Leaf2（192.0.2.5）へ送ります。Leaf2 は包みを外し、Host B へルーティングします。VNI の 10000 は、そのフレームが属するネットワークを示す番号です（VLAN 番号に似ていますが 24 ビット）。両方のリーフがルーティングする、対称 IRB という方式です。',
            )}
          </div>
          <div>
            {t(
              'EVPN is BGP telling every leaf where hosts are. Here the lesson works the routes out itself; they are not sent as packets. A Type-2 route says “this MAC and IP sit behind this VTEP”; a Type-5 route advertises a whole prefix (10.20.0.0/24), which is why Leaf1 sends 10.20.0.0/24 to Leaf2.',
              'EVPN は、ホストがどこにいるかを BGP で全リーフへ知らせるしくみです。ここでは経路をレッスン自身が計算していて、パケットとしては送っていません。Type-2 経路は「この MAC と IP はこの VTEP の先にいる」、Type-5 経路はプレフィックス全体（10.20.0.0/24）を知らせます。だから Leaf1 は 10.20.0.0/24 を Leaf2 へ送ります。',
            )}
          </div>
        </div>
        <button type="button" data-testid="vxlan-send" onClick={() => void send()}>
          {t('Send a ping across the fabric', 'ファブリック越しに ping を送る')}
        </button>
        <button
          type="button"
          data-testid="vxlan-vni-change"
          onClick={() => onChangeVni(leaf2Vni === VNI ? OTHER_VNI : VNI)}
        >
          {leaf2Vni === VNI
            ? t('Give Leaf2 another VNI', 'Leaf2 に別の VNI を付ける')
            : t('Restore Leaf2’s VNI', 'Leaf2 の VNI を元に戻す')}
        </button>
        <div style={LESSON_PANEL}>
          <h3 style={{ marginTop: 0 }}>VXLAN</h3>
          <div data-testid="vxlan-outer">
            {result
              ? `${t('Outer', '外側')} ${result.tunnel.outerSrc} → ${result.tunnel.outerDst} UDP/4789 VNI ${result.tunnel.key}`
              : t('Send a ping to see it.', 'ping を送ると表示されます。')}
          </div>
          <div data-testid="vxlan-inner">
            {result
              ? `${t('Inner', '内側')} ${result.tunnel.innerSrc} → ${result.tunnel.innerDst}`
              : '—'}
          </div>
          <div data-testid="vxlan-status">
            {!result
              ? '—'
              : result.delivered
                ? t('Delivered across the fabric', 'ファブリックを越えて届きました')
                : t(
                    'Dropped at Leaf2: the VNIs do not match',
                    'Leaf2 で捨てられました：VNI が一致しません',
                  )}
          </div>
        </div>
        <div style={LESSON_PANEL}>
          <h3 style={{ marginTop: 0 }}>
            {t('EVPN (worked out, not sent)', 'EVPN（計算のみ、送信はしない）')}
          </h3>
          <div data-testid="evpn-type2">
            Type-2: {type2.mac} / {type2.ip}
          </div>
          <div data-testid="evpn-type5">Type-5: {type5.prefix}</div>
          <button
            type="button"
            data-testid="arp-suppression-toggle"
            onClick={() => setSuppression((value) => !value)}
          >
            {suppression
              ? t('Disable ARP Suppression', 'ARP 抑止を無効にする')
              : t('Enable ARP Suppression', 'ARP 抑止を有効にする')}
          </button>
          <div data-testid="arp-suppression">
            {arp.action === 'reply'
              ? t(`ARP suppression hit: ${arp.mac}`, `ARP 抑止でヒット: ${arp.mac}`)
              : t('ARP suppression miss: flood', 'ARP 抑止でミス: フラッディングします')}
          </div>
        </div>
      </aside>
    </div>
  );
}
