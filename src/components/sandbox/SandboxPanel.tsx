import { useContext, useEffect, useRef, useState } from 'react';
import { hookEngine as sharedHookEngine } from '../../hooks/HookEngine';
import { shortcutRegistry } from '../../sandbox/shortcuts/registry';
import { useSandbox } from '../../sandbox/useSandbox';
import type { SandboxMode } from '../../sandbox/types';
import { AssessmentContext } from '../../assessments/AssessmentContext';
import { AssessmentTab } from '../assessments/AssessmentTab';
import { NetlabContext } from '../NetlabContext';
import { EditsTab } from './EditsTab';
import { ExportButton } from './ExportButton';
import { ImportDialog } from './ImportDialog';
import { PacketEditForm } from './PacketEditForm';
import { ParametersTab } from './ParametersTab';
import { PcapDownloadButton } from './PcapDownloadButton';
import { ProposalPendingIndicator } from './ProposalPendingIndicator';
import { LargeTopologyWarning } from './LargeTopologyWarning';
import { SandboxNodeTabBody } from './SandboxNodeTabBody';
import { SaveSnapshotButton } from './snapshots/SaveSnapshotButton';
import { ShortcutsHelpModal } from './ShortcutsHelpModal';
import { TrafficTab } from './TrafficTab';

type SandboxAxis = 'packet' | 'node' | 'parameters' | 'traffic' | 'edits' | 'assessment';
type ScenarioExportDialogComponent =
  typeof import('./authoring/ScenarioExportDialog').ScenarioExportDialog;

const BASE_TABS: { readonly axis: SandboxAxis; readonly label: string }[] = [
  { axis: 'packet', label: 'Packet' },
  { axis: 'node', label: 'Node' },
  { axis: 'parameters', label: 'Parameters' },
  { axis: 'traffic', label: 'Traffic' },
  { axis: 'edits', label: 'Edits' },
];

function getTabs(hasAssessment: boolean): { readonly axis: SandboxAxis; readonly label: string }[] {
  return hasAssessment ? [...BASE_TABS, { axis: 'assessment', label: 'Assessment' }] : BASE_TABS;
}

function getInitialAxis(hasAssessment: boolean): SandboxAxis {
  const requested = new URLSearchParams(window.location.search).get('sandboxTab');
  if (
    requested === 'packet' ||
    requested === 'node' ||
    requested === 'parameters' ||
    requested === 'traffic' ||
    requested === 'edits' ||
    (hasAssessment && requested === 'assessment')
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
    case 'assessment':
      return <AssessmentTab />;
  }
}

export function SandboxPanel() {
  const sandbox = useSandbox();
  const assessment = useContext(AssessmentContext);
  const netlabContext = useContext(NetlabContext);
  const hookEngine = netlabContext?.hookEngine ?? sharedHookEngine;
  const embedMode = netlabContext?.embedMode;
  const isMinimalEmbed = embedMode === 'minimal';
  const [open, setOpen] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const [scenarioExportOpen, setScenarioExportOpen] = useState(false);
  const [ScenarioExportDialog, setScenarioExportDialog] =
    useState<ScenarioExportDialogComponent | null>(null);
  const [activeAxis, setActiveAxis] = useState<SandboxAxis>(() =>
    getInitialAxis(assessment !== null),
  );
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabs = getTabs(assessment !== null);
  const nodeCount = sandbox.engine.snapshot.topology.nodes.length;
  const fastMode = sandbox.fastMode === true;

  useEffect(() => {
    const unregisters = [
      shortcutRegistry.register({
        key: '?',
        description: 'Show keyboard shortcuts',
        action: () => setHelpOpen(true),
      }),
      shortcutRegistry.register({
        key: 'Shift+S',
        description: 'Toggle sandbox panel',
        action: () => setOpen((current) => (isMinimalEmbed ? true : !current)),
        enabled: () => !isMinimalEmbed,
      }),
    ];
    return () => {
      for (const u of unregisters) u();
    };
  }, [isMinimalEmbed]);

  useEffect(() => {
    if (isMinimalEmbed) {
      setOpen(true);
    }
  }, [isMinimalEmbed]);

  useEffect(() => {
    if (!scenarioExportOpen || ScenarioExportDialog) return;

    let cancelled = false;
    void import('./authoring/ScenarioExportDialog').then((module) => {
      if (!cancelled) {
        setScenarioExportDialog(() => module.ScenarioExportDialog);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [ScenarioExportDialog, scenarioExportOpen]);

  const helpModal = helpOpen ? <ShortcutsHelpModal onClose={() => setHelpOpen(false)} /> : null;
  const scenarioExportDialog = scenarioExportOpen ? (
    ScenarioExportDialog ? (
      <ScenarioExportDialog open onClose={() => setScenarioExportOpen(false)} />
    ) : (
      <section role="dialog" aria-label="Export scenario">
        Export scenario
      </section>
    )
  ) : null;

  if (!open) {
    return (
      <>
        {helpModal}
        {scenarioExportDialog}
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
      </>
    );
  }

  const activeIndex = tabs.findIndex((tab) => tab.axis === activeAxis);

  const selectTabAt = (index: number) => {
    const nextIndex = (index + tabs.length) % tabs.length;
    const nextTab = tabs[nextIndex];
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
    <>
      {helpModal}
      {scenarioExportDialog}
      <aside
        role="region"
        aria-labelledby="sandbox-panel-heading"
        data-testid="sandbox-panel"
        {...(embedMode !== undefined ? { 'data-embed-mode': embedMode } : {})}
        style={{
          width: embedMode === 'minimal' ? 260 : embedMode === 'compact' ? 280 : 320,
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
          <PcapDownloadButton />
          <ExportButton />
          <button
            type="button"
            aria-label="Export as scenario"
            onClick={() => setScenarioExportOpen(true)}
            className="netlab-focus-ring"
            style={{
              border: '1px solid var(--netlab-border)',
              borderRadius: 6,
              background: 'var(--netlab-bg-surface)',
              color: 'var(--netlab-text-primary)',
              padding: '3px 7px',
              fontFamily: 'monospace',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            Scenario
          </button>
          <ImportDialog />
          <SaveSnapshotButton />
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              border: '1px solid var(--netlab-border)',
              borderRadius: 999,
              background: fastMode ? 'rgba(14, 165, 233, 0.16)' : 'var(--netlab-bg-surface)',
              color: 'var(--netlab-text-primary)',
              padding: '4px 7px',
              fontSize: 10,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              aria-label="Use fast mode"
              checked={fastMode}
              onChange={(event) => sandbox.setFastMode?.(event.currentTarget.checked)}
              style={{ margin: 0 }}
            />
            Fast
          </label>
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
            aria-label="Show keyboard shortcuts"
            data-testid="sandbox-shortcuts-help-btn"
            onClick={() => setHelpOpen(true)}
            className="netlab-focus-ring"
            style={{
              border: '1px solid var(--netlab-border)',
              borderRadius: 6,
              background: 'var(--netlab-bg-surface)',
              color: 'var(--netlab-text-muted)',
              padding: '3px 7px',
              fontFamily: 'monospace',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            ?
          </button>
          {!isMinimalEmbed && (
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
          )}
        </header>

        <LargeTopologyWarning
          nodeCount={nodeCount}
          fastMode={fastMode}
          onEnableFastMode={() => sandbox.setFastMode?.(true)}
        />

        <ProposalPendingIndicator count={sandbox.pendingProposalCount ?? 0} />

        <div role="tablist" aria-label="Sandbox edit axes" style={{ display: 'flex' }}>
          {tabs.map((tab, index) => {
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
    </>
  );
}
