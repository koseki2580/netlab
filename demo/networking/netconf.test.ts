/** REQ-400 — NETCONF/YANG: candidate, validate, commit vs a CLI script (TC-2040..TC-2046). */
import { describe, expect, it } from 'vitest';
import {
  cliPush,
  confirmedCommit,
  editConfigXml,
  netconfPush,
  pushAll,
  startingDevices,
  uplinkChange,
  type Change,
} from './netconf';

const r2 = () => startingDevices()[1]!.running;
const one = (change: Change) => netconfPush(r2(), [change]);

describe('TC-2040: the schema rejects values by type, range and key', () => {
  it('MTU must be an integer from 68 to 9216', () => {
    expect(one({ iface: 'eth1', leaf: 'mtu', value: '68' }).committed).toBe(true);
    expect(one({ iface: 'eth1', leaf: 'mtu', value: '9216' }).committed).toBe(true);
    expect(one({ iface: 'eth1', leaf: 'mtu', value: '67' }).errors[0]?.code).toBe('out-of-range');
    expect(one({ iface: 'eth1', leaf: 'mtu', value: '10000' }).errors).toEqual([
      {
        code: 'out-of-range',
        tag: 'invalid-value',
        path: "/interfaces/interface[name='eth1']/ipv4/mtu",
        index: 0,
      },
    ]);
    expect(one({ iface: 'eth1', leaf: 'mtu', value: 'jumbo' }).errors[0]?.code).toBe(
      'not-a-number',
    );
  });
  it('an address needs four octets and a prefix length up to 32, and must not exist yet', () => {
    expect(one({ iface: 'eth1', leaf: 'address', value: '10.1.2.300/24' }).errors[0]?.code).toBe(
      'bad-address',
    );
    expect(one({ iface: 'eth1', leaf: 'address', value: '10.1.2.1/33' }).errors[0]?.code).toBe(
      'prefix-out-of-range',
    );
    expect(one({ iface: 'eth1', leaf: 'address', value: '10.0.2.1/24' }).errors[0]).toEqual({
      code: 'duplicate-address',
      tag: 'data-exists',
      path: "/interfaces/interface[name='eth1']/ipv4/address[ip='10.0.2.1']",
      index: 0,
    });
  });
  it('enabled is a boolean, and the interface must exist', () => {
    expect(one({ iface: 'eth1', leaf: 'enabled', value: 'yes' }).errors[0]?.code).toBe(
      'not-boolean',
    );
    expect(one({ iface: 'eth9', leaf: 'mtu', value: '9000' }).errors[0]?.tag).toBe('data-missing');
  });
});

describe('TC-2041: one invalid value means nothing is committed on that router', () => {
  it('the candidate held the description and the address, but running is unchanged', () => {
    const result = netconfPush(r2(), uplinkChange('uplink to core', '10.1.2.1/24', '10000'));
    expect(result.committed).toBe(false);
    expect(result.errors.map((error) => error.index)).toEqual([2]);
    expect(result.candidate.eth1?.description).toBe('uplink to core');
    expect(result.candidate.eth1?.addresses).toHaveLength(2);
    expect(result.running).toEqual(r2());
  });
});

describe('TC-2042: a valid change set is committed in full', () => {
  it('description, second address and MTU 9000 all reach running together', () => {
    const result = netconfPush(r2(), uplinkChange('uplink to core', '10.1.2.1/24', '9000'));
    expect(result.committed).toBe(true);
    expect(result.running.eth1).toEqual({
      name: 'eth1',
      description: 'uplink to core',
      enabled: true,
      mtu: 9000,
      addresses: [
        { ip: '10.0.2.1', prefixLength: 24 },
        { ip: '10.1.2.1', prefixLength: 24 },
      ],
    });
  });
});

describe('TC-2043: a CLI script leaves the lines before the error applied', () => {
  it('the description and the address stay; the MTU line is rejected; the router is half-configured', () => {
    const result = cliPush(r2(), uplinkChange('uplink to core', '10.1.2.1/24', '10000'));
    expect(result.lines.map((line) => line.text)).toEqual([
      'interface eth1',
      ' description uplink to core',
      ' ip address 10.1.2.1/24',
      ' ip mtu 10000',
    ]);
    expect(result.appliedLines).toBe(3);
    expect(result.failedLine).toBe(3);
    expect(result.halfConfigured).toBe(true);
    expect(result.running.eth1?.description).toBe('uplink to core');
    expect(result.running.eth1?.addresses).toHaveLength(2);
    expect(result.running.eth1?.mtu).toBe(1500);
  });
  it('an error on the first change leaves nothing half-done', () => {
    const result = cliPush(r2(), uplinkChange('x', '10.0.2.1/24', '9000').slice(1));
    expect(result.appliedLines).toBe(1);
    expect(result.halfConfigured).toBe(false);
  });
});

