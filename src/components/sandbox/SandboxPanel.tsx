import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { hookEngine as sharedHookEngine } from '../../hooks/HookEngine';
import {
  SANDBOX_DEFAULT_WIDTH,
  SANDBOX_MAX_ABS_WIDTH,
  SANDBOX_MAX_VW_RATIO,
  SANDBOX_MIN_WIDTH,
  clampSandboxWidth,
  readSandboxWidth,
  writeSandboxWidth,
} from './sandboxLayoutStorage';
import { useI18n } from '../../i18n/useI18n';
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
import { MONO_FONT_STACK, TEXT } from '../_styles/tokens';

type SandboxAxis = 'packet' | 'node' | 'parameters' | 'traffic' | 'edits' | 'assessment';
type ScenarioExportDialogComponent =
  typeof import('./authoring/ScenarioExportDialog').ScenarioExportDialog;

const BASE_TABS: { readonly axis: SandboxAxis; readonly labelKey: string }[] = [
  { axis: 'packet', labelKey: 'sandbox.panel.tab.packet' },
  { axis: 'node', labelKey: 'sandbox.panel.tab.node' },
  { axis: 'parameters', labelKey: 'sandbox.panel.tab.parameters' },
  { axis: 'traffic', labelKey: 'sandbox.panel.tab.traffic' },
  { axis: 'edits', labelKey: 'sandbox.panel.tab.edits' },
];

