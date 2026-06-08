import type { Tutorial } from '../types';
import { allHops, mostRecentTrace, natEntriesForRouter } from './helpers';

const NAT_ROUTER_ID = 'nat-router';
const INSIDE_LOCAL_IP = '192.168.1.10';
const INSIDE_GLOBAL_IP = '203.0.113.1';

export const natTranslation: Tutorial = {
  id: 'nat-translation',
  scenarioId: 'nat-basics',
  title: 'NAT: SNAT & Port Forwarding',
  summary:
    'Watch the edge router rewrite a private source for outbound traffic, track the session, then forward an inbound port to an internal host.',
  difficulty: 'core',
  steps: [
    {
      id: 'outbound-snat',
      title: 'Rewrite the private source (SNAT)',
      description:
        'Send Client A → Internet. The edge router replaces the private 192.168.1.10 source with its public 203.0.113.1 address.',
      hint: 'Click "Client A → Internet (SNAT)", then open the R-Edge hop to read the translation.',
      predicate: ({ state }) =>
        allHops(state).some(
          (hop) =>
            hop.natTranslation?.type === 'snat' &&
            hop.natTranslation.postSrcIp === INSIDE_GLOBAL_IP,
        ),
    },
    {
      id: 'snat-session-tracked',
      title: 'Confirm the NAT table tracks the session',
      description:
        'The router stores the inside-local → inside-global mapping so the reply can be translated back to the original client.',
      hint: 'Read the NAT table panel — an SNAT row should map 192.168.1.10 to 203.0.113.1.',
      predicate: ({ state }) =>
        natEntriesForRouter(state, NAT_ROUTER_ID).some(
          (entry) =>
            entry.type === 'snat' &&
            entry.insideLocalIp === INSIDE_LOCAL_IP &&
            entry.insideGlobalIp === INSIDE_GLOBAL_IP,
        ),
    },
    {
      id: 'inbound-dnat',
      title: 'Forward an inbound port (DNAT)',
      description:
        'Send Internet → Client A on :8080. Port forwarding rewrites the public destination to the internal host 192.168.1.10:80, and the packet is delivered.',
      hint: 'Click "Internet → Client A (DNAT 8080)" and confirm the trace turns delivered.',
      predicate: ({ state }) =>
        allHops(state).some(
          (hop) =>
            hop.natTranslation?.type === 'dnat' &&
            hop.natTranslation.postDstIp === INSIDE_LOCAL_IP &&
            hop.natTranslation.postDstPort === 80,
        ) && mostRecentTrace(state)?.status === 'delivered',
    },
  ],
};
