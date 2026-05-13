import { describe, expect, it } from 'vitest';
import { Dhcpv6Server } from './Dhcpv6Server';
import { Dhcpv6Client } from './Dhcpv6Client';

describe('DHCPv6 server/client', () => {
  it('performs a deterministic Solicit/Advertise/Request/Reply exchange', () => {
    const server = new Dhcpv6Server({
      serverDuid: 'server-1',
      pool: { start: '2001:db8:10::100', end: '2001:db8:10::10f' },
      dnsServers: ['2001:db8::53'],
    });
    const client = new Dhcpv6Client({ macAddress: '02:00:00:00:00:0a', seed: 7 });

    const solicit = client.buildSolicit();
    const advertise = server.handle(solicit);
    const request = client.handleAdvertise(advertise);
    const reply = server.handle(request);
    const lease = client.handleReply(reply);

    expect(lease).toMatchObject({
      address: expect.stringMatching(/^2001:db8:10::10/),
      dnsServers: ['2001:db8::53'],
      status: 'bound',
    });
    expect(server.handle(client.buildSolicit()).options.iaNa?.addresses[0]?.address).toBe(
      lease.address,
    );
  });
});
