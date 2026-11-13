import { useMemo, useState } from 'react';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { NetlabProvider } from '../components/PhoneNetlabProvider';
import { PacketTimeline } from '../../src/components/simulation/PacketTimeline';
import { TraceSummary } from '../../src/components/simulation/TraceSummary';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import type { RouteEntry } from '../../src/types/routing';
import type { NetworkTopology } from '../../src/types/topology';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';
import { LESSON_BUTTON } from '../components/lessonStyles';
import { useNetlabContext } from '../../src/components/NetlabContext';
import { solicitedNodeAddress, solicitedNodeMac } from './ndp';

function route(nodeId: string, destination: string, nextHop: string): RouteEntry {
  return {
    nodeId,
    destination,
    nextHop,
    metric: 0,
    protocol: 'static',
    adminDistance: 1,
  };
}

function buildTopology(): NetworkTopology {
  return {
    nodes: [
      {
        id: 'client-1',
        type: 'client',
        position: { x: 80, y: 180 },
        data: {
          label: 'Dual-stack Client',
          role: 'client',
          layerId: 'l7',
          ip: '10.0.1.10',
          ipv6: '2001:db8:1::10',
          mac: '02:00:00:00:00:10',
        },
      },
      {
        id: 'router-1',
        type: 'router',
        position: { x: 310, y: 180 },
        data: {
          label: 'R1',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '10.0.1.1',
              prefixLength: 24,
              ipv6Address: '2001:db8:1::1',
              prefixLength6: 64,
              macAddress: '02:00:00:00:01:00',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '10.0.2.1',
              prefixLength: 24,
              ipv6Address: '2001:db8:2::1',
              prefixLength6: 64,
              macAddress: '02:00:00:00:01:01',
            },
          ],
          staticRoutes: [
            { destination: '10.0.1.0/24', nextHop: 'direct' },
            { destination: '10.0.2.0/24', nextHop: 'direct' },
          ],
          staticRoutes6: [
            { destination: '2001:db8:1::/64', nextHop: 'direct' },
            { destination: '2001:db8:2::/64', nextHop: 'direct' },
          ],
        },
      },
      {
        id: 'server-1',
        type: 'server',
        position: { x: 540, y: 180 },
        data: {
          label: 'Dual-stack Server',
          role: 'server',
          layerId: 'l7',
          ip: '10.0.2.20',
          ipv6: '2001:db8:2::20',
          mac: '02:00:00:00:00:20',
        },
      },
    ],
    edges: [
      { id: 'e-client-r1', source: 'client-1', target: 'router-1' },
      { id: 'e-r1-server', source: 'router-1', target: 'server-1' },
    ],
    areas: [],
    routeTables: new Map([
      [
        'router-1',
        [
          route('router-1', '10.0.1.0/24', 'direct'),
          route('router-1', '10.0.2.0/24', 'direct'),
          route('router-1', '2001:db8:1::/64', 'direct'),
          route('router-1', '2001:db8:2::/64', 'direct'),
        ],
      ],
    ]),
  };
}

