import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SerializedPacket } from '../../utils/packetSerializer';
import { PacketStructureViewer } from './PacketStructureViewer';

const simulationMock = vi.hoisted(() => ({
  state: {
    selectedHop: null as Record<string, unknown> | null,
    selectedPacket: null as Record<string, unknown> | null,
  },
}));

const serializerMock = vi.hoisted(() => ({
  serializePacket: vi.fn(),
  serializeArpFrame: vi.fn(),
}));

vi.mock('../../simulation/SimulationContext', () => ({
  useSimulation: () => ({
    state: simulationMock.state,
  }),
}));

vi.mock('../../utils/packetSerializer', () => ({
  serializePacket: serializerMock.serializePacket,
  serializeArpFrame: serializerMock.serializeArpFrame,
}));

function makeSerialized(overrides: Partial<SerializedPacket> = {}): SerializedPacket {
  return {
    bytes: Uint8Array.from([0xaa, 0xbb, 0xcc, 0xdd, 0x11, 0x22, 0x33, 0x44]),
    annotations: ['L2', 'L2', 'L2', 'L2', 'L3', 'L3', 'L4', 'raw'],
    fields: [
      {
        name: 'Dst MAC',
        layer: 'L2',
        byteOffset: 0,
        byteLength: 6,
        displayValue: 'aa:bb:cc:dd:11:22',
      },
      {
        name: 'Src IP',
        layer: 'L3',
        byteOffset: 4,
        byteLength: 2,
        displayValue: '10.0.0.1',
      },
      {
        name: 'Payload',
        layer: 'raw',
        byteOffset: 6,
        byteLength: 2,
        displayValue: 'OK',
      },
    ],
    ...overrides,
  };
}

function renderViewer() {
  return renderToStaticMarkup(<PacketStructureViewer />);
}

beforeEach(() => {
  simulationMock.state.selectedHop = null;
  simulationMock.state.selectedPacket = null;
  serializerMock.serializePacket.mockReset();
  serializerMock.serializeArpFrame.mockReset();
  serializerMock.serializePacket.mockReturnValue(makeSerialized());
  serializerMock.serializeArpFrame.mockReturnValue(makeSerialized());
});

