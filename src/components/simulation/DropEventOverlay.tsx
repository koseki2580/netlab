import { useCallback, useEffect, useRef, useState } from 'react';
import { useSimulation } from '../../simulation/SimulationContext';
import type { PacketHop } from '../../types/simulation';
import { useNetlabUI } from '../NetlabUIContext';
import { useNodeDetailDock } from '../NodeDetailPanel/useNodeDetailDock';
import { DropEventCard, pulseDroppingNode, type DropNavigateTarget } from './DropEventCard';
import { getDropLesson } from './dropLessons';

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

  const trace = state.traces.find((t) => t.packetId === state.currentTraceId) ?? null;
  const currentStep = state.currentStep >= 0 ? state.currentStep : 0;
  const currentHop = trace?.hops[currentStep] ?? null;
  const dropHop =
    currentHop && currentHop.event === 'drop' && getDropLesson(currentHop.reason)
      ? currentHop
      : null;

  // Latest drop hop, read inside the debounce timer without re-arming it every render.
  const dropHopRef = useRef<PacketHop | null>(dropHop);
  dropHopRef.current = dropHop;
  const dropStep = dropHop?.step ?? null;
  const dropReason = dropHop?.reason ?? null;

  const [activeHop, setActiveHop] = useState<PacketHop | null>(null);
  const [dismissedStep, setDismissedStep] = useState<number | null>(null);

  // Reset the dismissal once the playhead moves off the dismissed drop.
  useEffect(() => {
    if (dismissedStep !== null && currentStep !== dismissedStep) {
      setDismissedStep(null);
    }
  }, [currentStep, dismissedStep]);

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
  return (
    <DropEventCard
      hop={activeHop}
      onClose={() => setDismissedStep(activeHop.step)}
      onNavigate={handleNavigate}
    />
  );
}
