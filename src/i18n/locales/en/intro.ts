import type { Catalog } from '../../types';

export const intro = {
  'sandbox.intro.chrome.label': 'SANDBOX INTRO',
  'sandbox.intro.progress': 'Step {{current}} / {{total}}',
  'sandbox.intro.undoBlocked': 'Undo is blocked for this intro step.',
  'sandbox.intro.start': 'Start Intro',
  'sandbox.intro.restart': 'Restart Intro',
  'sandbox.intro.skip': 'Skip Intro',

  'sandbox.intro.mtu.title': 'Sandbox intro',
  'sandbox.intro.mtu.summary':
    'Learn the sandbox loop by editing MTU, launching traffic, and comparing outcomes.',
  'sandbox.intro.mtu.step.openNodeTab.title': 'Open the Node tab',
  'sandbox.intro.mtu.step.openNodeTab.description':
    'Open the Node tab in the sandbox panel to focus on node and link edits.',
  'sandbox.intro.mtu.step.editMtu.title': 'Lower an MTU',
  'sandbox.intro.mtu.step.editMtu.description':
    'Right-click a routed node, open the MTU editor, and apply a smaller interface MTU.',
  'sandbox.intro.mtu.step.launchTraffic.title': 'Launch sandbox traffic',
  'sandbox.intro.mtu.step.launchTraffic.description':
    'Use the Traffic tab to launch a synthetic flow through the edited topology.',
  'sandbox.intro.mtu.step.enterCompare.title': 'Enter Compare mode',
  'sandbox.intro.mtu.step.enterCompare.description':
    'Switch the sandbox from Live to Compare to view baseline and what-if side by side.',
  'sandbox.intro.mtu.step.exitCompare.title': 'Exit Compare mode',
  'sandbox.intro.mtu.step.exitCompare.description':
    'Switch back to Live mode and continue exploring freely.',

  'sandbox.intro.tcp.title': 'TCP intro',
  'sandbox.intro.tcp.summary': 'Flip SYN to RST.',
  'sandbox.intro.tcp.step.openPacketTab.title': 'Open Packet',
  'sandbox.intro.tcp.step.openPacketTab.description': 'Open Packet.',
  'sandbox.intro.tcp.step.pauseOnSyn.title': 'Launch TCP',
  'sandbox.intro.tcp.step.pauseOnSyn.description': 'Launch TCP.',
  'sandbox.intro.tcp.step.flipSynToRst.title': 'Flip SYN to RST',
  'sandbox.intro.tcp.step.flipSynToRst.description': 'SYN off, RST on.',
  'sandbox.intro.tcp.step.resumeAfterEdit.title': 'Resume',
  'sandbox.intro.tcp.step.resumeAfterEdit.description': 'Continue.',
  'sandbox.intro.tcp.step.observeHandshakeFailure.title': 'Observe reset',
  'sandbox.intro.tcp.step.observeHandshakeFailure.description': 'Confirm reset.',

  'sandbox.intro.ospf.title': 'OSPF intro',
  'sandbox.intro.ospf.summary': 'Fail a path and route around it.',
  'sandbox.intro.ospf.step.openNodeTab.title': 'Open Node',
  'sandbox.intro.ospf.step.openNodeTab.description': 'Open Node.',
  'sandbox.intro.ospf.step.disablePrimaryLink.title': 'Disable link',
  'sandbox.intro.ospf.step.disablePrimaryLink.description': 'Fail a link.',
  'sandbox.intro.ospf.step.observeBackupPath.title': 'Launch traffic',
  'sandbox.intro.ospf.step.observeBackupPath.description': 'Launch traffic.',
  'sandbox.intro.ospf.step.addStaticBackup.title': 'Add route',
  'sandbox.intro.ospf.step.addStaticBackup.description': 'Add backup.',
  'sandbox.intro.ospf.step.confirmBackupTraffic.title': 'Confirm path',
  'sandbox.intro.ospf.step.confirmBackupTraffic.description': 'Launch again.',

  'sandbox.intro.nat.title': 'NAT intro',
  'sandbox.intro.nat.summary': 'Add DNAT, test it, remove it.',
  'sandbox.intro.nat.step.openNodeTab.title': 'Open Node',
  'sandbox.intro.nat.step.openNodeTab.description': 'Open Node.',
  'sandbox.intro.nat.step.addDnatRule.title': 'Add DNAT',
  'sandbox.intro.nat.step.addDnatRule.description': 'Add DNAT.',
  'sandbox.intro.nat.step.launchExternalProbe.title': 'Launch outside',
  'sandbox.intro.nat.step.launchExternalProbe.description': 'Launch outside.',
  'sandbox.intro.nat.step.observeDnatTranslation.title': 'Observe DNAT',
  'sandbox.intro.nat.step.observeDnatTranslation.description': 'See rewrite.',
  'sandbox.intro.nat.step.removeRuleAndRetry.title': 'Remove and retry',
  'sandbox.intro.nat.step.removeRuleAndRetry.description': 'Retry.',
} as const satisfies Catalog;
