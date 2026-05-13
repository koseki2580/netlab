import { describe, expect, it, vi } from 'vitest';
import { FlowCollector, type FlowEvent } from './FlowCollector';

function netflow(id: string, step: number, deviceId = 'r1'): FlowEvent {
  return {
    kind: 'netflow',
    record: {
      version: 9,
      templateId: 256,
      samplerRouterId: deviceId,
      key: {
        srcIp: `10.0.0.${id}`,
        dstIp: '203.0.113.10',
        srcPort: 1000,
        dstPort: 80,
        proto: 'tcp',
        ingressIfId: 'eth0',
        egressIfId: 'eth1',
        tos: 0,
      },
      packets: 1,
      bytes: 120,
      firstStep: step,
      lastStep: step,
      tcpFlagsUnion: 0,
      reason: 'inactive-timeout',
    },
  };
}

function sflow(sequence: number, deviceId = 'sw1'): FlowEvent {
  return {
    kind: 'sflow',
    sample: {
      version: 5,
      sampleFormat: 1,
      samplerSwitchId: deviceId,
      portId: 'p1',
      sequence,
      samplingRate: 4,
      samplePool: sequence * 4,
      drops: 0,
      inputIfId: 'p1',
      outputIfId: 'p2',
      frameLength: 64,
      headerBytes: new Uint8Array([sequence]),
      step: sequence,
    },
  };
}

describe('FlowCollector', () => {
  it('keeps newest records and drops the oldest when full', () => {
    const collector = new FlowCollector({ maxRecords: 2 });
    collector.add(netflow('1', 1));
    collector.add(netflow('2', 2));
    collector.add(netflow('3', 3));

    expect(collector.size()).toBe(2);
    expect(
      collector.list().map((event) => event.kind === 'netflow' && event.record.key.srcIp),
    ).toEqual(['10.0.0.3', '10.0.0.2']);
  });

  it('filters by kind, device, since, and limit', () => {
    const collector = new FlowCollector({ maxRecords: 5 });
    collector.add(netflow('1', 1, 'r1'));
    collector.add(sflow(2, 'sw1'));
    collector.add(netflow('3', 3, 'r2'));

    expect(collector.list({ kind: 'netflow', deviceId: 'r2', since: 2, limit: 1 })).toEqual([
      netflow('3', 3, 'r2'),
    ]);
  });

  it('notifies subscribers and supports unsubscribe', () => {
    const collector = new FlowCollector();
    const left = vi.fn();
    const right = vi.fn();
    const unsubscribe = collector.subscribe(left);
    collector.subscribe(right);

    collector.add(netflow('1', 1));
    unsubscribe();
    collector.add(netflow('2', 2));

    expect(left).toHaveBeenCalledTimes(1);
    expect(right).toHaveBeenCalledTimes(2);
  });

  it('clears records without removing subscribers', () => {
    const collector = new FlowCollector();
    const subscriber = vi.fn();
    collector.subscribe(subscriber);
    collector.add(netflow('1', 1));
    collector.clear();
    collector.add(sflow(1));

    expect(collector.list()).toEqual([sflow(1)]);
    expect(subscriber).toHaveBeenCalledTimes(2);
  });
});
