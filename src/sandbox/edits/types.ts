import type { TcpFlags, InFlightPacket } from '../../types/packets';
import type { LacpConfig } from '../../types/lacp';
import type { LinkQosConfig, LinkShaperConfig } from '../../types/link';
import type { NetflowConfig, SflowConfig } from '../../types/observability';
import type { VrrpConfig } from '../../types/vrrp';
import type { WifiConfig, WirelessLinkConfig } from '../../types/wireless';
import type { GreTunnelConfig, VrfConfig, VtepConfig } from '../../types/tunneling';
import type { SnapshotEdit } from '../snapshots/types';
import type { TraceAnnotationEdit } from '../annotations/types';
import type { PluginEdit } from '../plugin/types';
import type {
  EdgeRef,
  InterfaceRef,
  NatRule,
  NodeRef,
  PacketRef,
  PacketFieldPath,
  ParameterKey,
  SandboxAclRule,
  SimulationSnapshot,
  StaticRoute,
  TrafficFlow,
} from '../types';

export type LinkState = 'up' | 'down';

export type Edit =
  | { readonly kind: 'noop' }
  | {
      readonly kind: 'packet.header';
      readonly target: PacketRef;
      readonly fieldPath: PacketFieldPath;
      readonly before: string | number;
      readonly after: string | number;
    }
  | {
      readonly kind: 'packet.flags.tcp';
      readonly target: PacketRef;
      readonly before: TcpFlags;
      readonly after: TcpFlags;
    }
  | {
      readonly kind: 'packet.payload';
      readonly target: PacketRef;
      readonly before: string;
      readonly after: string;
    }
  | { readonly kind: 'packet.compose'; readonly packet: InFlightPacket }
  | {
      readonly kind: 'param.set';
      readonly key: ParameterKey;
      readonly before: number;
      readonly after: number;
    }
  | { readonly kind: 'traffic.launch'; readonly flow: TrafficFlow }
  | { readonly kind: 'node.route.add'; readonly target: NodeRef; readonly route: StaticRoute }
  | { readonly kind: 'node.route.remove'; readonly target: NodeRef; readonly routeId: string }
  | {
      readonly kind: 'node.route.edit';
      readonly target: NodeRef;
      readonly routeId: string;
      readonly before: StaticRoute;
      readonly after: StaticRoute;
    }
  | {
      readonly kind: 'interface.mtu';
      readonly target: InterfaceRef;
      readonly before: number;
      readonly after: number;
    }
  | {
      readonly kind: 'link.state';
      readonly target: EdgeRef;
      readonly before: LinkState;
      readonly after: LinkState;
    }
  | {
      readonly kind: 'link.qos';
      readonly target: EdgeRef;
      readonly before: LinkQosConfig | null;
      readonly after: LinkQosConfig;
    }
  | {
      readonly kind: 'link.shaper';
      readonly target: EdgeRef;
      readonly before: LinkShaperConfig | null;
      readonly after: LinkShaperConfig | null;
    }
  | {
      readonly kind: 'link.lacp';
      readonly target: NodeRef;
      readonly portId: string;
      readonly before: LacpConfig | null;
      readonly after: LacpConfig | null;
    }
  | {
      readonly kind: 'node.vrrp';
      readonly target: InterfaceRef;
      readonly before: VrrpConfig | null;
      readonly after: VrrpConfig | null;
    }
  | {
      readonly kind: 'link.wireless';
      readonly target: EdgeRef;
      readonly before: WirelessLinkConfig | null;
      readonly after: WirelessLinkConfig | null;
    }
  | {
      readonly kind: 'node.wifi';
      readonly target: NodeRef;
      readonly before: WifiConfig | null;
      readonly after: WifiConfig | null;
    }
  | {
      readonly kind: 'node.gre';
      readonly target: InterfaceRef;
      readonly before: GreTunnelConfig | null;
      readonly after: GreTunnelConfig | null;
    }
  | {
      readonly kind: 'node.mpls-vrf';
      readonly target: NodeRef;
      readonly before: VrfConfig | null;
      readonly after: VrfConfig | null;
    }
  | {
      readonly kind: 'node.vxlan-vni';
      readonly target: NodeRef;
      readonly before: VtepConfig | null;
      readonly after: VtepConfig | null;
    }
  | {
      readonly kind: 'node.netflow';
      readonly target: NodeRef;
      readonly before: NetflowConfig | null;
      readonly after: NetflowConfig | null;
    }
  | {
      readonly kind: 'node.sflow';
      readonly target: NodeRef;
      readonly before: SflowConfig | null;
      readonly after: SflowConfig | null;
    }
  | { readonly kind: 'node.nat.add'; readonly target: NodeRef; readonly rule: NatRule }
  | { readonly kind: 'node.nat.remove'; readonly target: NodeRef; readonly ruleId: string }
  | {
      readonly kind: 'node.nat.edit';
      readonly target: NodeRef;
      readonly ruleId: string;
      readonly before: NatRule;
      readonly after: NatRule;
    }
  | { readonly kind: 'node.acl.add'; readonly target: NodeRef; readonly rule: SandboxAclRule }
  | { readonly kind: 'node.acl.remove'; readonly target: NodeRef; readonly ruleId: string }
  | {
      readonly kind: 'node.acl.edit';
      readonly target: NodeRef;
      readonly ruleId: string;
      readonly before: SandboxAclRule;
      readonly after: SandboxAclRule;
    }
  | SnapshotEdit
  | TraceAnnotationEdit
  | PluginEdit;

export type EditKind = Edit['kind'];
export type SandboxReducer<K extends EditKind = EditKind> = (
  snapshot: SimulationSnapshot,
  edit: Extract<Edit, { readonly kind: K }>,
) => SimulationSnapshot;
