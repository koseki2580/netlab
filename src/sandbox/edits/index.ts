import { getSandboxEditSpec, isRegisteredPluginEdit } from '../plugin/registry';
import { isSnapshotEdit } from '../snapshots/edits';
import { reduceSnapshotEdit } from '../snapshots/reducer';
import { isTraceAnnotation, isTraceAnnotationEdit } from '../annotations/edits';
import { reduceAnnotation } from '../annotations/reducer';
import type { SimulationSnapshot } from '../types';
import {
  isAclRule,
  isEdgeRef,
  isInterfaceRef,
  isNatRule,
  isNodeRef,
  isPacketRef,
  isPacketFieldPath,
  isParameterKey,
  isStaticRoute,
  isTrafficFlow,
} from '../types';
import {
  hasNumber,
  hasString,
  hasTarget,
  isGreTunnelConfig,
  isLacpConfig,
  isLinkQosConfig,
  isLinkShaperConfig,
  isLinkState,
  isNetflowConfig,
  isRecord,
  isSflowConfig,
  isTcpFlags,
  isVrfConfig,
  isVrrpConfig,
  isVtepConfig,
  isWifiConfig,
  isWirelessLinkConfig,
} from './guards';
import { emitRejected, getReducer, registerReducer } from './registry';
import type { Edit } from './types';

import './packet';
import './parameter';
import './traffic';
import './route';
import './interface';
import './link';
import './node-misc';
import './nat';
import './acl';

export type { Edit, EditKind, LinkState, SandboxReducer } from './types';
export {
  getReducer,
  isEditWithKind,
  PLACEHOLDER_EDIT_KINDS,
  registeredKinds,
  registerReducer,
} from './registry';

registerReducer('noop', (snapshot) => snapshot);
registerReducer('trace.annotate.add', reduceAnnotation);
registerReducer('trace.annotate.edit', reduceAnnotation);
registerReducer('trace.annotate.remove', reduceAnnotation);
registerReducer('snapshot.create', reduceSnapshotEdit);
registerReducer('snapshot.rename', reduceSnapshotEdit);
registerReducer('snapshot.delete', reduceSnapshotEdit);

