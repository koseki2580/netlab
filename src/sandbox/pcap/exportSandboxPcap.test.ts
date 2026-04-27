import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { EthernetFrame } from '../../types/packets';
import type { PcapRecord } from '../../utils/pcapSerializer';
import type { BranchedSimulationEngine } from '../BranchedSimulationEngine';
import { exportSandboxPcap } from './exportSandboxPcap';

function readUint16LE(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(offset, true);
}

function readUint32LE(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, true);
}

const FIXED_DATE = new Date('2026-04-21T10:30:00.000Z');
const pad = (n: number) => String(n).padStart(2, '0');
const STAMP =
  `${FIXED_DATE.getFullYear()}` +
  `${pad(FIXED_DATE.getMonth() + 1)}` +
  `${pad(FIXED_DATE.getDate())}` +
  `${pad(FIXED_DATE.getHours())}` +
  `${pad(FIXED_DATE.getMinutes())}`;

const dummyFrame: EthernetFrame = {
  layer: 'L2',
  srcMac: '00:00:00:00:00:01',
  dstMac: '00:00:00:00:00:02',
  etherType: 0x0800,
  fcs: 0,
  payload: {
    layer: 'L3',
    srcIp: '10.0.0.1',
    dstIp: '10.0.0.2',
    ttl: 64,
    protocol: 1,
    payload: { layer: 'raw', data: 'ping' },
  },
};

function makeRecord(step = 0): PcapRecord {
  return {
    hop: {
      step,
      nodeId: 'n1',
      nodeLabel: 'N1',
      srcIp: '10.0.0.1',
      dstIp: '10.0.0.2',
      ttl: 64,
      protocol: 'ICMP',
      event: 'create',
      timestamp: 1_000_000,
    },
    frame: dummyFrame,
  };
}

function makeEngineMock(overrides: {
  whatIfRecords?: PcapRecord[];
  baselineRecords?: PcapRecord[] | null;
}): BranchedSimulationEngine {
  const whatIfRecords = overrides.whatIfRecords ?? [makeRecord()];
  const baselineRecords = overrides.baselineRecords ?? null;

  const whatIfMock = {
    exportPcapRecords: vi.fn(() => whatIfRecords),
    exportPcap: vi.fn(() => new Uint8Array(24)),
    getState: vi.fn(() => ({ traces: [], currentTraceId: null })),
  };

  const baselineMock =
    baselineRecords !== null
      ? {
          exportPcapRecords: vi.fn(() => baselineRecords),
          exportPcap: vi.fn(() => new Uint8Array(24)),
          getState: vi.fn(() => ({ traces: [], currentTraceId: null })),
        }
      : null;

  return {
    whatIf: whatIfMock,
    baseline: baselineMock,
    mode: baselineMock ? 'beta' : 'alpha',
  } as unknown as BranchedSimulationEngine;
}

const opts = { scenarioId: 'test-scenario', now: FIXED_DATE };

describe('exportSandboxPcap — alpha branch', () => {
  it('returns one result with correct filename and PCAP MIME type', () => {
    const engine = makeEngineMock({});
    const [result] = exportSandboxPcap(engine, 'alpha', opts);

    expect(result).toBeDefined();
    expect(result?.filename).toBe(`netlab-sandbox-test-scenario-${STAMP}.pcap`);
    expect(result?.blob.type).toBe('application/vnd.tcpdump.pcap');
  });

  it('does not mark output as truncated for small record sets', () => {
    const engine = makeEngineMock({ whatIfRecords: [makeRecord()] });
    const [result] = exportSandboxPcap(engine, 'alpha', opts);
    expect(result?.truncated).toBe(false);
  });

  it('marks output as truncated when records exceed 10,000', () => {
    const manyRecords = Array.from({ length: 10_001 }, (_, i) => makeRecord(i));
    const engine = makeEngineMock({ whatIfRecords: manyRecords });
    const [result] = exportSandboxPcap(engine, 'alpha', opts);
    expect(result?.truncated).toBe(true);
  });

  it('produces a non-empty Blob containing a valid libpcap global header', async () => {
    const engine = makeEngineMock({ whatIfRecords: [makeRecord()] });
    const [result] = exportSandboxPcap(engine, 'alpha', opts);
    const bytes = new Uint8Array(await result!.blob.arrayBuffer());
    expect(readUint32LE(bytes, 0)).toBe(0xa1b2c3d4); // magic
  });

  it('returns one result for "whatif" branch (alias of alpha path)', () => {
    const engine = makeEngineMock({ whatIfRecords: [makeRecord()] });
    const results = exportSandboxPcap(engine, 'whatif', opts);
    expect(results).toHaveLength(1);
    expect(results[0]?.filename).toMatch(/\.pcap$/);
  });
});

