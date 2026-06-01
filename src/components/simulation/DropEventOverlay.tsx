import { useCallback, useEffect, useRef, useState } from 'react';
import { useSimulation } from '../../simulation/SimulationContext';
import { useSandboxOrNull } from '../../sandbox/useSandbox';
import type { PacketHop } from '../../types/simulation';
import type { DpTab } from '../NodeDetailPanel/useNodeDetailDock';
import { useNetlabUI } from '../NetlabUIContext';
import { useNodeDetailDock } from '../NodeDetailPanel/useNodeDetailDock';
import { DropEventCard, pulseDroppingNode, type DropNavigateTarget } from './DropEventCard';
import { getDropLesson } from './dropLessons';

/**
 * Sandbox-only corrective entry points keyed by drop `reason`. The fix routes
 * the learner to the editable tab where they can actually resolve the drop
 * (the ACL/Routes tabs are editable under the sandbox), so it is advisory and
 * gated — read-only scenarios never see it. Reasons absent here (e.g. inherent
 * `ttl-exceeded`) offer no fix.
 */
const DROP_FIXES: Readonly<Record<string, { readonly label: string; readonly tab: DpTab }>> = {
  'acl-deny': { label: 'permit this traffic', tab: 'acl' },
  'no-route': { label: 'add a route', tab: 'routes' },
};

export interface DropEventOverlayProps {
  /** Override how a drop-ref navigates. Defaults to opening the node's detail panel. */
  onNavigate?: (target: DropNavigateTarget) => void;
  /** Debounce before the card appears after the playhead settles, in ms. Default 200. */
  openDelayMs?: number;
}

/**
 * M2 — drop-event controller. Mount as a child of `<NetlabCanvas>`: it watches the
 * active trace, and when the playhead settles on a dropped hop with an authored
 * lesson it pulses the node and shows a {@link DropEventCard}. Closing hides the card
 * until the playhead moves to a different drop.
 */
export function DropEventOverlay({ onNavigate, openDelayMs = 200 }: DropEventOverlayProps = {}) {
  const { state } = useSimulation();
  const ui = useNetlabUI();
  const dock = useNodeDetailDock();
  const sandbox = useSandboxOrNull();

  const trace = state.traces.find((t) => t.packetId === state.currentTraceId) ?? null;
  // An explicit hop selection (timeline row, `drops N` button, canvas) wins over
  // the playhead, so selecting a drop anywhere opens the explainer — that is the
  // chain that connects the timeline, canvas, and detail panel to one selection.
  const isDropWithLesson = (hop: PacketHop | null | undefined): hop is PacketHop =>
    hop != null && hop.event === 'drop' && getDropLesson(hop.reason) !== undefined;
  const selectedDrop = isDropWithLesson(state.selectedHop) ? state.selectedHop : null;
  const currentStep = state.currentStep >= 0 ? state.currentStep : 0;
  const playheadHop = trace?.hops[currentStep] ?? null;
  const dropHop = selectedDrop ?? (isDropWithLesson(playheadHop) ? playheadHop : null);

  // Latest drop hop, read inside the debounce timer without re-arming it every render.
  const dropHopRef = useRef<PacketHop | null>(dropHop);
  dropHopRef.current = dropHop;
  const dropStep = dropHop?.step ?? null;
  const dropReason = dropHop?.reason ?? null;

  const [activeHop, setActiveHop] = useState<PacketHop | null>(null);
  const [dismissedStep, setDismissedStep] = useState<number | null>(null);

  // Reset the dismissal once the active drop moves off the dismissed step
  // (whether via the playhead or an explicit selection).
  useEffect(() => {
    if (dismissedStep !== null && dropStep !== dismissedStep) {
      setDismissedStep(null);
    }
  }, [dropStep, dismissedStep]);

  // Debounce showing the card so fast scrubbing past a drop does not flicker.
  useEffect(() => {
    if (dropStep === null || dropStep === dismissedStep) {
      setActiveHop(null);
      return undefined;
    }
    const id = window.setTimeout(() => setActiveHop(dropHopRef.current), openDelayMs);
    return () => window.clearTimeout(id);
  }, [dropStep, dropReason, dismissedStep, openDelayMs]);

  // Pulse the dropping node whenever a new drop card opens.
  useEffect(() => {
    if (activeHop) pulseDroppingNode(activeHop.nodeId);
  }, [activeHop]);

  const handleNavigate = useCallback(
    (target: DropNavigateTarget) => {
      if (onNavigate) {
        onNavigate(target);
        return;
      }
      ui.setSelectedNodeId(target.nodeId);
      if (target.tab) dock.setTab(target.tab);
    },
    [onNavigate, ui, dock],
  );

  if (!activeHop) return null;
  const editable = sandbox != null;
  const fixDef = activeHop.reason ? DROP_FIXES[activeHop.reason] : undefined;
  const fix =
    editable && fixDef
      ? {
          label: fixDef.label,
          onApply: () => handleNavigate({ nodeId: activeHop.nodeId, tab: fixDef.tab }),
        }
      : undefined;
  return (
    <DropEventCard
      hop={activeHop}
      onClose={() => setDismissedStep(activeHop.step)}
      onNavigate={handleNavigate}
      editable={editable}
      fix={fix}
    />
  );
}
