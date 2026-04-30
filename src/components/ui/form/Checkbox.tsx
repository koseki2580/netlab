import { useId } from 'react';

/**
 * Controlled checkbox with required visible label, optional description, and disabled state.
 * Uses native checkbox with accentColor for styling consistency with the netlab theme.
 */
export interface CheckboxProps {
  id?: string;
  /** Required for accessibility; visually shown. */
  label: string;
  description?: string;
  disabled?: boolean;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Checkbox({
  id: idProp,
  label,
  description,
  disabled,
  checked,
  onChange,
}: CheckboxProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          fontFamily: 'monospace',
          fontSize: 12,
          color: 'var(--netlab-text-primary)',
        }}
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="netlab-focus-ring"
          style={{
            width: 16,
            height: 16,
            borderRadius: 4,
            accentColor: 'var(--netlab-accent-blue)',
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        />
        {label}
      </label>
      {description && (
        <span
          style={{
            fontSize: 10,
            color: 'var(--netlab-text-muted)',
            fontFamily: 'monospace',
            paddingLeft: 24,
          }}
        >
          {description}
        </span>
      )}
    </div>
  );
}
