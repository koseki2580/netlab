import type { ObservabilityTrace } from '../../types/simulation';
import { CARD, FIELD_ROW, SECTION_HEADER, TEXT } from '../_styles/tokens';

function FieldRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        ...FIELD_ROW,
        alignItems: 'start',
      }}
    >
      <span style={{ color: TEXT.secondary }}>{label}</span>
      <span style={{ color: valueColor ?? TEXT.primary, wordBreak: 'break-word' }}>{value}</span>
    </div>
  );
}

function buildObservabilityFields(trace: ObservabilityTrace): { label: string; value: string }[] {
  switch (trace.kind) {
    case 'netflow:flow-update':
      return [
        { label: 'NetFlow Router', value: trace.routerId },
        { label: 'NetFlow Packets', value: String(trace.packets) },
        { label: 'NetFlow Bytes', value: String(trace.bytes) },
      ];
    case 'netflow:flow-export':
      return [
        { label: 'NetFlow Router', value: trace.routerId },
        { label: 'NetFlow Export', value: trace.reason },
      ];
    case 'sflow:sampled':
      return [
        { label: 'sFlow Switch', value: trace.switchId },
        { label: 'sFlow Port', value: trace.portId },
        { label: 'sFlow Sequence', value: String(trace.sequence) },
      ];
    case 'sflow:dropped':
      return [
        { label: 'sFlow Switch', value: trace.switchId },
        { label: 'sFlow Drop', value: trace.reason },
      ];
  }
}

function getHeader(trace: ObservabilityTrace): string {
  return trace.kind.startsWith('netflow:') ? 'NETFLOW' : 'SFLOW';
}

export function HopObservabilityView({ trace }: { trace: ObservabilityTrace }) {
  const fields = buildObservabilityFields(trace);

  return (
    <section style={CARD}>
      <div style={SECTION_HEADER}>{getHeader(trace)}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
        {fields.map((field) => (
          <FieldRow key={field.label} label={field.label} value={field.value} />
        ))}
      </div>
    </section>
  );
}
