import { useId } from 'react';

/**
 * Controlled range slider with optional label, description, value display, and custom format function.
 * Track fill is achieved via a linear-gradient on the input background.
 */
export interface SliderProps {
  id?: string;
  label?: string;
  description?: string;
  disabled?: boolean;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  /** Show numeric value next to the track. Default: true. */
  showValue?: boolean;
  /** Format function for the displayed value. Default: String. */
  format?: (value: number) => string;
}

export function Slider({
  id: idProp,
  label,
  description,
  disabled,
  min,
  max,
  step = 1,
  value,
  onChange,
  showValue = true,
  format = String,
}: SliderProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const pct = ((value - min) / (max - min)) * 100;

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
          gap: 8,
          opacity: disabled ? 0.5 : 1,
          pointerEvents: disabled ? 'none' : undefined,
        }}
      >
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="netlab-focus-ring"
          style={{
            flex: 1,
            appearance: 'none',
            height: 4,
            borderRadius: 2,
            background: `linear-gradient(to right, var(--netlab-accent-blue) ${pct}%, var(--netlab-bg-elevated) 0%)`,
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        />
        {showValue && (
          <span
            style={{
              fontSize: 11,
              color: 'var(--netlab-text-secondary)',
              fontFamily: 'monospace',
              minWidth: 28,
              textAlign: 'right',
            }}
          >
            {format(value)}
          </span>
        )}
      </div>
      {description && (
        <span
          style={{
            fontSize: 10,
            color: 'var(--netlab-text-muted)',
            fontFamily: 'monospace',
          }}
        >
          {description}
        </span>
      )}
    </div>
  );
}
