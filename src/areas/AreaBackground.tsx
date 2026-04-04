import type { NodeProps } from '@xyflow/react';
import type { AreaType } from '../types/areas';

export interface AreaBackgroundData extends Record<string, unknown> {
  name: string;
  type: AreaType;
  width: number;
  height: number;
  color?: string;
  label?: string;
}

const AREA_COLORS: Record<string, string> = {
  private: 'rgba(59, 130, 246, 0.08)',
  public: 'rgba(34, 197, 94, 0.08)',
  dmz: 'rgba(251, 146, 60, 0.08)',
  management: 'rgba(168, 85, 247, 0.08)',
};

const BORDER_COLORS: Record<string, string> = {
  private: 'rgba(59, 130, 246, 0.3)',
  public: 'rgba(34, 197, 94, 0.3)',
  dmz: 'rgba(251, 146, 60, 0.3)',
  management: 'rgba(168, 85, 247, 0.3)',
};

const LABEL_COLORS: Record<string, string> = {
  private: 'rgba(59, 130, 246, 0.8)',
  public: 'rgba(34, 197, 94, 0.8)',
  dmz: 'rgba(251, 146, 60, 0.8)',
  management: 'rgba(168, 85, 247, 0.8)',
};

export function AreaBackground({ data }: NodeProps) {
  const d = data as AreaBackgroundData;
  const bgColor = d.color ?? AREA_COLORS[d.type] ?? 'rgba(100,100,100,0.08)';
  const borderColor = BORDER_COLORS[d.type] ?? 'rgba(100,100,100,0.3)';
  const labelColor = LABEL_COLORS[d.type] ?? 'rgba(100,100,100,0.8)';
  const displayLabel = d.label ?? d.name;

  return (
    <div
      style={{
        width: d.width,
        height: d.height,
        background: bgColor,
        border: `2px dashed ${borderColor}`,
        borderRadius: 12,
        position: 'relative',
        pointerEvents: 'none',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 8,
          left: 12,
          fontSize: 11,
          fontWeight: 600,
          color: labelColor,
          fontFamily: 'monospace',
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        {displayLabel}
      </span>
    </div>
  );
}
