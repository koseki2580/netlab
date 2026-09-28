import { useMemo, useState, type CSSProperties } from 'react';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { answerArpFromEvpnCache } from '../../src/layers/l3-network/tunneling/ArpSuppression';
import {
  advertiseType2,
  advertiseType5,
  learnType2,
} from '../../src/layers/l3-network/tunneling/EvpnControlPlane';
import { encapVxlan } from '../../src/layers/l3-network/tunneling/VxlanEncap';
import type { EthernetFrame } from '../../src/types/packets';
import type { NetworkTopology } from '../../src/types/topology';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';

const PANEL_STYLE: CSSProperties = {
  border: '1px solid var(--netlab-border-subtle)',
  borderRadius: 8,
  padding: 12,
};

const frame: EthernetFrame = {
  layer: 'L2',
  srcMac: '02:00:00:00:00:0a',
  dstMac: '02:00:00:00:00:0b',
  etherType: 0x0800,
  payload: {
    layer: 'L3',
    srcIp: '10.10.0.10',
    dstIp: '10.10.0.20',
    ttl: 64,
    protocol: 1,
    payload: { layer: 'raw', data: 'icmp' },
  },
};

const topology: NetworkTopology = {
  nodes: [
    {
      id: 'leaf1',
      type: 'router',
      position: { x: 180, y: 220 },
      data: {
        label: 'Leaf1 VTEP',
        role: 'router',
        layerId: 'l3',
        vtep: {
          vni: 10000,
          sourceVtepIp: '192.0.2.1',
          peerVtepIps: ['192.0.2.2'],
          arpSuppression: true,
        },
      },
    },
    {
      id: 'spine',
      type: 'router',
      position: { x: 430, y: 220 },
      data: { label: 'Spine', role: 'router', layerId: 'l3' },
    },
    {
      id: 'leaf2',
      type: 'router',
      position: { x: 680, y: 220 },
      data: {
        label: 'Leaf2 VTEP',
        role: 'router',
        layerId: 'l3',
        vtep: {
          vni: 10000,
          sourceVtepIp: '192.0.2.2',
          peerVtepIps: ['192.0.2.1'],
          arpSuppression: true,
        },
      },
    },
    {
      id: 'host-a',
      type: 'client',
      position: { x: 180, y: 390 },
      data: { label: 'Host A', role: 'client', layerId: 'l7', ip: '10.10.0.10', mac: frame.srcMac },
    },
    {
      id: 'host-b',
      type: 'server',
      position: { x: 680, y: 390 },
      data: { label: 'Host B', role: 'server', layerId: 'l7', ip: '10.10.0.20', mac: frame.dstMac },
    },
  ],
  edges: [
    { id: 'leaf1-spine', source: 'leaf1', target: 'spine' },
    { id: 'spine-leaf2', source: 'spine', target: 'leaf2' },
    { id: 'host-a-leaf1', source: 'host-a', target: 'leaf1' },
    { id: 'host-b-leaf2', source: 'host-b', target: 'leaf2' },
  ],
  areas: [],
  routeTables: new Map(),
};

export default function VxlanEvpnDemo() {
  return (
    <DemoShell
      title="VXLAN EVPN"
      desc="Inspect VXLAN UDP/4789 encapsulation, EVPN learning, and ARP suppression."
    >
      <VxlanEvpnDemoInner />
    </DemoShell>
  );
}

