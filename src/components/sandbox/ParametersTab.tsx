import { useSandbox } from '../../sandbox/useSandbox';
import type { ParameterKey } from '../../sandbox/types';
import { buttonStyle, fieldStyle } from './editors/editorStyles';

const PARAMS: {
  readonly key: ParameterKey;
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
}[] = [
  { key: 'tcp.initialWindow', label: 'TCP initial window', min: 1024, max: 262144, step: 1024 },
  { key: 'tcp.mss', label: 'TCP MSS', min: 256, max: 9000, step: 1 },
  { key: 'tcp.rto', label: 'TCP RTO ms', min: 100, max: 10000, step: 100 },
  { key: 'ospf.helloIntervalMs', label: 'OSPF hello ms', min: 1000, max: 60000, step: 1000 },
  { key: 'ospf.deadIntervalMs', label: 'OSPF dead ms', min: 1000, max: 240000, step: 1000 },
  { key: 'arp.cacheTtlMs', label: 'ARP cache TTL ms', min: 1000, max: 3600000, step: 1000 },
  { key: 'engine.tickMs', label: 'Engine tick ms', min: 50, max: 5000, step: 50 },
  { key: 'engine.maxTtl', label: 'Max TTL', min: 1, max: 255, step: 1 },
];

function readParameter(sandbox: ReturnType<typeof useSandbox>, key: ParameterKey): number {
  return key.split('.').reduce<unknown>((current, part) => {
    if (typeof current !== 'object' || current === null) return undefined;
    return (current as Record<string, unknown>)[part];
  }, sandbox.engine.parameters) as number;
}

export function ParametersTab() {
  const sandbox = useSandbox();

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <p style={{ margin: 0, color: 'var(--netlab-text-muted)', fontSize: 11 }}>
        Parameter edits are applied in Live mode; switching from Compare returns to Live.
      </p>
      {PARAMS.map((param) => {
        const current = readParameter(sandbox, param.key);
        return (
          <label key={param.key} style={{ display: 'grid', gap: 4 }}>
            <span>{param.label}</span>
            <input
              type="range"
              aria-label={param.label}
              min={param.min}
              max={param.max}
              step={param.step}
              value={current}
              onChange={(event) => {
                const after = Number(event.target.value);
                if (sandbox.mode === 'beta') {
                  sandbox.switchMode('alpha');
                }
                sandbox.setDiffFilter('parameter');
                sandbox.pushEdit({ kind: 'param.set', key: param.key, before: current, after });
              }}
              style={fieldStyle}
            />
            <span style={{ color: 'var(--netlab-text-secondary)', fontSize: 11 }}>{current}</span>
          </label>
        );
      })}
      <button type="button" style={buttonStyle} onClick={sandbox.resetBaseline}>
        Reset parameters
      </button>
    </div>
  );
}
