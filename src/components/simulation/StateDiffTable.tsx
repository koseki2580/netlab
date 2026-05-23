import type React from 'react';
import { useMemo, useState } from 'react';
import {
  diffArp,
  diffRoutes,
  type ArpDiffRow,
  type DiffStatus,
  type RouteDiffRow,
  type StepSnapshots,
} from '../../simulation/snapshots';

const MONO = 'ui-monospace, monospace';
const MAX_HEATMAP_COLS = 32;

export type StateDiffTableKind = 'routes' | 'arp';
type DiffMode = 'now' | 'diff' | 'history';

export interface StateDiffTableProps {
  snapshots: StepSnapshots;
  nodeId: string;
  /** Current playhead step (0-indexed hop). */
  stepIndex: number;
  tableKind: StateDiffTableKind;
  /** Initial mode — defaults to `'diff'`. */
  defaultMode?: DiffMode;
}

const STATUS_COLOR: Record<DiffStatus, string> = {
  added: 'var(--netlab-accent-green)',
  removed: 'var(--netlab-accent-red)',
  changed: 'var(--netlab-accent-yellow)',
  unchanged: 'var(--netlab-text-secondary)',
};

const STATUS_SYMBOL: Record<DiffStatus, string> = {
  added: '+',
  removed: '−',
  changed: '~',
  unchanged: '=',
};

function rowKey(kind: StateDiffTableKind, row: { dst?: string; ip?: string }): string {
  return kind === 'routes' ? (row.dst ?? '') : (row.ip ?? '');
}

/**
 * M3 — per-node table with now / diff / history modes, driven by step snapshots.
 * `now` shows the current rows; `diff` colors added/removed/changed vs the previous
 * step; `history` is a presence heatmap across steps with the current column outlined.
 */
