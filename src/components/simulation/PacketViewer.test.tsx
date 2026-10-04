/* @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../i18n/I18nProvider';
import type { SimulationState } from '../../types/simulation';
import { PacketViewerPanel } from './PacketViewer';

const simulationMock = vi.hoisted(() => ({ state: null as unknown }));

vi.mock('../../simulation/SimulationContext', () => ({
  useSimulation: () => ({ state: simulationMock.state }),
}));

const IDLE = { traces: [], currentTraceId: null, selectedHop: null } as unknown as SimulationState;
const SENT = {
  traces: [{ packetId: 'p1', srcNodeId: 'a', dstNodeId: 'b', hops: [], status: 'delivered' }],
  currentTraceId: 'p1',
  selectedHop: null,
} as unknown as SimulationState;

let container: HTMLDivElement;
let root: Root;

function textIn(locale: string, state: SimulationState): string {
  simulationMock.state = state;
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(
      <I18nProvider locale={locale}>
        <PacketViewerPanel />
      </I18nProvider>,
    );
  });
  const text = container.textContent ?? '';
  act(() => root.unmount());
  container.remove();
  return text;
}

afterEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
});

describe('PacketViewerPanel with nothing chosen', () => {
  it('TC-348: before anything is sent it says so, and says what will appear', () => {
    expect(textIn('ja', IDLE)).toContain(
      'まだ何も送っていません。送ると、パケットの中身がここに出ます。',
    );
    expect(textIn('ja', IDLE)).not.toContain('ホップ');
    expect(textIn('en', IDLE)).toContain('Nothing sent yet.');
    expect(textIn('en', IDLE)).not.toContain('No hop selected');
  });

  it('TC-348: after a send it says how to bring a packet up', () => {
    expect(textIn('ja', SENT)).toContain('→ か、タイムラインの行を押すと、ここに中身が出ます。');
    expect(textIn('ja', SENT)).not.toContain('まだ何も送っていません');
  });
});
