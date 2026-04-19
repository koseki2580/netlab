import { describe, expect, it } from 'vitest';
import type { UdpBinding, UdpBindings } from './udp';
import {
  UDP_EPHEMERAL_PORT_MAX,
  UDP_EPHEMERAL_PORT_MIN,
  UDP_MAX_PORT,
  UDP_MIN_PORT,
  UDP_PROTOCOL,
} from './udp';

describe('UDP constants', () => {
  it('UDP_PROTOCOL is 17', () => {
    expect(UDP_PROTOCOL).toBe(17);
  });

  it('port range is 0–65535', () => {
    expect(UDP_MIN_PORT).toBe(0);
    expect(UDP_MAX_PORT).toBe(65535);
  });

  it('ephemeral range is 49152–65535', () => {
    expect(UDP_EPHEMERAL_PORT_MIN).toBe(49152);
    expect(UDP_EPHEMERAL_PORT_MAX).toBe(65535);
  });

  it('ephemeral range is within total port range', () => {
    expect(UDP_EPHEMERAL_PORT_MIN).toBeGreaterThanOrEqual(UDP_MIN_PORT);
    expect(UDP_EPHEMERAL_PORT_MAX).toBeLessThanOrEqual(UDP_MAX_PORT);
  });
});

describe('UdpBinding shape', () => {
  it('listening binding', () => {
    const b: UdpBinding = { ip: '0.0.0.0', port: 53, owner: 'dns-server', kind: 'listening' };
    expect(b.kind).toBe('listening');
  });

  it('ephemeral binding', () => {
    const b: UdpBinding = { ip: '10.0.0.1', port: 50000, owner: 'dhcp-client', kind: 'ephemeral' };
    expect(b.kind).toBe('ephemeral');
  });
});

describe('UdpBindings aggregate', () => {
  it('contains both listening and ephemeral arrays', () => {
    const bindings: UdpBindings = {
      listening: [{ ip: '0.0.0.0', port: 53, owner: 'dns' }],
      ephemeral: [{ ip: '10.0.0.1', port: 50000 }],
    };
    expect(bindings.listening).toHaveLength(1);
    expect(bindings.ephemeral).toHaveLength(1);
  });
});
