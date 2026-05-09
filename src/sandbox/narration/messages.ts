import type { TranslatorFn } from '../../i18n/types';
import type { Edit } from '../edits';
import type { SandboxMode } from '../types';

export function editAppliedMessage(t: TranslatorFn, edit: Edit): string {
  switch (edit.kind) {
    case 'interface.mtu':
      return t('sandbox.narration.edit.interfaceMtu', {
        after: edit.after,
        nodeId: edit.target.nodeId,
        ifaceId: edit.target.ifaceId,
      });
    case 'link.state':
      return t('sandbox.narration.edit.linkState', {
        edgeId: edit.target.edgeId,
        after: edit.after,
      });
    case 'node.route.add':
      return t('sandbox.narration.edit.routeAdd', {
        nodeId: edit.target.nodeId,
        prefix: edit.route.prefix,
        nextHop: edit.route.nextHop,
      });
    case 'node.route.remove':
      return t('sandbox.narration.edit.routeRemove', { nodeId: edit.target.nodeId });
    case 'node.route.edit':
      return t('sandbox.narration.edit.routeEdit', { nodeId: edit.target.nodeId });
    case 'node.nat.add':
      return t('sandbox.narration.edit.natAdd', { nodeId: edit.target.nodeId });
    case 'node.nat.remove':
      return t('sandbox.narration.edit.natRemove', { nodeId: edit.target.nodeId });
    case 'node.nat.edit':
      return t('sandbox.narration.edit.natEdit', { nodeId: edit.target.nodeId });
    case 'node.acl.add':
      return t('sandbox.narration.edit.aclAdd', { nodeId: edit.target.nodeId });
    case 'node.acl.remove':
      return t('sandbox.narration.edit.aclRemove', { nodeId: edit.target.nodeId });
    case 'node.acl.edit':
      return t('sandbox.narration.edit.aclEdit', { nodeId: edit.target.nodeId });
    case 'param.set':
      return t('sandbox.narration.edit.paramSet', { key: edit.key, after: String(edit.after) });
    case 'packet.header':
      return t('sandbox.narration.edit.packetHeader', {
        fieldPath: edit.fieldPath,
        after: String(edit.after),
      });
    case 'packet.flags.tcp':
      return t('sandbox.narration.edit.packetFlagsTcp');
    case 'packet.payload':
      return t('sandbox.narration.edit.packetPayload');
    case 'packet.compose':
      return t('sandbox.narration.edit.packetCompose');
    case 'traffic.launch':
      return t('sandbox.narration.edit.trafficLaunch', {
        srcNodeId: edit.flow.srcNodeId,
        dstNodeId: edit.flow.dstNodeId,
      });
    case 'noop':
      return '';
    default:
      return t('sandbox.narration.edit.generic');
  }
}

export function editUndoneMessage(t: TranslatorFn, edit: Edit): string {
  const base = editAppliedMessage(t, edit);
  return base
    ? t('sandbox.narration.undone', { detail: base })
    : t('sandbox.narration.undoneGeneric');
}

export function editRedoneMessage(t: TranslatorFn, edit: Edit): string {
  const base = editAppliedMessage(t, edit);
  return base
    ? t('sandbox.narration.redone', { detail: base })
    : t('sandbox.narration.redoneGeneric');
}

export function modeChangedMessage(t: TranslatorFn, mode: SandboxMode): string {
  return mode === 'beta' ? t('sandbox.narration.modeBeta') : t('sandbox.narration.modeAlpha');
}

export function resetAllMessage(t: TranslatorFn): string {
  return t('sandbox.narration.resetAll');
}
