import type { Catalog } from '../../../../types';

/** The `model` deck's questions (en); its name is in the core chunk. */
export const model: Catalog = {
  'learning.concept.model.q1.prompt': 'Why is networking split into layers?',
  'learning.concept.model.q1.a': 'So each layer solves one problem independently',
  'learning.concept.model.q1.b': 'So the network deliberately runs slower',
  'learning.concept.model.q1.c': 'So the network needs more physical cables',
  'learning.concept.model.q1.why':
    'Layering lets Ethernet, IP, TCP and HTTP each do one job and evolve independently — TCP does not care if the link is fiber or Wi-Fi.',
  'learning.concept.model.q2.prompt': 'Going DOWN the stack on send, data passes…',
  'learning.concept.model.q2.a': 'Link → Internet → Transport → Application',
  'learning.concept.model.q2.b': 'Application → Transport → Internet → Link',
  'learning.concept.model.q2.c': 'In random order',
  'learning.concept.model.q2.why':
    'The sender wraps app data in transport (TCP/UDP), then IP, then a link frame; the receiver unwraps in reverse.',
  'learning.concept.model.q3.prompt': 'Encapsulation means…',
  'learning.concept.model.q3.a': 'Encrypting every packet at every layer',
  'learning.concept.model.q3.b': 'Dropping all headers before sending',
  'learning.concept.model.q3.c': 'Each layer wraps the layer above in its own header',
  'learning.concept.model.q3.why':
    'Going down, each layer adds a header (and a trailer at L2); one layer’s payload is the whole unit of the layer above.',
  'learning.concept.model.q4.prompt': 'A router primarily operates at…',
  'learning.concept.model.q4.a': 'The Network layer (L3 / IP)',
  'learning.concept.model.q4.b': 'The Application layer (L7)',
  'learning.concept.model.q4.c': 'The Physical layer (L1)',
  'learning.concept.model.q4.why':
    'Routers forward by IP address (L3); switches forward by MAC (L2); the two cooperate to move a packet end-to-end.',
  'learning.concept.model.q5.prompt': 'A switch primarily operates at…',
  'learning.concept.model.q5.a': 'The Transport layer (L4)',
  'learning.concept.model.q5.b': 'The Data-link layer (L2 / MAC)',
  'learning.concept.model.q5.c': 'The Network layer (L3)',
  'learning.concept.model.q5.why':
    'A switch forwards Ethernet frames by MAC within a LAN and never looks at the IP header.',
  'learning.concept.model.q6.prompt': 'The payload TCP delivers to a web server is…',
  'learning.concept.model.q6.a': 'Another encapsulated IP header',
  'learning.concept.model.q6.b': 'The next-hop MAC address',
  'learning.concept.model.q6.c': 'The application data (e.g. the HTTP request)',
  'learning.concept.model.q6.why':
    'Each layer’s payload is the data of the layer above; TCP carries the application’s bytes up to the server.',
  'learning.concept.model.q1.b.why':
    'Layering adds no delay for its own sake — it splits the work so each layer stays simple and replaceable.',
  'learning.concept.model.q1.c.why':
    'Layering divides responsibilities, not wiring — it says nothing about how many cables you run.',
  'learning.concept.model.q2.a.why':
    'That is the receive order, unwrapping UP the stack; on send the data starts at the Application and moves DOWN.',
  'learning.concept.model.q2.c.why':
    'The order is fixed — each layer adds its header in sequence — never random.',
  'learning.concept.model.q3.a.why':
    'Encapsulation wraps, it does not encrypt; confidentiality is a separate concern (TLS, IPsec).',
  'learning.concept.model.q3.b.why':
    'Encapsulation ADDS a header at each layer; headers are only removed on the way back up (decapsulation).',
  'learning.concept.model.q4.b.why':
    'The Application layer lives on the end hosts; a router forwards on the L3 IP header, not application data.',
  'learning.concept.model.q4.c.why':
    'The Physical layer only moves bits and signals; choosing a next hop needs the L3 IP address.',
  'learning.concept.model.q5.a.why':
    'The Transport layer (L4) is an end-to-end host concern; a switch forwards frames by MAC at L2.',
  'learning.concept.model.q5.c.why':
    'Forwarding by IP is a router’s L3 job; a plain switch works at L2 on MAC addresses.',
  'learning.concept.model.q6.a.why':
    'The IP header is L3 and is stripped before the data reaches the app; TCP hands up the application bytes.',
  'learning.concept.model.q6.b.why':
    'A MAC address sits in the L2 frame header, not in the payload the application consumes.',
};
