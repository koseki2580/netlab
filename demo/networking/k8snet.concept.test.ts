/** The `k8snet` concept deck: each right answer is what the Kubernetes networking lesson model says. */
import { describe, expect, it } from 'vitest';
import { k8snet as en } from '../../src/i18n/locales/en/concept/decks/k8snet';
import { k8snet as ja } from '../../src/i18n/locales/ja/concept/decks/k8snet';
import { DECK } from '../../src/learning/concept-check/lessonDecks/k8snet';
import { CLIENT_POD, SERVICE, healthCheck, trace } from './k8sNetworking';

const answer = (id: string) => DECK.answers.find(([question]) => question === id)?.[1];

describe('TC-2599: k8snet deck: the right answers hold in the lesson model', () => {
  it('q1 (c): through the ClusterIP the backend sees the calling Pod, 10.244.1.5', () => {
    expect(answer('q1')).toBe('c');
    expect(trace('cluster-ip').backendSees).toBe(CLIENT_POD.ip);
  });
  it('q2 (a): the reply reaches the caller from 10.96.0.10:80', () => {
    expect(answer('q2')).toBe('a');
    expect(trace('cluster-ip').reply).toMatchObject({
      src: SERVICE.clusterIp,
      srcPort: SERVICE.port,
    });
  });
  it('q3 (b): under Cluster, entering on the backend’s node, the backend sees 10.0.0.2', () => {
    expect(answer('q3')).toBe('b');
    expect(trace('node-port', 'node-b', 'Cluster')).toMatchObject({
      backendSees: '10.0.0.2',
      extraHops: 0,
    });
  });
  it('q4 (c): under Local, node-a drops it and its health check answers 503', () => {
    expect(answer('q4')).toBe('c');
    expect(trace('node-port', 'node-a', 'Local').delivered).toBe(false);
    expect(healthCheck('node-a', 'Local')).toBe(503);
  });
});

describe('k8snet deck strings', () => {
  it('the right option is at most 1.6x the longest wrong one, in both locales', () => {
    for (const catalog of [en, ja]) {
      for (const [q, right] of DECK.answers) {
        const base = `learning.concept.k8snet.${q}`;
        const length = catalog[`${base}.${right}`]!.length;
        const wrong = Math.max(
          ...(['a', 'b', 'c'] as const)
            .filter((letter) => letter !== right)
            .map((letter) => catalog[`${base}.${letter}`]!.length),
        );
        expect(length / wrong, base).toBeLessThanOrEqual(1.6);
      }
    }
  });
  it('the right answer letter varies across the deck', () => {
    expect(new Set(DECK.answers.map(([, letter]) => letter)).size).toBeGreaterThan(1);
  });
});
