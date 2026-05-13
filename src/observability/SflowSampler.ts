import type { EthernetFrame } from '../types/packets';
import type { SflowConfig } from '../types/observability';
import { SFLOW_SAMPLE_FORMAT_FLOW, SFLOW_VERSION } from '../types/observability';
import type { FlowCollector } from './FlowCollector';

export type SflowTraceUpdate =
  | {
      readonly action: 'sflow:sampled';
      readonly switchId: string;
      readonly portId: string;
      readonly sequence: number;
    }
  | {
      readonly action: 'sflow:dropped';
      readonly switchId: string;
      readonly portId: string;
      readonly reason: 'collector-full';
    };

const DEFAULT_HEADER_CAPTURE_BYTES = 128;

function frameBytes(frame: EthernetFrame): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(frame));
}

export class SflowSampler {
  private observed = 0;
  private sequence = 0;
  private drops = 0;

  constructor(
    readonly switchId: string,
    readonly config: SflowConfig,
    private readonly collector: FlowCollector,
  ) {}

  observe(
    frame: EthernetFrame,
    inputIfId: string,
    outputIfId: string,
    atStep: number,
  ): SflowTraceUpdate | null {
    if (!this.config.enabled) return null;

    this.observed += 1;
    const rate = Math.max(1, Math.floor(this.config.rate));
    if (this.observed % rate !== 0) return null;

    if (this.collector.isFull()) {
      this.drops += 1;
      return {
        action: 'sflow:dropped',
        switchId: this.switchId,
        portId: inputIfId,
        reason: 'collector-full',
      };
    }

    const bytes = frameBytes(frame);
    const captureBytes = Math.max(
      1,
      Math.floor(this.config.headerCaptureBytes ?? DEFAULT_HEADER_CAPTURE_BYTES),
    );
    const sampleSequence = this.sequence;
    this.sequence += 1;
    this.collector.add({
      kind: 'sflow',
      sample: {
        version: SFLOW_VERSION,
        sampleFormat: SFLOW_SAMPLE_FORMAT_FLOW,
        samplerSwitchId: this.switchId,
        portId: inputIfId,
        sequence: sampleSequence,
        samplingRate: rate,
        samplePool: this.observed,
        drops: this.drops,
        inputIfId,
        outputIfId,
        frameLength: bytes.length,
        headerBytes: bytes.slice(0, captureBytes),
        step: atStep,
      },
    });

    return {
      action: 'sflow:sampled',
      switchId: this.switchId,
      portId: inputIfId,
      sequence: sampleSequence,
    };
  }

  getDrops(): number {
    return this.drops;
  }
}
