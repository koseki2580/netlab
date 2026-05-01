import { describe, expect, it } from 'vitest';
import { SANDBOX_STATE_PARAM } from '../../sandbox/urlCodec';
import { buildSandboxEmbedUrl } from '../buildSandboxEmbedUrl';

describe('buildSandboxEmbedUrl', () => {
  it('adds sandbox mode and scenario metadata by default', () => {
    expect(
      buildSandboxEmbedUrl({
        baseUrl: 'https://example.edu/netlab/?#/networking/mtu-fragmentation',
        scenarioId: 'fragmented-echo',
      }),
    ).toBe(
      'https://example.edu/netlab/?sandbox=1&scenario=fragmented-echo#/networking/mtu-fragmentation',
    );
  });

  it('preserves existing query params', () => {
    expect(
      buildSandboxEmbedUrl({
        baseUrl: 'https://example.edu/netlab/?theme=light#/simulation/nat',
        scenarioId: 'nat-basics',
      }),
    ).toContain('?theme=light&sandbox=1&scenario=nat-basics#');
  });

  it('can disable sandbox mode explicitly', () => {
    expect(
      buildSandboxEmbedUrl({
        baseUrl: 'https://example.edu/netlab/?#/simulation/nat',
        scenarioId: 'nat-basics',
        sandboxEnabled: false,
      }),
    ).toBe('https://example.edu/netlab/?scenario=nat-basics#/simulation/nat');
  });

  it('sets compact embed mode', () => {
    expect(
      buildSandboxEmbedUrl({
        baseUrl: 'https://example.edu/netlab/?#/simulation/nat',
        scenarioId: 'nat-basics',
        embedMode: 'compact',
      }),
    ).toContain('embedMode=compact');
  });

  it('sets minimal embed mode', () => {
    expect(
      buildSandboxEmbedUrl({
        baseUrl: 'https://example.edu/netlab/?#/simulation/nat',
        scenarioId: 'nat-basics',
        embedMode: 'minimal',
      }),
    ).toContain('embedMode=minimal');
  });

  it('sets tutorial id', () => {
    expect(
      buildSandboxEmbedUrl({
        baseUrl: 'https://example.edu/netlab/?#/simulation/tcp-handshake',
        scenarioId: 'tcp-handshake',
        tutorialId: 'sandbox-intro-tcp',
      }),
    ).toContain('tutorial=sandbox-intro-tcp');
  });

  it('sets assessment id', () => {
    expect(
      buildSandboxEmbedUrl({
        baseUrl: 'https://example.edu/netlab/?#/routing/ospf-convergence',
        scenarioId: 'ospf-convergence',
        assessmentId: 'ospf-convergence',
      }),
    ).toContain('assessment=ospf-convergence');
  });

  it('sets replay url', () => {
    expect(
      buildSandboxEmbedUrl({
        baseUrl: 'https://example.edu/netlab/?#/networking/mtu-fragmentation',
        scenarioId: 'fragmented-echo',
        replayUrl: '/fixtures/demo.netlabrec.json',
      }),
    ).toContain('replay=%2Ffixtures%2Fdemo.netlabrec.json');
  });

  it('sets already encoded sandbox edits', () => {
    const url = buildSandboxEmbedUrl({
      baseUrl: 'https://example.edu/netlab/?#/networking/mtu-fragmentation',
      scenarioId: 'fragmented-echo',
      edits: 'abc123',
    });

    expect(new URL(url).searchParams.get(SANDBOX_STATE_PARAM)).toBe('abc123');
  });

  it('updates existing sandbox params instead of duplicating them', () => {
    const url = buildSandboxEmbedUrl({
      baseUrl: 'https://example.edu/netlab/?sandbox=0&scenario=old#/simulation/nat',
      scenarioId: 'nat-basics',
    });
    const params = new URL(url).searchParams;

    expect(params.getAll('sandbox')).toEqual(['1']);
    expect(params.getAll('scenario')).toEqual(['nat-basics']);
  });

  it('sets parent origin values for iframe bridge setup', () => {
    const url = buildSandboxEmbedUrl({
      baseUrl: 'https://example.edu/netlab/?#/simulation/nat',
      scenarioId: 'nat-basics',
      parentOrigin: ['https://teacher.example', 'https://course.example'],
    });

    expect(new URL(url).searchParams.getAll('parentOrigin')).toEqual([
      'https://teacher.example',
      'https://course.example',
    ]);
  });

  it('supports relative base urls without reading from the DOM', () => {
    expect(
      buildSandboxEmbedUrl({
        baseUrl: '/netlab/?#/simulation/nat',
        scenarioId: 'nat-basics',
      }),
    ).toBe('/netlab/?sandbox=1&scenario=nat-basics#/simulation/nat');
  });
});
