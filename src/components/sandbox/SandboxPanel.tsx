import { useRef, useState } from 'react';
import { hookEngine } from '../../hooks/HookEngine';
import { useSandbox } from '../../sandbox/useSandbox';
import type { SandboxMode } from '../../sandbox/types';
import { EditsTab } from './EditsTab';
import { ExportButton } from './ExportButton';
import { ImportDialog } from './ImportDialog';
import { PacketEditForm } from './PacketEditForm';
import { ParametersTab } from './ParametersTab';
import { SandboxNodeTabBody } from './SandboxNodeTabBody';
import { TrafficTab } from './TrafficTab';

type SandboxAxis = 'packet' | 'node' | 'parameters' | 'traffic' | 'edits';

const TABS: { readonly axis: SandboxAxis; readonly label: string }[] = [
  { axis: 'packet', label: 'Packet' },
  { axis: 'node', label: 'Node' },
  { axis: 'parameters', label: 'Parameters' },
  { axis: 'traffic', label: 'Traffic' },
  { axis: 'edits', label: 'Edits' },
];

function getInitialAxis(): SandboxAxis {
  const requested = new URLSearchParams(window.location.search).get('sandboxTab');
  if (
    requested === 'packet' ||
    requested === 'node' ||
    requested === 'parameters' ||
    requested === 'traffic' ||
    requested === 'edits'
  ) {
    return requested;
  }
  return 'packet';
}

function nextMode(mode: SandboxMode): SandboxMode {
  return mode === 'alpha' ? 'beta' : 'alpha';
}

function SandboxTabBody({ axis }: { readonly axis: SandboxAxis }) {
  switch (axis) {
    case 'packet':
      return <PacketEditForm />;
    case 'node':
      return <SandboxNodeTabBody />;
    case 'parameters':
      return <ParametersTab />;
    case 'traffic':
      return <TrafficTab />;
    case 'edits':
      return <EditsTab />;
  }
}

export function SandboxPanel() {
  const sandbox = useSandbox();
  const [open, setOpen] = useState(true);
  const [activeAxis, setActiveAxis] = useState<SandboxAxis>(() => getInitialAxis());
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  if (!open) {
    return (
      <button
        type="button"
        aria-label="Open sandbox"
        onClick={() => setOpen(true)}
        className="netlab-focus-ring"
        style={{
          position: 'absolute',
          right: 12,
          top: 12,
          zIndex: 20,
          border: '1px solid var(--netlab-border)',
          borderRadius: 8,
          background: 'var(--netlab-bg-surface)',
          color: 'var(--netlab-text-primary)',
          padding: '6px 10px',
          fontFamily: 'monospace',
          cursor: 'pointer',
        }}
      >
        Sandbox
      </button>
    );
  }

  const activeIndex = TABS.findIndex((tab) => tab.axis === activeAxis);

  const selectTabAt = (index: number) => {
    const nextIndex = (index + TABS.length) % TABS.length;
    const nextTab = TABS[nextIndex];
    if (!nextTab) return;

    setActiveAxis(nextTab.axis);
    void hookEngine.emit('sandbox:panel-tab-opened', { axis: nextTab.axis });
    tabRefs.current[nextIndex]?.focus();
  };

  const selectAxis = (axis: SandboxAxis) => {
    setActiveAxis(axis);
    void hookEngine.emit('sandbox:panel-tab-opened', { axis });
  };

  return (
    <aside
      role="region"
      aria-labelledby="sandbox-panel-heading"
      data-testid="sandbox-panel"
      style={{
        width: 320,
        height: '100%',
        position: 'absolute',
        right: 0,
        top: 0,
        zIndex: 15,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--netlab-bg-primary)',
        borderLeft: '1px solid var(--netlab-border)',
        boxShadow: '0 16px 40px rgba(2, 6, 23, 0.35)',
        color: 'var(--netlab-text-primary)',
        fontFamily: 'monospace',
      }}
    >
      <header
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid var(--netlab-border)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <h2 id="sandbox-panel-heading" style={{ margin: 0, fontSize: 14, flex: 1 }}>
          Sandbox
        </h2>
        <ExportButton />
        <ImportDialog />
        <button
          type="button"
          aria-label="Switch sandbox mode"
          aria-pressed={sandbox.mode === 'beta'}
          onClick={() => sandbox.switchMode(nextMode(sandbox.mode))}
          className="netlab-focus-ring"
          style={{
            border: '1px solid var(--netlab-border)',
            borderRadius: 999,
            background: 'var(--netlab-bg-surface)',
            color: 'var(--netlab-text-primary)',
            padding: '4px 9px',
            fontFamily: 'monospace',
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          {sandbox.mode === 'alpha' ? 'Live' : 'Compare'}
        </button>
        <button
          type="button"
          aria-label="Collapse sandbox"
          onClick={() => setOpen(false)}
          className="netlab-focus-ring"
          style={{
            border: '1px solid var(--netlab-border)',
            borderRadius: 6,
            background: 'var(--netlab-bg-surface)',
            color: 'var(--netlab-text-muted)',
            padding: '3px 7px',
            fontFamily: 'monospace',
            cursor: 'pointer',
          }}
        >
          x
        </button>
      </header>

      <div role="tablist" aria-label="Sandbox edit axes" style={{ display: 'flex' }}>
        {TABS.map((tab, index) => {
          const selected = tab.axis === activeAxis;
          return (
            <button
              key={tab.axis}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              type="button"
              role="tab"
              data-axis={tab.axis}
              id={`sandbox-tab-${tab.axis}`}
              aria-selected={selected}
              aria-controls={`sandbox-tabpanel-${tab.axis}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => selectAxis(tab.axis)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowRight') {
                  event.preventDefault();
                  selectTabAt(activeIndex + 1);
                }
                if (event.key === 'ArrowLeft') {
                  event.preventDefault();
                  selectTabAt(activeIndex - 1);
                }
              }}
              className="netlab-focus-ring"
              style={{
                flex: 1,
                border: 0,
                borderBottom: selected
                  ? '2px solid var(--netlab-accent-cyan)'
                  : '1px solid var(--netlab-border)',
                background: selected ? 'var(--netlab-bg-surface)' : 'transparent',
                color: selected ? 'var(--netlab-text-primary)' : 'var(--netlab-text-muted)',
                padding: '8px 4px',
                fontFamily: 'monospace',
                fontSize: 10,
                cursor: 'pointer',
              }}
            >
              {tab.axis === 'edits' ? `${tab.label} (${sandbox.session.size()})` : tab.label}
            </button>
          );
        })}
      </div>

      <section
        role="tabpanel"
        id={`sandbox-tabpanel-${activeAxis}`}
        aria-labelledby={`sandbox-tab-${activeAxis}`}
        style={{ padding: 12, overflow: 'auto', flex: 1 }}
      >
        <SandboxTabBody axis={activeAxis} />
      </section>
    </aside>
  );
}
