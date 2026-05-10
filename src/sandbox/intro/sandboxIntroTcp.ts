import type { PredicateInput, Tutorial } from '../../tutorials/types';
import { intro } from '../../i18n/locales/en/intro';
import { editOf, hasEvent, isRecord } from './predicateUtils';

function isPacketTab(input: PredicateInput): boolean {
  return hasEvent(
    input,
    'sandbox:panel-tab-opened',
    (payload) => isRecord(payload) && payload.axis === 'packet',
  );
}

function isPausedOnSyn(input: PredicateInput): boolean {
  return hasEvent(input, 'sandbox:edit-applied', (payload) => {
    const edit = editOf(payload);
    return edit?.kind === 'traffic.launch' && isRecord(edit.flow) && edit.flow.protocol === 'tcp';
  });
}

function isSynFlippedToRstPayload(payload: unknown): boolean {
  const edit = editOf(payload);
  if (!edit || edit.kind !== 'packet.flags.tcp' || !isRecord(edit.after)) return false;

  return edit.after.syn === false && edit.after.rst === true;
}

function hasSynFlippedToRst(input: PredicateInput): boolean {
  return hasEvent(input, 'sandbox:edit-applied', isSynFlippedToRstPayload);
}

function hasResumedAfterFlagEdit(input: PredicateInput): boolean {
  return hasSynFlippedToRst(input);
}

function handshakeFailedAfterRst(input: PredicateInput): boolean {
  return hasSynFlippedToRst(input);
}

export const sandboxIntroTcp: Tutorial = Object.freeze({
  id: 'sandbox-intro-tcp',
  scenarioId: 'tcp-handshake',
  title: intro['sandbox.intro.tcp.title'],
  summary: intro['sandbox.intro.tcp.summary'],
  difficulty: 'intro',
  steps: Object.freeze([
    {
      id: 'open-packet-tab',
      title: intro['sandbox.intro.tcp.step.openPacketTab.title'],
      description: intro['sandbox.intro.tcp.step.openPacketTab.description'],
      predicate: isPacketTab,
    },
    {
      id: 'pause-on-syn',
      title: intro['sandbox.intro.tcp.step.pauseOnSyn.title'],
      description: intro['sandbox.intro.tcp.step.pauseOnSyn.description'],
      predicate: isPausedOnSyn,
    },
    {
      id: 'flip-syn-to-rst',
      title: intro['sandbox.intro.tcp.step.flipSynToRst.title'],
      description: intro['sandbox.intro.tcp.step.flipSynToRst.description'],
      predicate: hasSynFlippedToRst,
    },
    {
      id: 'resume-after-edit',
      title: intro['sandbox.intro.tcp.step.resumeAfterEdit.title'],
      description: intro['sandbox.intro.tcp.step.resumeAfterEdit.description'],
      predicate: hasResumedAfterFlagEdit,
    },
    {
      id: 'observe-handshake-failure',
      title: intro['sandbox.intro.tcp.step.observeHandshakeFailure.title'],
      description: intro['sandbox.intro.tcp.step.observeHandshakeFailure.description'],
      predicate: handshakeFailedAfterRst,
    },
  ]),
});
