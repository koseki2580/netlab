import type { Tutorial } from '../types';
import { hasHopEvent, traces } from './helpers';

export const arpBasics: Tutorial = {
  id: 'arp-basics',
  scenarioId: 'basic-arp',
  title: 'ARP Basics',
  summary: 'Learn how the first packet triggers ARP before IPv4 forwarding can continue.',
  difficulty: 'intro',
  steps: [
    {
      id: 'send-first-packet',
      title: 'Send the first IP packet',
      description: 'Send one packet from the client to the server to populate the first trace.',
      predicate: ({ state }) => traces(state).length >= 1,
    },
    {
      id: 'observe-arp-request',
      title: 'Observe the ARP request broadcast',
      description:
        'Inspect the trace and find the ARP request hop before the routed packet continues.',
      hint: 'Look for the ARP-REQ event before the first forwarded IPv4 hop.',
      predicate: ({ state }) => hasHopEvent(state, 'arp-request'),
    },
    {
      id: 'cache-populated',
      title: "Confirm the sender's ARP cache fills in",
      description:
        'Once the exchange completes, the sender should learn at least one IP-to-MAC mapping.',
      hint: 'The tutorial passes once the sender learns a usable first-hop MAC address.',
      predicate: ({ state }) => {
        if (typeof state !== 'object' || state === null) {
          return false;
        }

        const candidate = (state as unknown as Record<string, unknown>).nodeArpTables;
        if (!candidate || typeof candidate !== 'object') {
          return false;
        }

        return Object.values(candidate).some(
          (table) => table && typeof table === 'object' && Object.keys(table).length > 0,
        );
      },
    },
  ],
};