export function StateDiffTable({
  snapshots,
  nodeId,
  stepIndex,
  tableKind,
  defaultMode = 'diff',
}: StateDiffTableProps) {
  const [mode, setMode] = useState<DiffMode>(defaultMode);

  const prevStep = Math.max(0, stepIndex - 1);
  const prevState = snapshots.get(prevStep)?.[nodeId];
  const currState = snapshots.get(stepIndex)?.[nodeId];

  const diff = useMemo<(RouteDiffRow | ArpDiffRow)[]>(() => {
    if (tableKind === 'routes') {
      return diffRoutes(prevState?.routes ?? [], currState?.routes ?? []);
    }
    return diffArp(prevState?.arp ?? [], currState?.arp ?? []);
  }, [tableKind, prevState, currState]);

  const nowRows = useMemo<(RouteDiffRow | ArpDiffRow)[]>(() => {
    const rows = tableKind === 'routes' ? (currState?.routes ?? []) : (currState?.arp ?? []);
    return rows.map((r) => ({ ...r, status: 'unchanged' }) as RouteDiffRow | ArpDiffRow);
  }, [tableKind, currState]);

  const counts = diff.reduce<Record<string, number>>((acc, r) => {
    if (r.status !== 'unchanged') acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div
      data-testid="state-diff-table"
      data-table-kind={tableKind}
      role="region"
      aria-label={`${tableKind} table`}
      style={{
        border: '1px solid var(--netlab-border)',
        borderRadius: 8,
        background: 'var(--netlab-bg-surface)',
        fontFamily: MONO,
        fontSize: 11,
        color: 'var(--netlab-text-secondary)',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 8 }}>
        <span style={{ fontWeight: 700, color: 'var(--netlab-text-muted)', letterSpacing: 0.5 }}>
          {tableKind}
        </span>
        {(['now', 'diff', 'history'] as const).map((m) => (
          <button
            key={m}
            type="button"
            data-testid={`mode-${m}`}
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            style={modeBtnStyle(mode === m)}
          >
            {m}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', color: 'var(--netlab-text-muted)' }}>
          step {prevStep} <span aria-hidden>→</span> {stepIndex}
        </span>
      </div>

      {mode === 'history' ? (
        <HistoryHeatmap
          snapshots={snapshots}
          nodeId={nodeId}
          tableKind={tableKind}
          stepIndex={stepIndex}
        />
      ) : (
        <DiffRows kind={tableKind} rows={mode === 'now' ? nowRows : diff} />
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 8px',
          borderTop: '1px solid var(--netlab-border)',
          color: 'var(--netlab-text-muted)',
        }}
      >
        <span>{counts.changed ?? 0} changed</span>
        <span style={{ color: 'var(--netlab-accent-green)' }}>+{counts.added ?? 0}</span>
        <span style={{ color: 'var(--netlab-accent-red)' }}>−{counts.removed ?? 0}</span>
        <HistoryStrip
          snapshots={snapshots}
          nodeId={nodeId}
          tableKind={tableKind}
          stepIndex={stepIndex}
        />
      </div>
    </div>
  );
}

function modeBtnStyle(active: boolean): React.CSSProperties {
  return {
    fontFamily: MONO,
    fontSize: 10,
    padding: '2px 8px',
    borderRadius: 6,
    cursor: 'pointer',
    color: active ? 'var(--netlab-accent-blue)' : 'var(--netlab-text-secondary)',
    background: active
      ? 'color-mix(in srgb, var(--netlab-accent-blue) 16%, transparent)'
      : 'transparent',
    border: `1px solid ${active ? 'var(--netlab-accent-blue)' : 'var(--netlab-border)'}`,
  };
}

function DiffRows({
  kind,
  rows,
}: {
  kind: StateDiffTableKind;
  rows: (RouteDiffRow | ArpDiffRow)[];
}) {
  if (rows.length === 0) {
    return (
      <div
        style={{ padding: 14, color: 'var(--netlab-text-muted)' }}
        data-testid="state-diff-empty"
      >
        no entries
      </div>
    );
  }
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ color: 'var(--netlab-text-muted)', textAlign: 'left' }}>
          <th style={CELL} aria-label="status" />
          {kind === 'routes' ? (
            <>
              <th style={CELL}>destination</th>
              <th style={CELL}>via</th>
              <th style={CELL}>proto</th>
              <th style={CELL}>metric</th>
            </>
          ) : (
            <>
              <th style={CELL}>ip</th>
              <th style={CELL}>mac</th>
            </>
          )}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr
            key={`${rowKey(kind, r)}-${r.status}`}
            data-status={r.status}
            style={{ color: STATUS_COLOR[r.status] }}
          >
            <td style={{ ...CELL, color: STATUS_COLOR[r.status] }}>{STATUS_SYMBOL[r.status]}</td>
            {kind === 'routes' ? (
              <RouteCells row={r as RouteDiffRow} />
            ) : (
              <ArpCells row={r as ArpDiffRow} />
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RouteCells({ row }: { row: RouteDiffRow }) {
  return (
    <>
      <td style={CELL}>{row.dst}</td>
      <td style={CELL}>{row.via}</td>
      <td style={CELL}>{row.proto}</td>
      <td style={CELL}>
        {row.status === 'changed' && row.from ? `${row.from.metric} → ${row.metric}` : row.metric}
      </td>
    </>
  );
}

function ArpCells({ row }: { row: ArpDiffRow }) {
  return (
    <>
      <td style={CELL}>{row.ip}</td>
      <td style={CELL}>
        {row.status === 'changed' && row.from ? `${row.from.mac} → ${row.mac}` : row.mac}
      </td>
    </>
  );
}

const CELL: React.CSSProperties = { padding: '3px 8px' };

function collectKeys(
  snapshots: StepSnapshots,
  nodeId: string,
  kind: StateDiffTableKind,
): { steps: number[]; keys: string[] } {
  const steps = [...snapshots.keys()].sort((a, b) => a - b).slice(0, MAX_HEATMAP_COLS);
  const keys = new Set<string>();
  for (const step of steps) {
    const rows =
      kind === 'routes'
        ? snapshots.get(step)?.[nodeId]?.routes
        : snapshots.get(step)?.[nodeId]?.arp;
    for (const r of rows ?? []) keys.add(rowKey(kind, r));
  }
  return { steps, keys: [...keys] };
}

function hasKey(
  snapshots: StepSnapshots,
  nodeId: string,
  kind: StateDiffTableKind,
  step: number,
  key: string,
): boolean {
  const rows =
    kind === 'routes' ? snapshots.get(step)?.[nodeId]?.routes : snapshots.get(step)?.[nodeId]?.arp;
  return (rows ?? []).some((r) => rowKey(kind, r) === key);
}

function HistoryHeatmap({
  snapshots,
  nodeId,
  tableKind,
  stepIndex,
}: {
  snapshots: StepSnapshots;
  nodeId: string;
  tableKind: StateDiffTableKind;
  stepIndex: number;
}) {
  const { steps, keys } = collectKeys(snapshots, nodeId, tableKind);
  const truncated = snapshots.size > MAX_HEATMAP_COLS;
  if (keys.length === 0) {
    return (
      <div
        style={{ padding: 14, color: 'var(--netlab-text-muted)' }}
        data-testid="state-diff-empty"
      >
        no history
      </div>
    );
  }
  return (
    <div style={{ padding: 8, overflowX: 'auto' }} data-testid="state-diff-heatmap">
      <table style={{ borderCollapse: 'separate', borderSpacing: 2, fontSize: 10 }}>
        <thead>
          <tr>
            <th style={{ ...CELL, textAlign: 'left', color: 'var(--netlab-text-muted)' }}>entry</th>
            {steps.map((s) => (
              <th
                key={s}
                style={{
                  padding: 2,
                  color: s === stepIndex ? 'var(--netlab-accent-cyan)' : 'var(--netlab-text-muted)',
                }}
              >
                {s}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => (
            <tr key={key}>
              <td style={{ ...CELL, color: 'var(--netlab-text-primary)', whiteSpace: 'nowrap' }}>
                {key}
              </td>
              {steps.map((s) => {
                const present = hasKey(snapshots, nodeId, tableKind, s, key);
                return (
                  <td key={s} style={{ padding: 0 }}>
                    <div
                      data-testid={s === stepIndex ? 'heatmap-cell-current' : 'heatmap-cell'}
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 2,
                        background: present
                          ? 'color-mix(in srgb, var(--netlab-accent-green) 30%, var(--netlab-bg-elevated))'
                          : 'var(--netlab-bg-primary)',
                        border:
                          s === stepIndex
                            ? '1px solid var(--netlab-accent-cyan)'
                            : '1px solid var(--netlab-border-subtle)',
                      }}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {truncated && (
        <div style={{ marginTop: 6, color: 'var(--netlab-text-muted)' }}>
          showing first {MAX_HEATMAP_COLS} steps
        </div>
      )}
    </div>
  );
}

function stepChanged(
  snapshots: StepSnapshots,
  nodeId: string,
  kind: StateDiffTableKind,
  step: number,
): DiffStatus | 'none' {
  if (step <= 0) return 'none';
  const prev = snapshots.get(step - 1)?.[nodeId];
  const curr = snapshots.get(step)?.[nodeId];
  if (!prev || !curr) return 'none';
  const diff =
    kind === 'routes' ? diffRoutes(prev.routes, curr.routes) : diffArp(prev.arp, curr.arp);
  const changed = diff.find((r) => r.status !== 'unchanged');
  return changed ? changed.status : 'none';
}

function HistoryStrip({
  snapshots,
  nodeId,
  tableKind,
  stepIndex,
}: {
  snapshots: StepSnapshots;
  nodeId: string;
  tableKind: StateDiffTableKind;
  stepIndex: number;
}) {
  const steps = [...snapshots.keys()].sort((a, b) => a - b);
  return (
    <div data-testid="state-diff-strip" style={{ display: 'flex', gap: 2, marginLeft: 'auto' }}>
      {steps.map((s) => {
        const change = stepChanged(snapshots, nodeId, tableKind, s);
        const bg =
          change === 'none'
            ? 'var(--netlab-border)'
            : change === 'removed'
              ? 'var(--netlab-accent-red)'
              : change === 'changed'
                ? 'var(--netlab-accent-yellow)'
                : 'var(--netlab-accent-green)';
        return (
          <div
            key={s}
            title={`step ${s}`}
            style={{
              width: 6,
              height: 12,
              borderRadius: 1,
              background: bg,
              outline: s === stepIndex ? '1px solid var(--netlab-accent-cyan)' : 'none',
            }}
          />
        );
      })}
    </div>
  );
}
