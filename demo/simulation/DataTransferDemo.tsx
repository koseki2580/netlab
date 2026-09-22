import { useMemo, useState, type CSSProperties } from 'react';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { FailureTogglePanel } from '../../src/components/simulation/FailureTogglePanel';
import { HopInspector } from '../../src/components/simulation/HopInspector';
import { PacketTimeline } from '../../src/components/simulation/PacketTimeline';
import { DataTransferProvider, useDataTransfer } from '../../src/simulation/DataTransferContext';
import { FailureProvider, useFailure } from '../../src/simulation/FailureContext';
import { SessionProvider } from '../../src/simulation/SessionContext';
import { dataTransferDemoTopology } from '../../src/simulation/__fixtures__/topologies';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import type { PacketTrace } from '../../src/types/simulation';
import type { ReassemblyState, TransferChunk, TransferMessage } from '../../src/types/transfer';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';

const DEFAULT_PAYLOAD = 'Hello, this is a test message from Server A to Server B!';
const TOPOLOGY = dataTransferDemoTopology();

const SECTION_STYLE: CSSProperties = {
  background: 'var(--netlab-bg-primary)',
  border: '1px solid var(--netlab-bg-surface)',
  borderRadius: 10,
  padding: 12,
};

const LABEL_STYLE: CSSProperties = {
  display: 'block',
  fontSize: 10,
  color: 'var(--netlab-text-secondary)',
  fontFamily: 'monospace',
  marginBottom: 6,
  letterSpacing: 0.6,
};

function transferStatusColor(status: TransferMessage['status']): string {
  switch (status) {
    case 'delivered':
      return 'var(--netlab-accent-green)';
    case 'partial':
      return 'var(--netlab-accent-orange)';
    case 'failed':
      return '#ef4444';
    case 'in-progress':
      return 'var(--netlab-accent-cyan)';
    default:
      return 'var(--netlab-text-secondary)';
  }
}

function chunkStateColor(state: TransferChunk['state']): string {
  switch (state) {
    case 'delivered':
      return 'var(--netlab-accent-green)';
    case 'dropped':
      return '#ef4444';
    case 'in-flight':
      return 'var(--netlab-accent-cyan)';
    default:
      return 'var(--netlab-text-secondary)';
  }
}

function transferStatusLabel(
  status: TransferMessage['status'],
  t: (en: string, ja: string) => string,
): string {
  switch (status) {
    case 'pending':
      return t('pending', '待機中');
    case 'in-progress':
      return t('in-progress', '転送中');
    case 'delivered':
      return t('delivered', '届いた');
    case 'partial':
      return t('partial', '一部だけ届いた');
    case 'failed':
      return t('failed', '失敗');
  }
}

function chunkStateLabel(
  state: TransferChunk['state'],
  t: (en: string, ja: string) => string,
): string {
  switch (state) {
    case 'pending':
      return t('pending', '待機中');
    case 'in-flight':
      return t('in-flight', '送信中');
    case 'delivered':
      return t('delivered', '届いた');
    case 'dropped':
      return t('dropped', '破棄された');
  }
}

