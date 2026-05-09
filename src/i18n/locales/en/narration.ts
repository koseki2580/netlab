import type { Catalog } from '../../types';

export const narration: Catalog = {
  'sandbox.narration.edit.interfaceMtu':
    'MTU set to {{after}} on {{nodeId}} interface {{ifaceId}}.',
  'sandbox.narration.edit.linkState': 'Link {{edgeId}} set to {{after}}.',
  'sandbox.narration.edit.routeAdd':
    'Static route added on {{nodeId}}: {{prefix}} via {{nextHop}}.',
  'sandbox.narration.edit.routeRemove': 'Static route removed on {{nodeId}}.',
  'sandbox.narration.edit.routeEdit': 'Static route updated on {{nodeId}}.',
  'sandbox.narration.edit.natAdd': 'NAT rule added on {{nodeId}}.',
  'sandbox.narration.edit.natRemove': 'NAT rule removed on {{nodeId}}.',
  'sandbox.narration.edit.natEdit': 'NAT rule updated on {{nodeId}}.',
  'sandbox.narration.edit.aclAdd': 'ACL rule added on {{nodeId}}.',
  'sandbox.narration.edit.aclRemove': 'ACL rule removed on {{nodeId}}.',
  'sandbox.narration.edit.aclEdit': 'ACL rule updated on {{nodeId}}.',
  'sandbox.narration.edit.paramSet': 'Parameter {{key}} changed to {{after}}.',
  'sandbox.narration.edit.packetHeader': 'Packet header field {{fieldPath}} set to {{after}}.',
  'sandbox.narration.edit.packetFlagsTcp': 'TCP flags updated.',
  'sandbox.narration.edit.packetPayload': 'Packet payload updated.',
  'sandbox.narration.edit.packetCompose': 'New packet composed.',
  'sandbox.narration.edit.trafficLaunch':
    'Traffic flow launched from {{srcNodeId}} to {{dstNodeId}}.',
  'sandbox.narration.edit.generic': 'Edit applied.',
  'sandbox.narration.undone': 'Undone: {{detail}}',
  'sandbox.narration.undoneGeneric': 'Last edit undone.',
  'sandbox.narration.redone': 'Redone: {{detail}}',
  'sandbox.narration.redoneGeneric': 'Last edit redone.',
  'sandbox.narration.modeBeta':
    'Compare mode enabled; baseline and what-if are running side by side.',
  'sandbox.narration.modeAlpha': 'Compare mode exited.',
  'sandbox.narration.resetAll': 'All edits reset; sandbox returned to baseline.',
} as const;
