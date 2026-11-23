/**
 * The cloud-network (VPC) lesson (REQ-374): a VPC's parts — subnets, route
 * tables, an internet gateway, a NAT gateway, a security group — as devices
 * of the simulator, and four connections whose fate the learner predicts.
 */
import type { InFlightPacket } from '../../src/types/packets';
import type { PacketTrace } from '../../src/types/simulation';
import type { NetworkTopology } from '../../src/types/topology';

export const PUBLIC_IP = '198.51.100.1';
export const USER_IP = '198.51.100.20';

const ports = (count: number, group: number) =>
  Array.from({ length: count }, (_, index) => ({
    id: `p${index}`,
    name: `fa0/${index}`,
    macAddress: `02:00:00:0${group}:00:0${index}`,
  }));

/**
 * The VPC 10.0.0.0/16: a public subnet (web, NAT gateway) and a private one
 * (db). The internet gateway maps the public address's port 80 to web and,
 * as its security group, lets in only TCP 80. The subnets are labelled in
 * `locale`, short enough for a switch's box.
 */
export function vpcTopology(locale: 'en' | 'ja' = 'en'): NetworkTopology {
  const ja = locale === 'ja';
  return {
    nodes: [
      {
        id: 'user',
        type: 'client',
        position: { x: 40, y: 200 },
        data: {
          label: ja ? '利用者' : 'user',
          role: 'client',
          layerId: 'l7',
          ip: USER_IP,
          mac: '02:00:00:00:00:20',
        },
      },
      {
        id: 'igw',
        type: 'router',
        position: { x: 230, y: 200 },
        data: {
          label: 'internet GW',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'out',
              name: 'out',
              ipAddress: PUBLIC_IP,
              prefixLength: 24,
              macAddress: '02:00:00:00:01:01',
              nat: 'outside',
              // The security group: from the internet, only TCP 80 comes in.
              inboundAcl: [
                {
                  id: 'sg-http',
                  priority: 10,
                  action: 'permit',
                  protocol: 'tcp',
                  dstPort: 80,
                  description: 'HTTP',
                },
                {
                  id: 'sg-rest',
                  priority: 100,
                  action: 'deny',
                  protocol: 'any',
                  description: 'everything else',
                },
              ],
            },
            {
              id: 'in',
              name: 'in',
              ipAddress: '10.0.1.1',
              prefixLength: 24,
              macAddress: '02:00:00:00:01:02',
              nat: 'inside',
            },
          ],
          // The public address belongs to web: its ports 80 and 22 lead there. Whether
          // they get in is the security group's call.
          portForwardingRules: [
            { proto: 'tcp', externalPort: 80, internalIp: '10.0.1.10', internalPort: 80 },
            { proto: 'tcp', externalPort: 22, internalIp: '10.0.1.10', internalPort: 22 },
          ],
          staticRoutes: [{ destination: '10.0.2.0/24', nextHop: '10.0.1.30' }],
        },
      },
      {
        id: 'sw-public',
        type: 'switch',
        position: { x: 420, y: 200 },
        data: {
          label: ja ? '公開' : 'public',
          role: 'switch',
          layerId: 'l2',
          ports: ports(3, 1),
        },
      },
      {
        id: 'web',
        type: 'server',
        position: { x: 600, y: 90 },
        data: {
          label: 'web',
          role: 'server',
          layerId: 'l7',
          ip: '10.0.1.10',
          mac: '02:00:00:00:02:10',
        },
      },
      {
        id: 'natgw',
        type: 'router',
        position: { x: 600, y: 290 },
        data: {
          label: 'NAT GW',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'pub',
              name: 'pub',
              ipAddress: '10.0.1.30',
              prefixLength: 24,
              macAddress: '02:00:00:00:03:01',
              nat: 'outside',
            },
            {
              id: 'priv',
              name: 'priv',
              ipAddress: '10.0.2.1',
              prefixLength: 24,
              macAddress: '02:00:00:00:03:02',
              nat: 'inside',
            },
          ],
          // The private subnet's route table: everything else goes out through the gateway.
          staticRoutes: [{ destination: '0.0.0.0/0', nextHop: '10.0.1.1' }],
        },
      },
      {
        id: 'sw-private',
        type: 'switch',
        position: { x: 780, y: 290 },
        data: {
          label: ja ? '非公開' : 'private',
          role: 'switch',
          layerId: 'l2',
          ports: ports(2, 2),
        },
      },
      {
        id: 'db',
        type: 'server',
        position: { x: 940, y: 290 },
        data: {
          label: 'db',
          role: 'server',
          layerId: 'l7',
          ip: '10.0.2.10',
          mac: '02:00:00:00:04:10',
        },
      },
    ],
    edges: [
      { id: 'e-user', source: 'user', target: 'igw', targetHandle: 'out' },
      { id: 'e-igw', source: 'igw', target: 'sw-public', sourceHandle: 'in', targetHandle: 'p0' },
      { id: 'e-web', source: 'sw-public', target: 'web', sourceHandle: 'p1' },
      {
        id: 'e-natgw',
        source: 'sw-public',
        target: 'natgw',
        sourceHandle: 'p2',
        targetHandle: 'pub',
      },
      {
        id: 'e-private',
        source: 'natgw',
        target: 'sw-private',
        sourceHandle: 'priv',
        targetHandle: 'p0',
      },
      { id: 'e-db', source: 'sw-private', target: 'db', sourceHandle: 'p1' },
    ],
    areas: [],
    routeTables: new Map(),
  } as NetworkTopology;
}