export function isEdit(value: unknown): value is Edit {
  if (!isRecord(value) || typeof value.kind !== 'string') {
    return false;
  }

  switch (value.kind) {
    case 'noop':
      return true;
    case 'packet.header':
      return (
        isPacketRef(value.target) &&
        isPacketFieldPath(value.fieldPath) &&
        (typeof value.before === 'string' || typeof value.before === 'number') &&
        (typeof value.after === 'string' || typeof value.after === 'number')
      );
    case 'packet.flags.tcp':
      return isPacketRef(value.target) && isTcpFlags(value.before) && isTcpFlags(value.after);
    case 'packet.payload':
      return (
        isPacketRef(value.target) &&
        typeof value.before === 'string' &&
        typeof value.after === 'string'
      );
    case 'packet.compose':
      return isRecord(value.packet);
    case 'param.set':
      return isParameterKey(value.key) && hasNumber(value, 'before') && hasNumber(value, 'after');
    case 'traffic.launch':
      return isTrafficFlow(value.flow);
    case 'node.route.add':
      return hasTarget(value, isNodeRef) && isStaticRoute(value.route);
    case 'node.route.remove':
      return hasTarget(value, isNodeRef) && hasString(value, 'routeId');
    case 'node.route.edit':
      return (
        hasTarget(value, isNodeRef) &&
        hasString(value, 'routeId') &&
        isStaticRoute(value.before) &&
        isStaticRoute(value.after)
      );
    case 'interface.mtu':
      return (
        hasTarget(value, isInterfaceRef) && hasNumber(value, 'before') && hasNumber(value, 'after')
      );
    case 'link.state':
      return hasTarget(value, isEdgeRef) && isLinkState(value.before) && isLinkState(value.after);
    case 'link.qos':
      return (
        hasTarget(value, isEdgeRef) &&
        (value.before === null || isLinkQosConfig(value.before)) &&
        isLinkQosConfig(value.after)
      );
    case 'link.shaper':
      return (
        hasTarget(value, isEdgeRef) &&
        (value.before === null || isLinkShaperConfig(value.before)) &&
        (value.after === null || isLinkShaperConfig(value.after))
      );
    case 'link.lacp':
      return (
        hasTarget(value, isNodeRef) &&
        hasString(value, 'portId') &&
        (value.before === null || isLacpConfig(value.before)) &&
        (value.after === null || isLacpConfig(value.after))
      );
    case 'node.vrrp':
      return (
        hasTarget(value, isInterfaceRef) &&
        (value.before === null || isVrrpConfig(value.before)) &&
        (value.after === null || isVrrpConfig(value.after))
      );
    case 'link.wireless':
      return (
        hasTarget(value, isEdgeRef) &&
        (value.before === null || isWirelessLinkConfig(value.before)) &&
        (value.after === null || isWirelessLinkConfig(value.after))
      );
    case 'node.wifi':
      return (
        hasTarget(value, isNodeRef) &&
        (value.before === null || isWifiConfig(value.before)) &&
        (value.after === null || isWifiConfig(value.after))
      );
    case 'node.gre':
      return (
        hasTarget(value, isInterfaceRef) &&
        (value.before === null || isGreTunnelConfig(value.before)) &&
        (value.after === null || isGreTunnelConfig(value.after))
      );
    case 'node.mpls-vrf':
      return (
        hasTarget(value, isNodeRef) &&
        (value.before === null || isVrfConfig(value.before)) &&
        (value.after === null || isVrfConfig(value.after))
      );
    case 'node.vxlan-vni':
      return (
        hasTarget(value, isNodeRef) &&
        (value.before === null || isVtepConfig(value.before)) &&
        (value.after === null || isVtepConfig(value.after))
      );
    case 'node.netflow':
      return (
        hasTarget(value, isNodeRef) &&
        (value.before === null || isNetflowConfig(value.before)) &&
        (value.after === null || isNetflowConfig(value.after))
      );
    case 'node.sflow':
      return (
        hasTarget(value, isNodeRef) &&
        (value.before === null || isSflowConfig(value.before)) &&
        (value.after === null || isSflowConfig(value.after))
      );
    case 'node.nat.add':
      return hasTarget(value, isNodeRef) && isNatRule(value.rule);
    case 'node.nat.remove':
      return hasTarget(value, isNodeRef) && hasString(value, 'ruleId');
    case 'node.nat.edit':
      return (
        hasTarget(value, isNodeRef) &&
        hasString(value, 'ruleId') &&
        isNatRule(value.before) &&
        isNatRule(value.after)
      );
    case 'node.acl.add':
      return hasTarget(value, isNodeRef) && isAclRule(value.rule);
    case 'node.acl.remove':
      return hasTarget(value, isNodeRef) && hasString(value, 'ruleId');
    case 'node.acl.edit':
      return (
        hasTarget(value, isNodeRef) &&
        hasString(value, 'ruleId') &&
        isAclRule(value.before) &&
        isAclRule(value.after)
      );
    case 'trace.annotate.add':
      return isTraceAnnotation(value.annotation);
    case 'trace.annotate.edit':
      return isTraceAnnotationEdit(value);
    case 'trace.annotate.remove':
      return isTraceAnnotationEdit(value);
    case 'snapshot.create':
    case 'snapshot.rename':
    case 'snapshot.delete':
      return isSnapshotEdit(value);
    default:
      return isRegisteredPluginEdit(value);
  }
}

export function reduceEdit(snapshot: SimulationSnapshot, edit: unknown): SimulationSnapshot {
  const kind =
    typeof edit === 'object' && edit !== null && 'kind' in edit
      ? (edit.kind as unknown)
      : undefined;

  if (typeof kind !== 'string') {
    emitRejected(edit);
    return snapshot;
  }

  const reducer = getReducer(kind);
  if (reducer) {
    if (!isEdit(edit)) {
      emitRejected(edit);
      return snapshot;
    }

    return reducer(snapshot, edit as never);
  }

  const pluginSpec = getSandboxEditSpec(kind);
  if (!pluginSpec || !pluginSpec.validator(edit)) {
    emitRejected(edit);
    return snapshot;
  }

  try {
    return pluginSpec.reducer(snapshot, edit);
  } catch {
    emitRejected(edit, 'plugin-error');
    return snapshot;
  }
}
