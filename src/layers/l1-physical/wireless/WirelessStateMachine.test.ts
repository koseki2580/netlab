import { describe, expect, it } from 'vitest';
import { transitionWirelessState } from './WirelessStateMachine';

describe('WirelessStateMachine', () => {
  it('walks a station through discovery, association, WPA2, and connection', () => {
    const config = { ssid: 'netlab-wifi', psk: 'correct horse battery staple' };
    let state = transitionWirelessState(
      { phase: 'unassociated' },
      { type: 'beacon', ssid: 'netlab-wifi' },
      config,
    );
    state = transitionWirelessState(state, { type: 'probeResponse', ssid: 'netlab-wifi' }, config);
    state = transitionWirelessState(state, { type: 'authSuccess' }, config);
    state = transitionWirelessState(state, { type: 'assocSuccess', apId: 'ap-1' }, config);
    state = transitionWirelessState(state, { type: 'eapolM1' }, config);
    state = transitionWirelessState(state, { type: 'eapolM2' }, config);
    state = transitionWirelessState(state, { type: 'eapolM3' }, config);
    state = transitionWirelessState(state, { type: 'eapolM4' }, config);

    expect(state).toEqual({ phase: 'connected', apId: 'ap-1' });
  });

  it('returns to unassociated on deauthentication', () => {
    expect(
      transitionWirelessState(
        { phase: 'connected', apId: 'ap-1' },
        { type: 'deauth' },
        { ssid: 'netlab-wifi' },
      ),
    ).toEqual({ phase: 'unassociated' });
  });
});