describe('exportSandboxPcap — baseline branch', () => {
  it('returns one baseline-named PCAP file when baseline engine exists', () => {
    const engine = makeEngineMock({ baselineRecords: [makeRecord()] });
    const results = exportSandboxPcap(engine, 'baseline', opts);
    expect(results).toHaveLength(1);
    expect(results[0]?.filename).toContain('baseline');
  });

  it('returns empty-but-valid PCAP when baseline engine is absent', async () => {
    const engine = makeEngineMock({ baselineRecords: null });
    const results = exportSandboxPcap(engine, 'baseline', opts);
    expect(results).toHaveLength(1);
    const bytes = new Uint8Array(await results[0]!.blob.arrayBuffer());
    expect(readUint32LE(bytes, 0)).toBe(0xa1b2c3d4);
  });
});

describe('exportSandboxPcap — combined branch (non-Safari)', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      writable: true,
      value: { userAgent: 'Mozilla/5.0 (Linux; x86_64) Chrome/124' },
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      writable: true,
      value: undefined,
    });
  });

  it('returns one .pcapng file when baseline exists', () => {
    const engine = makeEngineMock({ baselineRecords: [makeRecord(0)] });
    const results = exportSandboxPcap(engine, 'combined', opts);
    expect(results).toHaveLength(1);
    expect(results[0]?.filename).toMatch(/combined.*\.pcapng$/);
  });

  it('pcapng starts with SHB magic 0x0A0D0D0A', async () => {
    const engine = makeEngineMock({ baselineRecords: [makeRecord(0)] });
    const [result] = exportSandboxPcap(engine, 'combined', opts);
    const bytes = new Uint8Array(await result!.blob.arrayBuffer());
    expect(readUint32LE(bytes, 0)).toBe(0x0a0d0d0a);
  });

  it('pcapng byte-order magic indicates little-endian', async () => {
    const engine = makeEngineMock({ baselineRecords: [makeRecord(0)] });
    const [result] = exportSandboxPcap(engine, 'combined', opts);
    const bytes = new Uint8Array(await result!.blob.arrayBuffer());
    expect(readUint32LE(bytes, 8)).toBe(0x1a2b3c4d);
  });

  it('pcapng second block is IDB with LINKTYPE_ETHERNET', async () => {
    const engine = makeEngineMock({ baselineRecords: [makeRecord(0)] });
    const [result] = exportSandboxPcap(engine, 'combined', opts);
    const bytes = new Uint8Array(await result!.blob.arrayBuffer());
    // IDB starts at offset 28 (after SHB)
    expect(readUint32LE(bytes, 28)).toBe(0x00000001); // IDB block type
    expect(readUint16LE(bytes, 36)).toBe(1); // LinkType = ETHERNET
  });

  it('EPB comment option contains the label "baseline" for first records', async () => {
    const engine = makeEngineMock({
      whatIfRecords: [],
      baselineRecords: [makeRecord(0)],
    });
    const [result] = exportSandboxPcap(engine, 'combined', opts);
    const bytes = new Uint8Array(await result!.blob.arrayBuffer());
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain('baseline');
  });

  it('EPB comment option contains the label "whatif" for whatif records', async () => {
    const engine = makeEngineMock({
      whatIfRecords: [makeRecord(0)],
      baselineRecords: [],
    });
    const [result] = exportSandboxPcap(engine, 'combined', opts);
    const bytes = new Uint8Array(await result!.blob.arrayBuffer());
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain('whatif');
  });

  it('falls back to single whatif PCAP when baseline engine is absent', () => {
    const engine = makeEngineMock({ baselineRecords: null });
    const results = exportSandboxPcap(engine, 'combined', opts);
    expect(results).toHaveLength(1);
    expect(results[0]?.filename).toMatch(/\.pcap$/);
    expect(results[0]?.filename).not.toContain('combined');
  });
});

describe('exportSandboxPcap — combined branch (Safari < 16 fallback)', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      writable: true,
      value: { userAgent: 'Mozilla/5.0 Version/15.0 Safari/605.1.15' },
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      writable: true,
      value: undefined,
    });
  });

  it('returns two separate classic pcap files on Safari < 16', () => {
    const engine = makeEngineMock({ baselineRecords: [makeRecord()] });
    const results = exportSandboxPcap(engine, 'combined', opts);
    expect(results).toHaveLength(2);
    expect(results[0]?.filename).toContain('baseline');
    expect(results[1]?.filename).toContain('whatif');
  });

  it('each fallback file starts with classic libpcap magic', async () => {
    const engine = makeEngineMock({ baselineRecords: [makeRecord()] });
    const [r0, r1] = exportSandboxPcap(engine, 'combined', opts);
    for (const r of [r0, r1]) {
      const bytes = new Uint8Array(await r!.blob.arrayBuffer());
      expect(readUint32LE(bytes, 0)).toBe(0xa1b2c3d4);
    }
  });
});
