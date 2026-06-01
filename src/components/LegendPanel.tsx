import type React from 'react';
import { useState } from 'react';
import { Marker } from './simulation/Marker';
import { LEGEND_MARKERS } from './simulation/hopMarkers';
import { NodeGlyph, type NodeGlyphKind } from './NodeGlyph';
import { EDGE_KINDS, NL_EDGE_KINDS } from './edgeEncoding';
import { EdgeKindCap } from './EdgeKindCap';

const LEGEND_KEY = 'nl_a11y_legend';
const MONO = 'ui-monospace, monospace';
const NODE_KINDS: readonly NodeGlyphKind[] = ['router', 'switch', 'client', 'server'];

function readOpen(): boolean {
  try {
    return window.localStorage.getItem(LEGEND_KEY) === '1';
  } catch {
    return false;
  }
}

function writeOpen(open: boolean): void {
  try {
    window.localStorage.setItem(LEGEND_KEY, open ? '1' : '0');
  } catch {
    /* localStorage unavailable — open state stays in-memory only */
  }
}

export interface LegendPanelProps {
  style?: React.CSSProperties;
}

/**
 * M6 — collapsible legend (bottom-right canvas overlay). Lists every node glyph
 * and timeline marker with its label, so the shape/letter encoding is decodable
 * without relying on color. Open state persists to `localStorage`.
 */
export function LegendPanel({ style }: LegendPanelProps) {
  const [open, setOpen] = useState<boolean>(() => readOpen());

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      writeOpen(next);
      return next;
    });
  };

  return (
    <div
      data-testid="legend-panel"
      style={{
        position: 'absolute',
        right: 12,
        bottom: 12,
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 6,
        ...style,
      }}
    >
      {open && (
        <div
          data-testid="legend-body"
          style={{
            width: 220,
            padding: 12,
            borderRadius: 10,
            border: '1px solid var(--netlab-border)',
            background: 'var(--netlab-bg-panel, var(--netlab-bg-surface))',
            color: 'var(--netlab-text-primary)',
            boxShadow: '0 14px 40px rgba(0, 0, 0, 0.35)',
            display: 'grid',
            gap: 12,
          }}
        >
          <section>
            <div style={EYEBROW}>nodes</div>
            <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
              {NODE_KINDS.map((kind) => (
                <div key={kind} style={{ display: 'grid', justifyItems: 'center', gap: 3 }}>
                  <NodeGlyph kind={kind} size={28} />
                  <span
                    style={{ fontFamily: MONO, fontSize: 9, color: 'var(--netlab-text-muted)' }}
                  >
                    {kind}
                  </span>
                </div>
              ))}
            </div>
          </section>
          <section style={{ borderTop: '1px solid var(--netlab-border-subtle)', paddingTop: 10 }}>
            <div style={EYEBROW}>packet edges</div>
            <div style={{ display: 'grid', gap: 4, marginTop: 8 }}>
              {EDGE_KINDS.map((kind) => {
                const meta = NL_EDGE_KINDS[kind];
                return (
                  <div key={kind} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg viewBox="0 0 145 24" width={72} height={12} aria-hidden>
                      <line
                        x1="6"
                        y1="12"
                        x2="120"
                        y2="12"
                        stroke={meta.color}
                        strokeWidth="3"
                        {...(meta.dash === 'none' ? {} : { strokeDasharray: meta.dash })}
                      />
                      <EdgeKindCap cap={meta.cap} color={meta.color} />
                    </svg>
                    <span
                      style={{
                        fontFamily: MONO,
                        fontSize: 10,
                        color: 'var(--netlab-text-secondary)',
                      }}
                    >
                      {meta.label}
                    </span>
                    <span
                      style={{
                        fontFamily: MONO,
                        fontSize: 9,
                        color: 'var(--netlab-text-muted)',
                        marginLeft: 'auto',
                      }}
                    >
                      {meta.dash === 'none' ? 'solid' : meta.cap}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
          <section style={{ borderTop: '1px solid var(--netlab-border-subtle)', paddingTop: 10 }}>
            <div style={EYEBROW}>markers</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
              {LEGEND_MARKERS.map((m) => (
                <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Marker shape={m.shape} color={m.color} label={m.label} />
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 10,
                      color: 'var(--netlab-text-secondary)',
                    }}
                  >
                    {m.label}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
      <button
        type="button"
        data-testid="legend-toggle"
        onClick={toggle}
        aria-expanded={open}
        title="Toggle legend"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          borderRadius: 999,
          border: '1px solid var(--netlab-border)',
          background: 'var(--netlab-bg-panel, var(--netlab-bg-surface))',
          color: 'var(--netlab-text-secondary)',
          fontFamily: MONO,
          fontSize: 11,
          cursor: 'pointer',
        }}
      >
        <span>legend</span>
        <span aria-hidden style={{ color: 'var(--netlab-text-faint)' }}>
          {open ? '▴' : '▾'}
        </span>
      </button>
    </div>
  );
}

const EYEBROW: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: 1,
  textTransform: 'uppercase',
  color: 'var(--netlab-text-muted)',
};
