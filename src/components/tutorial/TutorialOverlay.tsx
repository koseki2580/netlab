import { TutorialStepPanel } from './TutorialStepPanel';

export function TutorialOverlay() {
  return (
    <div
      role="dialog"
      aria-labelledby="netlab-tutorial-title"
      aria-modal="false"
      data-testid="tutorial-overlay"
      style={{
        position: 'absolute',
        top: 12,
        left: 12,
        zIndex: 140,
        pointerEvents: 'none',
      }}
    >
      <div style={{ pointerEvents: 'auto' }}>
        <TutorialStepPanel />
      </div>
    </div>
  );
}
