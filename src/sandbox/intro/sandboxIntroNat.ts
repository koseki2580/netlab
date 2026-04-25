import type { PredicateInput, Tutorial } from '../../tutorials/types';
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
  title: 'NAT intro',
  summary: 'Add DNAT, test it, remove it.',
  difficulty: 'intro',
  steps: Object.freeze([
    {
      id: 'open-node-tab',
      title: 'Open Node',
      description: 'Open Node.',
      predicate: openedNatNodeTab,
    },
    {
      id: 'add-dnat-rule',
      title: 'Add DNAT',
      description: 'Add DNAT.',
      predicate: addedDnatRule,
    },
    {
      id: 'launch-external-probe',
      title: 'Launch outside',
      description: 'Launch outside.',
      predicate: launchedExternalProbe,
    },
    {
      id: 'observe-dnat-translation',
      title: 'Observe DNAT',
      description: 'See rewrite.',
      predicate: observedDnatTranslation,
    },
    {
      id: 'remove-rule-and-retry',
      title: 'Remove and retry',
      description: 'Retry.',
      predicate: removedRuleAndRetried,
    },
  ]),
});
