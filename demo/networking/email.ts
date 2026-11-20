/**
 * The email lesson (REQ-408): how a message reaches the recipient's domain
 * (MX lookup, lowest preference first, RFC 5321) and how the receiver decides
 * whether the sender is who the From: header says (SPF RFC 7208, DKIM
 * RFC 6376, DMARC RFC 9989, which obsoletes RFC 7489).
 *
 * Simplified:
 * - DKIM signatures are not computed. A signature "verifies" unless the
 *   message was changed after signing (`bodyChanged`), which is what breaks
 *   the real body hash. No keys are looked up.
 * - SPF records hold only `ip4:` terms and end in `-all` or `~all`.
 * - The organisational domain is the last two labels of a name; real
 *   receivers use RFC 9989's DNS tree walk or the older Public Suffix List.
 * - Alignment is relaxed (the DMARC default): the organisational domains
 *   must match, not the full names.
 * - MX hosts with equal preference keep their listed order; RFC 5321 asks
 *   senders to pick among them at random.
 */

/* ---------------- Part 1: MX lookup and the SMTP dialogue ---------------- */

export interface MxRecord {
  readonly preference: number;
  readonly host: string;
}

/** example.org's MX records, as a DNS answer may list them (in any order). */
export const MX_RECORDS: readonly MxRecord[] = [
  { preference: 20, host: 'mx2.example.org' },
  { preference: 10, host: 'mx1.example.org' },
];

/** The order a sender tries MX hosts in: lowest preference first. */
export function deliveryOrder(records: readonly MxRecord[]): MxRecord[] {
  return [...records].sort((a, b) => a.preference - b.preference);
}

export interface Attempt {
  readonly host: string;
  readonly preference: number;
  readonly answered: boolean;
}

export interface Delivery {
  readonly attempts: readonly Attempt[];
  /** The host that accepted the connection, or null when every host was down. */
  readonly deliveredTo: string | null;
}

/** Try the MX hosts in order, skipping the ones that are down, until one answers. */
export function deliver(records: readonly MxRecord[], down: ReadonlySet<string>): Delivery {
  const attempts: Attempt[] = [];
  for (const record of deliveryOrder(records)) {
    const answered = !down.has(record.host);
    attempts.push({ host: record.host, preference: record.preference, answered });
    if (answered) return { attempts, deliveredTo: record.host };
  }
  return { attempts, deliveredTo: null };
}

export interface SmtpLine {
  readonly from: 'server' | 'client';
  readonly text: string;
  /** The reply code of a server line. */
  readonly code?: number;
}

export interface Envelope {
  readonly clientHost: string;
  readonly mailFrom: string;
  readonly rcptTo: string;
  readonly headerFrom: string;
  readonly subject: string;
  readonly body: string;
}

export const ENVELOPE: Envelope = {
  clientHost: 'mail.example.com',
  mailFrom: 'alice@example.com',
  rcptTo: 'bob@example.org',
  headerFrom: 'Alice <alice@example.com>',
  subject: 'Lunch?',
  body: 'See you at noon.',
};

/** The dialogue between the sending server and `serverHost`, ending in QUIT. */
export function smtpTranscript(serverHost: string, envelope: Envelope): SmtpLine[] {
  const s = (code: number, text: string, last = true): SmtpLine => ({
    from: 'server',
    code,
    text: `${code}${last ? ' ' : '-'}${text}`,
  });
  const c = (text: string): SmtpLine => ({ from: 'client', text });
  const recipientDomain = envelope.rcptTo.split('@')[1] ?? '';
  return [
    s(220, `${serverHost} ESMTP`),
    c(`EHLO ${envelope.clientHost}`),
    s(250, serverHost, false),
    s(250, 'STARTTLS'),
    c('STARTTLS'),
    s(220, 'Ready to start TLS'),
    // After the TLS handshake the client starts over with a fresh EHLO (RFC 3207).
    c(`EHLO ${envelope.clientHost}`),
    s(250, serverHost),
    c(`MAIL FROM:<${envelope.mailFrom}>`),
    s(250, 'OK'),
    c(`RCPT TO:<${envelope.rcptTo}>`),
    s(250, `OK, accepted for ${recipientDomain}`),
    c('DATA'),
    s(354, 'End data with <CR><LF>.<CR><LF>'),
    c(`From: ${envelope.headerFrom}`),
    c(`To: ${envelope.rcptTo}`),
    c(`Subject: ${envelope.subject}`),
    c(''),
    c(envelope.body),
    c('.'),
    s(250, 'OK, queued'),
    c('QUIT'),
    s(221, 'Bye'),
  ];
}

/* ---------------- Part 2: SPF, DKIM and DMARC ---------------- */

export type DmarcPolicy = 'none' | 'quarantine' | 'reject';

export interface DnsData {
  /** TXT records at each domain starting "v=spf1". */
  readonly spf: Readonly<Record<string, string>>;
  /** The p= of the DMARC record at _dmarc.<domain>. */
  readonly dmarc: Readonly<Record<string, DmarcPolicy>>;
}

export function dnsData(exampleComPolicy: DmarcPolicy): DnsData {
  return {
    spf: {
      'example.com': 'v=spf1 ip4:192.0.2.0/24 -all',
      'lists.example.net': 'v=spf1 ip4:198.51.100.0/24 -all',
      'other.example': 'v=spf1 ip4:203.0.113.64/26 -all',
    },
    dmarc: { 'example.com': exampleComPolicy },
  };
}