function TransferSummaryCard({
  transfer,
  chunks,
  reassembly,
}: {
  transfer: TransferMessage;
  chunks: TransferChunk[];
  reassembly: ReassemblyState | undefined;
}) {
  const t = useT();
  const delivered = chunks.filter((chunk) => chunk.state === 'delivered').length;
  const dropped = chunks.filter((chunk) => chunk.state === 'dropped').length;
  const missing = Math.max(0, transfer.expectedChunks - delivered);
  const checksumLabel =
    reassembly?.checksumVerified === undefined
      ? t('incomplete', '未完了')
      : reassembly.checksumVerified
        ? t('verified', '一致')
        : t('mismatch', '不一致');
  const verdictLabel =
    transfer.status === 'delivered'
      ? t('COMPLETE DELIVERY', 'すべて届いた')
      : transfer.status === 'partial'
        ? t('PARTIAL DELIVERY', '一部だけ届いた')
        : transfer.status === 'failed'
          ? t('FAILED DELIVERY', '届かなかった')
          : t('IN PROGRESS', '転送中');

  return (
    <div
      style={{
        ...SECTION_STYLE,
        background:
          'linear-gradient(135deg, var(--netlab-bg-primary) 0%, var(--netlab-bg-surface) 100%)',
        borderLeft: `3px solid ${transferStatusColor(transfer.status)}`,
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 'bold',
          fontFamily: 'monospace',
          color: transferStatusColor(transfer.status),
        }}
      >
        {verdictLabel}
      </div>
      <div
        style={{
          marginTop: 8,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 6,
          fontSize: 11,
          fontFamily: 'monospace',
          color: 'var(--netlab-text-primary)',
        }}
      >
        <div>
          {t('source:', '送信元:')} {transfer.srcNodeId}
        </div>
        <div>
          {t('destination:', '宛先:')} {transfer.dstNodeId}
        </div>
        <div>
          {t(
            `payload: ${transfer.payloadSizeBytes} bytes`,
            `ペイロード: ${transfer.payloadSizeBytes} バイト`,
          )}
        </div>
        <div>
          {t(
            `chunks: ${delivered}/${transfer.expectedChunks} delivered`,
            `チャンク: ${delivered}/${transfer.expectedChunks} 個が届いた`,
          )}
        </div>
        <div>{t(`dropped: ${dropped}`, `破棄: ${dropped}`)}</div>
        <div>{t(`missing: ${missing}`, `未着: ${missing}`)}</div>
        <div>
          {t('checksum:', 'チェックサム:')} {checksumLabel}
        </div>
        {reassembly?.reassembledPayload && (
          <div>
            {t(
              `reconstructed: ${reassembly.reassembledPayload.length} bytes`,
              `復元したデータ: ${reassembly.reassembledPayload.length} バイト`,
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function IpMacSummary({
  chunks,
  tracesById,
}: {
  chunks: TransferChunk[];
  tracesById: Map<string, PacketTrace>;
}) {
  const t = useT();
  const sampleChunk = chunks.find((chunk) => chunk.traceId && chunk.state === 'delivered');
  const trace = sampleChunk?.traceId ? tracesById.get(sampleChunk.traceId) : undefined;
  const hops =
    trace?.hops.filter((hop) => hop.event !== 'arp-request' && hop.event !== 'arp-reply') ?? [];

  if (hops.length === 0) {
    return null;
  }

  const firstHop = hops[0];
  const lastHop = hops[hops.length - 1];
  if (!firstHop || !lastHop) {
    return null;
  }
  const macChanges = hops.reduce((count, hop, index) => {
    if (index === 0) {
      return count;
    }
    const previousHop = hops[index - 1];
    if (!previousHop) {
      return count;
    }
    return hop.srcMac !== previousHop.srcMac || hop.dstMac !== previousHop.dstMac
      ? count + 1
      : count;
  }, 0);

  return (
    <div
      style={{
        ...SECTION_STYLE,
        fontSize: 11,
        fontFamily: 'monospace',
        color: 'var(--netlab-text-secondary)',
      }}
    >
      <label style={LABEL_STYLE}>{t('IP VS MAC (EDUCATIONAL)', 'IP と MAC の違い (学習用)')}</label>
      <div style={{ display: 'grid', gap: 4 }}>
        <div>
          {t(
            `End-to-end IP: ${firstHop.srcIp} -> ${firstHop.dstIp}`,
            `端から端までの IP: ${firstHop.srcIp} -> ${firstHop.dstIp}`,
          )}
          <span style={{ color: 'var(--netlab-accent-green)' }}>
            {t(' (unchanged)', ' (変わらない)')}
          </span>
        </div>
        <div>
          {t(
            `Hop-by-hop MAC rewrite: ${macChanges} change(s) across ${hops.length} hop(s)`,
            `ホップごとの MAC の書き換え: ${hops.length} ホップで ${macChanges} 回変化`,
          )}
        </div>
        {firstHop.srcMac && lastHop.dstMac && (
          <div style={{ marginTop: 4, color: 'var(--netlab-text-secondary)' }}>
            {t(
              `Initial: ${firstHop.srcMac} -> ${firstHop.dstMac ?? ''} | Final: ${lastHop.srcMac ?? ''} -> ${lastHop.dstMac}`,
              `最初: ${firstHop.srcMac} -> ${firstHop.dstMac ?? ''} | 最後: ${lastHop.srcMac ?? ''} -> ${lastHop.dstMac}`,
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PayloadPreviewSection({ transfer }: { transfer: TransferMessage }) {
  const t = useT();
  const preview =
    transfer.payloadData.length > 200
      ? `${transfer.payloadData.slice(0, 200)}...`
      : transfer.payloadData;

  return (
    <div style={SECTION_STYLE}>
      <label style={LABEL_STYLE}>{t('PAYLOAD PREVIEW', 'ペイロードのプレビュー')}</label>
      <pre
        style={{
          margin: 0,
          padding: 10,
          borderRadius: 8,
          background: 'var(--netlab-bg-primary)',
          color: 'var(--netlab-text-secondary)',
          fontSize: 11,
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          maxHeight: 120,
          overflow: 'auto',
        }}
      >
        {preview || t('(empty payload)', '(空のペイロード)')}
      </pre>
    </div>
  );
}

function MissingChunksSection({
  chunks,
  tracesById,
}: {
  chunks: TransferChunk[];
  tracesById: Map<string, PacketTrace>;
}) {
  const t = useT();
  const missing = chunks.filter((chunk) => chunk.state === 'dropped');

  if (missing.length === 0) {
    return null;
  }

  return (
    <div style={SECTION_STYLE}>
      <label style={LABEL_STYLE}>{t('MISSING CHUNKS', '届かなかったチャンク')}</label>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {missing.map((chunk) => {
          const trace = chunk.traceId ? tracesById.get(chunk.traceId) : undefined;
          const lastHop = trace?.hops[trace.hops.length - 1];
          const reason = lastHop?.reason ?? 'dropped';
          const location = lastHop?.nodeLabel ? ` @ ${lastHop.nodeLabel}` : '';

          return (
            <span
              key={chunk.chunkId}
              style={{
                padding: '3px 8px',
                borderRadius: 999,
                fontSize: 10,
                background: 'color-mix(in srgb, var(--netlab-accent-red) 18%, transparent)',
                border: '1px solid color-mix(in srgb, var(--netlab-accent-red) 30%, transparent)',
                color: 'var(--netlab-accent-red)',
                fontFamily: 'monospace',
              }}
            >
              {t(
                `#${chunk.sequenceNumber} (${chunk.sizeBytes} bytes) · ${reason}`,
                `#${chunk.sequenceNumber} (${chunk.sizeBytes} バイト) · ${reason}`,
              )}
              {location}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function MessageView({
  transfer,
  chunks,
  currentTraceId,
  tracesById,
  onChunkSelect,
}: {
  transfer: TransferMessage | null;
  chunks: TransferChunk[];
  currentTraceId: string | null;
  tracesById: Map<string, PacketTrace>;
  onChunkSelect: (chunk: TransferChunk) => void;
}) {
  const t = useT();
  const { getReassembly } = useDataTransfer();
  const reassembly = transfer ? getReassembly(transfer.messageId) : undefined;
  const [hoveredChunkId, setHoveredChunkId] = useState<string | null>(null);

  if (!transfer) {
    return (
      <div
        style={{
          ...SECTION_STYLE,
          color: 'var(--netlab-text-secondary)',
          fontFamily: 'monospace',
          fontSize: 12,
        }}
      >
        {t(
          'Start a transfer to inspect payloads, missing chunks, and hop-by-hop traces.',
          '転送を始めると、ペイロード、届かなかったチャンク、ホップごとの経路を確認できます。',
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
      <TransferSummaryCard transfer={transfer} chunks={chunks} reassembly={reassembly} />

      <IpMacSummary chunks={chunks} tracesById={tracesById} />

      <div style={SECTION_STYLE}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <div
            style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--netlab-text-primary)' }}
          >
            {transfer.srcNodeId} → {transfer.dstNodeId}
          </div>
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: 11,
              color: transferStatusColor(transfer.status),
              border: `1px solid ${transferStatusColor(transfer.status)}`,
              borderRadius: 999,
              padding: '2px 8px',
            }}
          >
            {transferStatusLabel(transfer.status, t)}
          </span>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 8,
            marginTop: 12,
            fontFamily: 'monospace',
            fontSize: 11,
            color: 'var(--netlab-text-primary)',
          }}
        >
          <div>messageId: {transfer.messageId}</div>
          <div>
            {t('protocol:', 'プロトコル:')} {transfer.protocol}
          </div>
          <div>
            {t(
              `payload bytes: ${transfer.payloadSizeBytes}`,
              `ペイロードのバイト数: ${transfer.payloadSizeBytes}`,
            )}
          </div>
          <div>
            {t(
              `expected chunks: ${transfer.expectedChunks}`,
              `予定のチャンク数: ${transfer.expectedChunks}`,
            )}
          </div>
        </div>
        <div
          style={{
            marginTop: 10,
            padding: 8,
            borderRadius: 8,
            background: 'var(--netlab-bg-primary)',
            fontFamily: 'monospace',
            fontSize: 11,
            color: 'var(--netlab-text-secondary)',
            wordBreak: 'break-all',
          }}
        >
          {t('checksum:', 'チェックサム:')} {transfer.checksum}
        </div>
      </div>

      <PayloadPreviewSection transfer={transfer} />

      <div style={SECTION_STYLE}>
        <label style={LABEL_STYLE}>{t('CHUNKS', 'チャンク')}</label>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: 8,
          }}
        >
          {chunks.map((chunk) => {
            const isSelectedTrace = chunk.traceId !== undefined && chunk.traceId === currentTraceId;
            const isHovered = hoveredChunkId === chunk.chunkId;

            return (
              <button
                key={chunk.chunkId}
                type="button"
                disabled={!chunk.traceId}
                onClick={() => onChunkSelect(chunk)}
                onMouseEnter={() => setHoveredChunkId(chunk.chunkId)}
                onMouseLeave={() =>
                  setHoveredChunkId((current) => (current === chunk.chunkId ? null : current))
                }
                style={{
                  borderRadius: 8,
                  border: `1px solid ${
                    isSelectedTrace
                      ? 'var(--netlab-accent-cyan)'
                      : isHovered && chunk.traceId
                        ? 'var(--netlab-text-secondary)'
                        : 'var(--netlab-border)'
                  }`,
                  background: isSelectedTrace
                    ? 'var(--netlab-bg-primary)'
                    : isHovered && chunk.traceId
                      ? '#172033'
                      : 'var(--netlab-bg-primary)',
                  color: 'var(--netlab-text-primary)',
                  padding: 10,
                  textAlign: 'left',
                  cursor: chunk.traceId ? 'pointer' : 'default',
                  fontFamily: 'monospace',
                  opacity: chunk.traceId ? 1 : 0.65,
                  transition: 'border-color 0.15s, background 0.15s',
                }}
                title={
                  chunk.traceId
                    ? t('Click to inspect hop trace', 'クリックするとホップごとの経路が見られます')
                    : t('Trace not available', 'トレースがありません')
                }
              >
                <div style={{ fontSize: 11 }}>
                  {t(`chunk #${chunk.sequenceNumber}`, `チャンク #${chunk.sequenceNumber}`)}
                </div>
                <div style={{ marginTop: 6, fontSize: 10, color: chunkStateColor(chunk.state) }}>
                  {chunkStateLabel(chunk.state, t)}
                </div>
                <div style={{ marginTop: 6, fontSize: 10, color: 'var(--netlab-text-secondary)' }}>
                  {t(`${chunk.sizeBytes} bytes`, `${chunk.sizeBytes} バイト`)}
                </div>
                {chunk.traceId && (
                  <div style={{ marginTop: 6, fontSize: 9, color: 'var(--netlab-accent-cyan)' }}>
                    {t('▶ Inspect hop trace', '▶ ホップごとの経路を見る')}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div style={SECTION_STYLE}>
        <label style={LABEL_STYLE}>{t('REASSEMBLY', '再組み立て')}</label>
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: 11,
            color: 'var(--netlab-text-primary)',
            display: 'grid',
            gap: 6,
          }}
        >
          <div>
            {t('received:', '受信:')} {reassembly?.receivedChunks.size ?? 0}/
            {reassembly?.expectedTotal ?? chunks.length}
          </div>
          <div>
            {t('complete:', '完了:')}{' '}
            {reassembly?.isComplete ? t('yes', 'はい') : t('no', 'いいえ')}
          </div>
          <div>
            {t('checksum:', 'チェックサム:')}{' '}
            {reassembly?.checksumVerified === undefined
              ? t('incomplete', '未完了')
              : reassembly.checksumVerified
                ? t('verified', '一致')
                : t('mismatch', '不一致')}
          </div>
        </div>
      </div>

      <MissingChunksSection chunks={chunks} tracesById={tracesById} />
    </div>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        borderRadius: 8,
        border: `1px solid ${active ? 'var(--netlab-accent-cyan)' : 'var(--netlab-border)'}`,
        background: active ? 'var(--netlab-bg-elevated)' : 'var(--netlab-bg-primary)',
        color: active ? 'var(--netlab-text-primary)' : 'var(--netlab-text-secondary)',
        fontFamily: 'monospace',
        fontSize: 11,
        padding: '8px 12px',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

function DataTransferDemoInner() {
  const t = useT();
  const { engine, state: simulationState } = useSimulation();
  const { failureState } = useFailure();
  const { state, startTransfer, getChunks, selectedTransferId, selectTransfer } = useDataTransfer();
  const [payload, setPayload] = useState(DEFAULT_PAYLOAD);
  const [chunkSize, setChunkSize] = useState(1400);
  const [isSending, setIsSending] = useState(false);
  const [activeView, setActiveView] = useState<'message' | 'packet'>('message');
  const [showPayloadConfig, setShowPayloadConfig] = useState(false);

  const transfers = useMemo(
    () =>
      Array.from(state.transfers.values()).sort((left, right) => right.createdAt - left.createdAt),
    [state.transfers],
  );
  const tracesById = useMemo(
    () =>
      new Map<string, PacketTrace>(simulationState.traces.map((trace) => [trace.packetId, trace])),
    [simulationState.traces],
  );
  const selectedTransfer = selectedTransferId
    ? (state.transfers.get(selectedTransferId) ?? null)
    : (transfers[0] ?? null);
  const selectedChunks = selectedTransfer ? getChunks(selectedTransfer.messageId) : [];
  const failureCount =
    failureState.downNodeIds.size +
    failureState.downEdgeIds.size +
    failureState.downInterfaceIds.size;
  const payloadSummary = payload.length > 40 ? `${payload.slice(0, 40)}...` : payload;

  const handleStartTransfer = async () => {
    if (isSending) {
      return;
    }

    setIsSending(true);

    try {
      const transfer = await startTransfer('server-a', 'server-b', payload, {
        chunkSize,
        chunkDelay: 100,
        failureState,
      });
      selectTransfer(transfer.messageId);
      setActiveView('message');
    } finally {
      setIsSending(false);
    }
  };

  const handleChunkSelect = (chunk: TransferChunk) => {
    if (!chunk.traceId) {
      return;
    }

    engine.selectTrace(chunk.traceId);
    setActiveView('packet');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div
        style={{
          flex: '0 0 44%',
          minHeight: 280,
          position: 'relative',
          borderBottom: '1px solid var(--netlab-bg-surface)',
        }}
      >
        <NetlabCanvas />
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            fontFamily: 'monospace',
            fontSize: 11,
            color: failureCount > 0 ? 'var(--netlab-accent-red)' : 'var(--netlab-text-secondary)',
            background: 'color-mix(in srgb, var(--netlab-bg-panel) 92%, transparent)',
            border: '1px solid var(--netlab-bg-surface)',
            borderRadius: 999,
            padding: '4px 10px',
          }}
        >
          {failureCount > 0
            ? t(`${failureCount} failure(s) active`, `障害 ${failureCount} 件が発生中`)
            : t('No failures active', '障害は起きていません')}
        </div>
      </div>

      <div
        style={{
          flex: '0 0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px 12px',
          background: 'var(--netlab-bg-primary)',
          borderBottom: '1px solid var(--netlab-bg-surface)',
          fontFamily: 'monospace',
          fontSize: 11,
          color: 'var(--netlab-text-primary)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onClick={() => void handleStartTransfer()}
          disabled={isSending}
          style={{
            borderRadius: 8,
            border: 'none',
            background: isSending ? 'var(--netlab-bg-surface)' : 'var(--netlab-accent-cyan)',
            color: isSending ? 'var(--netlab-text-secondary)' : 'var(--netlab-bg-primary)',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            padding: '8px 12px',
            cursor: isSending ? 'not-allowed' : 'pointer',
          }}
        >
          {isSending ? t('Sending...', '送信中...') : t('▶ Start Transfer', '▶ 転送を開始')}
        </button>

        <span
          style={{
            color: failureCount > 0 ? 'var(--netlab-accent-red)' : 'var(--netlab-text-secondary)',
            whiteSpace: 'nowrap',
          }}
        >
          {failureCount > 0
            ? t(`■ ${failureCount} failure(s)`, `■ 障害 ${failureCount} 件`)
            : t('■ No failures', '■ 障害なし')}
        </span>

        <span
          style={{
            color: 'var(--netlab-text-secondary)',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {t(
            `payload: "${payloadSummary}" · ${chunkSize}B chunks`,
            `ペイロード: "${payloadSummary}" · ${chunkSize}B ずつのチャンク`,
          )}
          {selectedTransfer && (
            <>
              {t(' · status: ', ' · 状態: ')}
              {transferStatusLabel(selectedTransfer.status, t)}
            </>
          )}
        </span>

        <TabButton
          active={activeView === 'message'}
          label={t('Message', 'メッセージ')}
          onClick={() => setActiveView('message')}
        />
        <TabButton
          active={activeView === 'packet'}
          label={t('Packet', 'パケット')}
          onClick={() => setActiveView('packet')}
        />
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div
          style={{
            flex: '0 0 300px',
            borderRight: '1px solid var(--netlab-bg-surface)',
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            overflow: 'auto',
            background: 'var(--netlab-bg-primary)',
          }}
        >
          <div style={SECTION_STYLE}>
            <button
              type="button"
              onClick={() => setShowPayloadConfig((current) => !current)}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderRadius: 8,
                border: '1px solid var(--netlab-border)',
                background: 'var(--netlab-bg-primary)',
                color: 'var(--netlab-text-primary)',
                fontFamily: 'monospace',
                fontSize: 12,
                padding: '10px 12px',
                boxSizing: 'border-box',
                cursor: 'pointer',
              }}
            >
              <span>
                {showPayloadConfig ? '▼' : '▶'} {t('Payload Configuration', 'ペイロードの設定')}
              </span>
              <span style={{ color: 'var(--netlab-text-secondary)', fontSize: 10 }}>
                {t(
                  `${payload.length} chars · ${chunkSize}B`,
                  `${payload.length} 文字 · ${chunkSize}B`,
                )}
              </span>
            </button>
            {showPayloadConfig && (
              <div style={{ marginTop: 10 }}>
                <label style={LABEL_STYLE} htmlFor="transfer-payload">
                  {t('PAYLOAD', 'ペイロード')}
                </label>
                <textarea
                  id="transfer-payload"
                  value={payload}
                  onChange={(event) => setPayload(event.target.value)}
                  rows={6}
                  style={{
                    width: '100%',
                    resize: 'vertical',
                    borderRadius: 8,
                    border: '1px solid var(--netlab-border)',
                    background: 'var(--netlab-bg-primary)',
                    color: 'var(--netlab-text-primary)',
                    fontFamily: 'monospace',
                    fontSize: 12,
                    padding: 10,
                    boxSizing: 'border-box',
                  }}
                />
                <label style={{ ...LABEL_STYLE, marginTop: 10 }} htmlFor="chunk-size">
                  {t('CHUNK SIZE', 'チャンクサイズ')}
                </label>
                <input
                  id="chunk-size"
                  type="number"
                  min={50}
                  max={5000}
                  value={chunkSize}
                  onChange={(event) => {
                    const nextValue = Number(event.target.value);
                    if (!Number.isFinite(nextValue)) {
                      return;
                    }
                    setChunkSize(Math.max(50, Math.min(5000, nextValue)));
                  }}
                  style={{
                    width: '100%',
                    borderRadius: 8,
                    border: '1px solid var(--netlab-border)',
                    background: 'var(--netlab-bg-primary)',
                    color: 'var(--netlab-text-primary)',
                    fontFamily: 'monospace',
                    fontSize: 12,
                    padding: 10,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}
          </div>

          <div
            style={{
              ...SECTION_STYLE,
              paddingBottom: 0,
              minHeight: 200,
              maxHeight: 320,
              overflow: 'auto',
            }}
          >
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: 12,
                color: 'var(--netlab-text-primary)',
                marginBottom: 10,
              }}
            >
              {t('Failure Injection', '障害を起こす')}
            </div>
            <FailureTogglePanel />
          </div>

          <div style={SECTION_STYLE}>
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: 12,
                color: 'var(--netlab-text-primary)',
                marginBottom: 10,
              }}
            >
              {t('Transfers', '転送の一覧')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {transfers.length === 0 && (
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 11,
                    color: 'var(--netlab-text-secondary)',
                  }}
                >
                  {t('No transfers yet.', 'まだ転送はありません。')}
                </div>
              )}
              {transfers.map((transfer) => {
                const isSelected = transfer.messageId === selectedTransfer?.messageId;

                return (
                  <button
                    key={transfer.messageId}
                    type="button"
                    onClick={() => {
                      selectTransfer(transfer.messageId);
                      setActiveView('message');
                    }}
                    style={{
                      borderRadius: 8,
                      border: `1px solid ${isSelected ? 'var(--netlab-accent-cyan)' : 'var(--netlab-border)'}`,
                      background: isSelected
                        ? 'var(--netlab-bg-elevated)'
                        : 'var(--netlab-bg-primary)',
                      color: 'var(--netlab-text-primary)',
                      padding: 10,
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontFamily: 'monospace',
                    }}
                  >
                    <div style={{ fontSize: 11 }}>
                      {transfer.payloadPreview || t('(empty payload)', '(空のペイロード)')}
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 10,
                        color: transferStatusColor(transfer.status),
                      }}
                    >
                      {transferStatusLabel(transfer.status, t)} ·{' '}
                      {t(
                        `${transfer.expectedChunks} chunk(s)`,
                        `${transfer.expectedChunks} チャンク`,
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--netlab-bg-primary)',
            overflow: 'auto',
          }}
        >
          <div style={{ flex: 1, minHeight: 0 }}>
            <div
              style={{
                display: activeView === 'message' ? 'flex' : 'none',
                flexDirection: 'column',
                gap: 12,
                minHeight: '100%',
                paddingRight: 4,
              }}
            >
              <MessageView
                transfer={selectedTransfer}
                chunks={selectedChunks}
                currentTraceId={simulationState.currentTraceId}
                tracesById={tracesById}
                onChunkSelect={handleChunkSelect}
              />
            </div>

            <div
              style={{
                display: activeView === 'packet' ? 'flex' : 'none',
                flexDirection: 'column',
                gap: 12,
                minHeight: '100%',
              }}
            >
              <div
                style={{
                  ...SECTION_STYLE,
                  flex: '0 0 40%',
                  minHeight: 180,
                  padding: 0,
                  overflow: 'hidden',
                }}
              >
                <PacketTimeline />
              </div>

              <div style={{ flex: '1 1 60%', minHeight: 0, overflow: 'hidden' }}>
                <HopInspector />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DataTransferDemo() {
  return (
    <DemoShell
      title="Data Transfer"
      desc="Application-level data transfer with chunking, reassembly, checksum verification, and per-hop trace inspection"
    >
      <NetlabProvider topology={TOPOLOGY}>
        <FailureProvider>
          {/* useMainThread: this surface drives the DataTransfer pipeline, which
              only the main-thread engine exposes (the browser-default worker
              engine has none, which previously crashed the page). */}
          <SimulationProvider useMainThread>
            <SessionProvider>
              <DataTransferProvider>
                <DataTransferDemoInner />
              </DataTransferProvider>
            </SessionProvider>
          </SimulationProvider>
        </FailureProvider>
      </NetlabProvider>
    </DemoShell>
  );
}
