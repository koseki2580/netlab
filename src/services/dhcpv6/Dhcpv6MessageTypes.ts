export const DHCPV6_MESSAGE_TYPE = {
  SOLICIT: 'Solicit',
  ADVERTISE: 'Advertise',
  REQUEST: 'Request',
  REPLY: 'Reply',
  INFORMATION_REQUEST: 'InformationRequest',
} as const;

export type Dhcpv6MessageType = (typeof DHCPV6_MESSAGE_TYPE)[keyof typeof DHCPV6_MESSAGE_TYPE];

export interface Dhcpv6IaAddress {
  readonly address: string;
  readonly preferredLifetimeSec: number;
  readonly validLifetimeSec: number;
}

export interface Dhcpv6IaNa {
  readonly iaid: number;
  readonly t1Sec: number;
  readonly t2Sec: number;
  readonly addresses: readonly Dhcpv6IaAddress[];
}

export interface Dhcpv6Message {
  readonly msgType: Dhcpv6MessageType;
  readonly txid: number;
  readonly clientDuid?: string;
  readonly serverDuid?: string;
  readonly options: {
    readonly iaNa?: Dhcpv6IaNa;
    readonly dnsServers?: readonly string[];
    readonly statusCode?: 'Success' | 'NoAddrsAvail';
    readonly oro?: readonly number[];
  };
}

export interface Dhcpv6Lease {
  readonly status: 'bound';
  readonly address: string;
  readonly preferredLifetimeSec: number;
  readonly validLifetimeSec: number;
  readonly dnsServers: readonly string[];
}
