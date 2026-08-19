import { useState } from 'react';
import type { PacketHop, PacketTrace } from '../../types/simulation';
import { PacketHistoryPanel } from './PacketHistoryPanel';

export type EditorSidebarTab = 'node' | 'validation' | 'history';

export interface EditorSidebarProps {
  /** The node editor, rendered in its own tab instead of floating over the canvas. */
  node: React.ReactNode;
  validation: React.ReactNode;
  traces: readonly PacketTrace[];
  selectedStep?: number | null;
  onSelectHop?: (hop: PacketHop, edgeId: string | null) => void;
}

const PANEL_STYLE: React.CSSProperties = {
  width: 300,
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  background: '#1e293b',
  borderLeft: '1px solid #334155',
  fontFamily: 'monospace',
  color: '#e2e8f0',
};

const TABS: readonly { id: EditorSidebarTab; label: string }[] = [
  { id: 'node', label: 'Node' },
  { id: 'validation', label: 'Checks' },
  { id: 'history', label: 'Run' },
];

/**
 * Right sidebar. The node editor and the validation list used to float over the
 * canvas, hiding the topology underneath; here they are tabs beside it, sharing
 * the rail with the run results and the packet history.
 */
export function EditorSidebar({
  node,
  validation,
  traces,
  selectedStep,
  onSelectHop,
}: EditorSidebarProps) {
  const [tab, setTab] = useState<EditorSidebarTab>('node');

  return (
    <aside style={PANEL_STYLE} data-testid="editor-sidebar" aria-label="Inspector">
      <div role="tablist" style={{ display: 'flex', borderBottom: '1px solid #334155' }}>
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={tab === entry.id}
            data-testid={`editor-sidebar-tab-${entry.id}`}
            onClick={() => setTab(entry.id)}
            style={{
              flex: 1,
              font: 'inherit',
              fontSize: 12,
              padding: '7px 4px',
              cursor: 'pointer',
              border: 'none',
              borderBottom: `2px solid ${tab === entry.id ? '#60a5fa' : 'transparent'}`,
              background: 'transparent',
              color: tab === entry.id ? '#e2e8f0' : '#94a3b8',
            }}
          >
            {entry.label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        data-testid={`editor-sidebar-panel-${tab}`}
        style={{ flex: 1, overflowY: 'auto', padding: 10, minHeight: 0 }}
      >
        {tab === 'node' ? node : null}
        {tab === 'validation' ? validation : null}
        {tab === 'history' ? (
          <PacketHistoryPanel
            traces={traces}
            {...(selectedStep !== undefined ? { selectedStep } : {})}
            {...(onSelectHop !== undefined ? { onSelectHop } : {})}
          />
        ) : null}
      </div>
    </aside>
  );
}
