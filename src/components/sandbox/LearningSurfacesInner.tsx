import { useEffect, useState, type ReactNode } from 'react';
import { AssessmentProvider } from '../../assessments/AssessmentProvider';
import { EmbedBridge } from '../../embed/EmbedBridge';
import { SandboxProvider, useSandbox } from '../../sandbox/SandboxContext';
import { SandboxIntroProvider } from '../../sandbox/intro/SandboxIntroProvider';
import type { SandboxIntroId } from '../../sandbox/intro/introRegistry';
import { scenarioRegistry } from '../../scenarios/ScenarioRegistry';
import { useSimulation } from '../../simulation/SimulationContext';
import { TutorialProvider } from '../../tutorials/TutorialContext';
import { useNetlabContext } from '../NetlabContext';
import { TutorialOverlay } from '../tutorial/TutorialOverlay';
import { BeforeAfterView } from './BeforeAfterView';
import { DiffTimeline } from './DiffTimeline';
import { SandboxActiveEditor } from './SandboxActiveEditor';
import { SandboxErrorBoundary } from './SandboxErrorBoundary';
import { SandboxIntroOverlay } from './SandboxIntroOverlay';
import { SandboxPanel } from './SandboxPanel';

const NARROW_VIEWPORT_QUERY = '(max-width: 900px)';

function useSandboxLayoutMode(): 'wide' | 'drawer' {
  const [mode, setMode] = useState<'wide' | 'drawer'>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return 'wide';
    }
    return window.matchMedia(NARROW_VIEWPORT_QUERY).matches ? 'drawer' : 'wide';
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(NARROW_VIEWPORT_QUERY);
    const onChange = (event: MediaQueryListEvent) => {
      setMode(event.matches ? 'drawer' : 'wide');
    };
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, []);

  return mode;
}

function SandboxSurface({
  children,
  introOverlay,
}: {
  readonly children: ReactNode;
  readonly introOverlay?: ReactNode;
}) {
  const sandbox = useSandbox();
  const layoutMode = useSandboxLayoutMode();
  const isDrawer = layoutMode === 'drawer';

  return (
    <div
      data-testid="sandbox-surface"
      data-layout-mode={layoutMode}
      style={{
        position: 'relative',
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: isDrawer ? 'column' : 'row',
      }}
    >
      <div
        data-testid="sandbox-canvas-slot"
        style={{
          flex: 1,
          position: 'relative',
          minWidth: 0,
          minHeight: 0,
        }}
      >
        {sandbox.mode === 'beta' ? <BeforeAfterView /> : children}
        {introOverlay}
        <SandboxActiveEditor />
        <DiffTimeline />
      </div>
      <SandboxPanel layoutMode={layoutMode} />
      <EmbedBridge />
    </div>
  );
}

/**
 * The learning surfaces — sandbox, intro, assessment, tutorial and the embed
 * bridge — composed around the simulator's children. Loaded lazily by
 * `LearningSurfaces` so `SimulationProvider` stays an engine-and-state module.
 *
 * Every context these surfaces publish (sandbox, tutorial, assessment, intro)
 * is consumed only by `children` rendered *inside* this tree, so no consumer
 * can mount before its provider exists: the canvas simply waits for the chunk.
 */
export default function LearningSurfacesInner({ children }: { readonly children: ReactNode }) {
  const {
    routeTable,
    hookEngine,
    tutorialId,
    sandboxEnabled,
    sandboxIntroId,
    assessmentScenarioId,
  } = useNetlabContext();
  const { engine, state } = useSimulation();

  const effectiveSandboxEnabled = sandboxEnabled || assessmentScenarioId !== undefined;
  const sandboxSurface = sandboxIntroId ? (
    <SandboxIntroProvider introId={sandboxIntroId as SandboxIntroId}>
      <SandboxSurface introOverlay={<SandboxIntroOverlay />}>{children}</SandboxSurface>
    </SandboxIntroProvider>
  ) : (
    <SandboxSurface>{children}</SandboxSurface>
  );

  const assessmentSurface = assessmentScenarioId ? (
    <AssessmentProvider assessmentScenarioId={assessmentScenarioId}>
      {sandboxSurface}
    </AssessmentProvider>
  ) : (
    sandboxSurface
  );
  const assessmentRubric = assessmentScenarioId
    ? scenarioRegistry.get(assessmentScenarioId)?.assessmentRubric
    : undefined;

  const content = effectiveSandboxEnabled ? (
    <SandboxErrorBoundary>
      <SandboxProvider {...(assessmentRubric ? { assessmentRubric } : {})}>
        {assessmentSurface}
      </SandboxProvider>
    </SandboxErrorBoundary>
  ) : (
    children
  );

  return tutorialId ? (
    <TutorialProvider
      tutorialId={tutorialId}
      engine={engine}
      simulationState={state}
      routeTable={routeTable}
      hookEngine={hookEngine}
    >
      <TutorialOverlay />
      {content}
    </TutorialProvider>
  ) : (
    <>{content}</>
  );
}