function DemoInner() {
  const t = useT();
  const { engine, state } = useSimulation();
  const ipv6Hops = useMemo(
    () => state.traces.flatMap((trace) => trace.hops.filter((hop) => hop.protocol === 'ICMPv6')),
    [state.traces],
  );

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
        <NetlabCanvas style={{ height: 560 }} />
      </section>
      <aside style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div
          data-testid="lesson-brief"
          style={{
            border: '1px solid var(--netlab-border-subtle)',
            borderRadius: 8,
            padding: '10px 12px',
            fontSize: 12,
            lineHeight: 1.7,
            color: 'var(--netlab-text-primary)',
          }}
        >
          <strong>{t('Dual stack', 'デュアルスタックのしくみ')}</strong>
          <div>
            {t(
              'Dual stack means one interface holds both an IPv4 and an IPv6 address, so the same network carries both kinds of traffic side by side. Open R1 to see each interface with both.',
              'デュアルスタックとは、1 つのインタフェースが IPv4 と IPv6 の両方のアドレスを持つことです。同じネットワークで 2 種類の通信を並べて運べます。R1 を開くと、各インタフェースに両方のアドレスが付いているのが分かります。',
            )}
          </div>
          <div style={{ marginTop: 6 }}>
            {t(
              'An IPv6 address such as 2001:db8:2::20 is written in hexadecimal groups; "::" stands for a run of zeros. The echo below goes to that address and stays IPv6 all the way — R1 forwards it between 2001:db8:1:: and 2001:db8:2:: without turning it into IPv4.',
              '2001:db8:2::20 のような IPv6 アドレスは 16 進数の区切りで書き、「::」は 0 の続きを省略した印です。下の Echo はこのアドレスへ送られ、最後まで IPv6 のままです。R1 は IPv4 に変えずに、2001:db8:1:: と 2001:db8:2:: の間で転送します。',
            )}
          </div>
        </div>
        <NdpStep />
        <button
          type="button"
          data-testid="ipv6-send-echo"
          style={LESSON_BUTTON}
          onClick={() => void engine.ping('client-1', '2001:db8:2::20')}
        >
          {t('Send IPv6 Echo', 'IPv6 の Echo を送る')}
        </button>
        <TraceSummary />
        <div
          data-testid="demo-trace-log"
          style={{
            border: '1px solid var(--netlab-border-subtle)',
            borderRadius: 8,
            padding: 10,
            fontFamily: 'monospace',
            fontSize: 12,
          }}
        >
          <div style={{ color: 'var(--netlab-text-secondary)', marginBottom: 6 }}>
            {t('ICMPv6 hops', 'ICMPv6 のホップ')}
          </div>
          <div style={{ color: 'var(--netlab-text-muted)', marginBottom: 8 }}>
            {t('2001:db8:1::10 to 2001:db8:2::20', '2001:db8:1::10 から 2001:db8:2::20 へ')}
          </div>
          {ipv6Hops.length === 0 ? (
            <div style={{ color: 'var(--netlab-text-muted)' }}>
              {t('No IPv6 trace yet', 'IPv6 のトレースはまだありません')}
            </div>
          ) : (
            ipv6Hops.map((hop) => (
              <div key={`${hop.step}-${hop.nodeId}`} style={{ marginBottom: 4 }}>
                {hop.step}: {hop.nodeLabel}{' '}
                {hop.event === 'ndp-solicit'
                  ? `NS → ${hop.dstIp}`
                  : hop.event === 'ndp-advert'
                    ? `NA → ${hop.dstIp}`
                    : hop.event}
              </div>
            ))
          )}
        </div>
        <PacketTimeline />
      </aside>
    </div>
  );
}

/** Every IPv6 address in the lesson, with the device that holds it. */
function useIpv6Addresses(): { label: string; address: string }[] {
  const { topology } = useNetlabContext();
  return topology.nodes.flatMap((node) => {
    const own = typeof node.data.ipv6 === 'string' ? [node.data.ipv6] : [];
    const ports = (node.data.interfaces ?? []).flatMap((port) =>
      port.ipv6Address ? [port.ipv6Address] : [],
    );
    return [...own, ...ports].map((address) => ({ label: node.data.label, address }));
  });
}

