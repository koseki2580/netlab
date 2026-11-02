/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../i18n/I18nProvider';
import { protocolPacks } from '../../protocols/packs';
import type { EthernetFrame } from '../../types/packets';
import { PacketStructureViewer } from './PacketStructureViewer';

const frame: EthernetFrame = {
  layer: 'L2',
  srcMac: '02:00:00:00:00:01',
  dstMac: '02:00:00:00:00:02',
  etherType: 0x0800,
  payload: {
    layer: 'L3',
    srcIp: '10.0.0.10',
    dstIp: '10.0.0.53',
    ttl: 64,
    protocol: 17,
    payload: {
      layer: 'L4',
      srcPort: 49152,
      dstPort: 53,
      payload: {
        layer: 'L7',
        transactionId: 1,
        isResponse: false,
        questions: [{ name: 'a.b', type: 'A' }],
        answers: [],
      },
    },
  },
};

const loader = vi.hoisted(() => ({ fail: false }));

vi.mock('../../simulation/SimulationContext', () => ({
  useSimulation: () => ({ state: { selectedHop: null, selectedPacket: { frame } } }),
}));

vi.mock('../../protocols/packLearn', async (original) => {
  const real = await original<typeof import('../../protocols/packLearn')>();
  return {
    loadLearnTier: (id: string) =>
      loader.fail ? Promise.reject(new Error('chunk failed')) : real.loadLearnTier(id),
  };
});

let root: Root | null = null;
let host: HTMLDivElement;
const env = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };

async function show(locale: 'en' | 'ja') {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(
      <I18nProvider locale={locale}>
        <PacketStructureViewer />
      </I18nProvider>,
    );
  });
}

const settled = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

const nameCell = (name: string) =>
  [...host.querySelectorAll('span')].find((span) => span.textContent === name);

beforeEach(() => {
  env.IS_REACT_ACT_ENVIRONMENT = true;
  loader.fail = false;
});

afterEach(() => {
  act(() => root?.unmount());
  host.remove();
  protocolPacks.detach('dns');
});

describe('what a field means, in the field view', () => {
  it('TC-1125: shows the meaning in the learner’s language once the learn tier loads', async () => {
    await show('ja');
    await vi.waitFor(async () => {
      await settled();
      expect(nameCell('RD')?.title).toBe('再帰要求：代わりに答えを探してほしいとサーバーに頼む。');
    });
    act(() => root?.unmount());
    root = null;
    host.remove();
    await show('en');
    await settled();
    expect(nameCell('RD')?.title).toContain('Recursion Desired');
  });

  it('TC-1126: stays as it is when the learn tier cannot load', async () => {
    loader.fail = true;
    await show('en');
    await settled();
    expect(nameCell('RD')).toBeDefined();
    expect(nameCell('RD')?.title).toBe('');
  });
});
