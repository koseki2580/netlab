import { useMemo, useState, type CSSProperties } from 'react';
import { LinkDetailPanel } from '../../src/components/LinkDetailPanel';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { PacketTimeline } from '../../src/components/simulation/PacketTimeline';
import { TraceSummary } from '../../src/components/simulation/TraceSummary';
import { buildUdpPacket } from '../../src/layers/l4-transport/udpPacketBuilder';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import type { LinkQosConfig, LinkShaperClass, LinkShaperConfig } from '../../src/types/link';
import type { PacketTrace } from '../../src/types/simulation';
import type { NetworkTopology } from '../../src/types/topology';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';

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

function route(nodeId: string, destination: string, nextHop: string, metric = 0) {
  return {
    nodeId,
    destination,
    nextHop,
    metric,
    protocol: 'static' as const,
    adminDistance: 1,
  };
}

function buildTopology(): NetworkTopology {
  return {
    nodes: [
      {
        id: 'client-1',
        type: 'client',
        position: { x: 60, y: 220 },
        data: {
          label: 'Client',
          role: 'client',
          layerId: 'l7',
          ip: '10.0.0.10',
          mac: '02:00:00:00:00:10',
        },
      },
      {
        id: 'r1',
        type: 'router',
        position: { x: 220, y: 220 },
        data: {
          label: 'R1',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '10.0.0.1',
              prefixLength: 24,
              macAddress: '02:00:00:00:01:00',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '10.0.1.1',
              prefixLength: 30,
              macAddress: '02:00:00:00:01:01',
            },
          ],
          staticRoutes: [
            { destination: '10.0.0.0/24', nextHop: 'direct', metric: 0 },
            { destination: '10.0.1.0/30', nextHop: 'direct', metric: 0 },
            { destination: '10.0.4.0/24', nextHop: '10.0.1.2', metric: 10 },
          ],
        },
      },
      {
        id: 'r2',
        type: 'router',
        position: { x: 380, y: 220 },
        data: {
          label: 'R2',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '10.0.1.2',
              prefixLength: 30,
              macAddress: '02:00:00:00:02:00',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '10.0.2.1',
              prefixLength: 30,
              macAddress: '02:00:00:00:02:01',
            },
          ],
          staticRoutes: [
            { destination: '10.0.1.0/30', nextHop: 'direct', metric: 0 },
            { destination: '10.0.2.0/30', nextHop: 'direct', metric: 0 },
            { destination: '10.0.0.0/24', nextHop: '10.0.1.1', metric: 10 },
            { destination: '10.0.4.0/24', nextHop: '10.0.2.2', metric: 10 },
          ],
        },
      },
      {
        id: 'r3',
        type: 'router',
        position: { x: 540, y: 220 },
        data: {
          label: 'R3',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '10.0.2.2',
              prefixLength: 30,
              macAddress: '02:00:00:00:03:00',
            },
            {
              id: 'eth1',
              name: 'eth1',
              ipAddress: '10.0.4.1',
              prefixLength: 24,
              macAddress: '02:00:00:00:03:01',
            },
          ],
          staticRoutes: [
            { destination: '10.0.2.0/30', nextHop: 'direct', metric: 0 },
            { destination: '10.0.4.0/24', nextHop: 'direct', metric: 0 },
            { destination: '10.0.0.0/24', nextHop: '10.0.2.1', metric: 10 },
          ],
        },
      },
      {
        id: 'server-1',
        type: 'server',
        position: { x: 700, y: 220 },
        data: {
          label: 'Server',
          role: 'server',
          layerId: 'l7',
          ip: '10.0.4.10',
          mac: '02:00:00:00:00:20',
        },
      },
    ],
    edges: [
      { id: 'e-client-r1', source: 'client-1', target: 'r1' },
      { id: 'e-r1-r2', source: 'r1', target: 'r2' },
      {
        id: 'e-r2-r3',
        source: 'r2',
        target: 'r3',
        data: {
          link: {
            bandwidthBps: 1_000_000,
            propagationDelayMs: 20,
            lossPct: 5,
            queueDepthSegments: 100,
            lossSeed: 42,
          },
        },
      },
      { id: 'e-r3-server', source: 'r3', target: 'server-1' },
    ],
    areas: [],
    routeTables: new Map([
      [
        'r1',
        [
          route('r1', '10.0.0.0/24', 'direct'),
          route('r1', '10.0.1.0/30', 'direct'),
          route('r1', '10.0.4.0/24', '10.0.1.2', 10),
        ],
      ],
      [
        'r2',
        [
          route('r2', '10.0.1.0/30', 'direct'),
          route('r2', '10.0.2.0/30', 'direct'),
          route('r2', '10.0.0.0/24', '10.0.1.1', 10),
          route('r2', '10.0.4.0/24', '10.0.2.2', 10),
        ],
      ],
      [
        'r3',
        [
          route('r3', '10.0.2.0/30', 'direct'),
          route('r3', '10.0.4.0/24', 'direct'),
          route('r3', '10.0.0.0/24', '10.0.2.1', 10),
        ],
      ],
    ]),
  };
}

