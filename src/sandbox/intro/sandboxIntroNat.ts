import type { PredicateInput, Tutorial } from '../../tutorials/types';
import { intro } from '../../i18n/locales/en/intro';
import { editOf, eventLog, findLastEditIndex, hasEvent, isRecord } from './predicateUtils';

function openedNatNodeTab(input: PredicateInput): boolean {
  return hasEvent(
    input,
    'sandbox:panel-tab-opened',
    (payload) => isRecord(payload) && payload.axis === 'node',
  );
}

function addedDnatRule(input: PredicateInput): boolean {
  return hasEvent(input, 'sandbox:edit-applied', (payload) => {
    const edit = editOf(payload);
    if (!edit || edit.kind !== 'node.nat.add' || !isRecord(edit.rule)) return false;

    return edit.rule.kind === 'dnat' && edit.rule.translateTo === '192.168.1.10';
  });
}

function launchedExternalProbe(input: PredicateInput): boolean {
  return hasEvent(input, 'sandbox:edit-applied', isExternalProbePayload);
}

function isExternalProbePayload(payload: unknown): boolean {
  const edit = editOf(payload);
  if (!edit || edit.kind !== 'traffic.launch' || !isRecord(edit.flow)) return false;

  return edit.flow.srcNodeId === 'server-1' && edit.flow.dstNodeId === 'nat-router';
}

function observedDnatTranslation(input: PredicateInput): boolean {
  return addedDnatRule(input) && launchedExternalProbe(input);
}

function removedRuleAndRetried(input: PredicateInput): boolean {
  const removeIndex = findLastEditIndex(input, 'node.nat.remove');
  if (removeIndex < 0) return false;

  return eventLog(input)
    .slice(removeIndex + 1)
    .some(
      (event) =>
        isRecord(event) &&
        event.name === 'sandbox:edit-applied' &&
        isExternalProbePayload(event.payload),
    );
}

export const sandboxIntroNat: Tutorial = Object.freeze({
  id: 'sandbox-intro-nat',
  scenarioId: 'nat-basics',
  title: intro['sandbox.intro.nat.title'],
  summary: intro['sandbox.intro.nat.summary'],
  difficulty: 'intro',
  steps: Object.freeze([
    {
      id: 'open-node-tab',
      title: intro['sandbox.intro.nat.step.openNodeTab.title'],
      description: intro['sandbox.intro.nat.step.openNodeTab.description'],
      predicate: openedNatNodeTab,
    },
    {
      id: 'add-dnat-rule',
      title: intro['sandbox.intro.nat.step.addDnatRule.title'],
      description: intro['sandbox.intro.nat.step.addDnatRule.description'],
      predicate: addedDnatRule,
    },
    {
      id: 'launch-external-probe',
      title: intro['sandbox.intro.nat.step.launchExternalProbe.title'],
      description: intro['sandbox.intro.nat.step.launchExternalProbe.description'],
      predicate: launchedExternalProbe,
    },
    {
      id: 'observe-dnat-translation',
      title: intro['sandbox.intro.nat.step.observeDnatTranslation.title'],
      description: intro['sandbox.intro.nat.step.observeDnatTranslation.description'],
      predicate: observedDnatTranslation,
    },
    {
      id: 'remove-rule-and-retry',
      title: intro['sandbox.intro.nat.step.removeRuleAndRetry.title'],
      description: intro['sandbox.intro.nat.step.removeRuleAndRetry.description'],
      predicate: removedRuleAndRetried,
    },
  ]),
});
