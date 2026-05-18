import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { FakeDeterministicProvider } from '../../src/crypto/FakeDeterministicProvider';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { detectHiddenNodeCollision } from '../../src/layers/l1-physical/wireless/CsmaCa';
import { WirelessLinkController } from '../../src/layers/l1-physical/wireless/WirelessLinkController';
import { transitionWirelessState } from '../../src/layers/l1-physical/wireless/WirelessStateMachine';
import { WpaFourWayHandshake } from '../../src/layers/l1-physical/wireless/WpaFourWayHandshake';
import type { WpaFourWayHandshakeResult } from '../../src/layers/l1-physical/wireless/WpaFourWayHandshake';
import type { WirelessAssociationState, WirelessLinkConfig } from '../../src/types/wireless';
import type { NetworkTopology } from '../../src/types/topology';
import DemoShell from '../DemoShell';

const PANEL_STYLE: CSSProperties = {
  border: '1px solid var(--netlab-border-subtle)',
  borderRadius: 8,
  padding: 12,
};

const BUTTON_STYLE: CSSProperties = {
  border: '1px solid var(--netlab-border-strong)',
  borderRadius: 6,
  background: 'var(--netlab-accent-cyan)',
  color: '#082f49',
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontWeight: 700,
  padding: '8px 12px',
};

const WIRELESS: WirelessLinkConfig = {
  ssid: 'netlab-wifi',
  channel: 6,
  bandMhz: 2437,
  txPowerDbm: 20,
  lossSeed: 81,
};

function connectedState(): WirelessAssociationState {
  const config = { ssid: WIRELESS.ssid, psk: 'correct horse battery staple' };
  let state = transitionWirelessState(
    { phase: 'unassociated' },
    { type: 'beacon', ssid: WIRELESS.ssid },
    config,
  );
  state = transitionWirelessState(state, { type: 'probeResponse', ssid: WIRELESS.ssid }, config);
  state = transitionWirelessState(state, { type: 'authSuccess' }, config);
  state = transitionWirelessState(state, { type: 'assocSuccess', apId: 'ap-1' }, config);
  state = transitionWirelessState(state, { type: 'eapolM4' }, config);
  return state;
}

function topology(distanceMetersValue: number): NetworkTopology {
  const stationX = 180 + distanceMetersValue * 2;
  return {
    nodes: [
      {
        id: 'ap-1',
        type: 'default',
        position: { x: 160, y: 230 },
        data: {
          label: 'AP',
          role: 'access-point',
          layerId: 'l1',
          wifi: {
            role: 'access-point',
            ssid: WIRELESS.ssid,
            psk: 'correct horse battery staple',
          },
        },
      },
      {
        id: 'sta-a',
        type: 'default',
        position: { x: stationX, y: 130 },
        data: {
          label: 'Station A',
          role: 'station',
          layerId: 'l1',
          ip: '10.10.10.10',
          wifi: {
            role: 'station',
            ssid: WIRELESS.ssid,
            apId: 'ap-1',
          },
        },
      },
      {
        id: 'sta-b',
        type: 'default',
        position: { x: stationX, y: 330 },
        data: {
          label: 'Station B',
          role: 'station',
          layerId: 'l1',
          ip: '10.10.10.11',
          wifi: {
            role: 'station',
            ssid: WIRELESS.ssid,
            apId: 'ap-1',
          },
        },
      },
    ],
    edges: [
      { id: 'wifi-a', source: 'ap-1', target: 'sta-a', data: { wireless: WIRELESS } },
      { id: 'wifi-b', source: 'ap-1', target: 'sta-b', data: { wireless: WIRELESS } },
    ],
    areas: [],
    routeTables: new Map(),
  };
}

export default function WirelessDemo() {
  const [distance, setDistance] = useState(20);
  const [hiddenNode, setHiddenNode] = useState(false);
  const [handshake, setHandshake] = useState<WpaFourWayHandshakeResult | null>(null);
  const currentTopology = useMemo(() => topology(distance), [distance]);
  const controller = useMemo(() => new WirelessLinkController(WIRELESS), []);
  const rssi = controller.rssiForDistance(distance);
  const loss = controller.lossPctForDistance(distance);
  const association = connectedState();
  const collision = hiddenNode
    ? detectHiddenNodeCollision({
        apId: 'ap-1',
        transmissions: [
          { stationId: 'sta-a', apReachable: true, peerReachableStationIds: [] },
          { stationId: 'sta-b', apReachable: true, peerReachableStationIds: [] },
        ],
      })
    : { collidedStationIds: [] };

  useEffect(() => {
    const wpa = new WpaFourWayHandshake(new FakeDeterministicProvider());
    void wpa
      .run({
        ssid: WIRELESS.ssid,
        psk: 'correct horse battery staple',
        apMac: '02:00:00:00:aa:01',
        stationMac: '02:00:00:00:bb:01',
        seed: 81,
      })
      .then(setHandshake);
  }, []);

  return (
    <DemoShell
      title="Wireless 802.11"
      desc="Inspect RSSI-derived loss, association, WPA2 four-way messages, and hidden-node collision behavior."
    >
      <NetlabProvider topology={currentTopology}>
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
            <div style={PANEL_STYLE}>
              <h3 style={{ marginTop: 0 }}>Radio model</h3>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                Station distance
                <input
                  aria-label="Station distance"
                  data-testid="wireless-station-distance"
                  type="range"
                  min={5}
                  max={300}
                  value={distance}
                  onChange={(event) => setDistance(Number(event.currentTarget.value))}
                />
              </label>
              <div data-testid="wireless-rssi">RSSI: {rssi.toFixed(1)} dBm</div>
              <div data-testid="wireless-loss">Loss: {loss}%</div>
            </div>
            <div style={PANEL_STYLE}>
              <h3 style={{ marginTop: 0 }}>Association</h3>
              <div data-testid="wireless-association">State: {association.phase}</div>
              <div data-testid="wpa-messages">
                WPA2:{' '}
                {handshake
                  ? handshake.messages.map((message) => message.type).join(' ')
                  : 'pending'}
              </div>
            </div>
            <button
              type="button"
              data-testid="hidden-node-toggle"
              style={BUTTON_STYLE}
              onClick={() => setHiddenNode((value) => !value)}
            >
              {hiddenNode ? 'Disable Hidden Node' : 'Enable Hidden Node'}
            </button>
            <div style={PANEL_STYLE}>
              <h3 style={{ marginTop: 0 }}>CSMA/CA</h3>
              <div data-testid="hidden-node">
                {collision.collidedStationIds.length > 0
                  ? `Collision: ${collision.collidedStationIds.join(', ')}`
                  : 'No collision'}
              </div>
            </div>
          </aside>
        </div>
      </NetlabProvider>
    </DemoShell>
  );
}