function updateQos(topology: NetworkTopology, link: LinkQosConfig): NetworkTopology {
  return {
    ...topology,
    edges: topology.edges.map((edge) =>
      edge.id === 'e-r2-r3'
        ? {
            ...edge,
            data: {
              ...(edge.data ?? {}),
              link,
            },
          }
        : edge,
    ),
  };
}

const FIELD_LABEL: CSSProperties = {
  display: 'grid',
  gap: 4,
  fontSize: 12,
  color: 'var(--netlab-text-secondary)',
};

const INPUT: CSSProperties = {
  background: 'var(--netlab-bg-primary)',
  border: '1px solid var(--netlab-border-subtle)',
  borderRadius: 6,
  color: 'var(--netlab-text-primary)',
  fontFamily: 'monospace',
  padding: '5px 6px',
  minWidth: 0,
};

const SECONDARY_BUTTON: CSSProperties = {
  ...BUTTON_STYLE,
  background: 'var(--netlab-bg-primary)',
  color: 'var(--netlab-text-primary)',
  border: '1px solid var(--netlab-border)',
};

const CARD: CSSProperties = {
  marginTop: 14,
  padding: 12,
  borderRadius: 8,
  border: '1px solid var(--netlab-border-subtle)',
  display: 'grid',
  gap: 10,
};

const DEFAULT_CLASSES: readonly LinkShaperClass[] = [
  { id: 'ef', dscp: [46], weightPct: 80, queueDepthSegments: 8 },
  { id: 'be', dscp: [], weightPct: 20, queueDepthSegments: 8, default: true },
];

interface ClassDraft {
  name: string;
  weight: string;
  queue: string;
  dscp: string;
  isDefault: boolean;
}

function toDraft(klass: LinkShaperClass): ClassDraft {
  return {
    name: klass.id,
    weight: String(klass.weightPct),
    queue: String(klass.queueDepthSegments),
    dscp: klass.dscp.join(', '),
    isDefault: klass.default === true,
  };
}

/**
 * Build the shaper from the labelled fields, or say in words what is wrong.
 * The same rules the advanced text editor applies: one default class, weights
 * adding up to 100, DSCP values 0–63 each in one class only.
 */
export function shaperFromDrafts(
  drafts: readonly ClassDraft[],
  t: (en: string, ja: string) => string,
): { shaper: LinkShaperConfig } | { error: string } {
  const classes: LinkShaperClass[] = [];
  const seenDscp = new Set<number>();
  for (const draft of drafts) {
    const name = draft.name.trim();
    const weight = Number(draft.weight);
    const queue = Number(draft.queue);
    const dscpParts = draft.dscp
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    const dscp = dscpParts.map(Number);
    if (name === '') return { error: t('Every class needs a name.', 'クラスには名前が必要です。') };
    if (!Number.isFinite(weight) || weight < 1 || weight > 100) {
      return {
        error: t(`Weight of ${name} must be 1–100.`, `${name} の重みは 1〜100 にしてください。`),
      };
    }
    if (!Number.isInteger(queue) || queue < 1) {
      return {
        error: t(
          `Queue length of ${name} must be 1 or more.`,
          `${name} のキューの長さは 1 以上にしてください。`,
        ),
      };
    }
    for (const value of dscp) {
      if (!Number.isInteger(value) || value < 0 || value > 63) {
        return {
          error: t(
            `DSCP values of ${name} must be whole numbers 0–63.`,
            `${name} の DSCP は 0〜63 の整数にしてください。`,
          ),
        };
      }
      if (seenDscp.has(value)) {
        return {
          error: t(
            `DSCP ${value} is in more than one class.`,
            `DSCP ${value} が複数のクラスに入っています。`,
          ),
        };
      }
      seenDscp.add(value);
    }
    classes.push({
      id: name,
      weightPct: weight,
      queueDepthSegments: queue,
      dscp,
      ...(draft.isDefault ? { default: true } : {}),
    });
  }
  if (new Set(classes.map((klass) => klass.id)).size !== classes.length) {
    return { error: t('Two classes share a name.', '同じ名前のクラスがあります。') };
  }
  if (classes.filter((klass) => klass.default).length !== 1) {
    return {
      error: t('Choose exactly one default class.', '既定のクラスをちょうど1つ選んでください。'),
    };
  }
  const total = classes.reduce((sum, klass) => sum + klass.weightPct, 0);
  if (total < 99 || total > 101) {
    return {
      error: t(
        `Weights add up to ${total}; make them 100.`,
        `重みの合計が ${total} です。100 にしてください。`,
      ),
    };
  }
  return { shaper: { classes } };
}

