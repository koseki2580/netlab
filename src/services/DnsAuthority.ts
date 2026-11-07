/** What a DNS server with records answers from its own data (RFC 1034 §4.3.2). */
import type { DnsMessage, DnsQuestion, DnsRecord } from '../types/packets';
import type { DnsServerConfig } from '../types/services';

/** Lower case, no trailing dot; the root is ''. */
export const normaliseName = (name: string) => name.toLowerCase().replace(/\.$/, '');

/** Whether `name` is `zone` or below it. */
export function isWithin(name: string, zone: string): boolean {
  return zone === '' || name === zone || name.endsWith(`.${zone}`);
}

const LEGACY_TTL = 300;

/**
 * What a server answers from its own data, with no help from anyone (RFC 1034
 * §4.3.2): the records asked for (and a CNAME's target where it holds it); a
 * referral to the closest delegation it knows, with glue; or, for a name in a
 * zone it is authoritative for (it holds the zone's SOA), NXDOMAIN or NODATA
 * with that SOA. Null: the name is nothing to this server.
 */
export function answerAuthoritatively(
  config: DnsServerConfig,
  question: DnsQuestion,
  transactionId: number,
): DnsMessage | null {
  const name = normaliseName(question.name);
  const base = {
    layer: 'L7' as const,
    transactionId,
    isResponse: true,
    questions: [question],
  };

  // The earlier, A-only list: answered as it always was.
  if (!config.records) {
    const record = config.zones.find((zone) => normaliseName(zone.name) === name);
    if (record) {
      return {
        ...base,
        answers: [{ name: record.name, type: 'A', ttl: LEGACY_TTL, address: record.address }],
      };
    }
    // RFC 1035 §4.1.1: a name that does not exist is answered, not ignored. No SOA,
    // so nobody may cache it (RFC 2308 §5).
    return config.zones.length > 0 ? { ...base, answers: [], rcode: 3 } : null;
  }

  const records = config.records;
  const owned = (owner: string) => records.filter((record) => normaliseName(record.name) === owner);
  const longest = (type: DnsRecord['type']) =>
    records
      .filter((record) => record.type === type && isWithin(name, normaliseName(record.name)))
      .map((record) => normaliseName(record.name))
      .sort((left, right) => right.length - left.length)[0];
  const apex = longest('SOA');
  const cut = records
    .filter(
      (record) =>
        record.type === 'NS' &&
        isWithin(name, normaliseName(record.name)) &&
        normaliseName(record.name) !== apex &&
        (apex === undefined || isWithin(normaliseName(record.name), apex)),
    )
    .map((record) => normaliseName(record.name))
    .sort((left, right) => right.length - left.length)[0];

  if (cut !== undefined) {
    const ns = owned(cut).filter((record) => record.type === 'NS');
    const glue = ns.flatMap((record) =>
      owned(normaliseName(record.address)).filter(
        (entry) => entry.type === 'A' || entry.type === 'AAAA',
      ),
    );
    return {
      ...base,
      answers: [],
      authority: ns,
      additional: glue,
      rcode: 0,
      authoritative: false,
      recursionDesired: false,
      recursionAvailable: false,
    };
  }

  const authoritative = apex !== undefined;
  const flags = { authoritative, recursionDesired: false, recursionAvailable: false };
  const here = owned(name);
  const matching = here.filter((record) => record.type === question.type);
  const cname = here.find((record) => record.type === 'CNAME');
  if (matching.length > 0) return { ...base, answers: matching, rcode: 0, ...flags };
  if (cname && question.type !== 'CNAME') {
    const target = owned(normaliseName(cname.address)).filter(
      (record) => record.type === question.type,
    );
    return { ...base, answers: [cname, ...target], rcode: 0, ...flags };
  }
  if (!authoritative) return null;
  const soa = owned(apex).filter((record) => record.type === 'SOA');
  return { ...base, answers: [], authority: soa, rcode: here.length > 0 ? 0 : 3, ...flags };
}
