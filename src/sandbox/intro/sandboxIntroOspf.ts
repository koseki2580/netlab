import type { PredicateInput, Tutorial } from '../../tutorials/types';
import { intro } from '../../i18n/locales/en/intro';
import { editOf, eventLog, findLastEditIndex, hasEvent, isRecord } from './predicateUtils';

function openedNodeTab(input: PredicateInput): boolean {
  return hasEvent(
    input,
    'sandbox:panel-tab-opened',
    (payload) => isRecord(payload) && payload.axis === 'node',
  );
}

function disabledPrimaryLink(input: PredicateInput): boolean {
  return hasEvent(input, 'sandbox:edit-applied', (payload) => {
    const edit = editOf(payload);
    return (
      (edit?.kind === 'link.state' && edit.after === 'down') || edit?.kind === 'traffic.launch'
    );
  });
}

function observedBackupPath(input: PredicateInput): boolean {
  return disabledPrimaryLink(input) && hasEvent(input, 'sandbox:edit-applied', isTrafficLaunch);
}

function addedStaticBackupRoute(input: PredicateInput): boolean {
  return hasEvent(input, 'sandbox:edit-applied', (payload) => {
    const edit = editOf(payload);
    return edit?.kind === 'node.route.add';
  });
}

function trafficUsesBackupRoute(input: PredicateInput): boolean {
  const routeIndex = findLastEditIndex(input, 'node.route.add');
  return (
    routeIndex >= 0 &&
    eventLog(input)
      .slice(routeIndex + 1)
      .some(isTrafficLaunchEvent)
  );
}

function isTrafficLaunch(payload: unknown): boolean {
  return editOf(payload)?.kind === 'traffic.launch';
}

function isTrafficLaunchEvent(event: unknown): boolean {
  return isRecord(event) && event.name === 'sandbox:edit-applied' && isTrafficLaunch(event.payload);
}

export const sandboxIntroOspf: Tutorial = Object.freeze({
  id: 'sandbox-intro-ospf',
  scenarioId: 'ospf-convergence',
  title: intro['sandbox.intro.ospf.title'],
  summary: intro['sandbox.intro.ospf.summary'],
  difficulty: 'intro',
  steps: Object.freeze([
    {
      id: 'open-node-tab',
      title: intro['sandbox.intro.ospf.step.openNodeTab.title'],
      description: intro['sandbox.intro.ospf.step.openNodeTab.description'],
      predicate: openedNodeTab,
    },
    {
      id: 'disable-primary-link',
      title: intro['sandbox.intro.ospf.step.disablePrimaryLink.title'],
      description: intro['sandbox.intro.ospf.step.disablePrimaryLink.description'],
      predicate: disabledPrimaryLink,
    },
    {
      id: 'observe-backup-path',
      title: intro['sandbox.intro.ospf.step.observeBackupPath.title'],
      description: intro['sandbox.intro.ospf.step.observeBackupPath.description'],
      predicate: observedBackupPath,
    },
    {
      id: 'add-static-backup',
      title: intro['sandbox.intro.ospf.step.addStaticBackup.title'],
      description: intro['sandbox.intro.ospf.step.addStaticBackup.description'],
      predicate: addedStaticBackupRoute,
    },
    {
      id: 'confirm-backup-traffic',
      title: intro['sandbox.intro.ospf.step.confirmBackupTraffic.title'],
      description: intro['sandbox.intro.ospf.step.confirmBackupTraffic.description'],
      predicate: trafficUsesBackupRoute,
    },
  ]),
});
