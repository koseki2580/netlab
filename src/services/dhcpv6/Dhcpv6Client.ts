import { buildDuidLl } from './Dhcpv6Options';
import type { Dhcpv6Lease, Dhcpv6Message } from './Dhcpv6MessageTypes';
import { DHCPV6_MESSAGE_TYPE } from './Dhcpv6MessageTypes';
import { getRequired } from '../../utils/typedAccess';

export interface Dhcpv6ClientConfig {
  readonly macAddress: string;
  readonly seed: number;
}

export class Dhcpv6Client {
  private readonly duid: string;
  private readonly txid: number;

  constructor(config: Dhcpv6ClientConfig) {
    this.duid = buildDuidLl(config.macAddress);
    this.txid = config.seed & 0xffffff;
  }

  buildSolicit(): Dhcpv6Message {
    return {
      msgType: DHCPV6_MESSAGE_TYPE.SOLICIT,
      txid: this.txid,
      clientDuid: this.duid,
      options: { oro: [23] },
    };
  }

  handleAdvertise(advertise: Dhcpv6Message): Dhcpv6Message {
    if (advertise.msgType !== DHCPV6_MESSAGE_TYPE.ADVERTISE || advertise.txid !== this.txid) {
      throw new RangeError('DHCPv6 client received an invalid Advertise');
    }
    return {
      msgType: DHCPV6_MESSAGE_TYPE.REQUEST,
      txid: this.txid,
      clientDuid: this.duid,
      ...(advertise.serverDuid !== undefined ? { serverDuid: advertise.serverDuid } : {}),
      options: advertise.options,
    };
  }

  handleReply(reply: Dhcpv6Message): Dhcpv6Lease {
    if (reply.msgType !== DHCPV6_MESSAGE_TYPE.REPLY || reply.txid !== this.txid) {
      throw new RangeError('DHCPv6 client received an invalid Reply');
    }
    if (reply.options.statusCode !== 'Success' || !reply.options.iaNa) {
      throw new RangeError('DHCPv6 server did not provide an address');
    }
    const address = getRequired(reply.options.iaNa.addresses, 0, { field: 'iaNa.addresses' });
    return {
      status: 'bound',
      address: address.address,
      preferredLifetimeSec: address.preferredLifetimeSec,
      validLifetimeSec: address.validLifetimeSec,
      dnsServers: reply.options.dnsServers ?? [],
    };
  }
}
