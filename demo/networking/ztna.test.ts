/** REQ-415 — from VPN to zero-trust network access (TC-2190..TC-2196). */
import { describe, expect, it } from 'vitest';
import { USERS, addressCount, contains, decide, exposure, vpnReachable, type User } from './ztna';

const user = (id: string): User => USERS.find((entry) => entry.id === id)!;
const allowed = (u: User) =>
  (['hr', 'code-repo', 'finance-db', 'printers', 'wifi-admin'] as const).filter(
    (app) => decide(u, app).allow,
  );

describe('TC-2190: a VPN ACL permitting 10.0.0.0/8 reaches every internal app', () => {
  it('all five apps, including the printer subnet and the Wi-Fi admin page', () => {
    expect(vpnReachable()).toEqual(['hr', 'code-repo', 'finance-db', 'printers', 'wifi-admin']);
  });
  it('a narrower ACL reaches only what lies inside it', () => {
    expect(vpnReachable('10.2.0.0/16')).toEqual(['code-repo']);
    expect(contains('10.4.0.0/16', '10.4.0.0/24')).toBe(true);
    expect(contains('10.4.0.0/24', '10.4.0.0/16')).toBe(false);
  });
});

describe('TC-2191: VPN reach ignores who the user is and what state the device is in', () => {
  it('every user, including the contractor and the stale laptop, gets 5 apps and 16 777 216 addresses', () => {
    expect(USERS.map((u) => exposure('vpn', u))).toEqual(
      USERS.map(() => ({ apps: 5, addresses: 16_777_216 })),
    );
    expect(addressCount('10.0.0.0/8')).toBe(16_777_216);
  });
});

describe('TC-2192: ZTNA allows the managed engineer only the apps the engineer’s groups may use', () => {
  it('HR, code repo and printers allowed; finance DB and Wi-Fi admin denied for group', () => {
    expect(allowed(user('engineer'))).toEqual(['hr', 'code-repo', 'printers']);
    expect(decide(user('engineer'), 'finance-db')).toEqual({
      app: 'finance-db',
      allow: false,
      reason: 'not-in-group',
    });
  });
});

describe('TC-2193: ZTNA allows the contractor’s personal laptop only the code repo', () => {
  it('code repo accepts an up-to-date personal device; HR denies by group', () => {
    expect(allowed(user('contractor'))).toEqual(['code-repo']);
    expect(decide(user('contractor'), 'hr').reason).toBe('not-in-group');
  });
  it('an unmanaged device is refused where a compliant one is required', () => {
    const contractorInHr: User = { ...user('contractor'), groups: ['employees'] };
    expect(decide(contractorInHr, 'hr')).toEqual({ app: 'hr', allow: false, reason: 'unmanaged' });
  });
});

describe('TC-2194: a laptop that fails posture is denied even apps its user may use', () => {
  it('the engineer with an out-of-date OS is denied HR and the code repo', () => {
    expect(allowed(user('engineer-stale'))).toEqual([]);
    expect(decide(user('engineer-stale'), 'code-repo')).toEqual({
      app: 'code-repo',
      allow: false,
      reason: 'os-out-of-date',
    });
  });
});

describe('TC-2195: exposure per user and model', () => {
  it('ZTNA: engineer 3, contractor 1, stale laptop 0 apps, and no directly reachable addresses', () => {
    expect(USERS.map((u) => exposure('ztna', u))).toEqual([
      { apps: 3, addresses: 0 },
      { apps: 1, addresses: 0 },
      { apps: 0, addresses: 0 },
    ]);
  });
});

describe('TC-2196: decisions are per request, so fixing posture changes the next answer', () => {
  it('after the OS update the same engineer is allowed 3 apps again', () => {
    const updated = { managed: true, osUpToDate: true };
    expect(decide(user('engineer-stale'), 'hr', updated).allow).toBe(true);
    expect(exposure('ztna', user('engineer-stale'), updated).apps).toBe(3);
  });
  it('an OS falling out of date mid-session denies the next request', () => {
    expect(decide(user('engineer'), 'hr', { managed: true, osUpToDate: false }).allow).toBe(false);
  });
});