describe('PacketStructureViewer', () => {
  describe('EmptyState', () => {
    it('renders when no packet selected', () => {
      expect(renderViewer()).toContain(
        'No packet selected — step through the simulation to inspect packet bytes.',
      );
    });
  });

  describe('HexDump', () => {
    it('renders hex bytes from serialized packet', () => {
      simulationMock.state.selectedPacket = { frame: {} };

      const html = renderViewer();

      expect(html).toContain('AA');
      expect(html).toContain('BB');
      expect(html).toContain('CC');
    });

    it('respects MAX_RENDER_BYTES limit', () => {
      simulationMock.state.selectedPacket = { frame: {} };
      serializerMock.serializePacket.mockReturnValue(
        makeSerialized({
          bytes: Uint8Array.from([
            ...Array.from({ length: 512 }, () => 0x00),
            0xff,
          ]),
          annotations: Array.from({ length: 513 }, () => 'raw'),
          fields: [
            {
              name: 'Data',
              layer: 'raw',
              byteOffset: 0,
              byteLength: 513,
              displayValue: 'payload',
            },
          ],
        }),
      );

      const html = renderViewer();

      expect(html).not.toContain('FF');
    });

    it('shows truncation message when bytes exceed limit', () => {
      simulationMock.state.selectedPacket = { frame: {} };
      serializerMock.serializePacket.mockReturnValue(
        makeSerialized({
          bytes: Uint8Array.from([
            ...Array.from({ length: 512 }, () => 0x00),
            0x01,
          ]),
          annotations: Array.from({ length: 513 }, () => 'raw'),
          fields: [
            {
              name: 'Data',
              layer: 'raw',
              byteOffset: 0,
              byteLength: 513,
              displayValue: 'payload',
            },
          ],
        }),
      );

      expect(renderViewer()).toContain('+1 more bytes…');
    });

    it('highlights changed fields with yellow outline', () => {
      simulationMock.state.selectedPacket = { frame: {} };
      simulationMock.state.selectedHop = { changedFields: ['Src IP'] };

      const html = renderViewer();

      expect(html).toContain('outline:1px solid #fbbf24');
    });

    it('renders row with offset labels', () => {
      simulationMock.state.selectedPacket = { frame: {} };
      serializerMock.serializePacket.mockReturnValue(
        makeSerialized({
          bytes: Uint8Array.from(Array.from({ length: 20 }, (_, index) => index)),
          annotations: Array.from({ length: 20 }, () => 'raw'),
          fields: [
            {
              name: 'Data',
              layer: 'raw',
              byteOffset: 0,
              byteLength: 20,
              displayValue: 'payload',
            },
          ],
        }),
      );

      const html = renderViewer();

      expect(html).toContain('000');
      expect(html).toContain('010');
    });
  });

  describe('FieldTable', () => {
    it('renders all fields with layer colors', () => {
      simulationMock.state.selectedPacket = { frame: {} };

      const html = renderViewer();

      expect(html).toContain('Dst MAC');
      expect(html).toContain('Src IP');
      expect(html).toContain('Payload');
      expect(html).toContain('L2');
      expect(html).toContain('L3');
    });

    it('shows byte lengths for each field', () => {
      simulationMock.state.selectedPacket = { frame: {} };

      const html = renderViewer();

      expect(html).toContain('6');
      expect(html).toContain('2');
    });

    it('highlights changed fields with different background', () => {
      simulationMock.state.selectedPacket = { frame: {} };
      simulationMock.state.selectedHop = { changedFields: ['Src IP'] };

      expect(renderViewer()).toContain('background:#92400e33');
    });

    it('alternates row colors', () => {
      simulationMock.state.selectedPacket = { frame: {} };

      expect(renderViewer()).toContain('background:#0f172a55');
    });
  });

  describe('LegendPills', () => {
    it('renders deduplicated layer badges', () => {
      simulationMock.state.selectedPacket = { frame: {} };
      serializerMock.serializePacket.mockReturnValue(
        makeSerialized({
          annotations: ['L2', 'L2', 'L3', 'L3', 'L4'],
        }),
      );

      const html = renderViewer();

      expect((html.match(/L2 Ethernet/g) ?? [])).toHaveLength(1);
      expect((html.match(/L3 IPv4/g) ?? [])).toHaveLength(1);
      expect((html.match(/L4 TCP\/UDP/g) ?? [])).toHaveLength(1);
    });

    it('renders no badges when no annotations are present', () => {
      simulationMock.state.selectedPacket = { frame: {} };
      serializerMock.serializePacket.mockReturnValue(
        makeSerialized({
          annotations: [],
        }),
      );

      const html = renderViewer();

      expect(html).not.toContain('L2 Ethernet');
      expect(html).not.toContain('L3 IPv4');
    });
  });

  describe('serialization dispatch', () => {
    it('uses serializeArpFrame for ARP packets', () => {
      simulationMock.state.selectedPacket = { frame: { layer: 'L2' } };
      simulationMock.state.selectedHop = {
        arpFrame: { layer: 'L2', payload: { layer: 'ARP' } },
      };

      renderViewer();

      expect(serializerMock.serializeArpFrame).toHaveBeenCalledOnce();
      expect(serializerMock.serializePacket).not.toHaveBeenCalled();
    });

    it('uses serializePacket for non-ARP packets', () => {
      simulationMock.state.selectedPacket = { frame: { layer: 'L2' } };
      simulationMock.state.selectedHop = null;

      renderViewer();

      expect(serializerMock.serializePacket).toHaveBeenCalledOnce();
      expect(serializerMock.serializeArpFrame).not.toHaveBeenCalled();
    });
  });
});
