import type { WifiConfig, WirelessAssociationState, WirelessEvent } from '../../../types/wireless';

export function transitionWirelessState(
  state: WirelessAssociationState,
  event: WirelessEvent,
  config: Pick<WifiConfig, 'ssid' | 'psk'>,
): WirelessAssociationState {
  if (event.type === 'deauth' || event.type === 'timeout') {
    return { phase: 'unassociated' };
  }

  switch (state.phase) {
    case 'unassociated':
      return event.type === 'beacon' && event.ssid === config.ssid ? { phase: 'probing' } : state;
    case 'probing':
      return event.type === 'probeResponse' && event.ssid === config.ssid
        ? { phase: 'authenticated' }
        : state;
    case 'authenticated':
      return event.type === 'authSuccess' ? { phase: 'associated' } : state;
    case 'associated':
      if (event.type === 'assocSuccess') {
        return config.psk
          ? { phase: '4way', apId: event.apId }
          : { phase: 'connected', apId: event.apId };
      }
      return state;
    case '4way':
      return event.type === 'eapolM4'
        ? {
            phase: 'connected',
            ...(state.apId !== undefined ? { apId: state.apId } : {}),
          }
        : state;
    case 'connected':
      return state;
  }
}
