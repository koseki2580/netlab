/** REQ-437 — fibre link budget and the DWDM grid (TC-2480..TC-2484). */
import { describe, expect, it } from 'vitest';
import { ASKED_LINK, budget, dwdmGrid, lossLimitedKm, nmOf, powerProfile } from './optical';

describe('TC-2480: 30 km of single-mode at 1310 nm comes up with a thin 2 dB margin', () => {
  it('fibre 10.5 dB, 5 splices 0.5 dB, 2 connectors 1 dB: received −12 dBm against −14 dBm', () => {
    expect(budget(ASKED_LINK)).toEqual({
      fibreLossDb: 10.5,
      splices: 5,
      spliceLossDb: 0.5,
      connectorLossDb: 1,
      totalLossDb: 12,
      rxDbm: -12,
      marginDb: 2,
      verdict: 'thin',
      limit: null,
    });
  });
});

describe('TC-2481: the same link at 1550 nm has 3 dB more margin; longer links go down on loss', () => {
  it('1550 nm: 7.5 dB of fibre, margin 5 dB, comfortable', () => {
    expect(budget({ ...ASKED_LINK, fibre: 'smf-1550' })).toMatchObject({
      fibreLossDb: 7.5,
      marginDb: 5,
      verdict: 'comfortable',
    });
  });
  it('40 km at 1310 nm is short by 1.7 dB; extra connectors eat margin 0.5 dB each', () => {
    expect(budget({ ...ASKED_LINK, km: 40 })).toMatchObject({
      marginDb: -1.7,
      verdict: 'down',
      limit: 'loss',
    });
    expect(budget({ ...ASKED_LINK, connectors: 6 }).marginDb).toBe(0);
  });
  it('the loss-limited reach is about 35 km at 1310 nm and about 48 km at 1550 nm', () => {
    expect(lossLimitedKm('smf-1310', 2)).toBe(35.1);
    expect(lossLimitedKm('smf-1550', 2)).toBe(48.4);
  });
});

describe('TC-2482: multimode is limited by its reach, not its loss', () => {
  it('300 m of OM3 loses 1.9 dB; 500 m still has margin but is past the 300 m reach', () => {
    expect(budget({ fibre: 'mmf-850', km: 0.3, connectors: 2 })).toMatchObject({
      totalLossDb: 1.9,
      marginDb: 7.1,
      verdict: 'comfortable',
    });
    expect(budget({ fibre: 'mmf-850', km: 0.5, connectors: 2 })).toMatchObject({
      marginDb: 6.5,
      verdict: 'down',
      limit: 'reach',
    });
  });
});

describe('TC-2483: the power profile ends at the received power', () => {
  it('starts at the Tx power and steps down at each connector and splice', () => {
    const profile = powerProfile(ASKED_LINK);
    expect(profile[0]).toEqual({ km: 0, dbm: 0 });
    expect(profile[1]).toEqual({ km: 0, dbm: -0.5 });
    expect(profile[profile.length - 1]).toEqual({ km: 30, dbm: budget(ASKED_LINK).rxDbm });
  });
});

describe('TC-2484: the G.694.1 grid fits 44 channels at 100 GHz in 1530–1565 nm', () => {
  it('100 GHz: 44 channels from 191.6 to 195.9 THz, 0.8 nm apart near 1550 nm', () => {
    const grid = dwdmGrid(100);
    expect(grid.count).toBe(44);
    expect(grid.channelsThz[0]).toBe(191.6);
    expect(grid.channelsThz[grid.count - 1]).toBe(195.9);
    expect(grid.channelsThz).toContain(193.1);
    expect(grid.spacingNmAt1550).toBe(0.801);
  });
  it('50 GHz: 87 channels; the band edges are 191.56 and 195.94 THz', () => {
    expect(dwdmGrid(50).count).toBe(87);
    expect(Math.round(nmOf(191.6) * 100) / 100).toBe(1564.68);
  });
});