export type CaseId = 'direct' | 'list' | 'forwarded' | 'forged';
export const CASES: readonly CaseId[] = ['direct', 'list', 'forwarded', 'forged'];

export interface Message {
  /** The IP address of the server that connected to the receiver. */
  readonly connectingIp: string;
  /** The domain of MAIL FROM (the envelope sender, where bounces go). */
  readonly mailFromDomain: string;
  /** The domain of the From: header, the address the reader sees. */
  readonly headerFromDomain: string;
  /** The DKIM signature, if any: its d= domain and whether the message changed after signing. */
  readonly dkim: { readonly d: string; readonly bodyChanged: boolean } | null;
}

export const MESSAGES: Readonly<Record<CaseId, Message>> = {
  // Alice's own server sends straight to the receiver.
  direct: {
    connectingIp: '192.0.2.10',
    mailFromDomain: 'example.com',
    headerFromDomain: 'example.com',
    dkim: { d: 'mail.example.com', bodyChanged: false },
  },
  // A mailing list resends Alice's post with its own bounce address, a subject tag and a footer.
  list: {
    connectingIp: '198.51.100.20',
    mailFromDomain: 'lists.example.net',
    headerFromDomain: 'example.com',
    dkim: { d: 'mail.example.com', bodyChanged: true },
  },
  // Bob's old address forwards everything unchanged, keeping Alice's MAIL FROM.
  forwarded: {
    connectingIp: '203.0.113.5',
    mailFromDomain: 'example.com',
    headerFromDomain: 'example.com',
    dkim: { d: 'mail.example.com', bodyChanged: false },
  },
  // Someone else's server puts example.com in the From: header.
  forged: {
    connectingIp: '203.0.113.66',
    mailFromDomain: 'other.example',
    headerFromDomain: 'example.com',
    dkim: null,
  },
};

const ipToNumber = (ip: string) =>
  ip.split('.').reduce((total, octet) => total * 256 + Number(octet), 0);

/** Whether `ip` is inside `cidr` (a.b.c.d/len). */
export function inCidr(ip: string, cidr: string): boolean {
  const [network = '', lengthText = '32'] = cidr.split('/');
  const size = 2 ** (32 - Number(lengthText));
  return Math.floor(ipToNumber(ip) / size) === Math.floor(ipToNumber(network) / size);
}

export type SpfResult = 'pass' | 'fail' | 'softfail' | 'none';

/** SPF: is the connecting IP listed by the MAIL FROM domain? */
export function checkSpf(message: Message, dns: DnsData): SpfResult {
  const record = dns.spf[message.mailFromDomain];
  if (!record) return 'none';
  const terms = record.split(/\s+/).slice(1);
  for (const term of terms) {
    if (term.startsWith('ip4:') && inCidr(message.connectingIp, term.slice(4))) return 'pass';
  }
  return terms.includes('~all') ? 'softfail' : 'fail';
}

export type DkimResult = 'pass' | 'fail' | 'none';

/** DKIM, with a stand-in for the cryptography: any change after signing breaks it. */
export function checkDkim(message: Message): DkimResult {
  if (!message.dkim) return 'none';
  return message.dkim.bodyChanged ? 'fail' : 'pass';
}

/** The organisational domain, simplified to the last two labels. */
export function organisationalDomain(domain: string): string {
  return domain.split('.').slice(-2).join('.');
}

/** Relaxed alignment: same organisational domain. */
export function aligned(domain: string, headerFromDomain: string): boolean {
  return organisationalDomain(domain) === organisationalDomain(headerFromDomain);
}

export type Action = 'deliver' | 'quarantine' | 'reject';

export interface Verdict {
  readonly spf: SpfResult;
  readonly spfAligned: boolean;
  readonly dkim: DkimResult;
  readonly dkimAligned: boolean;
  /** 'none' when the From: domain publishes no DMARC record. */
  readonly dmarc: 'pass' | 'fail' | 'none';
  readonly policy: DmarcPolicy | null;
  readonly action: Action;
}

/** What the receiver concludes about a message, and what it does with it. */
export function evaluate(message: Message, dns: DnsData): Verdict {
  const spf = checkSpf(message, dns);
  const dkim = checkDkim(message);
  const spfAligned = spf === 'pass' && aligned(message.mailFromDomain, message.headerFromDomain);
  const dkimAligned =
    dkim === 'pass' && message.dkim !== null && aligned(message.dkim.d, message.headerFromDomain);
  // The record is looked up at the From: domain, then at its organisational domain.
  const policy =
    dns.dmarc[message.headerFromDomain] ??
    dns.dmarc[organisationalDomain(message.headerFromDomain)] ??
    null;
  if (policy === null) {
    return { spf, spfAligned, dkim, dkimAligned, dmarc: 'none', policy, action: 'deliver' };
  }
  const dmarc = spfAligned || dkimAligned ? 'pass' : 'fail';
  const action: Action = dmarc === 'pass' || policy === 'none' ? 'deliver' : policy;
  return { spf, spfAligned, dkim, dkimAligned, dmarc, policy, action };
}
