/** REQ-449 — the Kubernetes networking challenges, checked by the trace model (TC-2664). */
import { describe, expect, it } from 'vitest';
import { k8sNetworkingChallenges, type ExploreState } from './k8sNetworkingChallenges';

/** The explore card's initial state. */
const INITIAL: ExploreState = { target: 'node-port', entry: 'node-b', policy: 'Local' };

const challenge = (state: ExploreState, id: string) => {
  const found = k8sNetworkingChallenges(state).find((c) => c.id === id);
  if (!found) throw new Error(`no challenge ${id}`);
  return found;
};

describe('TC-2664: the Kubernetes networking challenges are reached by the path the trace model says reaches them', () => {
  it('none is reached in the explore card’s initial state (NodePort, node-b, Local)', () => {
    expect(k8sNetworkingChallenges(INITIAL).map((c) => c.reached)).toEqual([false, false, false]);
  });

  it('cluster-no-hop: Cluster entering node-b has 0 extra hops and the backend sees 10.0.0.2; node-a takes a hop', () => {
    const reached = challenge({ ...INITIAL, policy: 'Cluster' }, 'cluster-no-hop');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('10.0.0.2');
    expect(reached.why.ja).toContain('10.0.0.2');
    expect(
      challenge({ ...INITIAL, policy: 'Cluster', entry: 'node-a' }, 'cluster-no-hop').reached,
    ).toBe(false);
    expect(
      challenge({ ...INITIAL, policy: 'Cluster', target: 'cluster-ip' }, 'cluster-no-hop').reached,
    ).toBe(false);
  });

  it('health-503: Local entering node-a answers 503 and drops the request; Cluster has no health check', () => {
    const reached = challenge({ ...INITIAL, entry: 'node-a' }, 'health-503');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('503');
    expect(reached.why.en).toContain('dropped');
    expect(reached.why.en).toContain('200');
    expect(
      challenge({ ...INITIAL, entry: 'node-a', policy: 'Cluster' }, 'health-503').reached,
    ).toBe(false);
    expect(challenge({ ...INITIAL, entry: 'node-a', target: 'pod' }, 'health-503').reached).toBe(
      false,
    );
  });

  it('virtual-reply: through the ClusterIP the reply comes from 10.96.0.10:80; straight to the Pod it does not', () => {
    const reached = challenge({ ...INITIAL, target: 'cluster-ip' }, 'virtual-reply');
    expect(reached.reached).toBe(true);
    expect(reached.why.en).toContain('10.244.2.7:8080');
    expect(reached.why.en).toContain('10.96.0.10:80');
    expect(challenge({ ...INITIAL, target: 'pod' }, 'virtual-reply').reached).toBe(false);
    expect(
      challenge({ ...INITIAL, policy: 'Cluster', entry: 'node-a' }, 'virtual-reply').reached,
    ).toBe(false);
  });
});
