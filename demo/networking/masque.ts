/**
 * The MASQUE lesson (REQ-379): a request to a site sent directly, through one
 * CONNECT-UDP proxy, or through two (an ingress and an egress relay, as in
 * iCloud Private Relay). The client wraps the request once per proxy, each
 * wrapping sealed to that proxy and naming the next hop; who learns what is
 * read from those wrappings, not written by hand.
 */
export type Setup = 'direct' | 'one-proxy' | 'two-hop';
export type Party = 'wifi' | 'relay1' | 'relay2' | 'site';
export type Fact = 'clientIp' | 'site' | 'content';

export const SETUPS: readonly Setup[] = ['direct', 'one-proxy', 'two-hop'];
export const FACTS: readonly Fact[] = ['clientIp', 'site', 'content'];

export const ADDRESS = {
  client: '192.0.2.10',
  relay1: '198.51.100.7',
  relay2: '203.0.113.9',
  site: '203.0.113.80',
} as const;
export const SITE_NAME = 'news.example';

type Node = 'client' | 'relay1' | 'relay2' | 'site';

/** One layer: sealed to `key`, naming where its contents go next. */
export interface Layer {
  readonly key: Node;
  /** What the layer's opener is asked to do: forward to this hop, or (at the site) serve the request. */
  readonly next: Node | 'request';
  readonly inner: Layer | null;
}

/** The hops a packet takes, client first. */
export function path(setup: Setup): Node[] {
  if (setup === 'direct') return ['client', 'site'];
  if (setup === 'one-proxy') return ['client', 'relay2', 'site'];
  return ['client', 'relay1', 'relay2', 'site'];
}

/** What the client sends: one layer per proxy around the end-to-end QUIC to the site. */
export function wrap(setup: Setup): Layer {
  const hops = path(setup).slice(1);
  let layer: Layer = { key: 'site', next: 'request', inner: null };
  for (let index = hops.length - 2; index >= 0; index--) {
    layer = { key: hops[index]!, next: hops[index + 1]!, inner: layer };
  }
  return layer;
}

export interface Segment {
  readonly from: Node;
  readonly to: Node;
  readonly srcIp: string;
  readonly dstIp: string;
  /** The layer this segment carries. */
  readonly layer: Layer;
}

/** The packets on each stretch of the path: every hop sends from its own address. */
export function segments(setup: Setup): Segment[] {
  const hops = path(setup);
  const out: Segment[] = [];
  let layer: Layer | null = wrap(setup);
  for (let index = 0; index + 1 < hops.length && layer; index++) {
    const from = hops[index]!;
    const to = hops[index + 1]!;
    out.push({ from, to, srcIp: ADDRESS[from], dstIp: ADDRESS[to], layer });
    // The receiver opens its own layer and sends on what is inside.
    if (layer.key === to) layer = layer.inner ?? layer;
  }
  return out;
}

const siteIs = (node: Node | 'request') => node === 'site';

/**
 * What a party learns. It sees the address header of every segment it is on
 * (the Wi-Fi sees the first); it reads inside a layer only if sealed to it.
 */
export function knows(setup: Setup, party: Party): Record<Fact, boolean> {
  if (party !== 'wifi' && !path(setup).includes(party)) {
    return { clientIp: false, site: false, content: false };
  }
  const seen = segments(setup).filter((segment) =>
    party === 'wifi' ? segment.from === 'client' : segment.to === party || segment.from === party,
  );
  const opened = seen.flatMap((segment) => (segment.layer.key === party ? [segment.layer] : []));
  return {
    clientIp: seen.some((segment) => segment.srcIp === ADDRESS.client),
    site:
      party === 'site' ||
      seen.some((segment) => segment.dstIp === ADDRESS.site) ||
      opened.some((layer) => siteIs(layer.next)),
    content: opened.some((layer) => layer.next === 'request'),
  };
}

/** Whether anyone but the client knows both who is asking and which site. */
export function anyoneLinks(setup: Setup): Party | null {
  const parties: Party[] = ['wifi', 'relay1', 'relay2'];
  return (
    parties.find((party) => {
      const known = knows(setup, party);
      return known.clientIp && known.site;
    }) ?? null
  );
}