/** One line about what happened to the packet on the shaped link. */
export function burstOutcome(
  trace: PacketTrace | null,
  t: (en: string, ja: string) => string,
): string {
  if (!trace) return t('No packet was sent.', 'パケットは送られませんでした。');
  const drop = trace.hops.find((hop) => hop.action === 'link:dropped');
  if (drop) {
    const reason = drop.linkQos?.reason;
    return reason === 'loss'
      ? t('Dropped on the link by random loss.', 'リンクのランダムな損失で落ちました。')
      : reason === 'queue-full'
        ? t('Dropped: the link queue was full.', 'リンクのキューがいっぱいで落ちました。')
        : t('Dropped on the link.', 'リンクで落ちました。');
  }
  const arrived = trace.hops.find((hop) => hop.action === 'link:arrived');
  const latency = arrived?.linkQos?.totalLatencySteps;
  if (trace.status === 'delivered') {
    return latency !== undefined
      ? t(
          `Delivered — ${latency} ms to cross the link.`,
          `届きました — リンクの通過に ${latency} ms かかりました。`,
        )
      : t('Delivered.', '届きました。');
  }
  return t('Dropped before reaching the server.', 'サーバに届く前に落ちました。');
}

function QosFields({
  link,
  onQosChange,
}: {
  readonly link: LinkQosConfig;
  readonly onQosChange: (link: LinkQosConfig) => void;
}) {
  const t = useT();
  const [bandwidth, setBandwidth] = useState(String(link.bandwidthBps ?? ''));
  const [delay, setDelay] = useState(String(link.propagationDelayMs ?? ''));
  const [loss, setLoss] = useState(link.lossPct ?? 0);
  const [drafts, setDrafts] = useState<ClassDraft[]>(() =>
    (link.shaper?.classes ?? DEFAULT_CLASSES).map(toDraft),
  );
  const [shaperNote, setShaperNote] = useState<string | null>(null);

  const bandwidthValue = Number(bandwidth);
  const delayValue = Number(delay);
  const linkError =
    !Number.isFinite(bandwidthValue) || bandwidthValue <= 0
      ? t('Bandwidth must be more than 0 bps.', '帯域は 0 bps より大きくしてください。')
      : !Number.isFinite(delayValue) || delayValue < 0 || delayValue > 1000
        ? t('Delay must be 0–1000 ms.', '伝搬遅延は 0〜1000 ms にしてください。')
        : null;
  const shaperResult = shaperFromDrafts(drafts, t);

  const updateDraft = (index: number, patch: Partial<ClassDraft>) =>
    setDrafts((current) =>
      current.map((draft, i) =>
        i === index
          ? { ...draft, ...patch }
          : patch.isDefault
            ? { ...draft, isDefault: false }
            : draft,
      ),
    );

  const applyLink = () => {
    if (linkError) return;
    onQosChange({
      ...link,
      bandwidthBps: bandwidthValue,
      propagationDelayMs: delayValue,
      lossPct: loss,
      lossSeed: link.lossSeed ?? 42,
    });
  };

  const applyShaper = () => {
    if ('error' in shaperResult) return;
    onQosChange({ ...link, shaper: shaperResult.shaper });
    setShaperNote(t('Classes applied to R2 → R3.', 'クラスを R2 → R3 のリンクに適用しました。'));
  };

  return (
    <>
      <section data-testid="link-qos-fields" style={CARD}>
        <div style={{ fontSize: 12, fontWeight: 700 }}>
          {t('The R2 → R3 link', 'R2 → R3 のリンク')}
        </div>
        <label style={FIELD_LABEL}>
          {t('Bandwidth (bps)', '帯域 (bps)')}
          <input
            data-testid="link-qos-bandwidth"
            type="number"
            min={1}
            value={bandwidth}
            onChange={(event) => setBandwidth(event.currentTarget.value)}
            style={INPUT}
          />
        </label>
        <label style={FIELD_LABEL}>
          {t('Propagation delay (ms)', '伝搬遅延 (ms)')}
          <input
            data-testid="link-qos-delay"
            type="number"
            min={0}
            max={1000}
            value={delay}
            onChange={(event) => setDelay(event.currentTarget.value)}
            style={INPUT}
          />
        </label>
        <label style={FIELD_LABEL}>
          <span>
            {t('Loss', '損失率')}:{' '}
            <output
              data-testid="link-qos-loss-value"
              style={{ color: 'var(--netlab-text-primary)' }}
            >
              {loss}%
            </output>
          </span>
          <input
            data-testid="link-qos-loss"
            type="range"
            min={0}
            max={50}
            value={loss}
            aria-valuetext={`${loss}%`}
            onChange={(event) => setLoss(Number(event.currentTarget.value))}
          />
        </label>
        {linkError && (
          <div role="alert" style={{ color: 'var(--netlab-accent-red)', fontSize: 12 }}>
            {linkError}
          </div>
        )}
        <button
          type="button"
          data-testid="link-qos-apply"
          disabled={linkError !== null}
          onClick={applyLink}
          style={{ ...BUTTON_STYLE, justifySelf: 'start' }}
        >
          {t('Apply to the link', 'リンクに適用')}
        </button>
      </section>

      <section data-testid="link-qos-classes" style={CARD}>
        <div style={{ fontSize: 12, fontWeight: 700 }}>
          {t('Traffic classes', 'トラフィックのクラス')}
        </div>
        {drafts.map((draft, index) => (
          <fieldset
            key={index}
            data-testid={`link-qos-class-${index}`}
            style={{
              margin: 0,
              padding: 8,
              border: '1px solid var(--netlab-border-subtle)',
              borderRadius: 6,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
            }}
          >
            <legend style={{ fontSize: 11, color: 'var(--netlab-text-secondary)' }}>
              {t(`Class ${index + 1}`, `クラス ${index + 1}`)}
            </legend>
            <label style={FIELD_LABEL}>
              {t('Name', '名前')}
              <input
                data-testid={`link-qos-class-${index}-name`}
                value={draft.name}
                onChange={(event) => updateDraft(index, { name: event.currentTarget.value })}
                style={INPUT}
              />
            </label>
            <label style={FIELD_LABEL}>
              {t('Weight (%)', '重み (%)')}
              <input
                data-testid={`link-qos-class-${index}-weight`}
                type="number"
                min={1}
                max={100}
                value={draft.weight}
                onChange={(event) => updateDraft(index, { weight: event.currentTarget.value })}
                style={INPUT}
              />
            </label>
            <label style={FIELD_LABEL}>
              {t('Queue length (packets)', 'キューの長さ (パケット数)')}
              <input
                data-testid={`link-qos-class-${index}-queue`}
                type="number"
                min={1}
                value={draft.queue}
                onChange={(event) => updateDraft(index, { queue: event.currentTarget.value })}
                style={INPUT}
              />
            </label>
            <label style={FIELD_LABEL}>
              {t('DSCP values (comma-separated)', 'DSCP の値 (カンマ区切り)')}
              <input
                data-testid={`link-qos-class-${index}-dscp`}
                value={draft.dscp}
                onChange={(event) => updateDraft(index, { dscp: event.currentTarget.value })}
                style={INPUT}
              />
            </label>
            <label style={{ ...FIELD_LABEL, gridColumn: '1 / -1', display: 'flex', gap: 6 }}>
              <input
                type="radio"
                name="link-qos-default-class"
                checked={draft.isDefault}
                onChange={() => updateDraft(index, { isDefault: true })}
              />
              {t(
                'Default class (takes packets no DSCP value matches)',
                '既定のクラス (どの DSCP にも当てはまらないパケットが入る)',
              )}
            </label>
            {drafts.length > 1 && (
              <button
                type="button"
                onClick={() => setDrafts((current) => current.filter((_, i) => i !== index))}
                style={{ ...SECONDARY_BUTTON, gridColumn: '1 / -1', justifySelf: 'start' }}
              >
                {t('Remove class', 'クラスを削除')}
              </button>
            )}
          </fieldset>
        ))}
        <button
          type="button"
          onClick={() =>
            setDrafts((current) => [
              ...current,
              {
                name: `c${current.length + 1}`,
                weight: '10',
                queue: '8',
                dscp: '',
                isDefault: false,
              },
            ])
          }
          style={{ ...SECONDARY_BUTTON, justifySelf: 'start' }}
        >
          {t('Add class', 'クラスを追加')}
        </button>
        {'error' in shaperResult && (
          <div role="alert" style={{ color: 'var(--netlab-accent-red)', fontSize: 12 }}>
            {shaperResult.error}
          </div>
        )}
        <button
          type="button"
          data-testid="link-qos-apply-classes"
          disabled={'error' in shaperResult}
          onClick={applyShaper}
          style={{ ...BUTTON_STYLE, justifySelf: 'start' }}
        >
          {t('Apply classes', 'クラスを適用')}
        </button>
        {shaperNote && (
          <div role="status" style={{ fontSize: 12 }}>
            {shaperNote}
          </div>
        )}
      </section>
    </>
  );
}

