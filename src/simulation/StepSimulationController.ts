import { SimulationEngine } from './SimulationEngine';
import type { InFlightPacket } from '../types/packets';
import type { PacketHop, SimulationState } from '../types/simulation';

export type StepSimStatus = 'idle' | 'loaded' | 'stepping' | 'done';

export interface StepSimState {
  status: StepSimStatus;
  currentStep: number;
  totalSteps: number;
  currentHop: PacketHop | null;
  canStep: boolean;
  canReset: boolean;
}

export class StepSimulationController {
  private listeners = new Set<(state: StepSimState) => void>();

  constructor(private readonly engine: SimulationEngine) {
    engine.subscribe(() => this.notifyListeners());
  }

  async load(packet: InFlightPacket): Promise<void> {
    await this.engine.send(packet);
  }

  nextStep(): PacketHop | null {
    const before = this.engine.getState().currentStep;
    this.engine.step();
    const after = this.engine.getState();
    if (after.currentStep === before) return null;
    return after.selectedHop;
  }

  reset(): void {
    this.engine.reset();
  }

  getState(): StepSimState {
    return this.deriveState(this.engine.getState());
  }

  subscribe(listener: (state: StepSimState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private deriveState(engineState: SimulationState): StepSimState {
    const trace = engineState.currentTraceId
      ? engineState.traces.find((t) => t.packetId === engineState.currentTraceId) ?? null
      : null;

    const totalSteps = trace?.hops.length ?? 0;
    const currentStep = engineState.currentStep;
    const currentHop = engineState.selectedHop;

    let status: StepSimStatus = 'idle';
    if (trace) {
      if (engineState.status === 'done') status = 'done';
      else if (currentStep >= 0) status = 'stepping';
      else status = 'loaded';
    }

    const canStep = (status === 'loaded' || status === 'stepping') && currentStep < totalSteps - 1;
    const canReset = status !== 'idle';

    return { status, currentStep, totalSteps, currentHop, canStep, canReset };
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach((fn) => fn(state));
  }
}
