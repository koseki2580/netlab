import { buildPcap, serializePcapFrame } from '../../utils/pcapSerializer';
import type { PcapRecord } from '../../utils/pcapSerializer';
import type { BranchedSimulationEngine } from '../BranchedSimulationEngine';

export type PcapBranch = 'alpha' | 'baseline' | 'whatif' | 'combined';

export interface SandboxPcapExport {
  blob: Blob;
  filename: string;
  truncated: boolean;
}

const MAX_FRAMES = 10_000;
const PCAP_MIME = 'application/vnd.tcpdump.pcap';

// Pre-computed static pcapng blocks
// SHB: 0x0A0D0D0A, BTL=28, BOM=0x1A2B3C4D, v1.0, SectionLen=-1
const PCAPNG_SHB = new Uint8Array([
  0x0a, 0x0d, 0x0d, 0x0a, 0x1c, 0, 0, 0, 0x4d, 0x3c, 0x2b, 0x1a, 1, 0, 0, 0, 0xff, 0xff, 0xff, 0xff,
  0xff, 0xff, 0xff, 0xff, 0x1c, 0, 0, 0,
]);
// IDB: type=1, BTL=20, LinkType=1(Ethernet), Reserved=0, SnapLen=65535
const PCAPNG_IDB = new Uint8Array([
  1, 0, 0, 0, 0x14, 0, 0, 0, 1, 0, 0, 0, 0xff, 0xff, 0, 0, 0x14, 0, 0, 0,
]);

const LABEL_BASELINE = new Uint8Array([98, 97, 115, 101, 108, 105, 110, 101]); // "baseline" (8 bytes, no pad)
const LABEL_WHATIF = new Uint8Array([119, 104, 97, 116, 105, 102, 0, 0]); // "whatif\0\0" (padded to 8)

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function stampNow(d: Date): string {
  return (
    `${d.getFullYear()}` +
    `${pad(d.getMonth() + 1)}` +
    `${pad(d.getDate())}` +
    `${pad(d.getHours())}` +
    `${pad(d.getMinutes())}`
  );
}

function toBlob(bytes: Uint8Array): Blob {
  return new Blob([Uint8Array.from(bytes)], { type: PCAP_MIME });
}

function buildPcapngEPB(record: PcapRecord, label: Uint8Array, labelRawLen: number): Uint8Array {
  const frameBytes = serializePcapFrame(record.frame);
  const capLen = frameBytes.length;
  const paddedData = (capLen + 3) & ~3;
  // Options: opt_comment(2+2+8=12) + opt_endofopt(2+2=4) = 16 bytes
  const btl = 32 + paddedData + 16;
  const buf = new Uint8Array(btl);
  const dv = new DataView(buf.buffer);

  const { timestamp, step } = record.hop;
  const totalMicros = (timestamp % 1000) * 1000 + step * 1000;
  const tsSec = Math.floor(timestamp / 1000) + Math.floor(totalMicros / 1_000_000);
  const tsUsec = totalMicros % 1_000_000;
  const ts64 = tsSec * 1_000_000 + tsUsec;

  let o = 0;
  dv.setUint32(o, 6, true);
  o += 4; // EPB block type
  dv.setUint32(o, btl, true);
  o += 4;
  dv.setUint32(o, 0, true);
  o += 4; // Interface ID
  dv.setUint32(o, Math.floor(ts64 / 0x1_0000_0000), true);
  o += 4; // TSHigh
  dv.setUint32(o, ts64 % 0x1_0000_0000, true);
  o += 4; // TSLow
  dv.setUint32(o, capLen, true);
  o += 4;
  dv.setUint32(o, capLen, true);
  o += 4;
  buf.set(frameBytes, o);
  o += paddedData;
  // opt_comment: code=1, length=rawLen, value=label (padded 8 bytes)
  dv.setUint16(o, 1, true);
  o += 2;
  dv.setUint16(o, labelRawLen, true);
  o += 2;
  buf.set(label, o);
  o += 8;
  // opt_endofopt: zeros already in buf; skip 4
  o += 4;
  dv.setUint32(o, btl, true); // BTL repeated

  return buf;
}

function buildCombinedPcapng(
  baselineRecords: PcapRecord[],
  whatIfRecords: PcapRecord[],
): Uint8Array {
  const parts: Uint8Array[] = [PCAPNG_SHB, PCAPNG_IDB];
  for (const r of baselineRecords) parts.push(buildPcapngEPB(r, LABEL_BASELINE, 8));
  for (const r of whatIfRecords) parts.push(buildPcapngEPB(r, LABEL_WHATIF, 6));
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function isSafariLt16(): boolean {
  if (typeof navigator === 'undefined') return false;
  const m = /Version\/(\d+).*Safari/.exec(navigator.userAgent);
  return m ? parseInt(m[1] ?? '0', 10) < 16 : false;
}

function cap(records: PcapRecord[]): { records: PcapRecord[]; truncated: boolean } {
  return records.length <= MAX_FRAMES
    ? { records, truncated: false }
    : { records: records.slice(0, MAX_FRAMES), truncated: true };
}

export function exportSandboxPcap(
  engine: BranchedSimulationEngine,
  branch: PcapBranch,
  opts: { scenarioId: string; now?: Date },
): SandboxPcapExport[] {
  const stamp = stampNow(opts.now ?? new Date());
  const { scenarioId } = opts;

  if (branch === 'alpha' || branch === 'whatif') {
    const { records, truncated } = cap(engine.whatIf.exportPcapRecords());
    return [
      {
        blob: toBlob(buildPcap(records)),
        filename: `netlab-sandbox-${scenarioId}-${stamp}.pcap`,
        truncated,
      },
    ];
  }

  if (branch === 'baseline') {
    const bl = engine.baseline;
    if (!bl) {
      return [
        {
          blob: toBlob(buildPcap([])),
          filename: `netlab-sandbox-${scenarioId}-baseline-${stamp}.pcap`,
          truncated: false,
        },
      ];
    }
    const { records, truncated } = cap(bl.exportPcapRecords());
    return [
      {
        blob: toBlob(buildPcap(records)),
        filename: `netlab-sandbox-${scenarioId}-baseline-${stamp}.pcap`,
        truncated,
      },
    ];
  }

  // combined
  const bl = engine.baseline;
  if (!bl) {
    const { records, truncated } = cap(engine.whatIf.exportPcapRecords());
    return [
      {
        blob: toBlob(buildPcap(records)),
        filename: `netlab-sandbox-${scenarioId}-${stamp}.pcap`,
        truncated,
      },
    ];
  }

  const { records: bRec, truncated: bt } = cap(bl.exportPcapRecords());
  const { records: wRec, truncated: wt } = cap(engine.whatIf.exportPcapRecords());
  const truncated = bt || wt;

  if (isSafariLt16()) {
    return [
      {
        blob: toBlob(buildPcap(bRec)),
        filename: `netlab-sandbox-${scenarioId}-baseline-${stamp}.pcap`,
        truncated,
      },
      {
        blob: toBlob(buildPcap(wRec)),
        filename: `netlab-sandbox-${scenarioId}-whatif-${stamp}.pcap`,
        truncated,
      },
    ];
  }

  return [
    {
      blob: toBlob(buildCombinedPcapng(bRec, wRec)),
      filename: `netlab-sandbox-${scenarioId}-combined-${stamp}.pcapng`,
      truncated,
    },
  ];
}
