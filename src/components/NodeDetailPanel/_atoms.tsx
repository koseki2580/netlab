import { useEffect, useState } from 'react';
import { parseMtu } from './_parsers';
import {
  BADGE_STYLE,
  FIELD_ERROR_STYLE,
  FIELD_STACK_STYLE,
  INPUT_STYLE,
  ROW_STYLE,
  SELECT_STYLE,
} from './_styles';

export function EditableTextRow({
  label,
  name,
  value,
  editable,
  color = 'var(--netlab-text-primary)',
  minWidth = 72,
  width = '100%',
  onCommit,
}: {
  label: string;
  name: string;
  value: string;
  editable: boolean;
  color?: string;
  minWidth?: number;
  width?: number | string;
  onCommit: (value: string) => string | null;
}) {
  const [localValue, setLocalValue] = useState(value);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocalValue(value);
    setError(null);
  }, [value]);

  return (
    <div style={{ ...ROW_STYLE, alignItems: 'flex-start', marginBottom: 6 }}>
      <span style={{ color: 'var(--netlab-text-secondary)', minWidth }}>{label}</span>
      <div style={FIELD_STACK_STYLE}>
        {editable ? (
          <input
            name={name}
            value={localValue}
            onChange={(event) => setLocalValue(event.target.value)}
            onBlur={(event) => setError(onCommit(event.currentTarget.value))}
            style={{ ...INPUT_STYLE, width }}
          />
        ) : (
          <span style={{ color }}>{value || '—'}</span>
        )}
        {error && <span style={FIELD_ERROR_STYLE}>{error}</span>}
      </div>
    </div>
  );
}

export function EditableSelectRow({
  label,
  name,
  value,
  editable,
  minWidth = 72,
  options,
  onCommit,
}: {
  label: string;
  name: string;
  value: string;
  editable: boolean;
  minWidth?: number;
  options: { label: string; value: string }[];
  onCommit: (value: string) => void;
}) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <div style={{ ...ROW_STYLE, alignItems: 'center', marginBottom: 6 }}>
      <span style={{ color: 'var(--netlab-text-secondary)', minWidth }}>{label}</span>
      {editable ? (
        <select
          name={name}
          value={localValue}
          onChange={(event) => {
            setLocalValue(event.target.value);
            onCommit(event.target.value);
          }}
          style={SELECT_STYLE}
        >
          {options.map((option) => (
            <option key={option.value || 'empty'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <span style={{ color: 'var(--netlab-text-primary)' }}>{value || '—'}</span>
      )}
    </div>
  );
}

export function MtuBadge({ mtu }: { mtu: number | undefined }) {
  const lowMtu = mtu !== undefined && mtu < 1500;
  return (
    <span
      data-low-mtu={lowMtu ? 'true' : 'false'}
      style={{
        ...BADGE_STYLE,
        color: lowMtu ? 'var(--netlab-accent-orange)' : 'var(--netlab-text-primary)',
        background: lowMtu ? 'rgba(245, 158, 11, 0.12)' : 'rgba(148, 163, 184, 0.08)',
        borderColor: lowMtu ? 'rgba(245, 158, 11, 0.3)' : 'var(--netlab-border-subtle)',
      }}
    >
      {mtu === undefined ? 'MTU ∞' : `MTU ${mtu}`}
    </span>
  );
}

export function MtuInput({
  name,
  mtu,
  onCommit,
}: {
  name: string;
  mtu: number | undefined;
  onCommit: (mtu: number | undefined) => void;
}) {
  const [localValue, setLocalValue] = useState(mtu === undefined ? '' : String(mtu));

  useEffect(() => {
    setLocalValue(mtu === undefined ? '' : String(mtu));
  }, [mtu]);

  return (
    <input
      name={name}
      type="number"
      min={1}
      placeholder="inherit"
      value={localValue}
      onChange={(event) => setLocalValue(event.target.value)}
      onBlur={(event) => onCommit(parseMtu(event.currentTarget.value))}
      style={INPUT_STYLE}
    />
  );
}