export type VpcCaseId = 'web-in' | 'db-out' | 'db-in' | 'ssh-in';

export interface VpcCase {
  readonly id: VpcCaseId;
  readonly from: string;
  readonly fromIp: string;
  readonly to: string;
  readonly toIp: string;
  readonly port: number;
  readonly situation: { readonly en: string; readonly ja: string };
  readonly arrives: boolean;
  readonly explain: { readonly en: string; readonly ja: string };
}

export const VPC_CASES: readonly VpcCase[] = [
  {
    id: 'web-in',
    from: 'user',
    fromIp: USER_IP,
    to: 'web',
    toIp: PUBLIC_IP,
    port: 80,
    situation: {
      en: 'An internet user opens http://198.51.100.1/ — web’s public address.',
      ja: 'インターネットの利用者が http://198.51.100.1/（web の公開アドレス）を開きます。',
    },
    arrives: true,
    explain: {
      en: 'The security group lets TCP 80 in, and the internet gateway maps the public address to web’s private one, 10.0.1.10. In a cloud this is the instance’s public (elastic) IP.',
      ja: 'セキュリティグループが TCP 80 を通し、インターネットゲートウェイが公開アドレスを web のプライベートアドレス 10.0.1.10 に書き換えます。クラウドでは、インスタンスの公開 IP（Elastic IP）にあたります。',
    },
  },
  {
    id: 'db-out',
    from: 'db',
    fromIp: '10.0.2.10',
    to: 'user',
    toIp: USER_IP,
    port: 443,
    situation: {
      en: 'db, in the private subnet, connects out to the internet (for an update).',
      ja: '非公開サブネットの db が、インターネットへ接続します（更新を取りにいく）。',
    },
    arrives: true,
    explain: {
      en: 'The private subnet’s route table sends it to the NAT gateway, which puts its own address on it; the internet gateway then puts the public one. The reply can come back, but nobody outside can start a connection to db. Here one gateway address, 198.51.100.1, is shared by everything going out; in a cloud the NAT gateway has its own public (elastic) IP, separate from web’s.',
      ja: '非公開サブネットのルートテーブルが NAT ゲートウェイへ送り、NAT ゲートウェイが自分のアドレスに、インターネットゲートウェイが公開アドレスに書き換えます。返事は戻れますが、外から db に接続を始めることはできません。ここでは外へ出る通信がすべてゲートウェイの 1 つのアドレス 198.51.100.1 を共有していますが、クラウドでは NAT ゲートウェイが web とは別の、自分専用の公開 IP（Elastic IP）を持ちます。',
    },
  },
  {
    id: 'db-in',
    from: 'user',
    fromIp: USER_IP,
    to: 'db',
    toIp: '10.0.2.10',
    port: 80,
    situation: {
      en: 'An internet user tries to connect straight to db at 10.0.2.10, on port 80 (which the security group allows).',
      ja: 'インターネットの利用者が、db（10.0.2.10）の 80 番（セキュリティグループが通す番号）に直接つなごうとします。',
    },
    arrives: false,
    explain: {
      en: 'A private address has no mapping at the internet gateway, so nothing comes in (on the real internet, 10.0.0.0/8 is not even routed). That is what “private subnet” means.',
      ja: 'プライベートアドレスにはインターネットゲートウェイの対応づけがないので、入れません（本物のインターネットでは、10.0.0.0/8 はそもそも経路に載りません）。これが「非公開サブネット」の意味です。',
    },
  },
  {
    id: 'ssh-in',
    from: 'user',
    fromIp: USER_IP,
    to: 'web',
    toIp: PUBLIC_IP,
    port: 22,
    situation: {
      en: 'An internet user tries SSH (TCP 22) to web’s public address.',
      ja: 'インターネットの利用者が、web の公開アドレスに SSH（TCP 22）でつなごうとします。',
    },
    arrives: false,
    explain: {
      en: 'The public address does lead to web on port 22, but the security group lets in only TCP 80, so TCP 22 is stopped before it reaches web. Open SSH only to an administrator’s address, never to everyone.',
      ja: '公開アドレスの 22 番も web へつながってはいますが、セキュリティグループが通すのは TCP 80 だけなので、TCP 22 は web に届く前に止められます。SSH を開けるなら管理者のアドレスだけにし、全員には開けません。',
    },
  },
];

