import { useSimulation } from '../../simulation/SimulationContext';
import { serializePacket } from '../../utils/packetSerializer';
import type { AnnotatedField, LayerTag, SerializedPacket } from '../../utils/packetSerializer';

// ── Layer color palette ───────────────────────────────────────────────────────

const LAYER_COLORS: Record<LayerTag, string> = {
  L2:  '#7dd3fc',  // sky-300   — matches existing CREATE event badge
  L3:  '#a78bfa',  // violet-400
  L4:  '#4ade80',  // green-400 — matches existing FORWARD event badge
  L7:  '#f472b6',  // pink-400
  raw: '#94a3b8',  // slate-400
};

const LAYER_LABELS: Record<LayerTag, string> = {
  L2:  'L2 Ethernet',
  L3:  'L3 IPv4',
  L4:  'L4 TCP/UDP',
  L7:  'L7 App',
  raw: 'Payload',
};

const HEX_BYTES_PER_ROW = 16;
const MAX_RENDER_BYTES = 512;

// ── Shared badge style ────────────────────────────────────────────────────────

function layerBadgeStyle(layer: LayerTag): React.CSSProperties {
  const color = LAYER_COLORS[layer];
  return {
    display: 'inline-block',
    padding: '0 5px',
    borderRadius: 3,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.3,
    background: `${color}22`,
    color,
    border: `1px solid ${color}44`,
    fontFamily: 'monospace',
    flexShrink: 0,
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div
      style={{
        color: '#475569',
        fontSize: 11,
        fontStyle: 'italic',
        padding: '12px 0',
        fontFamily: 'monospace',
      }}
    >
      No packet selected — step through the simulation to inspect packet bytes.
    </div>
  );
}

function LegendPills({ annotations }: { annotations: LayerTag[] }) {
  const present = [...new Set(annotations)] as LayerTag[];
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
      {present.map((layer) => (
        <span key={layer} style={layerBadgeStyle(layer)}>
          {LAYER_LABELS[layer]}
        </span>
      ))}
    </div>
  );
}

function HexDump({
  serialized,
  changedFields,
}: {
  serialized: SerializedPacket;
  changedFields?: string[];
}) {
  const { bytes, annotations, fields } = serialized;
  const truncated = bytes.length > MAX_RENDER_BYTES;
  const renderBytes = truncated ? bytes.slice(0, MAX_RENDER_BYTES) : bytes;
  const changedFieldSet = new Set(changedFields ?? []);

  // Build a lookup: byteIndex → field name
  const fieldByByte = new Map<number, string>();
  for (const field of fields) {
    for (let i = 0; i < field.byteLength; i++) {
      fieldByByte.set(field.byteOffset + i, field.name);
    }
  }

  const rows: JSX.Element[] = [];
  for (let rowStart = 0; rowStart < renderBytes.length; rowStart += HEX_BYTES_PER_ROW) {
    const rowBytes = renderBytes.slice(rowStart, rowStart + HEX_BYTES_PER_ROW);
    rows.push(
      <div key={rowStart} style={{ display: 'flex', gap: 1, marginBottom: 2, alignItems: 'center' }}>
        {/* Offset label */}
        <span
          style={{
            fontSize: 10,
            color: '#475569',
            width: 30,
            flexShrink: 0,
            textAlign: 'right',
            marginRight: 6,
            fontFamily: 'monospace',
          }}
        >
          {rowStart.toString(16).padStart(3, '0')}
        </span>
        {/* Byte cells */}
        {Array.from(rowBytes).map((byte, i) => {
          const absIdx = rowStart + i;
          const layer = annotations[absIdx] ?? 'raw';
          const color = LAYER_COLORS[layer];
          const fieldName = fieldByByte.get(absIdx) ?? '';
          const isChangedByte = changedFieldSet.has(fieldName);
          return (
            <span
              key={i}
              title={fieldName}
              style={{
                display: 'inline-block',
                width: 22,
                textAlign: 'center',
                fontSize: 11,
                fontFamily: 'monospace',
                borderRadius: 2,
                padding: '1px 0',
                color,
                background: `${color}18`,
                outline: isChangedByte ? '1px solid #fbbf24' : undefined,
                outlineOffset: isChangedByte ? '-1px' : undefined,
                cursor: 'default',
                userSelect: 'none',
              }}
            >
              {byte.toString(16).padStart(2, '0').toUpperCase()}
            </span>
          );
        })}
      </div>,
    );
  }

  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 'bold',
          letterSpacing: 1,
          color: '#64748b',
          marginBottom: 4,
        }}
      >
        HEX DUMP
      </div>
      {rows}
      {truncated && (
        <div style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>
          +{bytes.length - MAX_RENDER_BYTES} more bytes…
        </div>
      )}
    </div>
  );
}

function FieldTable({
  fields,
  changedFields,
}: {
  fields: AnnotatedField[];
  changedFields?: string[];
}) {
  if (fields.length === 0) return null;
  const changedFieldSet = new Set(changedFields ?? []);
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 'bold',
          letterSpacing: 1,
          color: '#64748b',
          marginBottom: 4,
        }}
      >
        FIELD DETAILS
      </div>
      <div
        style={{
          border: '1px solid #1e293b',
          borderRadius: 6,
          overflow: 'hidden',
          fontSize: 11,
          fontFamily: 'monospace',
        }}
      >
        {/* Header row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '60px 110px 1fr 30px',
            gap: 4,
            padding: '4px 8px',
            background: '#1e293b',
            color: '#475569',
            fontSize: 10,
            letterSpacing: 0.5,
          }}
        >
          <span>Layer</span>
          <span>Field</span>
          <span>Value</span>
          <span style={{ textAlign: 'right' }}>B</span>
        </div>
        {/* Data rows */}
        {fields.map((field, idx) => (
          <div
            key={idx}
            style={{
              display: 'grid',
              gridTemplateColumns: '60px 110px 1fr 30px',
              gap: 4,
              padding: '3px 8px',
              borderTop: idx > 0 ? '1px solid #0f172a' : undefined,
              background: changedFieldSet.has(field.name)
                ? '#92400e33'
                : idx % 2 === 0
                  ? 'transparent'
                  : '#0f172a55',
              alignItems: 'center',
            }}
          >
            <span style={layerBadgeStyle(field.layer)}>{field.layer}</span>
            <span style={{ color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {field.name}
            </span>
            <span
              style={{
                color: '#e2e8f0',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={field.displayValue}
            >
              {field.displayValue}
            </span>
            <span style={{ color: '#475569', textAlign: 'right' }}>{field.byteLength}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PacketStructureViewer() {
  const { state } = useSimulation();
  const { selectedHop, selectedPacket } = state;

  return (
    <div
      style={{
        height: 320,
        overflowY: 'auto',
        borderTop: '1px solid #1e293b',
        padding: '10px 12px',
        background: '#0f172a',
        fontFamily: 'monospace',
        color: '#e2e8f0',
        flexShrink: 0,
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div
        style={{
          fontSize: 10,
          fontWeight: 'bold',
          letterSpacing: 1,
          color: '#64748b',
          marginBottom: 6,
        }}
      >
        PACKET STRUCTURE
      </div>

      {!selectedPacket ? (
        <EmptyState />
      ) : (
        (() => {
          const serialized = serializePacket(selectedPacket.frame);
          const changedFields = selectedHop?.changedFields;
          return (
            <>
              <LegendPills annotations={serialized.annotations} />
              <HexDump serialized={serialized} changedFields={changedFields} />
              <FieldTable fields={serialized.fields} changedFields={changedFields} />
            </>
          );
        })()
      )}
    </div>
  );
}
