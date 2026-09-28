import { useMemo, useState, type CSSProperties } from 'react';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import {
  applyRouterAdvertisement,
  buildRouterAdvertisement,
  type RouterAdvertisementResult,
} from '../../src/simulation/icmpv6';
import { Dhcpv6Client } from '../../src/services/dhcpv6/Dhcpv6Client';
import { Dhcpv6Server } from '../../src/services/dhcpv6/Dhcpv6Server';
import type { NetworkTopology } from '../../src/types/topology';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';

type Mode = 'managed' | 'other' | 'slaac';

const BUTTON_STYLE: CSSProperties = {
  border: '1px solid var(--netlab-border-strong)',
  borderRadius: 6,
  background: 'var(--netlab-accent-cyan)',
  color: 'var(--netlab-bg-primary)',
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontWeight: 700,
  padding: '8px 12px',
};

function buildTopology(hostAddress: string): NetworkTopology {
  return {
    nodes: [
      {
        id: 'router-1',
        type: 'router',
        position: { x: 220, y: 170 },
        data: {
          label: 'RA + DHCPv6 Router',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '10.10.0.1',
              prefixLength: 24,
              ipv6Address: '2001:db8:30::1',
              prefixLength6: 64,
              macAddress: '02:00:00:00:30:01',
            },
          ],
        },
      },
      {
        id: 'host-1',
        type: 'client',
        position: { x: 520, y: 170 },
        data: {
          label: 'IPv6 Host',
          role: 'client',
          layerId: 'l7',
          ip: '10.10.0.10',
          ipv6: hostAddress,
          mac: '02:00:00:00:00:0a',
        },
      },
    ],
    edges: [{ id: 'e-router-host', source: 'router-1', target: 'host-1' }],
    areas: [],
    routeTables: new Map(),
  };
}

function resolveMode(mode: Mode) {
  const flags =
    mode === 'managed'
      ? { managed: true, otherConfig: false }
      : mode === 'other'
        ? { managed: false, otherConfig: true }
        : { managed: false, otherConfig: false };
  const ra = buildRouterAdvertisement({ prefix: '2001:db8:30::/64', ...flags });
  const raResult = applyRouterAdvertisement(ra, '02:00:00:00:00:0a');

  if (raResult.needsDhcpv6Address) {
    const server = new Dhcpv6Server({
      serverDuid: 'router-1',
      pool: { start: '2001:db8:30::100', end: '2001:db8:30::10f' },
      dnsServers: ['2001:db8::53'],
    });
    const client = new Dhcpv6Client({ macAddress: '02:00:00:00:00:0a', seed: 30 });
    const reply = server.handle(client.handleAdvertise(server.handle(client.buildSolicit())));
    const lease = client.handleReply(reply);
    return { address: lease.address, dns: lease.dnsServers.join(', '), mode: raResult.mode };
  }

  return {
    address: raResult.slaacAddress ?? 'unassigned',
    dns: raResult.needsDhcpv6OtherConfig ? '2001:db8::53' : 'none',
    mode: raResult.mode,
  };
}

/** The mode in words, not the identifier the simulator uses for it. */
function modeName(
  mode: RouterAdvertisementResult['mode'],
  t: (en: string, ja: string) => string,
): string {
  switch (mode) {
    case 'dhcpv6-address':
      return t('DHCPv6 address', 'DHCPv6 でアドレス取得');
    case 'slaac-with-dhcpv6-other':
      return t('SLAAC + stateless DHCPv6 (DNS only)', 'SLAAC ＋ DHCPv6（DNS などだけ）');
    case 'slaac-only':
      return t('SLAAC only', 'SLAAC のみ');
  }
}

// Rendered inside DemoShell so it reads the learner's language; the page
// component itself sits outside the shell's locale provider.
function ModeControls({
  resolved,
  setMode,
}: {
  readonly resolved: ReturnType<typeof resolveMode>;
  readonly setMode: (mode: Mode) => void;
}) {
  const t = useT();

  return (
    <aside style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <button type="button" style={BUTTON_STYLE} onClick={() => setMode('managed')}>
        {t('M=1 DHCPv6 Address', 'M=1 DHCPv6 でアドレス取得')}
      </button>
      <button
        type="button"
        data-testid="dhcpv6-flag-m0-o1"
        style={BUTTON_STYLE}
        onClick={() => setMode('other')}
      >
        M=0 O=1 SLAAC + DNS
      </button>
      <button
        type="button"
        data-testid="dhcpv6-flag-m0-o0"
        style={BUTTON_STYLE}
        onClick={() => setMode('slaac')}
      >
        {t('M=0 O=0 Pure SLAAC', 'M=0 O=0 SLAAC のみ')}
      </button>
      <div
        style={{
          border: '1px solid var(--netlab-border-subtle)',
          borderRadius: 8,
          padding: 12,
          fontFamily: 'monospace',
          fontSize: 13,
        }}
      >
        <div data-testid="slaac-mode">
          {t('Mode: ', 'モード: ')}
          {modeName(resolved.mode, t)}
        </div>
        <div data-testid="host-ipv6">
          {t('Host IPv6: ', 'ホストの IPv6: ')}
          {resolved.address === 'unassigned' ? t('unassigned', '未割り当て') : resolved.address}
        </div>
        <div data-testid="host-dns">
          DNS: {resolved.dns === 'none' ? t('none', 'なし') : resolved.dns}
        </div>
      </div>
      <p
        data-testid="dhcpv6-lease-note"
        style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: 'var(--netlab-text-secondary)' }}
      >
        {t(
          'When M goes from 1 to 0, this lesson drops the DHCPv6 address at once for clarity; real hosts keep it until its lease lifetime expires.',
          'M が 1 から 0 に変わると、このレッスンでは分かりやすさのため DHCPv6 のアドレスをすぐ外します。実際のホストはリース期間が切れるまでそのアドレスを使い続けます。',
        )}
      </p>
    </aside>
  );
}

export default function Dhcpv6SlaacDemo() {
  const [mode, setMode] = useState<Mode>('managed');
  const resolved = useMemo(() => resolveMode(mode), [mode]);
  const topology = useMemo(() => buildTopology(resolved.address), [resolved.address]);

  return (
    <DemoShell
      title="DHCPv6 And Stateful SLAAC"
      desc="Toggle Router Advertisement M/O flags and inspect whether the host uses DHCPv6 or SLAAC."
    >
      <NetlabProvider topology={topology}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 360px',
            gap: 16,
            minHeight: 560,
          }}
        >
          <section style={{ minHeight: 500, border: '1px solid var(--netlab-border-subtle)' }}>
            <NetlabCanvas style={{ height: 500 }} />
          </section>
          <ModeControls resolved={resolved} setMode={setMode} />
        </div>
      </NetlabProvider>
    </DemoShell>
  );
}
