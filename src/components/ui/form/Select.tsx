import { useId } from 'react';

const HEIGHT: Record<'sm' | 'md', number> = { sm: 28, md: 32 };

export interface SelectOption<V extends string = string> {
  value: V;
  label: string;
  disabled?: boolean;
}

/**
 * Controlled native select dropdown with optional label, description/error slot, and size variants.
 * Re-skinned with a custom chevron via background-image. Styled with netlab design tokens.
 */
export interface SelectProps<V extends string = string> {
  id?: string;
  label?: string;
  description?: string;
  error?: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
  options: SelectOption<V>[];
  value: V;
  onChange: (value: V) => void;
}

export function Select<V extends string = string>({
  id: idProp,
  label,
  description,
  error,
  size = 'md',
  disabled,
  options,
  value,
  onChange,
}: SelectProps<V>) {
  const generatedId = useId();
  const id = idProp ?? generatedId;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && (
        <label
          htmlFor={id}
          style={{ fontSize: 11, color: 'var(--netlab-text-secondary)', fontFamily: 'monospace' }}
        >
          {label}
        </label>
      )}
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as V)}
        className="netlab-focus-ring"
        style={{
          height: HEIGHT[size],
          border: `1px solid ${error ? 'var(--netlab-accent-red)' : 'var(--netlab-border)'}`,
          borderRadius: 6,
          background: 'var(--netlab-bg-surface)',
          color: 'var(--netlab-text-primary)',
          fontFamily: 'monospace',
          fontSize: 12,
          padding: '0 10px',
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2394a3b8'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 10px center',
          paddingRight: 28,
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      {(description || error) && (
        <span
          style={{
            fontSize: 10,
            color: error ? 'var(--netlab-accent-red)' : 'var(--netlab-text-muted)',
            fontFamily: 'monospace',
          }}
        >
          {error ?? description}
        </span>
      )}
    </div>
  );
}
