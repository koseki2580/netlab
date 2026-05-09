import { describe, expect, it } from 'vitest';
import { EditSession } from '../../sandbox/EditSession';
import { encodeSession } from '../../sandbox/session-io/codec';
import { DEFAULT_PARAMETERS } from '../../sandbox/types';
import { decodeSessionInput } from '../session-loader';
import { loadScenario } from '../scenario-loader';
import { createAssertionContext, evaluateAssertion } from './built-in';
import type { Assertion } from './types';

function sessionFor(scenarioId: string, session = EditSession.empty()) {
  return decodeSessionInput(
    JSON.stringify(
      encodeSession(session, {
        scenarioId,
        initialParameters: DEFAULT_PARAMETERS,
        savedAt: '2026-05-09T00:00:00.000Z',
      }),
    ),
  ).session;
}

async function evaluate(scenarioId: string, assertion: Assertion, session = EditSession.empty()) {
  const scenario = loadScenario(scenarioId);
  const context = createAssertionContext({
    scenario,
    session: sessionFor(scenarioId, session),
  });

  return evaluateAssertion(assertion, context);
}

describe('built-in CLI assertions', () => {
  it('passes packet-reaches when an ICMP ping delivers within the hop budget', async () => {
    await expect(
      evaluate('basic-arp', {
        kind: 'packet-reaches',
        source: 'client-1',
        destination: '203.0.113.10',
        within: 100,
      }),
    ).resolves.toMatchObject({ pass: true });
  });

  it('fails packet-reaches when the hop budget is too low', async () => {
    await expect(
      evaluate('basic-arp', {
        kind: 'packet-reaches',
        source: 'client-1',
        destination: '203.0.113.10',
        within: 1,
      }),
    ).resolves.toMatchObject({ pass: false });
  });

  it('passes packet-fails for a TTL drop', async () => {
    await expect(
      evaluate('basic-arp', {
        kind: 'packet-fails',
        source: 'client-1',
        destination: '203.0.113.10',
        reason: 'ttl',
      }),
    ).resolves.toMatchObject({ pass: true });
  });

  it('fails packet-fails when traffic is delivered', async () => {
    await expect(
      evaluate('basic-arp', {
        kind: 'packet-fails',
        source: 'client-1',
        destination: '203.0.113.10',
        reason: 'no-route',
      }),
    ).resolves.toMatchObject({ pass: false });
  });

  it('passes arp-cache-contains after earlier assertion traffic seeds runtime ARP state', async () => {
    const scenario = loadScenario('basic-arp');
    const context = createAssertionContext({ scenario, session: sessionFor('basic-arp') });
    await evaluateAssertion(
      { kind: 'packet-reaches', source: 'client-1', destination: '203.0.113.10', within: 100 },
      context,
    );

    await expect(
      evaluateAssertion(
        { kind: 'arp-cache-contains', nodeId: 'client-1', ip: '10.0.0.1' },
        context,
      ),
    ).resolves.toMatchObject({ pass: true });
  });

  it('fails arp-cache-contains when no entry exists', async () => {
    await expect(
      evaluate('basic-arp', { kind: 'arp-cache-contains', nodeId: 'client-1', ip: '192.0.2.1' }),
    ).resolves.toMatchObject({ pass: false });
  });

  it('passes route-table-contains for computed static routes', async () => {
    await expect(
      evaluate('basic-arp', {
        kind: 'route-table-contains',
        nodeId: 'router-1',
        destination: '203.0.113.0/24',
        nextHop: 'direct',
      }),
    ).resolves.toMatchObject({ pass: true });
  });

  it('fails route-table-contains for a missing next hop', async () => {
    await expect(
      evaluate('basic-arp', {
        kind: 'route-table-contains',
        nodeId: 'router-1',
        destination: '203.0.113.0/24',
        nextHop: '10.255.255.1',
      }),
    ).resolves.toMatchObject({ pass: false });
  });

  it('passes fragmentation-occurs on the low-MTU fragmented echo scenario', async () => {
    await expect(
      evaluate('fragmented-echo', { kind: 'fragmentation-occurs', atNodeId: 'router-r1' }),
    ).resolves.toMatchObject({ pass: true });
  });

  it('fails fragmentation-occurs when the requested node never fragments', async () => {
    await expect(
      evaluate('fragmented-echo', { kind: 'fragmentation-occurs', atNodeId: 'host-a' }),
    ).resolves.toMatchObject({ pass: false });
  });

  it('passes tcp-established on the TCP scenario', async () => {
    await expect(
      evaluate('tcp-handshake', {
        kind: 'tcp-established',
        client: 'client-1',
        server: 'server-1',
      }),
    ).resolves.toMatchObject({ pass: true });
  });

  it('fails tcp-established for missing endpoints', async () => {
    await expect(
      evaluate('tcp-handshake', { kind: 'tcp-established', client: 'client-1', server: 'missing' }),
    ).resolves.toMatchObject({ pass: false });
  });

  it('passes ospf-converged when a sample flow delivers within the step budget', async () => {
    await expect(
      evaluate('ospf-convergence', { kind: 'ospf-converged', withinSteps: 100 }),
    ).resolves.toMatchObject({ pass: true });
  });

  it('fails ospf-converged when the step budget is too low', async () => {
    await expect(
      evaluate('ospf-convergence', { kind: 'ospf-converged', withinSteps: 1 }),
    ).resolves.toMatchObject({ pass: false });
  });

  it('passes rubric-passes for the OSPF backup assessment after disabling the primary link', async () => {
    const session = EditSession.empty().push({
      kind: 'link.state',
      target: { kind: 'edge', edgeId: 'e-r2-r4' },
      before: 'up',
      after: 'down',
    });

    await expect(
      evaluate(
        'ospf-convergence',
        { kind: 'rubric-passes', rubricId: 'ospf-backup-path' },
        session,
      ),
    ).resolves.toMatchObject({ pass: true });
  });

  it('fails rubric-passes when the rubric id does not match', async () => {
    await expect(
      evaluate('ospf-convergence', { kind: 'rubric-passes', rubricId: 'missing-rubric' }),
    ).resolves.toMatchObject({ pass: false });
  });
});
