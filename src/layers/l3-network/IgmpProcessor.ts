import {
  ALL_HOSTS_GROUP,
  ALL_ROUTERS_GROUP,
  IGMP_PROTOCOL,
} from "../../types/multicast";
import type { IgmpMessage, InFlightPacket } from "../../types/packets";
import { ipToMulticastMac } from "../../utils/multicastMac";

export class IgmpProcessor {
  /** (interfaceId, groupAddress) pairs the router has learned. */
  private readonly memberships = new Map<string, Set<string>>();

  /**
   * Build a General Query packet from the given router interface.
   * Destination: ALL_HOSTS_GROUP (224.0.0.1), MAC 01:00:5e:00:00:01.
   */
  buildGeneralQuery(srcInterface: { ip: string; mac: string }): InFlightPacket {
    const igmp: IgmpMessage = {
      layer: "L4",
      igmpType: "v2-membership-query",
      groupAddress: "0.0.0.0",
      maxResponseTime: 100, // 10 seconds in 0.1s units
    };

    return buildIgmpPacket({
      srcIp: srcInterface.ip,
      srcMac: srcInterface.mac,
      dstIp: ALL_HOSTS_GROUP,
      dstMac: "01:00:5e:00:00:01",
      igmp,
    });
  }

  /**
   * Build a Membership Report for joining a group.
   * Destination IP/MAC is the group itself.
   */
  static buildMembershipReport(
    srcIp: string,
    srcMac: string,
    groupAddress: string,
  ): InFlightPacket {
    const igmp: IgmpMessage = {
      layer: "L4",
      igmpType: "v2-membership-report",
      groupAddress,
    };

    return buildIgmpPacket({
      srcIp,
      srcMac,
      dstIp: groupAddress,
      dstMac: ipToMulticastMac(groupAddress),
      igmp,
    });
  }

  /**
   * Build a Leave Group message.
   * Destination: ALL_ROUTERS_GROUP (224.0.0.2).
   */
  static buildLeaveGroup(
    srcIp: string,
    srcMac: string,
    groupAddress: string,
  ): InFlightPacket {
    const igmp: IgmpMessage = {
      layer: "L4",
      igmpType: "v2-leave-group",
      groupAddress,
    };

    return buildIgmpPacket({
      srcIp,
      srcMac,
      dstIp: ALL_ROUTERS_GROUP,
      dstMac: "01:00:5e:00:00:02",
      igmp,
    });
  }

  /** Record a Report arrival on a router interface. */
  recordReport(interfaceId: string, groupAddress: string): void {
    let groups = this.memberships.get(interfaceId);
    if (!groups) {
      groups = new Set();
      this.memberships.set(interfaceId, groups);
    }
    groups.add(groupAddress);
  }

  /** Record a Leave on a router interface. */
  recordLeave(interfaceId: string, groupAddress: string): void {
    const groups = this.memberships.get(interfaceId);
    if (groups) {
      groups.delete(groupAddress);
    }
  }

  /** Per-router snapshot for UI. Sorted by (interfaceId, group). */
  snapshot(): Array<{ interfaceId: string; group: string }> {
    const rows: Array<{ interfaceId: string; group: string }> = [];
    for (const [interfaceId, groups] of this.memberships) {
      for (const group of groups) {
        rows.push({ interfaceId, group });
      }
    }
    rows.sort(
      (a, b) =>
        a.interfaceId.localeCompare(b.interfaceId) ||
        a.group.localeCompare(b.group),
    );
    return rows;
  }
}

/** Internal helper to assemble an IGMP InFlightPacket. */
function buildIgmpPacket(opts: {
  srcIp: string;
  srcMac: string;
  dstIp: string;
  dstMac: string;
  igmp: IgmpMessage;
}): InFlightPacket {
  return {
    id: "",
    srcNodeId: "",
    dstNodeId: "",
    currentDeviceId: "",
    ingressPortId: "",
    path: [],
    timestamp: 0,
    frame: {
      layer: "L2",
      srcMac: opts.srcMac,
      dstMac: opts.dstMac,
      etherType: 0x0800,
      payload: {
        layer: "L3",
        protocol: IGMP_PROTOCOL,
        ttl: 1,
        srcIp: opts.srcIp,
        dstIp: opts.dstIp,
        payload: opts.igmp,
      },
    },
  };
}