function VxlanEvpnDemoInner() {
  const t = useT();
  const [suppression, setSuppression] = useState(true);
  const type2 = useMemo(
    () =>
      advertiseType2({
        rd: { type: 0, value: '65000:10000' },
        vni: 10000,
        mac: frame.dstMac,
        ip: '10.10.0.20',
        originVtepIp: '192.0.2.2',
      }),
    [],
  );
  const type5 = advertiseType5({
    rd: { type: 0, value: '65000:10000' },
    vni: 10000,
    prefix: '10.10.0.0/24',
    gatewayIp: '10.10.0.1',
    originVtepIp: '192.0.2.2',
  });
  const learned = learnType2(type2);
  const arp = suppression
    ? answerArpFromEvpnCache([learned], { vni: 10000, targetIp: '10.10.0.20' })
    : { action: 'flood' as const };
  const outer = encapVxlan(frame, {
    vni: 10000,
    sourceVtepIp: '192.0.2.1',
    destinationVtepIp: learned.remoteVtepIp,
  });

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
            <strong>{t('What you are looking at', 'この画面の見方')}</strong>
            <div>
              {t(
                'Host A and Host B are on one layer-2 network (10.10.0.0/24) although a routed fabric sits between their leaves. Each leaf is a VTEP (VXLAN tunnel endpoint): Leaf1 (192.0.2.1) wraps Host A’s Ethernet frame in UDP to port 4789 and sends it to Leaf2 (192.0.2.2), which unwraps it. The VNI, 10000, says which layer-2 network the frame belongs to — like a VLAN number, but 24 bits.',
                'Host A と Host B は、リーフの間にルーティングされたファブリックがあっても、同じレイヤ 2 のネットワーク（10.10.0.0/24）にいます。各リーフは VTEP（VXLAN トンネルの端点）です。Leaf1（192.0.2.1）は Host A の Ethernet フレームを UDP のポート 4789 あてに包んで Leaf2（192.0.2.2）へ送り、Leaf2 が包みを外します。VNI の 10000 は、そのフレームがどのレイヤ 2 ネットワークのものかを示す番号です（VLAN 番号に似ていますが 24 ビット）。',
              )}
            </div>
            <div>
              {t(
                'EVPN is BGP telling every leaf where hosts are. A Type-2 route says “this MAC and IP sit behind this VTEP”: Leaf2 advertises Host B. A Type-5 route advertises a whole IP prefix (10.10.0.0/24) for routing between networks.',
                'EVPN は、ホストがどこにいるかを BGP で全リーフへ知らせるしくみです。Type-2 経路は「この MAC と IP はこの VTEP の先にいる」という知らせで、Leaf2 が Host B について出しています。Type-5 経路は、ネットワーク間のルーティング用に IP のプレフィックス全体（10.10.0.0/24）を知らせます。',
              )}
            </div>
            <div>
              {t(
                'ARP suppression: when Host A asks “who has 10.10.0.20?”, Leaf1 already knows Host B’s MAC from the Type-2 route and answers locally, so no ARP broadcast crosses the fabric. Turn it off and the request is flooded to every VTEP in the VNI.',
                'ARP 抑止：Host A が「10.10.0.20 は誰？」と尋ねると、Leaf1 は Type-2 経路で Host B の MAC を知っているので自分で答え、ARP のブロードキャストはファブリックを渡りません。無効にすると、要求は同じ VNI のすべての VTEP へフラッディングされます。',
              )}
            </div>
          </div>
          <button
            type="button"
            data-testid="arp-suppression-toggle"
            onClick={() => setSuppression((value) => !value)}
          >
            {suppression
              ? t('Disable ARP Suppression', 'ARP 抑止を無効にする')
              : t('Enable ARP Suppression', 'ARP 抑止を有効にする')}
          </button>
          <div style={PANEL_STYLE}>
            <h3 style={{ marginTop: 0 }}>VXLAN</h3>
            <div data-testid="vxlan-outer">
              {t('Outer UDP/', '外側 UDP/')}
              {outer.payload.layer === 'L4' && 'dstPort' in outer.payload
                ? outer.payload.dstPort
                : t('n/a', 'なし')}{' '}
              VNI 10000
            </div>
            <div data-testid="vxlan-inner">
              {t('Inner Ethernet:', '内側 Ethernet:')} {frame.srcMac} → {frame.dstMac}
            </div>
          </div>
          <div style={PANEL_STYLE}>
            <h3 style={{ marginTop: 0 }}>EVPN</h3>
            <div data-testid="evpn-type2">
              Type-2: {type2.mac} / {type2.ip}
            </div>
            <div data-testid="evpn-type5">Type-5: {type5.prefix}</div>
            <div data-testid="arp-suppression">
              {arp.action === 'reply'
                ? t(`ARP suppression hit: ${arp.mac}`, `ARP 抑止でヒット: ${arp.mac}`)
                : t('ARP suppression miss: flood', 'ARP 抑止でミス: フラッディングします')}
            </div>
          </div>
        </aside>
      </div>
    </NetlabProvider>
  );
}
