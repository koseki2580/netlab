/**
 * @property-seed 0x5a4b12 NetFlow record count and packet conservation.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { buildUdpPacket } from '../../layers/l4-transport/udpPacketBuilder';
import { PROPERTY_NUM_RUNS_DEFAULT, PROPERTY_SEED_DEFAULT } from '../../testing/seeds';
import { FlowCollector } from '../FlowCollector';
import { NetflowExporter } from '../NetflowExporter';

describe('NetflowExporter record-count properties', () => {
  it('flushes one record per distinct observed flow and preserves packet totals', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1000, max: 1020 }), { minLength: 1, maxLength: 60 }),
        (srcPorts) => {
          const collector = new FlowCollector({ maxRecords: 100 });
          const exporter = new NetflowExporter(
            'r1',
            { enabled: true, maxCacheEntries: 128 },
            collector,
          );

          for (const [index, srcPort] of srcPorts.entries()) {
            exporter.observe(
              buildUdpPacket({
                srcNodeId: 'client',
                dstNodeId: 'server',
                srcIp: '10.0.0.10',
                dstIp: '203.0.113.10',
                srcPort,
                dstPort: 53,
                srcMac: '00:00:00:00:00:01',
                dstMac: '00:00:00:00:00:02',
                packetId: `udp-flow-${index}`,
                timestamp: index,
                payload: { layer: 'raw', data: `dns-${index}` },
              }),
              'eth0',
              'eth1',
              index,
            );
          }

          exporter.flush('cache-evict');
          const records = collector.list({ kind: 'netflow' });
          expect(records).toHaveLength(new Set(srcPorts).size);
          expect(
            records.reduce(
              (sum, event) => sum + (event.kind === 'netflow' ? event.record.packets : 0),
              0,
            ),
          ).toBe(srcPorts.length);
        },
      ),
      { seed: PROPERTY_SEED_DEFAULT, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });
});
