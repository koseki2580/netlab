import { MulticastTable, type MulticastTableEntry } from '../layers/l2-datalink/MulticastTable';
import { AclProcessor } from '../layers/l3-network/AclProcessor';
import { IgmpProcessor } from '../layers/l3-network/IgmpProcessor';
import { NatProcessor } from '../layers/l3-network/NatProcessor';
import type { ConnTrackTable } from '../types/acl';
import type { NatTable } from '../types/nat';
import type { NetlabNode, NetworkTopology } from '../types/topology';

/**
 * The processors that live on a device across sends: NAT and ACL (with its
 * connection tracking) and IGMP per router, a multicast table per switch.
 * Each is made the first time its device asks for it.
 */
export class DeviceProcessors {
  private readonly natProcessors = new Map<string, NatProcessor>();
  private readonly aclProcessors = new Map<string, AclProcessor>();
  private readonly igmpProcessors = new Map<string, IgmpProcessor>();
  private readonly multicastTables = new Map<string, MulticastTable>();

  constructor(private readonly topology: NetworkTopology) {}

  serializeNatTables(): NatTable[] {
    return Array.from(this.natProcessors.values()).map((processor) => processor.getTable());
  }

  serializeConnTrackTables(): ConnTrackTable[] {
    return Array.from(this.aclProcessors.entries()).flatMap(([routerId, processor]) => {
      const node = this.findNode(routerId);
      if (!node || node.data.role !== 'router' || node.data.statefulFirewall !== true) {
        return [];
      }
      return [processor.getConnTrackTable()];
    });
  }

  getNatProcessor(routerId: string): NatProcessor | null {
    const node = this.findNode(routerId);
    if (!node || node.data.role !== 'router') return null;

    const interfaces = node.data.interfaces ?? [];
    const hasInside = interfaces.some((iface) => iface.nat === 'inside');
    const hasOutside = interfaces.some((iface) => iface.nat === 'outside');
    if (!hasInside || !hasOutside) return null;

    if (!this.natProcessors.has(routerId)) {
      this.natProcessors.set(routerId, new NatProcessor(routerId, this.topology));
    }

    return this.natProcessors.get(routerId) ?? null;
  }

  getAclProcessor(routerId: string): AclProcessor | null {
    const node = this.findNode(routerId);
    if (!node || node.data.role !== 'router') return null;

    const interfaces = node.data.interfaces ?? [];
    const hasAcl = interfaces.some(
      (iface) => iface.inboundAcl !== undefined || iface.outboundAcl !== undefined,
    );
    if (!hasAcl) return null;

    if (!this.aclProcessors.has(routerId)) {
      this.aclProcessors.set(routerId, new AclProcessor(routerId, this.topology));
    }

    return this.aclProcessors.get(routerId) ?? null;
  }

  getIgmpProcessor(routerId: string): IgmpProcessor | null {
    const node = this.findNode(routerId);
    if (!node || node.data.role !== 'router') return null;

    if (!this.igmpProcessors.has(routerId)) {
      this.igmpProcessors.set(routerId, new IgmpProcessor());
    }

    return this.igmpProcessors.get(routerId) ?? null;
  }

  getMulticastTable(switchId: string): MulticastTable | null {
    const node = this.findNode(switchId);
    if (!node || node.data.role !== 'switch') return null;

    if (!this.multicastTables.has(switchId)) {
      this.multicastTables.set(switchId, new MulticastTable());
    }
    return this.multicastTables.get(switchId) ?? null;
  }

  getMulticastTableSnapshot(switchId: string): MulticastTableEntry[] {
    return this.getMulticastTable(switchId)?.snapshot() ?? [];
  }

  getIgmpMembershipSnapshot(routerId: string): { interfaceId: string; group: string }[] {
    return this.getIgmpProcessor(routerId)?.snapshot() ?? [];
  }

  /** Empties the NAT and ACL state (IGMP and multicast tables are kept, as they always were). */
  reset(): void {
    this.natProcessors.forEach((processor) => processor.clear());
    this.natProcessors.clear();
    this.aclProcessors.forEach((processor) => processor.clear());
    this.aclProcessors.clear();
  }

  private findNode(nodeId: string): NetlabNode | null {
    return this.topology.nodes.find((candidate) => candidate.id === nodeId) ?? null;
  }
}
