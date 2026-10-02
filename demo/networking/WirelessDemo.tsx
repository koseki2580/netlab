import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { FakeDeterministicProvider } from '../../src/crypto/FakeDeterministicProvider';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { useNetlabContext } from '../../src/components/NetlabContext';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { detectHiddenNodeCollision } from '../../src/layers/l1-physical/wireless/CsmaCa';
import { WirelessLinkController } from '../../src/layers/l1-physical/wireless/WirelessLinkController';
import { transitionWirelessState } from '../../src/layers/l1-physical/wireless/WirelessStateMachine';
import { WpaFourWayHandshake } from '../../src/layers/l1-physical/wireless/WpaFourWayHandshake';
import type { WpaFourWayHandshakeResult } from '../../src/layers/l1-physical/wireless/WpaFourWayHandshake';
import type {
  WirelessAssociationPhase,
  WirelessAssociationState,
  WirelessLinkConfig,
} from '../../src/types/wireless';
import type { NetworkTopology } from '../../src/types/topology';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';

const PANEL_STYLE: CSSProperties = {
  border: '1px solid var(--netlab-border-subtle)',
  borderRadius: 8,
  padding: 12,
};

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

const DISTANCE_MIN_M = 5;
const DISTANCE_MAX_M = 300;

const PHASE_LABELS: Record<WirelessAssociationPhase, readonly [string, string]> = {
  unassociated: ['not associated', '未接続'],
  probing: ['probing', 'AP を探索中'],
  authenticated: ['authenticated', '認証済み'],
  associated: ['associated', 'アソシエーション済み'],
  '4way': ['WPA2 4-way handshake', 'WPA2 4 ウェイハンドシェイク中'],
  connected: ['connected', '接続済み'],
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

// Rendered inside DemoShell so it reads the learner's language; the page
// component itself sits outside the shell's locale provider.
function WirelessControls({
  distance,
  onDistanceChange,
  rssi,
  loss,
  associationPhase,
  handshake,
  hiddenNode,
  onToggleHiddenNode,
  collidedStationIds,
}: {
  readonly distance: number;
  readonly onDistanceChange: (distance: number) => void;
  readonly rssi: number;
  readonly loss: number;
  readonly associationPhase: WirelessAssociationState['phase'];
  readonly handshake: WpaFourWayHandshakeResult | null;
  readonly hiddenNode: boolean;
  readonly onToggleHiddenNode: () => void;
  readonly collidedStationIds: readonly string[];
}) {
  const t = useT();
  const { topology: shown } = useNetlabContext();
  const [draftDistance, setDraftDistance] = useState<string | null>(null);
  // Name stations the way the canvas does — Station A, not sta-a.
  const collided = collidedStationIds.map(
    (id) => shown.nodes.find((node) => node.id === id)?.data.label ?? id,
  );

  return (
    <aside style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={PANEL_STYLE}>
        <h3 style={{ marginTop: 0 }}>{t('Radio model', '電波のモデル')}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <span>{t('Station distance', 'AP から端末までの距離')}</span>
            <span data-testid="wireless-distance-value" style={{ fontFamily: 'monospace' }}>
              {t(`Distance: ${distance} m`, `距離: ${distance} m`)}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              aria-label={t('Station distance', 'AP から端末までの距離')}
              aria-valuetext={`${distance} m`}
              data-testid="wireless-station-distance"
              type="range"
              min={DISTANCE_MIN_M}
              max={DISTANCE_MAX_M}
              step={1}
              value={distance}
              onChange={(event) => onDistanceChange(Number(event.currentTarget.value))}
              style={{ flex: 1, minWidth: 0 }}
            />
            <input
              data-testid="wireless-distance-input"
              aria-label={t('Station distance (m)', 'AP から端末までの距離 (m)')}
              type="number"
              min={DISTANCE_MIN_M}
              max={DISTANCE_MAX_M}
              step={1}
              // The typed text is kept while it is being edited, so a half-typed
              // "2" on the way to "200" is not snapped back to the old distance.
              value={draftDistance ?? String(distance)}
              onChange={(event) => {
                const text = event.currentTarget.value;
                setDraftDistance(text);
                const next = Number(text);
                if (Number.isInteger(next) && next >= DISTANCE_MIN_M && next <= DISTANCE_MAX_M) {
                  onDistanceChange(next);
                }
              }}
              onBlur={() => setDraftDistance(null)}
              style={{ width: 64, fontFamily: 'monospace' }}
            />
            <span aria-hidden="true">m</span>
          </div>
          <div
            aria-hidden="true"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 11,
              color: 'var(--netlab-text-secondary)',
            }}
          >
            <span>{DISTANCE_MIN_M} m</span>
            <span>{DISTANCE_MAX_M} m</span>
          </div>
        </div>
        <div data-testid="wireless-rssi">RSSI: {rssi.toFixed(1)} dBm</div>
        <div data-testid="wireless-loss">
          {t('Loss: ', '損失率: ')}
          {loss}%
        </div>
        <div
          data-testid="wireless-radio-model-note"
          style={{
            marginTop: 10,
            paddingTop: 8,
            borderTop: '1px solid var(--netlab-border-subtle)',
            fontSize: 12,
            lineHeight: 1.7,
          }}
        >
          <div>
            {t(
              `How this lesson works it out: RSSI = transmit power (${WIRELESS.txPowerDbm} dBm) − free-space path loss at ${WIRELESS.bandMhz} MHz. The signal gets 20 dB weaker for every tenfold distance (about 6 dB for every doubling). Loss is 0% down to −65 dBm, then rises in a straight line, 4 points per dB, to 100% at −90 dBm.`,
              `このレッスンの計算方法：RSSI ＝ 送信電力（${WIRELESS.txPowerDbm} dBm）− ${WIRELESS.bandMhz} MHz での自由空間伝搬損失。電波は距離が 10 倍になるごとに 20 dB 弱くなります（2 倍ごとに約 6 dB）。損失率は −65 dBm までは 0% で、そこから 1 dB につき 4 ポイントずつ直線的に増え、−90 dBm で 100% になります。`,
            )}
          </div>
          <div>
            {t(
              'That loss line is this lesson’s simplification, not a rule of Wi-Fi. On real Wi-Fi, −66 dBm is a healthy signal, and loss depends on noise, interference and the data rate in use.',
              'この損失率の直線は、このレッスンだけの単純化で、Wi-Fi の決まりではありません。実際の Wi-Fi では −66 dBm は十分に強い電波で、損失率はノイズ、干渉、使っているデータレートで決まります。',
            )}
          </div>
          <div>
            {t(
              'The values shown are rounded: RSSI to one decimal place and loss to a whole percent. At 200 m the RSSI is −66.2 dBm, 1.2 dB below −65 dBm, so the rule gives 1.2 × 4 = 4.8%, shown as 5%.',
              '画面の値は丸めて表示しています。RSSI は小数第 1 位まで、損失率は整数のパーセントです。200 m では RSSI が −66.2 dBm で、−65 dBm より 1.2 dB 低いので、規則どおりなら 1.2 × 4 ＝ 4.8% になり、表示は 5% です。',
            )}
          </div>
        </div>
      </div>
      <div style={PANEL_STYLE}>
        <h3 style={{ marginTop: 0 }}>{t('Association', 'アソシエーション (AP への接続)')}</h3>
        <div data-testid="wireless-association">
          {t('State: ', '状態: ')}
          {t(...PHASE_LABELS[associationPhase])}
        </div>
        <div data-testid="wpa-messages">
          WPA2:{' '}
          {handshake
            ? handshake.messages.map((message) => message.type).join(' ')
            : t('pending', '処理中')}
        </div>
      </div>
      <button
        type="button"
        data-testid="hidden-node-toggle"
        style={BUTTON_STYLE}
        onClick={onToggleHiddenNode}
      >
        {hiddenNode
          ? t('Disable Hidden Node', '隠れ端末問題を解消する')
          : t('Enable Hidden Node', '隠れ端末問題を起こす')}
      </button>
      <div style={PANEL_STYLE}>
        <h3 style={{ marginTop: 0 }}>CSMA/CA</h3>
        <div data-testid="hidden-node">
          {collided.length > 0
            ? t(`Collision: ${collided.join(', ')}`, `衝突: ${collided.join(', ')}`)
            : t('No collision', '衝突なし')}
        </div>
      </div>
    </aside>
  );
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
          <WirelessControls
            distance={distance}
            onDistanceChange={setDistance}
            rssi={rssi}
            loss={loss}
            associationPhase={association.phase}
            handshake={handshake}
            hiddenNode={hiddenNode}
            onToggleHiddenNode={() => setHiddenNode((value) => !value)}
            collidedStationIds={collision.collidedStationIds}
          />
        </div>
      </NetlabProvider>
    </DemoShell>
  );
}
