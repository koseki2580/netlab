import type { LinkQosConfig } from '../types/link';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface RssiInput {
  readonly distanceMeters: number;
  readonly frequencyMhz: number;
  readonly txPowerDbm: number;
  readonly antennaGainDbi?: number;
}

export function distanceMeters(left: Point, right: Point, pixelsPerMeter = 10): number {
  const dx = left.x - right.x;
  const dy = left.y - right.y;
  return Math.sqrt(dx * dx + dy * dy) / pixelsPerMeter;
}

export function rssiDbm(input: RssiInput): number {
  const distanceKm = Math.max(input.distanceMeters, 1) / 1000;
  const pathLossDb = 32.44 + 20 * Math.log10(distanceKm) + 20 * Math.log10(input.frequencyMhz);
  return input.txPowerDbm + (input.antennaGainDbi ?? 0) - pathLossDb;
}

export function lossPctFromRssi(rssi: number): number {
  if (rssi >= -65) return 0;
  if (rssi <= -90) return 100;
  return Math.round(((-65 - rssi) / 25) * 100);
}

export function wirelessLinkQosFromRssi(rssi: number, lossSeed: number): LinkQosConfig {
  return {
    lossPct: lossPctFromRssi(rssi),
    lossSeed,
  };
}
