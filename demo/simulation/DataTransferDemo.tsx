import { useMemo, useState, type CSSProperties } from 'react';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { FailureTogglePanel } from '../../src/components/simulation/FailureTogglePanel';
import { HopInspector } from '../../src/components/simulation/HopInspector';
import { PacketTimeline } from '../../src/components/simulation/PacketTimeline';
import { DataTransferProvider, useDataTransfer } from '../../src/simulation/DataTransferContext';
import { FailureProvider, useFailure } from '../../src/simulation/FailureContext';
import { dataTransferDemoTopology } from '../../src/simulation/__fixtures__/topologies';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import type { PacketTrace } from '../../src/types/simulation';
import type { TransferChunk, TransferMessage } from '../../src/types/transfer';
import DemoShell from '../DemoShell';

const DEFAULT_PAYLOAD = 'Hello, this is a test message from Server A to Server B!';
const TOPOLOGY = dataTransferDemoTopology();

const SECTION_STYLE: CSSProperties = {
  background: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: 10,
  padding: 12,
};

const LABEL_STYLE: CSSProperties = {
  display: 'block',
  fontSize: 10,
  color: '#64748b',
  fontFamily: 'monospace',
  marginBottom: 6,
  letterSpacing: 0.6,
};

function transferStatusColor(status: TransferMessage['status']): string {
  switch (status) {
    case 'delivered':
      return '#22c55e';
    case 'partial':
      return '#f59e0b';
    case 'failed':
      return '#ef4444';
    case 'in-progress':
      return '#38bdf8';
    default:
      return '#94a3b8';
  }
}

function chunkStateColor(state: TransferChunk['state']): string {
  switch (state) {
    case 'delivered':
      return '#22c55e';
    case 'dropped':
      return '#ef4444';
    case 'in-flight':
      return '#38bdf8';
    default:
      return '#64748b';
  }
}

