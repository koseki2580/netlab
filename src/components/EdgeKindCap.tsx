import type { EdgeCap } from './edgeEncoding';

/**
 * Render an edge end-cap shape — the third, color-independent encoding channel
 * for a packet kind. Shared by the legend (and any edge marker that needs the
 * cap glyph) so the shape stays consistent everywhere.
 */
export function EdgeKindCap({
  cap,
  color,
  x = 130,
  y = 12,
}: {
  cap: EdgeCap;
  color: string;
  x?: number;
  y?: number;
}) {
  switch (cap) {
    case 'dot':
      return <circle cx={x} cy={y} r={5} fill={color} />;
    case 'diamond':
      return (
        <rect
          x={x - 5}
          y={y - 5}
          width={9}
          height={9}
          transform={`rotate(45 ${x} ${y})`}
          fill={color}
        />
      );
    case 'triangle':
      return <polygon points={`${x},${y - 5} ${x + 5},${y + 4} ${x - 5},${y + 4}`} fill={color} />;
    case 'cross':
      return (
        <text
          x={x - 3}
          y={y + 4}
          fontFamily="ui-monospace, monospace"
          fontSize={11}
          fontWeight={700}
          fill={color}
        >
          ×
        </text>
      );
    default:
      return null;
  }
}