function DemoInner({
  topology,
  onQosChange,
}: {
  readonly topology: NetworkTopology;
  readonly onQosChange: (link: LinkQosConfig) => void;
}) {
  const t = useT();
  const { sendPacket, state, engine } = useSimulation();
  const [burstResult, setBurstResult] = useState<string | null>(null);
  const edge = useMemo(
    () => topology.edges.find((candidate) => candidate.id === 'e-r2-r3') ?? topology.edges[0],
    [topology.edges],
  );

  const sendBurst = async () => {
    const packet = buildUdpPacket({
      srcNodeId: 'client-1',
      dstNodeId: 'server-1',
      srcIp: '10.0.0.10',
      dstIp: '10.0.4.10',
      srcPort: 49200,
      dstPort: 7777,
      srcMac: '02:00:00:00:00:10',
      dstMac: '02:00:00:00:00:20',
      payload: { layer: 'raw', data: 'x'.repeat(1472) },
    });
    const id = `link-qos-${state.traces.length + 1}`;
    await sendPacket({
      ...packet,
      id,
      frame: {
        ...packet.frame,
        payload: {
          ...packet.frame.payload,
          totalLength: 1500,
        },
      },
    });
    const trace = engine.getState().traces.find((candidate) => candidate.packetId === id) ?? null;
    setBurstResult(burstOutcome(trace, t));
  };

  return (
    <main style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', height: '100%' }}>
      <div style={{ position: 'relative', minWidth: 0 }}>
        <NetlabCanvas />
      </div>
      <aside
        aria-label={t('Link QoS controls', 'リンクの QoS の操作')}
        style={{
          borderLeft: '1px solid var(--netlab-border-subtle)',
          background: 'var(--netlab-bg-panel)',
          color: 'var(--netlab-text-primary)',
          overflow: 'auto',
          padding: 14,
        }}
      >
        <button type="button" data-testid="link-qos-burst" onClick={sendBurst} style={BUTTON_STYLE}>
          {t('Send QoS burst', 'QoS を試すパケットを送る')}
        </button>
        {burstResult && (
          <div
            role="status"
            data-testid="link-qos-burst-result"
            style={{ marginTop: 8, fontSize: 12, lineHeight: 1.5 }}
          >
            {burstResult}
          </div>
        )}
        {edge && (
          // Re-read the fields whenever the link changes, including from the
          // advanced editor below.
          <QosFields
            key={JSON.stringify(edge.data?.link ?? {})}
            link={edge.data?.link ?? {}}
            onQosChange={onQosChange}
          />
        )}
        {/* The text form for the whole configuration stays, for a reader who
            already knows the grammar; a beginner uses the fields above. */}
        <details data-testid="link-qos-advanced" style={{ marginTop: 14 }}>
          <summary
            data-testid="link-qos-advanced-toggle"
            style={{ cursor: 'pointer', fontSize: 12 }}
          >
            {t('Advanced: every setting as text', '詳細設定 (上級者向け・テキストで編集)')}
          </summary>
          {edge && <LinkDetailPanel edge={edge} onQosChange={onQosChange} />}
        </details>
        <div style={{ marginTop: 14 }}>
          <TraceSummary />
          <PacketTimeline />
        </div>
      </aside>
    </main>
  );
}

export default function LinkQosDemo() {
  const [topology, setTopology] = useState(() => buildTopology());

  return (
    <DemoShell
      title="Per-Link QoS"
      desc="Bandwidth, propagation delay, seeded loss, and drop-tail queue annotations on one bottleneck link."
    >
      <NetlabProvider topology={topology}>
        <SimulationProvider>
          <DemoInner
            topology={topology}
            onQosChange={(link) => setTopology(updateQos(topology, link))}
          />
        </SimulationProvider>
      </NetlabProvider>
    </DemoShell>
  );
}
