import type { TcpFlags } from '../../types/packets';
import type { LinkQosConfig, LinkShaperConfig } from '../../types/link';
import type { NetflowConfig, SflowConfig } from '../../types/observability';
import type { LacpConfig } from '../../types/lacp';
import type { VrrpConfig } from '../../types/vrrp';
import type { WifiConfig, WirelessLinkConfig } from '../../types/wireless';
import type { GreTunnelConfig, VrfConfig, VtepConfig } from '../../types/tunneling';
import type { LinkState } from './types';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function hasString(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === 'string';
}

export function hasNumber(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === 'number' && Number.isFinite(value[key]);
}

export function isLinkState(value: unknown): value is LinkState {
  return value === 'up' || value === 'down';
}

export function isLinkQosConfig(value: unknown): value is LinkQosConfig {
  if (!isRecord(value)) return false;
  const optionalNumber = (key: string) => value[key] === undefined || hasNumber(value, key);
  return (
    optionalNumber('bandwidthBps') &&
    optionalNumber('propagationDelayMs') &&
    optionalNumber('lossPct') &&
    optionalNumber('queueDepthSegments') &&
    optionalNumber('lossSeed') &&
    (value.shaper === undefined || isLinkShaperConfig(value.shaper))
  );
}

export function isLinkShaperConfig(value: unknown): value is LinkShaperConfig {
  return (
    isRecord(value) &&
    Array.isArray(value.classes) &&
    value.classes.every(
      (klass) =>
        isRecord(klass) &&
        typeof klass.id === 'string' &&
        Array.isArray(klass.dscp) &&
        klass.dscp.every((dscp) => typeof dscp === 'number') &&
        typeof klass.weightPct === 'number' &&
        typeof klass.queueDepthSegments === 'number' &&
        (klass.default === undefined || typeof klass.default === 'boolean'),
    )
  );
}

export function isNetflowConfig(value: unknown): value is NetflowConfig {
  return (
    isRecord(value) &&
    typeof value.enabled === 'boolean' &&
    (value.inactiveTimeoutMs === undefined || hasNumber(value, 'inactiveTimeoutMs')) &&
    (value.activeTimeoutMs === undefined || hasNumber(value, 'activeTimeoutMs')) &&
    (value.maxCacheEntries === undefined || hasNumber(value, 'maxCacheEntries'))
  );
}

export function isSflowConfig(value: unknown): value is SflowConfig {
  return (
    isRecord(value) &&
    typeof value.enabled === 'boolean' &&
    hasNumber(value, 'rate') &&
    (value.headerCaptureBytes === undefined || hasNumber(value, 'headerCaptureBytes')) &&
    (value.samplingSeed === undefined || hasNumber(value, 'samplingSeed'))
  );
}

export function isLacpConfig(value: unknown): value is LacpConfig {
  return (
    isRecord(value) &&
    hasNumber(value, 'key') &&
    typeof value.systemId === 'string' &&
    (value.mode === 'active' || value.mode === 'passive') &&
    (value.fastTimer === undefined || typeof value.fastTimer === 'boolean') &&
    (value.channelId === undefined || typeof value.channelId === 'string')
  );
}

export function isVrrpConfig(value: unknown): value is VrrpConfig {
  return (
    isRecord(value) &&
    hasNumber(value, 'vrid') &&
    typeof value.virtualIp === 'string' &&
    hasNumber(value, 'priority') &&
    (value.advertIntervalMs === undefined || hasNumber(value, 'advertIntervalMs')) &&
    (value.preempt === undefined || typeof value.preempt === 'boolean') &&
    (value.hsrpMode === undefined || typeof value.hsrpMode === 'boolean')
  );
}

export function isWirelessLinkConfig(value: unknown): value is WirelessLinkConfig {
  return (
    isRecord(value) &&
    typeof value.ssid === 'string' &&
    hasNumber(value, 'channel') &&
    hasNumber(value, 'bandMhz') &&
    hasNumber(value, 'txPowerDbm') &&
    (value.antennaGainDbi === undefined || hasNumber(value, 'antennaGainDbi')) &&
    (value.lossSeed === undefined || hasNumber(value, 'lossSeed'))
  );
}

export function isWifiConfig(value: unknown): value is WifiConfig {
  return (
    isRecord(value) &&
    (value.role === 'access-point' || value.role === 'station') &&
    typeof value.ssid === 'string' &&
    (value.psk === undefined || typeof value.psk === 'string') &&
    (value.apId === undefined || typeof value.apId === 'string')
  );
}

export function isGreTunnelConfig(value: unknown): value is GreTunnelConfig {
  return (
    isRecord(value) &&
    hasString(value, 'sourceIp') &&
    hasString(value, 'destinationIp') &&
    (value.key === undefined || hasNumber(value, 'key')) &&
    (value.sequence === undefined || hasNumber(value, 'sequence'))
  );
}

export function isRouteDistinguisher(value: unknown): boolean {
  return (
    isRecord(value) &&
    (value.type === 0 || value.type === 1 || value.type === 2) &&
    typeof value.value === 'string'
  );
}

export function isRouteTarget(value: unknown): boolean {
  return isRecord(value) && value.type === 0x0002 && typeof value.value === 'string';
}

export function isVrfConfig(value: unknown): value is VrfConfig {
  return (
    isRecord(value) &&
    hasString(value, 'name') &&
    isRouteDistinguisher(value.rd) &&
    Array.isArray(value.importRts) &&
    value.importRts.every(isRouteTarget) &&
    Array.isArray(value.exportRts) &&
    value.exportRts.every(isRouteTarget) &&
    Array.isArray(value.attachedInterfaces) &&
    value.attachedInterfaces.every((iface) => typeof iface === 'string')
  );
}

export function isVtepConfig(value: unknown): value is VtepConfig {
  return (
    isRecord(value) &&
    hasNumber(value, 'vni') &&
    hasString(value, 'sourceVtepIp') &&
    Array.isArray(value.peerVtepIps) &&
    value.peerVtepIps.every((peer) => typeof peer === 'string') &&
    (value.arpSuppression === undefined || typeof value.arpSuppression === 'boolean')
  );
}

export function isTcpFlags(value: unknown): value is TcpFlags {
  return (
    isRecord(value) &&
    typeof value.syn === 'boolean' &&
    typeof value.ack === 'boolean' &&
    typeof value.fin === 'boolean' &&
    typeof value.rst === 'boolean' &&
    typeof value.psh === 'boolean' &&
    typeof value.urg === 'boolean'
  );
}

export function hasTarget(
  value: Record<string, unknown>,
  guard: (target: unknown) => boolean,
): boolean {
  return guard(value.target);
}
