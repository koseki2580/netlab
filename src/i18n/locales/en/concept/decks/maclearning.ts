import type { Catalog } from '../../../../types';

/** The `maclearning` deck's questions (en); its name is in the core chunk. */
export const maclearning: Catalog = {
  'learning.concept.maclearning.q1.prompt':
    'A switch has just been powered on, its MAC table empty. Host A on port 1 sends a unicast frame to host B on port 2. Which ports does it leave by?',
  'learning.concept.maclearning.q1.a': 'None: the switch drops it until it has learned B',
  'learning.concept.maclearning.q1.b': 'Ports 2, 3 and 4: it is flooded, as B is unknown',
  'learning.concept.maclearning.q1.c': 'Port 2 only, read from the frame’s destination',
  'learning.concept.maclearning.q1.why':
    'With no entry for B’s address the switch cannot know where B is, so it floods the frame out of every port except the one it came in on. B gets it; C and D discard it.',
  'learning.concept.maclearning.q1.a.why':
    'A switch never drops a frame for an unknown destination; it floods it, so the first frame always gets through.',
  'learning.concept.maclearning.q1.c.why':
    'The destination address says who the frame is for, not which port that host is on. Only the table can tell the switch that, and it is empty.',
  'learning.concept.maclearning.q2.prompt':
    'What does the switch learn from that first frame, A → B arriving on port 1?',
  'learning.concept.maclearning.q2.a': 'That B is on port 2, the port the frame went to',
  'learning.concept.maclearning.q2.b': 'Nothing until B answers the frame',
  'learning.concept.maclearning.q2.c': 'That A’s MAC address is on port 1',
  'learning.concept.maclearning.q2.why':
    'A switch learns from the source address of every frame: A’s address came in on port 1, so frames to A will leave by port 1. When B answers, B is learned on port 2.',
  'learning.concept.maclearning.q2.a.why':
    'The frame was flooded to ports 2, 3 and 4, so the switch has no idea which of them B is on; it learns B only from a frame B sends.',
  'learning.concept.maclearning.q2.b.why':
    'Learning does not wait for an answer: the source address of the frame that just arrived is learned at once.',
  'learning.concept.maclearning.q3.prompt':
    'Virtual machine A migrates from the server on port 1 to the one on port 3. Port 1 stays up and A sends nothing. B then sends to A. What happens?',
  'learning.concept.maclearning.q3.a': 'It leaves by port 1 only, so A never gets it',
  'learning.concept.maclearning.q3.b': 'It leaves by port 3: the switch noticed the move',
  'learning.concept.maclearning.q3.c': 'It is flooded, as A’s entry was cleared',
  'learning.concept.maclearning.q3.why':
    'The table still says A is on port 1, learned seconds ago, so the frame leaves by port 1 alone. Only a frame from A on port 3 moves the entry, which is why hypervisors send one when a VM arrives.',
  'learning.concept.maclearning.q3.b.why':
    'A switch learns only from frames it receives. A has sent nothing from port 3, so nothing has told the switch A moved.',
  'learning.concept.maclearning.q3.c.why':
    'The entry was refreshed seconds ago and port 1 never went down, so nothing cleared it; the switch trusts it.',
  'learning.concept.maclearning.q4.prompt':
    'The ageing time is the default 300 s. A has sent nothing for 400 s, and is still on port 1. B (port 2) sends to A. Which ports does it leave by?',
  'learning.concept.maclearning.q4.a': 'Port 1 only: entries last until the switch restarts',
  'learning.concept.maclearning.q4.b': 'Ports 1, 3 and 4: A’s entry aged out',
  'learning.concept.maclearning.q4.c': 'None: the stale entry makes the switch drop it',
  'learning.concept.maclearning.q4.why':
    'An entry not refreshed for the ageing time is removed. With no entry for A the frame is flooded like on a fresh switch, so A still gets it.',
  'learning.concept.maclearning.q4.a.why':
    'Learned entries are dynamic: one that is not refreshed for the ageing time (300 s by default) is removed, so the table follows the network.',
  'learning.concept.maclearning.q4.c.why':
    'The stale entry is not kept to drop frames; it is removed, and an unknown destination is flooded.',
};