/** Neighbour discovery (RFC 4861): where a Neighbor Solicitation for one address goes. */
function NdpStep() {
  const t = useT();
  const addresses = useIpv6Addresses();
  const [chosen, setChosen] = useState(addresses[0]?.address ?? '');
  const target = addresses.find((entry) => entry.address === chosen) ?? addresses[0];
  if (!target) return null;
  const group = solicitedNodeAddress(target.address);
  const mac = solicitedNodeMac(target.address);

  return (
    <div
      data-testid="ipv6-ndp"
      style={{
        border: '1px solid var(--netlab-border-subtle)',
        borderRadius: 8,
        padding: '10px 12px',
        fontSize: 12,
        lineHeight: 1.7,
        color: 'var(--netlab-text-primary)',
        display: 'grid',
        gap: 6,
      }}
    >
      <strong>{t('Finding a neighbour’s MAC (NDP)', '隣の MAC を調べる (NDP)')}</strong>
      <div>
        {t(
          'IPv6 has no ARP. To learn a neighbour’s MAC, a device sends an ICMPv6 Neighbor Solicitation (RFC 4861) — not to everyone, but to the target’s solicited-node multicast address: ff02::1:ff followed by the last 24 bits of the target address (RFC 4291). The frame goes to the MAC 33:33 followed by that group’s last 32 bits (RFC 2464). The target answers with a Neighbor Advertisement carrying its MAC.',
          'IPv6 には ARP がありません。隣の機器の MAC を知るには、ICMPv6 の Neighbor Solicitation (RFC 4861) を送ります。宛先は全員ではなく、相手のアドレスの下位 24 ビットを ff02::1:ff に続けた solicited-node マルチキャストアドレスです (RFC 4291)。フレームの宛先 MAC は、33:33 にそのグループの下位 32 ビットを続けたものです (RFC 2464)。相手は自分の MAC を載せた Neighbor Advertisement で応えます。',
        )}
      </div>
      <label style={{ display: 'grid', gap: 4 }}>
        {t('Address to look up', '調べるアドレス')}
        <select
          data-testid="ipv6-ndp-target"
          value={target.address}
          onChange={(event) => setChosen(event.target.value)}
          style={{ fontFamily: 'monospace', fontSize: 12, minHeight: 32 }}
        >
          {addresses.map((entry) => (
            <option key={entry.address} value={entry.address}>
              {`${entry.address} (${entry.label})`}
            </option>
          ))}
        </select>
      </label>
      <div data-testid="ipv6-ndp-solicited" style={{ fontFamily: 'monospace' }}>
        {t(`Solicited-node address: ${group}`, `solicited-node アドレス: ${group}`)}
      </div>
      <div data-testid="ipv6-ndp-mac" style={{ fontFamily: 'monospace' }}>
        {t(`Frame sent to MAC: ${mac}`, `フレームの宛先 MAC: ${mac}`)}
      </div>
      <div data-testid="ipv6-ndp-note" style={{ color: 'var(--netlab-text-secondary)' }}>
        {t(
          'Press Send IPv6 Echo: on the first send, the list below shows each Neighbor Solicitation (NS, to the solicited-node address) and the Advertisement (NA) that answers it, first the Client asking for R1, then R1 for the Server. A second send asks nothing: the answers are remembered.',
          '「IPv6 の Echo を送る」を押すと、最初の送信では、下の一覧に Neighbor Solicitation（NS、solicited-node アドレスあて）と、それに応える Advertisement（NA）が出ます。まず Client が R1 を、次に R1 が Server を尋ねます。2 回目の送信では何も尋ねません。答えを覚えているからです。',
        )}
      </div>
      <div data-testid="ipv6-gateway-note" style={{ color: 'var(--netlab-text-secondary)' }}>
        {t(
          'Here the Client reaches R1 by R1’s global address, 2001:db8:1::1, to keep the picture readable. A real host usually uses the router’s link-local address (fe80::…) as its gateway, learned from the router’s Router Advertisements (RFC 4861).',
          'ここでは図を読みやすくするため、Client は R1 のグローバルアドレス 2001:db8:1::1 に向けて送ります。本物の機器は、ふつうルータのリンクローカルアドレス（fe80::…）をゲートウェイにします。ルータが送る Router Advertisement から知ります（RFC 4861）。',
        )}
      </div>
    </div>
  );
}

export default function Ipv6Demo() {
  const topology = useMemo(() => buildTopology(), []);

  return (
    <DemoShell
      title="IPv6 Dual-Stack"
      desc="Send ICMPv6 echo across static dual-stack routes and inspect IPv6 trace hops."
    >
      <NetlabProvider topology={topology}>
        <SimulationProvider>
          <DemoInner />
        </SimulationProvider>
      </NetlabProvider>
    </DemoShell>
  );
}
