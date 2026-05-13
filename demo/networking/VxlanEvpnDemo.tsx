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
    <DemoShell
      title="VXLAN EVPN"
      desc="Inspect VXLAN UDP/4789 encapsulation, EVPN learning, and ARP suppression."
    >
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
            <button type="button" onClick={() => setSuppression((value) => !value)}>
              {suppression ? 'Disable ARP Suppression' : 'Enable ARP Suppression'}
            </button>
            <div style={PANEL_STYLE}>
              <h3 style={{ marginTop: 0 }}>VXLAN</h3>
              <div data-testid="vxlan-outer">
                Outer UDP/
                {outer.payload.layer === 'L4' && 'dstPort' in outer.payload
                  ? outer.payload.dstPort
                  : 'n/a'}{' '}
                VNI 10000
              </div>
              <div data-testid="vxlan-inner">
                Inner Ethernet: {frame.srcMac} → {frame.dstMac}
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
                  ? `ARP suppression hit: ${arp.mac}`
                  : 'ARP suppression miss: flood'}
              </div>
            </div>
          </aside>
        </div>
      </NetlabProvider>
    </DemoShell>
  );
}
