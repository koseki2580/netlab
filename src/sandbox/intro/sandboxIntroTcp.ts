import type { PredicateInput, Tutorial } from '../../tutorials/types';
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
  title: 'TCP intro',
  summary: 'Flip SYN to RST.',
  difficulty: 'intro',
  steps: Object.freeze([
    {
      id: 'open-packet-tab',
      title: 'Open Packet',
      description: 'Open Packet.',
      predicate: isPacketTab,
    },
    {
      id: 'pause-on-syn',
      title: 'Launch TCP',
      description: 'Launch TCP.',
      predicate: isPausedOnSyn,
    },
    {
      id: 'flip-syn-to-rst',
      title: 'Flip SYN to RST',
      description: 'SYN off, RST on.',
      predicate: hasSynFlippedToRst,
    },
    {
      id: 'resume-after-edit',
      title: 'Resume',
      description: 'Continue.',
      predicate: hasResumedAfterFlagEdit,
    },
    {
      id: 'observe-handshake-failure',
      title: 'Observe reset',
      description: 'Confirm reset.',
      predicate: handshakeFailedAfterRst,
    },
  ]),
});