function getTabs(
  hasAssessment: boolean,
): { readonly axis: SandboxAxis; readonly labelKey: string }[] {
  return hasAssessment
    ? [...BASE_TABS, { axis: 'assessment', labelKey: 'sandbox.panel.tab.assessment' }]
    : BASE_TABS;
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

export type SandboxPanelLayoutMode = 'wide' | 'drawer';

export interface SandboxPanelProps {
  readonly layoutMode?: SandboxPanelLayoutMode;
}

export function SandboxPanel({ layoutMode = 'wide' }: SandboxPanelProps = {}) {
  const { t } = useI18n();
  const sandbox = useSandbox();
  const assessment = useContext(AssessmentContext);
  const netlabContext = useContext(NetlabContext);
  const hookEngine = netlabContext?.hookEngine ?? sharedHookEngine;
  const embedMode = netlabContext?.embedMode;
  const isMinimalEmbed = embedMode === 'minimal';
  const isDrawer = layoutMode === 'drawer';
  const isResizeEnabled = !isDrawer && embedMode !== 'minimal' && embedMode !== 'compact';
  const [open, setOpen] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const [scenarioExportOpen, setScenarioExportOpen] = useState(false);
  const [ScenarioExportDialog, setScenarioExportDialog] =
    useState<ScenarioExportDialogComponent | null>(null);
  const [activeAxis, setActiveAxis] = useState<SandboxAxis>(() =>
    getInitialAxis(assessment !== null),
  );
  const [panelWidth, setPanelWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return SANDBOX_DEFAULT_WIDTH;
    return readSandboxWidth(window.innerWidth);
  });
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabs = getTabs(assessment !== null);
  const nodeCount = sandbox.engine.snapshot.topology.nodes.length;
  const fastMode = sandbox.fastMode === true;

  useEffect(() => {
    const unregisters = [
      shortcutRegistry.register({
        key: '?',
        description: t('sandbox.panel.shortcuts.helpLabel'),
        action: () => setHelpOpen(true),
      }),
      shortcutRegistry.register({
        key: 'Shift+S',
        description: t('sandbox.panel.shortcut.toggleDescription'),
        action: () => setOpen((current) => (isMinimalEmbed ? true : !current)),
        enabled: () => !isMinimalEmbed,
      }),
    ];
    return () => {
      for (const u of unregisters) u();
    };
  }, [isMinimalEmbed, t]);

  useEffect(() => {
    if (isMinimalEmbed) {
      setOpen(true);
    }
  }, [isMinimalEmbed]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => {
      setPanelWidth((current) => clampSandboxWidth(current, window.innerWidth));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const beginResize = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (typeof window === 'undefined') return;
      const startX = event.clientX;
      const startWidth = panelWidth;
      const onMove = (moveEvent: MouseEvent) => {
        const delta = startX - moveEvent.clientX;
        const next = clampSandboxWidth(startWidth + delta, window.innerWidth);
        setPanelWidth(next);
      };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        setPanelWidth((current) => {
          writeSandboxWidth(current);
          return current;
        });
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [panelWidth],
  );

  const handleResizeKey = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (typeof window === 'undefined') return;
    const viewport = window.innerWidth;
    const step = 10;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setPanelWidth((current) => {
        const next = clampSandboxWidth(current + step, viewport);
        writeSandboxWidth(next);
        return next;
      });
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      setPanelWidth((current) => {
        const next = clampSandboxWidth(current - step, viewport);
        writeSandboxWidth(next);
        return next;
      });
    } else if (event.key === 'Home') {
      event.preventDefault();
      setPanelWidth(() => {
        const next = clampSandboxWidth(SANDBOX_MIN_WIDTH, viewport);
        writeSandboxWidth(next);
        return next;
      });
    } else if (event.key === 'End') {
      event.preventDefault();
      setPanelWidth(() => {
        const next = clampSandboxWidth(SANDBOX_MAX_ABS_WIDTH, viewport);
        writeSandboxWidth(next);
        return next;
      });
    }
  }, []);

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
      <section role="dialog" aria-label={t('sandbox.panel.export.dialogPlaceholderLabel')}>
        {t('sandbox.panel.export.dialogPlaceholderText')}
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
          aria-label={t('sandbox.panel.openButton.label')}
          onClick={() => setOpen(true)}
          className="netlab-focus-ring"
          style={{
            position: 'absolute',
            right: 12,
            ...(isDrawer ? { bottom: 12 } : { top: 12 }),
            zIndex: 20,
            border: '1px solid var(--netlab-border)',
            borderRadius: 8,
            background: 'var(--netlab-bg-surface)',
            color: TEXT.primary,
            padding: '6px 10px',
            fontFamily: MONO_FONT_STACK,
            cursor: 'pointer',
          }}
        >
          {t('sandbox.panel.openButton.text')}
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
        data-layout-mode={layoutMode}
        {...(embedMode !== undefined ? { 'data-embed-mode': embedMode } : {})}
        style={
          isDrawer
            ? {
                position: 'relative',
                width: '100%',
                flex: '0 0 40vh',
                height: '40vh',
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--netlab-bg-primary)',
                borderTop: '1px solid var(--netlab-border)',
                color: TEXT.primary,
                fontFamily: MONO_FONT_STACK,
              }
            : {
                position: 'relative',
                width: embedMode === 'minimal' ? 260 : embedMode === 'compact' ? 280 : panelWidth,
                flex: '0 0 auto',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--netlab-bg-primary)',
                borderLeft: '1px solid var(--netlab-border)',
                color: TEXT.primary,
                fontFamily: MONO_FONT_STACK,
              }
        }
      >
        {isResizeEnabled ? (
          <div
            role="separator"
            aria-label={t('sandbox.panel.resizeHandle.label')}
            aria-orientation="vertical"
            aria-valuemin={SANDBOX_MIN_WIDTH}
            aria-valuemax={
              typeof window !== 'undefined'
                ? Math.min(window.innerWidth * SANDBOX_MAX_VW_RATIO, SANDBOX_MAX_ABS_WIDTH)
                : SANDBOX_MAX_ABS_WIDTH
            }
            aria-valuenow={Math.round(panelWidth)}
            tabIndex={0}
            data-testid="sandbox-panel-resize-handle"
            onMouseDown={beginResize}
            onKeyDown={handleResizeKey}
            className="netlab-focus-ring"
            style={{
              position: 'absolute',
              left: -2,
              top: 0,
              width: 6,
              height: '100%',
              cursor: 'col-resize',
              background: 'transparent',
              zIndex: 1,
            }}
          />
        ) : null}
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
            {t('sandbox.panel.heading')}
          </h2>
          <PcapDownloadButton />
          <ExportButton />
          <button
            type="button"
            aria-label={t('sandbox.panel.export.scenarioLabel')}
            data-testid="sandbox-export-scenario-open"
            onClick={() => setScenarioExportOpen(true)}
            className="netlab-focus-ring"
            style={{
              border: '1px solid var(--netlab-border)',
              borderRadius: 6,
              background: 'var(--netlab-bg-surface)',
              color: TEXT.primary,
              padding: '3px 7px',
              fontFamily: MONO_FONT_STACK,
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            {t('sandbox.panel.export.scenarioText')}
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
              color: TEXT.primary,
              padding: '4px 7px',
              fontSize: 10,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              aria-label={t('sandbox.panel.fast.label')}
              data-testid="sandbox-fast-mode-toggle"
              checked={fastMode}
              onChange={(event) => sandbox.setFastMode?.(event.currentTarget.checked)}
              style={{ margin: 0 }}
            />
            {t('sandbox.panel.fast.text')}
          </label>
          <button
            type="button"
            aria-label={t('sandbox.panel.mode.toggleLabel')}
            aria-pressed={sandbox.mode === 'beta'}
            data-testid="sandbox-mode-switch"
            onClick={() => sandbox.switchMode(nextMode(sandbox.mode))}
            className="netlab-focus-ring"
            style={{
              border: '1px solid var(--netlab-border)',
              borderRadius: 999,
              background: 'var(--netlab-bg-surface)',
              color: TEXT.primary,
              padding: '4px 9px',
              fontFamily: MONO_FONT_STACK,
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            {sandbox.mode === 'alpha'
              ? t('sandbox.panel.mode.alphaText')
              : t('sandbox.panel.mode.betaText')}
          </button>
          <button
            type="button"
            aria-label={t('sandbox.panel.shortcuts.helpLabel')}
            data-testid="sandbox-shortcuts-help-btn"
            onClick={() => setHelpOpen(true)}
            className="netlab-focus-ring"
            style={{
              border: '1px solid var(--netlab-border)',
              borderRadius: 6,
              background: 'var(--netlab-bg-surface)',
              color: TEXT.muted,
              padding: '3px 7px',
              fontFamily: MONO_FONT_STACK,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {t('sandbox.panel.shortcuts.helpText')}
          </button>
          {!isMinimalEmbed && (
            <button
              type="button"
              aria-label={t('sandbox.panel.collapse.label')}
              data-testid="sandbox-collapse"
              onClick={() => setOpen(false)}
              className="netlab-focus-ring"
              style={{
                border: '1px solid var(--netlab-border)',
                borderRadius: 6,
                background: 'var(--netlab-bg-surface)',
                color: TEXT.muted,
                padding: '3px 7px',
                fontFamily: MONO_FONT_STACK,
                cursor: 'pointer',
              }}
            >
              {t('sandbox.panel.collapse.text')}
            </button>
          )}
        </header>

        <LargeTopologyWarning
          nodeCount={nodeCount}
          fastMode={fastMode}
          onEnableFastMode={() => sandbox.setFastMode?.(true)}
        />

        <ProposalPendingIndicator count={sandbox.pendingProposalCount ?? 0} />

        <div
          role="tablist"
          aria-label={t('sandbox.panel.tablist.label')}
          style={{ display: 'flex' }}
        >
          {tabs.map((tab, index) => {
            const selected = tab.axis === activeAxis;
            const label = t(tab.labelKey);
            return (
              <button
                key={tab.axis}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                type="button"
                role="tab"
                data-axis={tab.axis}
                data-testid={`sandbox-tab-${tab.axis}`}
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
                  color: selected ? TEXT.primary : TEXT.muted,
                  padding: '8px 4px',
                  fontFamily: MONO_FONT_STACK,
                  fontSize: 10,
                  cursor: 'pointer',
                }}
              >
                {tab.axis === 'edits'
                  ? t('sandbox.panel.tab.editsWithCount', {
                      label,
                      count: sandbox.session.size(),
                    })
                  : label}
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
