import type { RouteEntry } from '../../types/routing';
import type { PacketHop, PacketTrace, SimulationState } from '../../types/simulation';

type TutorialAugmentedState = SimulationState & {
  tutorialRouteTable?: Record<string, RouteEntry[]>;
};

export function traces(state: SimulationState): PacketTrace[] {
  if (typeof state !== 'object' || state === null) {
    return [];
  }

  const candidate = state as unknown as Record<string, unknown>;
  return Array.isArray(candidate.traces) ? (candidate.traces as PacketTrace[]) : [];
}

export function mostRecentTrace(state: SimulationState): PacketTrace | null {
  const value = traces(state);
  return value[value.length - 1] ?? null;
}

export function allHops(state: SimulationState): PacketHop[] {
  return traces(state).flatMap((trace) => (Array.isArray(trace.hops) ? trace.hops : []));
}

export function hasTraceLabel(state: SimulationState, label: string): boolean {
  return traces(state).some((trace) => trace.label === label);
}

export function hasHopEvent(state: SimulationState, event: PacketHop['event']): boolean {
  return allHops(state).some((hop) => hop.event === event);
}

export function hasHopAction(
  state: SimulationState,
  action: NonNullable<PacketHop['action']>,
): boolean {
  return allHops(state).some((hop) => hop.action === action);
}

export function routeEntriesForNode(state: SimulationState, nodeId: string): RouteEntry[] {
  if (typeof state !== 'object' || state === null) {
    return [];
  }

  const candidate = (state as TutorialAugmentedState).tutorialRouteTable;
  if (!candidate || typeof candidate !== 'object') {
    return [];
  }

  return Array.isArray(candidate[nodeId]) ? candidate[nodeId] : [];
}
