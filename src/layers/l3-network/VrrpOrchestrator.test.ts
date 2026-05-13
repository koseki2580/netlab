import { describe, expect, it } from 'vitest';
import { VrrpOrchestrator } from './VrrpOrchestrator';

describe('VrrpOrchestrator', () => {
  it('answers VIP ownership only from the elected master', () => {
    const orchestrator = new VrrpOrchestrator([
      {
        nodeId: 'r1',
        interfaceId: 'eth0',
        realIp: '192.0.2.2',
        config: { vrid: 1, virtualIp: '192.0.2.1', priority: 90 },
      },
      {
        nodeId: 'r2',
        interfaceId: 'eth0',
        realIp: '192.0.2.3',
        config: { vrid: 1, virtualIp: '192.0.2.1', priority: 120 },
      },
    ]);

    expect(orchestrator.isMaster('r2', 'eth0')).toBe(true);
    expect(orchestrator.resolveVirtualMac('192.0.2.1')).toBe('00:00:5e:00:01:01');

    orchestrator.markNodeDown('r2');
    expect(orchestrator.isMaster('r1', 'eth0')).toBe(true);
  });
});
