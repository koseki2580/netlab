import { useId } from 'react';
import type { ReactNode } from 'react';

const HEIGHT: Record<'sm' | 'md', number> = { sm: 28, md: 32 };

/**
 * Controlled text input with optional label, description/error slot, prefix/suffix icons,
 * and size variants. Styled with netlab design tokens.
 */
export interface InputProps {
  id?: string;
  label?: string;
  description?: string;
  error?: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
  type?: 'text' | 'number' | 'search' | 'email' | 'password';
  placeholder?: string;
  /** Small icon or text rendered inside the field on the left. */
  prefix?: ReactNode;
  /** Small icon or text rendered inside the field on the right. */
  suffix?: ReactNode;
  value: string;
  onChange: (value: string) => void;
}

export function Input({
  id: idProp,
  label,
  description,
  error,
  size = 'md',
  disabled,
  type = 'text',
  placeholder,
  prefix,
  suffix,
  value,
  onChange,
}: InputProps) {
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: HEIGHT[size],
          border: `1px solid ${error ? 'var(--netlab-accent-red)' : 'var(--netlab-border)'}`,
          borderRadius: 6,
          background: 'var(--netlab-bg-surface)',
          paddingLeft: prefix ? 8 : 10,
          paddingRight: suffix ? 8 : 10,
          gap: 6,
          opacity: disabled ? 0.5 : 1,
          pointerEvents: disabled ? 'none' : undefined,
        }}
      >
        {prefix && (
          <span style={{ color: 'var(--netlab-text-muted)', flexShrink: 0 }}>{prefix}</span>
        )}
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="netlab-focus-ring"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--netlab-text-primary)',
            fontFamily: 'monospace',
            fontSize: 12,
          }}
        />
        {suffix && (
          <span style={{ color: 'var(--netlab-text-muted)', flexShrink: 0 }}>{suffix}</span>
        )}
      </div>
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
