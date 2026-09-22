import { useI18n } from '../../i18n/useI18n';
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

function buildObservabilityFields(
  trace: ObservabilityTrace,
): { labelKey: string; value: string }[] {
  switch (trace.kind) {
    case 'netflow:flow-update':
      return [
        { labelKey: 'simulation.observability.netflowRouter', value: trace.routerId },
        { labelKey: 'simulation.observability.netflowPackets', value: String(trace.packets) },
        { labelKey: 'simulation.observability.netflowBytes', value: String(trace.bytes) },
      ];
    case 'netflow:flow-export':
      return [
        { labelKey: 'simulation.observability.netflowRouter', value: trace.routerId },
        { labelKey: 'simulation.observability.netflowExport', value: trace.reason },
      ];
    case 'sflow:sampled':
      return [
        { labelKey: 'simulation.observability.sflowSwitch', value: trace.switchId },
        { labelKey: 'simulation.observability.sflowPort', value: trace.portId },
        { labelKey: 'simulation.observability.sflowSequence', value: String(trace.sequence) },
      ];
    case 'sflow:dropped':
      return [
        { labelKey: 'simulation.observability.sflowSwitch', value: trace.switchId },
        { labelKey: 'simulation.observability.sflowDrop', value: trace.reason },
      ];
  }
}

function getHeader(trace: ObservabilityTrace): string {
  return trace.kind.startsWith('netflow:') ? 'NETFLOW' : 'SFLOW';
}

export function HopObservabilityView({ trace }: { trace: ObservabilityTrace }) {
  const { t } = useI18n();
  const fields = buildObservabilityFields(trace);

  return (
    <section style={CARD}>
      <div style={SECTION_HEADER}>{getHeader(trace)}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
        {fields.map((field) => (
          <FieldRow key={field.labelKey} label={t(field.labelKey)} value={field.value} />
        ))}
      </div>
    </section>
  );
}
