import { useNetlabContext } from '../../src/components/NetlabContext';
import { ospfInterfaceCost } from '../../src/routing/ospf/OspfProtocol';
import type { NetworkTopology } from '../../src/types/topology';
import { useT } from '../localeContext';

/** One inter-router link's OSPF cost, as each end charges it. */
export interface OspfLinkCost {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  /** The cost `from` charges to send toward `to`. */
  readonly forward: number;
  /** The cost `to` charges to send toward `from`. */
  readonly reverse: number;
  readonly down: boolean;
}

/**
 * The OSPF cost of every link between two OSPF routers. A cost belongs to the
 * interface a packet leaves by, so one link has two, and they may differ.
 */
export function ospfLinkCosts(topology: NetworkTopology): OspfLinkCost[] {
  const costs: OspfLinkCost[] = [];
  for (const edge of topology.edges) {
    const source = topology.nodes.find((node) => node.id === edge.source);
    const target = topology.nodes.find((node) => node.id === edge.target);
    if (!source?.data.ospfConfig || !target?.data.ospfConfig) continue;
    const sourceIface = source.data.interfaces?.find((iface) => iface.id === edge.sourceHandle);
    const targetIface = target.data.interfaces?.find((iface) => iface.id === edge.targetHandle);
    if (!sourceIface || !targetIface) continue;
    costs.push({
      id: edge.id,
      from: source.data.label,
      to: target.data.label,
      forward: ospfInterfaceCost(source, sourceIface),
      reverse: ospfInterfaceCost(target, targetIface),
      down: edge.data?.state === 'down',
    });
  }
  return costs;
}

/**
 * Each link's cost, so the metrics in the tables can be added up on this page.
 * The cost 3 on R1's interface toward R3 used to be stated only in another lesson.
 */
export function LinkCostsPanel() {
  const t = useT();
  const { topology } = useNetlabContext();
  const links = ospfLinkCosts(topology);

  return (
    <div
      data-testid="ospf-link-costs"
      style={{
        background: 'var(--netlab-bg-primary)',
        border: '1px solid var(--netlab-bg-surface)',
        borderRadius: 10,
        padding: 12,
        color: 'var(--netlab-text-primary)',
        fontFamily: 'monospace',
        fontSize: 11,
      }}
    >
      <div
        style={{
          color: 'var(--netlab-text-secondary)',
          fontWeight: 700,
          letterSpacing: 1,
          marginBottom: 8,
        }}
      >
        {t('LINK COSTS', 'リンクのコスト')}
      </div>
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridAutoFlow: 'dense',
          gap: '2px 12px',
        }}
      >
        {links.map((link) => (
          <li
            key={link.id}
            data-testid={`ospf-link-cost-${link.id}`}
            style={{
              // A link whose two ends differ needs the whole row to say both.
              ...(link.forward !== link.reverse ? { gridColumn: '1 / -1' } : {}),
              ...(link.down ? { color: 'var(--netlab-text-muted)' } : {}),
            }}
          >
            {link.forward === link.reverse
              ? t(
                  `${link.from} ↔ ${link.to}: cost ${link.forward}`,
                  `${link.from} ↔ ${link.to}: コスト ${link.forward}`,
                )
              : t(
                  `${link.from} → ${link.to}: cost ${link.forward} · ${link.to} → ${link.from}: cost ${link.reverse}`,
                  `${link.from} → ${link.to}: コスト ${link.forward} · ${link.to} → ${link.from}: コスト ${link.reverse}`,
                )}
            {link.down && t(' (link down)', '（リンク断）')}
          </li>
        ))}
      </ul>
      <div style={{ marginTop: 6, color: 'var(--netlab-text-secondary)', lineHeight: 1.4 }}>
        {t(
          'A metric adds the cost of each interface the packet leaves by, plus the cost of the last router’s interface onto the destination network.',
          'メトリックは、パケットが出ていく各インタフェースのコストに、最後のルータが宛先ネットワークへつながるインタフェースのコストを足した値です。',
        )}
      </div>
    </div>
  );
}
