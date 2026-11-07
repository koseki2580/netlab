/**
 * The DNS resolution lesson's reading of the simulator: each DNS message on
 * the wire, in order, as the packet capture holds it, said in words.
 */
import type { DnsMessage, DnsRecord, InFlightPacket } from '../../src/types/packets';
import type { PacketTrace } from '../../src/types/simulation';
import type { NetworkTopology } from '../../src/types/topology';
import type { PcapRecord } from '../../src/utils/pcapSerializer';

type T = (en: string, ja: string) => string;

export interface DnsStep {
  readonly from: string;
  readonly to: string;
  readonly message: DnsMessage;
}

function dnsOf(record: PcapRecord | undefined): DnsMessage | null {
  const ip = record?.frame.payload;
  if (!ip || !('payload' in ip)) return null;
  const transport = (ip as InFlightPacket['frame']['payload']).payload;
  return 'payload' in transport && 'questions' in transport.payload ? transport.payload : null;
}

/** The DNS messages of `traces`, read from each trace's capture. */
export function dnsSteps(
  topology: NetworkTopology,
  traces: readonly PacketTrace[],
  capture: (packetId: string) => readonly PcapRecord[],
): DnsStep[] {
  const label = (id: string) => topology.nodes.find((node) => node.id === id)?.data.label ?? id;
  return traces.flatMap((trace) => {
    const message = dnsOf(capture(trace.packetId)[0]);
    return message ? [{ from: label(trace.srcNodeId), to: label(trace.dstNodeId), message }] : [];
  });
}

const recordText = (record: DnsRecord) =>
  record.type === 'MX'
    ? `${record.name} MX ${record.preference ?? 0} ${record.address}`
    : `${record.name} ${record.type} ${record.address}`;

/** One line for a step. */
export function describeStep(step: DnsStep, t: T): string {
  const { message } = step;
  const head = `${step.from} → ${step.to}: `;
  const question = message.questions[0];
  const asked = question ? `${question.name} ${question.type}` : '';
  if (!message.isResponse) {
    const rd = message.recursionDesired === false ? 0 : 1;
    return head + t(`query ${asked}? (RD ${rd})`, `問い合わせ ${asked}?（RD ${rd}）`);
  }
  if (message.rcode === 3) {
    const soa = message.authority?.[0];
    return (
      head +
      (soa
        ? t(
            `NXDOMAIN: no such name (SOA ${soa.name}, keep for ${soa.ttl} s)`,
            `NXDOMAIN：その名前はない（SOA ${soa.name}、${soa.ttl} 秒覚えておける）`,
          )
        : t('NXDOMAIN: no such name', 'NXDOMAIN：その名前はない'))
    );
  }
  if (message.answers.length > 0) {
    const records = message.answers
      .map((record) => `${recordText(record)} (TTL ${record.ttl})`)
      .join('; ');
    const who =
      message.authoritative === true
        ? t('authoritative answer', '権威ある回答')
        : t('answer', '回答');
    return `${head}${who}${t(': ', '：')}${records}`;
  }
  const ns = message.authority?.filter((record) => record.type === 'NS') ?? [];
  if (ns.length > 0) {
    const glue = (message.additional ?? []).map((record) => `${record.name} = ${record.address}`);
    return (
      head +
      t(
        `referral: ask ${ns[0]?.name} at ${ns.map((record) => record.address).join(', ')} (${glue.join(', ')})`,
        `委任：${ns[0]?.name} は ${ns.map((record) => record.address).join(', ')} に聞く（${glue.join(', ')}）`,
      )
    );
  }
  return head + t('no data of that type', 'その種類のデータはない');
}
