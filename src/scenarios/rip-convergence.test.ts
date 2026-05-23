import { describe, expect, it } from 'vitest';
import { scenariosInGroup } from './index';
import { buildRipConvergenceTopology, ripConvergence } from './rip-convergence';

describe('rip-convergence scenario', () => {
  it('configures RIP (not OSPF) on every router, reusing the OSPF addressing', () => {
    const topology = buildRipConvergenceTopology();
    const routers = topology.nodes.filter((node) => node.data.role === 'router');
    expect(routers).toHaveLength(4);
    for (const router of routers) {
      expect(router.data.ripConfig?.networks.length ?? 0).toBeGreaterThan(0);
      expect(router.data.ospfConfig).toBeUndefined();
    }
    // The addressing is identical to the OSPF scenario so the two are comparable.
    const r1 = topology.nodes.find((node) => node.id === 'r1');
    expect(r1?.data.interfaces?.[0]?.ipAddress).toBe('10.1.0.1');
  });

  it('shares a topology group with ospf-convergence', () => {
    expect(ripConvergence.topologyGroup).toBe('convergence-4router');
    const ids = scenariosInGroup('convergence-4router').map((scenario) => scenario.metadata.id);
    expect(ids).toContain('ospf-convergence');
    expect(ids).toContain('rip-convergence');
  });
});
