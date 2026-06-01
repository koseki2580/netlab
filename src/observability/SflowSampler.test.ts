/**
 * @property-seed 0x5a4b12 deterministic sFlow sampling.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { buildUdpPacket } from '../layers/l4-transport/udpPacketBuilder';
import { PROPERTY_NUM_RUNS_DEFAULT, PROPERTY_SEED_DEFAULT } from '../testing/seeds';
import { FlowCollector } from './FlowCollector';
import { SflowSampler } from './SflowSampler';

function frame(index: number) {
  return buildUdpPacket({
    srcNodeId: 'a',
    dstNodeId: 'b',
    srcIp: '10.0.0.1',
    dstIp: '10.0.0.2',
    srcPort: 1000 + index,
    dstPort: 2000,
    srcMac: '00:00:00:00:00:01',
    dstMac: '00:00:00:00:00:02',
    packetId: `sflow-${index}`,
    timestamp: index,
    payload: { layer: 'raw', data: `payload-${index}` },
  }).frame;
}

describe('SflowSampler', () => {
  it('samples every Nth observed frame deterministically', () => {
    const collector = new FlowCollector();
    const sampler = new SflowSampler('sw1', { enabled: true, rate: 4 }, collector);

    for (let index = 1; index <= 16; index += 1) {
      sampler.observe(frame(index), 'p1', 'p2', index);
    }

    expect(collector.list({ kind: 'sflow' })).toHaveLength(4);
    expect(
      collector
        .list({ kind: 'sflow' })
        .map((event) => event.kind === 'sflow' && event.sample.sequence),
    ).toEqual([3, 2, 1, 0]);
  });

  it('increments drops when the collector is full', () => {
    const collector = new FlowCollector({ maxRecords: 1 });
    collector.add({
      kind: 'sflow',
      sample: {
        version: 5,
        sampleFormat: 1,
        samplerSwitchId: 'existing',
        portId: 'p0',
        sequence: 0,
        samplingRate: 1,
        samplePool: 1,
        drops: 0,
        inputIfId: 'p0',
        outputIfId: 'p0',
        frameLength: 1,
        headerBytes: new Uint8Array([1]),
        step: 0,
      },
    });
    const sampler = new SflowSampler('sw1', { enabled: true, rate: 1 }, collector);

    const trace = sampler.observe(frame(1), 'p1', 'p2', 1);

    expect(trace).toEqual({
      action: 'sflow:dropped',
      switchId: 'sw1',
      portId: 'p1',
      reason: 'collector-full',
    });
    expect(sampler.getDrops()).toBe(1);
    expect(collector.list()).toHaveLength(1);
  });

  it('sample count is floor(observed / rate)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1, max: 100 }),
        (rate, observed) => {
          const collector = new FlowCollector({ maxRecords: 1000 });
          const sampler = new SflowSampler('sw1', { enabled: true, rate }, collector);
          for (let index = 1; index <= observed; index += 1) {
            sampler.observe(frame(index), 'p1', 'p2', index);
          }
          expect(collector.list({ kind: 'sflow' })).toHaveLength(Math.floor(observed / rate));
        },
      ),
      { seed: PROPERTY_SEED_DEFAULT, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });
});
