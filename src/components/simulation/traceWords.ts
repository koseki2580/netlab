import type { TranslatorFn } from '../../i18n/types';
import type { PacketTrace } from '../../types/simulation';

/** Phone-width rules the shared controls need and inline styles cannot say. */
export const NARROW_CSS =
  '@media (max-width:640px){.netlab-tap{min-width:44px;min-height:44px}.netlab-wide{display:none}.netlab-grow{overflow:visible!important;flex:none!important}.netlab-grow-box{overflow-y:auto}.netlab-bar{flex-shrink:1!important;min-height:min-content!important}}';

const EVENT_WORD_KEYS: Record<string, string> = {
  create: 'simulation.event.create',
  forward: 'simulation.event.forward',
  deliver: 'simulation.event.deliver',
  drop: 'simulation.event.drop',
  'arp-request': 'simulation.event.arpRequest',
  'arp-reply': 'simulation.event.arpReply',
};

/** An event code in the reader's words; a code with no word stays as it is. */
export function eventWord(event: string, t: TranslatorFn): string {
  const key = EVENT_WORD_KEYS[event];
  return key ? t(key) : event;
}

/** "Step 3 of 10: Router (ARP request)" — where the packet is right now. */
export function hopReadout(trace: PacketTrace, step: number, t: TranslatorFn): string {
  const hop = trace.hops[step];
  if (!hop) return '';
  return t('simulation.steps.readout', {
    current: step + 1,
    total: trace.hops.length,
    node: hop.nodeLabel,
    event: eventWord(hop.event, t),
  });
}

/** How a finished trace ended, in a sentence; empty while it has not ended. */
export function traceOutcome(trace: PacketTrace, t: TranslatorFn): string {
  const last = trace.hops[trace.hops.length - 1];
  if (!last) return '';
  if (trace.status === 'delivered') {
    return t('simulation.steps.delivered', { node: last.nodeLabel });
  }
  if (trace.status === 'dropped') {
    return t('simulation.steps.dropped', {
      node: last.nodeLabel,
      reason: last.reason ?? eventWord('drop', t),
    });
  }
  return '';
}