/** A TCP SYN for one situation. */
export function vpcSyn(situation: VpcCase): InFlightPacket {
  return {
    id: `vpc-${situation.id}-${Date.now()}`,
    srcNodeId: situation.from,
    dstNodeId: situation.to,
    currentDeviceId: situation.from,
    ingressPortId: '',
    path: [],
    timestamp: Date.now(),
    frame: {
      layer: 'L2',
      srcMac: '02:00:00:00:00:99',
      dstMac: '00:00:00:00:00:00',
      etherType: 0x0800,
      payload: {
        layer: 'L3',
        srcIp: situation.fromIp,
        dstIp: situation.toIp,
        ttl: 64,
        protocol: 6,
        payload: {
          layer: 'L4',
          srcPort: 40000,
          dstPort: situation.port,
          seq: 0,
          ack: 0,
          flags: { syn: true, ack: false, fin: false, rst: false, psh: false, urg: false },
          payload: { layer: 'raw', data: '' },
        },
      },
    },
  } as InFlightPacket;
}

/** What happened to a situation's packet: where it ended, and each address rewrite on the way. */
export function readVpcTrace(trace: PacketTrace) {
  const last = trace.hops[trace.hops.length - 1];
  return {
    arrived: trace.status === 'delivered',
    endedAt: last?.nodeLabel ?? '',
    reason: last?.event === 'drop' ? (last.reason ?? '') : null,
    rewrites: trace.hops.flatMap((hop) =>
      hop.natTranslation
        ? [
            hop.natTranslation.type === 'dnat'
              ? `${hop.nodeLabel}: ${hop.natTranslation.preDstIp} → ${hop.natTranslation.postDstIp}`
              : `${hop.nodeLabel}: ${hop.natTranslation.preSrcIp} → ${hop.natTranslation.postSrcIp}`,
          ]
        : [],
    ),
  };
}