function PayloadPreviewSection({ transfer }: { transfer: TransferMessage }) {
  const preview = transfer.payloadData.length > 200
    ? `${transfer.payloadData.slice(0, 200)}...`
    : transfer.payloadData;

  return (
    <div style={SECTION_STYLE}>
      <label style={LABEL_STYLE}>PAYLOAD PREVIEW</label>
      <pre
        style={{
          margin: 0,
          padding: 10,
          borderRadius: 8,
          background: '#020617',
          color: '#94a3b8',
          fontSize: 11,
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          maxHeight: 120,
          overflow: 'auto',
        }}
      >
        {preview || '(empty payload)'}
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
  const missing = chunks.filter((chunk) => chunk.state === 'dropped');

  if (missing.length === 0) {
    return null;
  }

  return (
    <div style={SECTION_STYLE}>
      <label style={LABEL_STYLE}>MISSING CHUNKS</label>
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
                background: '#450a0a',
                border: '1px solid #991b1b',
                color: '#fca5a5',
                fontFamily: 'monospace',
              }}
            >
              #{chunk.sequenceNumber} ({chunk.sizeBytes} bytes) · {reason}{location}
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
  const { getReassembly } = useDataTransfer();
  const reassembly = transfer ? getReassembly(transfer.messageId) : undefined;

  if (!transfer) {
    return (
      <div style={{ ...SECTION_STYLE, color: '#94a3b8', fontFamily: 'monospace', fontSize: 12 }}>
        Start a transfer to inspect payloads, missing chunks, and hop-by-hop traces.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
      <div style={SECTION_STYLE}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#e2e8f0' }}>
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
            {transfer.status}
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
            color: '#cbd5e1',
          }}
        >
          <div>messageId: {transfer.messageId}</div>
          <div>protocol: {transfer.protocol}</div>
          <div>payload bytes: {transfer.payloadSizeBytes}</div>
          <div>expected chunks: {transfer.expectedChunks}</div>
        </div>
        <div
          style={{
            marginTop: 10,
            padding: 8,
            borderRadius: 8,
            background: '#020617',
            fontFamily: 'monospace',
            fontSize: 11,
            color: '#94a3b8',
            wordBreak: 'break-all',
          }}
        >
          checksum: {transfer.checksum}
        </div>
      </div>

      <PayloadPreviewSection transfer={transfer} />

      <div style={SECTION_STYLE}>
        <label style={LABEL_STYLE}>CHUNKS</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
          {chunks.map((chunk) => {
            const isSelectedTrace = chunk.traceId !== undefined && chunk.traceId === currentTraceId;

            return (
              <button
                key={chunk.chunkId}
                type="button"
                disabled={!chunk.traceId}
                onClick={() => onChunkSelect(chunk)}
                style={{
                  borderRadius: 8,
                  border: `1px solid ${isSelectedTrace ? '#38bdf8' : '#334155'}`,
                  background: isSelectedTrace ? '#082f49' : '#111827',
                  color: '#e2e8f0',
                  padding: 10,
                  textAlign: 'left',
                  cursor: chunk.traceId ? 'pointer' : 'default',
                  fontFamily: 'monospace',
                }}
              >
                <div style={{ fontSize: 11 }}>chunk #{chunk.sequenceNumber}</div>
                <div style={{ marginTop: 6, fontSize: 10, color: chunkStateColor(chunk.state) }}>
                  {chunk.state}
                </div>
                <div style={{ marginTop: 6, fontSize: 10, color: '#64748b' }}>
                  {chunk.sizeBytes} bytes
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div style={SECTION_STYLE}>
        <label style={LABEL_STYLE}>REASSEMBLY</label>
        <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#cbd5e1', display: 'grid', gap: 6 }}>
          <div>received: {reassembly?.receivedChunks.size ?? 0}/{reassembly?.expectedTotal ?? chunks.length}</div>
          <div>complete: {reassembly?.isComplete ? 'yes' : 'no'}</div>
          <div>
            checksum:
            {' '}
            {reassembly?.checksumVerified === undefined
              ? 'incomplete'
              : reassembly.checksumVerified
                ? 'verified'
                : 'mismatch'}
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
        border: `1px solid ${active ? '#38bdf8' : '#334155'}`,
        background: active ? '#082f49' : '#111827',
        color: active ? '#e0f2fe' : '#94a3b8',
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
  const { engine, state: simulationState } = useSimulation();
  const { failureState } = useFailure();
  const {
    state,
    startTransfer,
    getChunks,
    selectedTransferId,
    selectTransfer,
  } = useDataTransfer();
  const [payload, setPayload] = useState(DEFAULT_PAYLOAD);
  const [chunkSize, setChunkSize] = useState(1400);
  const [isSending, setIsSending] = useState(false);
  const [activeView, setActiveView] = useState<'message' | 'packet'>('message');

  const transfers = useMemo(
    () => Array.from(state.transfers.values()).sort((left, right) => right.createdAt - left.createdAt),
    [state.transfers],
  );
  const tracesById = useMemo(
    () => new Map<string, PacketTrace>(simulationState.traces.map((trace) => [trace.packetId, trace])),
    [simulationState.traces],
  );
  const selectedTransfer = selectedTransferId
    ? state.transfers.get(selectedTransferId) ?? null
    : transfers[0] ?? null;
  const selectedChunks = selectedTransfer ? getChunks(selectedTransfer.messageId) : [];
  const failureCount =
    failureState.downNodeIds.size +
    failureState.downEdgeIds.size +
    failureState.downInterfaceIds.size;

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
      <div style={{ flex: '0 0 44%', minHeight: 280, position: 'relative', borderBottom: '1px solid #1e293b' }}>
        <NetlabCanvas />
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            fontFamily: 'monospace',
            fontSize: 11,
            color: failureCount > 0 ? '#f87171' : '#94a3b8',
            background: 'rgba(2, 6, 23, 0.82)',
            border: '1px solid #1e293b',
            borderRadius: 999,
            padding: '4px 10px',
          }}
        >
          {failureCount > 0 ? `${failureCount} failure(s) active` : 'No failures active'}
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <div
          style={{
            flex: '0 0 340px',
            borderRight: '1px solid #1e293b',
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            overflow: 'auto',
            background: '#020617',
          }}
        >
          <div style={SECTION_STYLE}>
            <label style={LABEL_STYLE} htmlFor="transfer-payload">PAYLOAD</label>
            <textarea
              id="transfer-payload"
              value={payload}
              onChange={(event) => setPayload(event.target.value)}
              rows={6}
              style={{
                width: '100%',
                resize: 'vertical',
                borderRadius: 8,
                border: '1px solid #334155',
                background: '#020617',
                color: '#e2e8f0',
                fontFamily: 'monospace',
                fontSize: 12,
                padding: 10,
                boxSizing: 'border-box',
              }}
            />
            <label style={{ ...LABEL_STYLE, marginTop: 10 }} htmlFor="chunk-size">CHUNK SIZE</label>
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
                border: '1px solid #334155',
                background: '#020617',
                color: '#e2e8f0',
                fontFamily: 'monospace',
                fontSize: 12,
                padding: 10,
                boxSizing: 'border-box',
              }}
            />
            <button
              type="button"
              onClick={() => void handleStartTransfer()}
              disabled={isSending}
              style={{
                marginTop: 12,
                width: '100%',
                borderRadius: 8,
                border: 'none',
                background: isSending ? '#1e293b' : '#0ea5e9',
                color: isSending ? '#64748b' : '#082f49',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                padding: '10px 14px',
                cursor: isSending ? 'not-allowed' : 'pointer',
              }}
            >
              {isSending ? 'Sending...' : 'Start Transfer'}
            </button>
          </div>

          <div style={{ ...SECTION_STYLE, paddingBottom: 0 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#e2e8f0', marginBottom: 10 }}>
              Failures
            </div>
            <div style={{ maxHeight: 280, overflow: 'auto', paddingBottom: 12 }}>
              <FailureTogglePanel />
            </div>
          </div>

          <div style={SECTION_STYLE}>
            <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#e2e8f0', marginBottom: 10 }}>
              Transfers
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {transfers.length === 0 && (
                <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>
                  No transfers yet.
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
                      border: `1px solid ${isSelected ? '#38bdf8' : '#334155'}`,
                      background: isSelected ? '#082f49' : '#111827',
                      color: '#e2e8f0',
                      padding: 10,
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontFamily: 'monospace',
                    }}
                  >
                    <div style={{ fontSize: 11 }}>{transfer.payloadPreview || '(empty payload)'}</div>
                    <div style={{ marginTop: 6, fontSize: 10, color: transferStatusColor(transfer.status) }}>
                      {transfer.status} · {transfer.expectedChunks} chunk(s)
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
            gap: 12,
            background: '#020617',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <TabButton
              active={activeView === 'message'}
              label="Message View"
              onClick={() => setActiveView('message')}
            />
            <TabButton
              active={activeView === 'packet'}
              label="Packet View"
              onClick={() => setActiveView('packet')}
            />
          </div>

          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <div
              style={{
                display: activeView === 'message' ? 'flex' : 'none',
                flexDirection: 'column',
                gap: 12,
                height: '100%',
                minHeight: 0,
                overflow: 'auto',
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
                height: '100%',
                minHeight: 0,
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
          <SimulationProvider>
            <DataTransferProvider>
              <DataTransferDemoInner />
            </DataTransferProvider>
          </SimulationProvider>
        </FailureProvider>
      </NetlabProvider>
    </DemoShell>
  );
}
