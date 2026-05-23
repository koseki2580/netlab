import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ObservabilityTrace } from '../../types/simulation';
import { HopObservabilityView } from './HopObservabilityView';

describe('HopObservabilityView', () => {
  it('renders NetFlow flow-update counters under a NETFLOW header', () => {
    const trace: ObservabilityTrace = {
      kind: 'netflow:flow-update',
      routerId: 'router-1',
      flowKey: '10.0.0.10:1234->203.0.113.10:443/tcp',
      packets: 42,
      bytes: 5120,
    };

    const html = renderToStaticMarkup(<HopObservabilityView trace={trace} />);

    expect(html).toContain('NETFLOW');
    expect(html).toContain('NetFlow Router');
    expect(html).toContain('router-1');
    expect(html).toContain('NetFlow Packets');
    expect(html).toContain('42');
    expect(html).toContain('NetFlow Bytes');
    expect(html).toContain('5120');
  });

  it('renders NetFlow flow-export reason', () => {
    const trace: ObservabilityTrace = {
      kind: 'netflow:flow-export',
      routerId: 'router-2',
      flowKey: 'flow-1',
      reason: 'active-timeout',
    };

    const html = renderToStaticMarkup(<HopObservabilityView trace={trace} />);

    expect(html).toContain('NETFLOW');
    expect(html).toContain('NetFlow Export');
    expect(html).toContain('active-timeout');
  });

  it('renders sFlow sampled metadata under an SFLOW header', () => {
    const trace: ObservabilityTrace = {
      kind: 'sflow:sampled',
      switchId: 'sw-1',
      portId: 'eth2',
      sequence: 7,
    };

    const html = renderToStaticMarkup(<HopObservabilityView trace={trace} />);

    expect(html).toContain('SFLOW');
    expect(html).toContain('sFlow Switch');
    expect(html).toContain('sw-1');
    expect(html).toContain('sFlow Port');
    expect(html).toContain('eth2');
    expect(html).toContain('sFlow Sequence');
    expect(html).toContain('7');
  });

  it('renders sFlow dropped reason', () => {
    const trace: ObservabilityTrace = {
      kind: 'sflow:dropped',
      switchId: 'sw-1',
      portId: 'eth2',
      reason: 'collector-full',
    };

    const html = renderToStaticMarkup(<HopObservabilityView trace={trace} />);

    expect(html).toContain('SFLOW');
    expect(html).toContain('sFlow Drop');
    expect(html).toContain('collector-full');
  });
});