describe('TC-2044: per device, all or none, and CLI across three routers', () => {
  const changesFor = (name: string) =>
    uplinkChange('uplink', `10.1.${name.slice(1)}.1/24`, name === 'R2' ? '10000' : '9000');
  const devices = startingDevices();
  it('per device: R1 and R3 commit, R2 rejects', () => {
    const outcome = pushAll(devices, changesFor, 'netconf');
    expect(outcome.map((o) => o.status)).toEqual(['committed', 'rejected', 'committed']);
    expect(outcome[0]?.running.eth1?.mtu).toBe(9000);
  });
  it('all or none: R2 fails validation, so R1 and R3 are discarded too', () => {
    const outcome = pushAll(devices, changesFor, 'netconf-all-or-none');
    expect(outcome.map((o) => o.status)).toEqual(['aborted', 'rejected', 'aborted']);
    expect(outcome.map((o) => o.running)).toEqual(devices.map((d) => d.running));
  });
  it('CLI: R2 is left half-applied', () => {
    const outcome = pushAll(devices, changesFor, 'cli');
    expect(outcome.map((o) => o.status)).toEqual(['applied', 'half-applied', 'applied']);
    expect(outcome[1]?.running.eth1?.mtu).toBe(1500);
    expect(outcome[1]?.running.eth1?.description).toBe('uplink');
  });
  it('with every value valid, all or none commits all three', () => {
    const outcome = pushAll(
      devices,
      (n) => uplinkChange('u', `10.1.${n.slice(1)}.1/24`, '9000'),
      'netconf-all-or-none',
    );
    expect(outcome.map((o) => o.status)).toEqual(['committed', 'committed', 'committed']);
  });
});

describe('TC-2045: a confirmed commit rolls back by itself if not confirmed in time', () => {
  const shutMgmt: Change[] = [{ iface: 'eth0', leaf: 'enabled', value: 'false' }];
  it('shutting the management interface cuts the session: rolled back at the timeout', () => {
    const result = confirmedCommit(r2(), shutMgmt, {
      timeoutS: 600,
      confirmAfterS: 30,
      sessionIface: 'eth0',
    });
    expect(result).toMatchObject({ committed: true, reachable: false, confirmedAtS: null });
    expect(result.rolledBackAtS).toBe(600);
    expect(result.running.eth0?.enabled).toBe(true);
  });
  it('a change that keeps the session is confirmed and kept', () => {
    const result = confirmedCommit(r2(), uplinkChange('u', '10.1.2.1/24', '9000'), {
      timeoutS: 120,
      confirmAfterS: 30,
      sessionIface: 'eth0',
    });
    expect(result).toMatchObject({ confirmedAtS: 30, rolledBackAtS: null });
    expect(result.running.eth1?.mtu).toBe(9000);
  });
  it('a confirmation later than the timeout is too late', () => {
    const result = confirmedCommit(r2(), uplinkChange('u', '10.1.2.1/24', '9000'), {
      timeoutS: 60,
      confirmAfterS: 90,
      sessionIface: 'eth0',
    });
    expect(result.rolledBackAtS).toBe(60);
    expect(result.running.eth1?.mtu).toBe(1500);
  });
});

describe('TC-2046: the generated <edit-config> carries the change, escaped', () => {
  const xml = editConfigXml(uplinkChange('core & edge <A>', '10.1.2.1/24', '9000'));
  it('targets the candidate and puts each leaf in its module', () => {
    expect(xml).toContain('<target>\n      <candidate/>\n    </target>');
    expect(xml).toContain('<interfaces xmlns="urn:ietf:params:xml:ns:yang:ietf-interfaces">');
    expect(xml).toContain('<name>eth1</name>');
    expect(xml).toContain('<ipv4 xmlns="urn:ietf:params:xml:ns:yang:ietf-ip">');
    expect(xml).toContain('<mtu>9000</mtu>');
    expect(xml).toContain(
      '<address nc:operation="create">\n              <ip>10.1.2.1</ip>\n              <prefix-length>24</prefix-length>',
    );
  });
  it('escapes markup in values', () => {
    expect(xml).toContain('<description>core &amp; edge &lt;A&gt;</description>');
    expect(xml).not.toContain('<A>');
  });
});
