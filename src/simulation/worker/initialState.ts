import type { SimulationState } from '../../types/simulation';

export const INITIAL_SIMULATION_STATE: SimulationState = {
  status: 'idle',
  traces: [],
  currentTraceId: null,
  currentStep: -1,
  activeEdgeIds: [],
  activePathEdgeIds: [],
  highlightMode: 'path',
  traceColors: {},
  selectedHop: null,
  selectedPacket: null,
  nodeArpTables: {},
  natTables: [],
  connTrackTables: [],
};
