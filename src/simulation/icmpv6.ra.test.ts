import { describe, expect, it } from 'vitest';
import { applyRouterAdvertisement, buildRouterAdvertisement } from './icmpv6';

describe('ICMPv6 Router Advertisement M/O flags', () => {
  it('routes clients through managed, other-config, and pure SLAAC states', () => {
    expect(
      applyRouterAdvertisement(
        buildRouterAdvertisement({ prefix: '2001:db8:30::/64', managed: true, otherConfig: false }),
        '02:00:00:00:00:0a',
      ),
    ).toMatchObject({
      mode: 'dhcpv6-address',
      needsDhcpv6Address: true,
    });
    expect(
      applyRouterAdvertisement(
        buildRouterAdvertisement({ prefix: '2001:db8:30::/64', managed: false, otherConfig: true }),
        '02:00:00:00:00:0a',
      ),
    ).toMatchObject({
      mode: 'slaac-with-dhcpv6-other',
      needsDhcpv6Address: false,
      needsDhcpv6OtherConfig: true,
    });
    expect(
      applyRouterAdvertisement(
        buildRouterAdvertisement({
          prefix: '2001:db8:30::/64',
          managed: false,
          otherConfig: false,
        }),
        '02:00:00:00:00:0a',
      ),
    ).toMatchObject({
      mode: 'slaac-only',
      needsDhcpv6OtherConfig: false,
    });
  });
});
