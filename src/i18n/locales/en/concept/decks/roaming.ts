import type { Catalog } from '../../../../types';

/** The `roaming` deck's questions (en); its name is in the core chunk. */
export const roaming: Catalog = {
  'learning.concept.roaming.q1.prompt':
    'A phone’s roaming threshold is lowered from −70 dBm to −85 dBm. What changes as it walks past the APs?',
  'learning.concept.roaming.q1.a': 'It roams sooner and more often, chasing the best AP',
  'learning.concept.roaming.q1.b': 'Nothing: the controller decides when a client moves',
  'learning.concept.roaming.q1.c': 'It clings to a far AP longer, on a weaker signal',
  'learning.concept.roaming.q1.why':
    'Only the client decides when to roam, and it waits until its AP is weaker than the threshold. A lower threshold makes a “sticky” client that stays on a distant AP, drops to slow data rates and takes airtime from everyone on that AP. 802.11k and 802.11v can only advise it.',
  'learning.concept.roaming.q1.a.why':
    'A lower threshold is easier to stay above, so the phone waits longer before roaming, not shorter.',
  'learning.concept.roaming.q1.b.why':
    'The controller and APs can suggest a better AP (802.11v), but the client makes the decision, using its own threshold.',
  'learning.concept.roaming.q2.prompt':
    'Each roam does a full 802.1X login: 8 EAP round trips to a RADIUS server 30 ms away. The call hides gaps up to 150 ms. What happens to the call?',
  'learning.concept.roaming.q2.a': 'A gap of about 260 ms: the caller hears audio drop out',
  'learning.concept.roaming.q2.b': 'About 10 ms of reassociation, well hidden by the call',
  'learning.concept.roaming.q2.c':
    'No gap: it keeps the old AP’s keys until the new ones are ready',
  'learning.concept.roaming.q2.why':
    'The 8 EAP round trips alone take 240 ms; with authentication, reassociation and the 4-way handshake the roam takes 260 ms, over the 150 ms the call can hide, so about 13 voice packets are lost.',
  'learning.concept.roaming.q2.b.why':
    'The frame exchanges over the air are short, but a full login also waits for the RADIUS server on every EAP round trip, and those dominate.',
  'learning.concept.roaming.q2.c.why':
    'The keys of the old AP do not work with the new one; voice cannot flow on the new AP until 802.1X and the 4-way handshake have finished.',
  'learning.concept.roaming.q3.prompt':
    'Why does an 802.11r fast transition (FT) roam take only about 10 ms?',
  'learning.concept.roaming.q3.a': 'It skips encryption until the call is over',
  'learning.concept.roaming.q3.b': 'Keys were derived ahead, so no RADIUS trip is needed',
  'learning.concept.roaming.q3.c': 'It runs the same EAP login, in parallel with reassociation',
  'learning.concept.roaming.q3.why':
    'With FT the keys for the next AP are derived ahead from the first login, so a roam is just two exchanges over the air (FT authentication and reassociation), 5 ms each.',
  'learning.concept.roaming.q3.a.why':
    'Traffic stays encrypted; FT makes roaming fast by having the keys ready, not by dropping security.',
  'learning.concept.roaming.q3.c.why':
    'FT sends no EAP at all during the roam: there are no RADIUS round trips to overlap, only the two air exchanges.',
  'learning.concept.roaming.q4.prompt':
    'Central switching (CAPWAP). Phone A on AP1 calls Phone B on AP2; both APs hang off switch SW1. Which way do the voice frames go?',
  'learning.concept.roaming.q4.a': 'AP1 → SW1 → AP2: the shortest way across the switch',
  'learning.concept.roaming.q4.b': 'Straight from AP1 to AP2 over the air',
  'learning.concept.roaming.q4.c': 'Through the tunnel to the WLC and back down to AP2',
  'learning.concept.roaming.q4.why':
    'In central switching every client frame goes through the CAPWAP tunnel to the controller and back, here AP1, SW1, Core, WLC, Core, SW1, AP2: 6 links instead of 2. In return the client’s VLAN and address stay at the controller, unchanged by roaming.',
  'learning.concept.roaming.q4.a.why':
    'That is local switching, where the AP puts traffic on the wired VLAN itself. In central switching the frames are tunnelled to the controller first.',
  'learning.concept.roaming.q4.b.why':
    'APs do not relay clients’ frames to each other over the air; each AP sends them over its wired uplink.',
};
