import type { Catalog } from '../../types';

export const conceptCheck: Catalog = {
  'learning.concept.title': 'Protocol Concept Checks',
  'learning.concept.primer.title': 'How this works',
  'learning.concept.primer.body':
    'Pick a protocol and answer a few quick questions to check what you really understand. Every answer comes with a one-line explanation, and a session ends with your score. Decks span the stack from L2 to security.',
  'learning.concept.pickDeck': 'Choose a protocol to drill',
  'learning.concept.search': 'Filter protocols (e.g. BGP, TLS)',
  'learning.concept.searchEmpty': 'No protocols match “{{query}}”.',
  'learning.concept.streak': '{{count}} correct in a row',
  'learning.concept.backToDecks': '← All protocols',
  'learning.concept.deckProgress': 'Question {{current}} / {{total}}',
  'learning.concept.layer.l2': 'Layer 2 — Link',
  'learning.concept.layer.l3': 'Layer 3 — Network',
  'learning.concept.layer.l4': 'Layer 4 — Transport',
  'learning.concept.layer.l5': 'Security',
  'learning.concept.layer.l7': 'Layer 7 — Application',
  'learning.concept.layer.routing': 'Routing',
  'learning.concept.arp.name': 'ARP',
  'learning.concept.arp.q1.prompt': 'What does ARP resolve?',
  'learning.concept.arp.q1.a': 'An IPv4 address to a MAC address',
  'learning.concept.arp.q1.b': 'A hostname to an IP address',
  'learning.concept.arp.q1.c': 'A MAC address to a switch port',
  'learning.concept.arp.q1.why':
    'ARP maps a known IPv4 address to the link-layer MAC needed to frame the packet on the LAN.',
  'learning.concept.arp.q2.prompt': 'An ARP request is sent to which destination MAC?',
  'learning.concept.arp.q2.a': "The target host's MAC",
  'learning.concept.arp.q2.b': 'The broadcast address ff:ff:ff:ff:ff:ff',
  'learning.concept.arp.q2.c': "The default gateway's MAC",
  'learning.concept.arp.q2.why':
    "The sender doesn't know the target MAC yet, so the request is broadcast to every host on the segment.",
  'learning.concept.arp.q3.prompt': 'ARP operates within…',
  'learning.concept.arp.q3.a': 'The entire internet',
  'learning.concept.arp.q3.b': 'Only between routers',
  'learning.concept.arp.q3.c': 'A single broadcast domain (LAN)',
  'learning.concept.arp.q3.why':
    'ARP is link-local; to reach a remote network you ARP for the gateway, not the remote host.',
  'learning.concept.stp.name': 'STP',
  'learning.concept.stp.q1.prompt': 'What problem does Spanning Tree prevent?',
  'learning.concept.stp.q1.a': 'IP address exhaustion',
  'learning.concept.stp.q1.b': 'Layer-2 forwarding loops',
  'learning.concept.stp.q1.c': 'Routing loops',
  'learning.concept.stp.q1.why':
    'Redundant switch links would loop broadcasts forever; STP blocks ports to form a loop-free tree.',
  'learning.concept.stp.q2.prompt': 'The switch chosen as the reference point of the tree is the…',
  'learning.concept.stp.q2.a': 'Root bridge',
  'learning.concept.stp.q2.b': 'Designated router',
  'learning.concept.stp.q2.c': 'Default gateway',
  'learning.concept.stp.q2.why':
    'The bridge with the lowest priority/MAC becomes the root; all path costs are measured toward it.',
  'learning.concept.stp.q3.prompt': 'A blocked STP port…',
  'learning.concept.stp.q3.a': 'Is physically disconnected',
  'learning.concept.stp.q3.b': 'Forwards data but ignores BPDUs',
  'learning.concept.stp.q3.c': 'Forwards only BPDUs, not data frames',
  'learning.concept.stp.q3.why':
    'Blocked ports still listen to BPDUs so STP can reactivate them if the topology changes.',
  'learning.concept.vlan.name': 'VLAN',
  'learning.concept.vlan.q1.prompt': 'A VLAN creates…',
  'learning.concept.vlan.q1.a': 'A separate broadcast domain on a shared switch',
  'learning.concept.vlan.q1.b': 'A new physical cable',
  'learning.concept.vlan.q1.c': 'A routing table',
  'learning.concept.vlan.q1.why':
    'Each VLAN is its own L2 broadcast domain; hosts in different VLANs need a router to talk.',
  'learning.concept.vlan.q2.prompt': 'A trunk port carries…',
  'learning.concept.vlan.q2.a': 'One VLAN only',
  'learning.concept.vlan.q2.b': 'Multiple VLANs, tagged with 802.1Q',
  'learning.concept.vlan.q2.c': 'Only untagged traffic',
  'learning.concept.vlan.q2.why':
    'Trunks tag frames with a VLAN ID so several VLANs share one link between switches.',
  'learning.concept.vlan.q3.prompt': 'To move traffic between two VLANs you need…',
  'learning.concept.vlan.q3.a': 'A longer cable',
  'learning.concept.vlan.q3.b': 'A second root bridge',
  'learning.concept.vlan.q3.c': 'A router or L3 switch',
  'learning.concept.vlan.q3.why':
    'VLANs are separate L3 subnets; inter-VLAN traffic must be routed.',
  'learning.concept.tcp.name': 'TCP',
  'learning.concept.tcp.q1.prompt': 'The TCP three-way handshake order is…',
  'learning.concept.tcp.q1.a': 'SYN, SYN-ACK, ACK',
  'learning.concept.tcp.q1.b': 'ACK, SYN, FIN',
  'learning.concept.tcp.q1.c': 'SYN, ACK, SYN',
  'learning.concept.tcp.q1.why':
    'The client SYNs, the server SYN-ACKs, the client ACKs — then the connection is established.',
  'learning.concept.tcp.q2.prompt': 'TCP guarantees…',
  'learning.concept.tcp.q2.a': 'The lowest possible latency',
  'learning.concept.tcp.q2.b': 'Reliable, in-order delivery',
  'learning.concept.tcp.q2.c': 'Encryption of the payload',
  'learning.concept.tcp.q2.why':
    'Sequence numbers, acknowledgements and retransmission give reliable ordered bytes; encryption is TLS’s job.',
  'learning.concept.tcp.q3.prompt': 'What closes a TCP connection gracefully?',
  'learning.concept.tcp.q3.a': 'An RST segment',
  'learning.concept.tcp.q3.b': 'A second SYN',
  'learning.concept.tcp.q3.c': 'A FIN exchange',
  'learning.concept.tcp.q3.why':
    "Each side sends FIN and ACKs the other's FIN; RST is an abrupt abort, not a graceful close.",
  'learning.concept.udp.name': 'UDP',
  'learning.concept.udp.q1.prompt': 'Compared to TCP, UDP…',
  'learning.concept.udp.q1.a': 'Adds retransmission',
  'learning.concept.udp.q1.b': 'Guarantees ordering',
  'learning.concept.udp.q1.c': 'Has no handshake or delivery guarantee',
  'learning.concept.udp.q1.why':
    'UDP is connectionless and fire-and-forget — lower overhead, no reliability.',
  'learning.concept.udp.q2.prompt': 'UDP is a good fit for…',
  'learning.concept.udp.q2.a': 'Large file downloads',
  'learning.concept.udp.q2.b': 'Real-time voice/video and DNS',
  'learning.concept.udp.q2.c': 'Bank transactions',
  'learning.concept.udp.q2.why':
    "Latency-sensitive or simple request/response traffic prefers UDP's low overhead over TCP's reliability cost.",
  'learning.concept.udp.q3.prompt': 'A UDP header contains…',
  'learning.concept.udp.q3.a': 'Source/destination ports, length, checksum',
  'learning.concept.udp.q3.b': 'Sequence and acknowledgement numbers',
  'learning.concept.udp.q3.c': 'A congestion window',
  'learning.concept.udp.q3.why':
    'UDP is minimal: just ports, length, and an optional checksum — no connection state.',
  'learning.concept.nat.name': 'NAT',
  'learning.concept.nat.q1.prompt': 'NAT primarily lets…',
  'learning.concept.nat.q1.a': 'Many private hosts share one public IP',
  'learning.concept.nat.q1.b': 'Switches learn MAC addresses',
  'learning.concept.nat.q1.c': 'Routers run OSPF',
  'learning.concept.nat.q1.why':
    'Source NAT/PAT rewrites private addresses to a public one (tracking ports) so a whole LAN shares a public IP.',
  'learning.concept.nat.q2.prompt':
    'For inbound connections to reach an internal server you configure…',
  'learning.concept.nat.q2.a': 'A default route',
  'learning.concept.nat.q2.b': 'Port forwarding (DNAT)',
  'learning.concept.nat.q2.c': 'A VLAN trunk',
  'learning.concept.nat.q2.why':
    'DNAT maps a public ip:port to an internal host:port so outside clients can reach it.',
  'learning.concept.nat.q3.prompt': 'NAT keeps a translation table to…',
  'learning.concept.nat.q3.a': 'Encrypt the traffic',
  'learning.concept.nat.q3.b': 'Elect a root bridge',
  'learning.concept.nat.q3.c': 'Match replies back to the right inside host',
  'learning.concept.nat.q3.why':
    'The table remembers each inside-local↔inside-global mapping so return packets are translated back correctly.',
  'learning.concept.dns.name': 'DNS',
  'learning.concept.dns.q1.prompt': 'DNS translates…',
  'learning.concept.dns.q1.a': 'Hostnames to IP addresses',
  'learning.concept.dns.q1.b': 'IP addresses to MAC addresses',
  'learning.concept.dns.q1.c': 'Ports to service names',
  'learning.concept.dns.q1.why':
    'DNS resolves human names like example.com to the IP addresses needed to connect.',
  'learning.concept.dns.q2.prompt': 'Which record maps a name to an IPv4 address?',
  'learning.concept.dns.q2.a': 'MX',
  'learning.concept.dns.q2.b': 'A',
  'learning.concept.dns.q2.c': 'CNAME',
  'learning.concept.dns.q2.why':
    'An A record holds an IPv4 address; AAAA is IPv6, MX is mail, CNAME is an alias.',
  'learning.concept.dns.q3.prompt': 'A recursive resolver…',
  'learning.concept.dns.q3.a': 'Answers only from its own zone',
  'learning.concept.dns.q3.b': 'Only caches MAC addresses',
  'learning.concept.dns.q3.c': 'Queries other servers on your behalf until it has the answer',
  'learning.concept.dns.q3.why':
    'The recursive resolver walks the DNS hierarchy (root → TLD → authoritative) and returns the final answer.',
  'learning.concept.tls.name': 'TLS',
  'learning.concept.tls.q1.prompt': 'TLS provides…',
  'learning.concept.tls.q1.a': 'Routing between networks',
  'learning.concept.tls.q1.b': 'Encryption, integrity, and server authentication',
  'learning.concept.tls.q1.c': 'IP address assignment',
  'learning.concept.tls.q1.why':
    'TLS secures a transport connection: it encrypts data, detects tampering, and authenticates the server via its certificate.',
  'learning.concept.tls.q2.prompt': 'During the handshake the server proves its identity with…',
  'learning.concept.tls.q2.a': 'A MAC address',
  'learning.concept.tls.q2.b': 'A VLAN tag',
  'learning.concept.tls.q2.c': 'An X.509 certificate',
  'learning.concept.tls.q2.why':
    "The certificate, signed by a CA the client trusts, binds the server's name to its public key.",
  'learning.concept.tls.q3.prompt': 'TLS runs…',
  'learning.concept.tls.q3.a': 'Over a reliable transport like TCP',
  'learning.concept.tls.q3.b': 'Below IP',
  'learning.concept.tls.q3.c': 'Instead of Ethernet',
  'learning.concept.tls.q3.why':
    'TLS assumes an ordered, reliable byte stream, so it sits on top of TCP (QUIC provides its own).',
  'learning.concept.ethernet.name': 'Ethernet',
  'learning.concept.ethernet.q1.prompt': 'An Ethernet frame is addressed using…',
  'learning.concept.ethernet.q1.a': 'MAC addresses',
  'learning.concept.ethernet.q1.b': 'IP addresses',
  'learning.concept.ethernet.q1.c': 'Port numbers',
  'learning.concept.ethernet.q1.why':
    'Layer-2 frames are delivered by 48-bit MAC addresses within a LAN segment.',
  'learning.concept.ethernet.q2.prompt': 'A switch builds its MAC table by…',
  'learning.concept.ethernet.q2.a': 'Reading IP headers',
  'learning.concept.ethernet.q2.b': 'Learning source MACs from incoming frames',
  'learning.concept.ethernet.q2.c': 'Running OSPF',
  'learning.concept.ethernet.q2.why':
    'A switch records which port each source MAC arrives on, then forwards by destination MAC.',
  'learning.concept.ethernet.q3.prompt': 'A frame with an unknown destination MAC is…',
  'learning.concept.ethernet.q3.a': 'Dropped',
  'learning.concept.ethernet.q3.b': 'Routed to the gateway',
  'learning.concept.ethernet.q3.c': 'Flooded out all other ports',
  'learning.concept.ethernet.q3.why':
    'Unknown-unicast frames are flooded so the destination can reply and be learned.',
  'learning.concept.dhcp.name': 'DHCP',
  'learning.concept.dhcp.q1.prompt': 'The DHCP four-step exchange is…',
  'learning.concept.dhcp.q1.a': 'SYN, SYN-ACK, ACK, FIN',
  'learning.concept.dhcp.q1.b': 'Discover, Offer, Request, Ack (DORA)',
  'learning.concept.dhcp.q1.c': 'Query, Response, Renew, Release',
  'learning.concept.dhcp.q1.why':
    'The client Discovers, the server Offers, the client Requests, the server Acks the lease.',
  'learning.concept.dhcp.q2.prompt': 'The first DHCP Discover is sent as…',
  'learning.concept.dhcp.q2.a': 'A broadcast',
  'learning.concept.dhcp.q2.b': 'A unicast to the server',
  'learning.concept.dhcp.q2.c': 'A multicast to routers',
  'learning.concept.dhcp.q2.why':
    "The client has no IP yet and doesn't know the server, so Discover is broadcast.",
  'learning.concept.dhcp.q3.prompt': 'Besides an IP address, DHCP commonly provides…',
  'learning.concept.dhcp.q3.a': 'A MAC address',
  'learning.concept.dhcp.q3.b': 'A TCP port',
  'learning.concept.dhcp.q3.c': 'The default gateway and DNS servers',
  'learning.concept.dhcp.q3.why':
    'DHCP options carry gateway, subnet mask, DNS, and lease time alongside the address.',
  'learning.concept.icmp.name': 'ICMP',
  'learning.concept.icmp.q1.prompt': 'ping uses which protocol?',
  'learning.concept.icmp.q1.a': 'ICMP Echo Request/Reply',
  'learning.concept.icmp.q1.b': 'TCP',
  'learning.concept.icmp.q1.c': 'UDP',
  'learning.concept.icmp.q1.why': 'ping sends ICMP Echo Requests and times the Echo Replies.',
  'learning.concept.icmp.q2.prompt': 'A packet whose TTL reaches 0 triggers…',
  'learning.concept.icmp.q2.a': 'An ARP request',
  'learning.concept.icmp.q2.b': 'ICMP Time Exceeded',
  'learning.concept.icmp.q2.c': 'A TCP RST',
  'learning.concept.icmp.q2.why':
    'The router that decrements TTL to 0 drops the packet and returns ICMP Time Exceeded — the basis of traceroute.',
  'learning.concept.icmp.q3.prompt': 'ICMP mainly carries…',
  'learning.concept.icmp.q3.a': 'Application data',
  'learning.concept.icmp.q3.b': 'Routing tables',
  'learning.concept.icmp.q3.c': 'Error and diagnostic messages',
  'learning.concept.icmp.q3.why':
    'ICMP reports problems (unreachable, fragmentation needed, time exceeded) and supports diagnostics, not user data.',
  'learning.concept.ipv4.name': 'IPv4',
  'learning.concept.ipv4.q1.prompt': 'The IPv4 TTL field…',
  'learning.concept.ipv4.q1.a': 'Encrypts the packet',
  'learning.concept.ipv4.q1.b': 'Is decremented by each router to prevent loops',
  'learning.concept.ipv4.q1.c': 'Sets the priority',
  'learning.concept.ipv4.q1.why':
    'Every hop decrements TTL; at 0 the packet is dropped, bounding how long it can circulate.',
  'learning.concept.ipv4.q2.prompt': 'An IPv4 address is…',
  'learning.concept.ipv4.q2.a': '32 bits, written as four octets',
  'learning.concept.ipv4.q2.b': '48 bits',
  'learning.concept.ipv4.q2.c': '128 bits',
  'learning.concept.ipv4.q2.why':
    'IPv4 is 32-bit, shown as dotted decimal like 192.168.1.1; 48-bit is MAC, 128-bit is IPv6.',
  'learning.concept.ipv4.q3.prompt':
    'If a packet exceeds the link MTU and DF is clear, the router…',
  'learning.concept.ipv4.q3.a': 'Drops it silently',
  'learning.concept.ipv4.q3.b': 'Encrypts it',
  'learning.concept.ipv4.q3.c': 'Fragments it',
  'learning.concept.ipv4.q3.why':
    "IPv4 routers fragment oversized packets unless the Don't-Fragment bit is set, when they return ICMP instead.",
  'learning.concept.ipv6.name': 'IPv6',
  'learning.concept.ipv6.q1.prompt': 'An IPv6 address is…',
  'learning.concept.ipv6.q1.a': '128 bits',
  'learning.concept.ipv6.q1.b': '32 bits',
  'learning.concept.ipv6.q1.c': '64 bits',
  'learning.concept.ipv6.q1.why':
    'IPv6 expands the address to 128 bits, written as eight hex groups.',
  'learning.concept.ipv6.q2.prompt': 'IPv6 replaces ARP with…',
  'learning.concept.ipv6.q2.a': 'DHCP',
  'learning.concept.ipv6.q2.b': 'Neighbor Discovery (NDP)',
  'learning.concept.ipv6.q2.c': 'STP',
  'learning.concept.ipv6.q2.why':
    'NDP uses ICMPv6 Neighbor Solicitation/Advertisement to resolve link-layer addresses.',
  'learning.concept.ipv6.q3.prompt': 'IPv6 has no…',
  'learning.concept.ipv6.q3.a': 'Routing',
  'learning.concept.ipv6.q3.b': 'Addresses',
  'learning.concept.ipv6.q3.c': 'Broadcast (it uses multicast)',
  'learning.concept.ipv6.q3.why':
    'IPv6 drops broadcast entirely; "all-nodes" traffic uses multicast groups instead.',
  'learning.concept.ospf.name': 'OSPF',
  'learning.concept.ospf.q1.prompt': 'OSPF is a…',
  'learning.concept.ospf.q1.a': 'Link-state protocol',
  'learning.concept.ospf.q1.b': 'Distance-vector protocol',
  'learning.concept.ospf.q1.c': 'Path-vector protocol',
  'learning.concept.ospf.q1.why':
    'OSPF floods link-state advertisements so every router builds the same map and runs SPF (Dijkstra).',
  'learning.concept.ospf.q2.prompt': 'OSPF picks the best path by…',
  'learning.concept.ospf.q2.a': 'Hop count',
  'learning.concept.ospf.q2.b': 'Total link cost (often bandwidth-based)',
  'learning.concept.ospf.q2.c': 'AS-path length',
  'learning.concept.ospf.q2.why':
    "OSPF sums per-link costs; the lowest total cost wins, unlike RIP's hop count.",
  'learning.concept.ospf.q3.prompt': 'When a link fails, OSPF…',
  'learning.concept.ospf.q3.a': 'Waits for a timer only',
  'learning.concept.ospf.q3.b': 'Does nothing',
  'learning.concept.ospf.q3.c': 'Re-floods LSAs and recomputes the shortest path',
  'learning.concept.ospf.q3.why':
    'Topology changes trigger new LSAs and a fresh SPF run, so OSPF reconverges around failures.',
  'learning.concept.bgp.name': 'BGP',
  'learning.concept.bgp.q1.prompt': 'BGP is the protocol that…',
  'learning.concept.bgp.q1.a': 'Routes between autonomous systems (the internet backbone)',
  'learning.concept.bgp.q1.b': 'Assigns IP addresses',
  'learning.concept.bgp.q1.c': 'Resolves names',
  'learning.concept.bgp.q1.why':
    'BGP exchanges reachability between ASes and is how independent networks form the global internet.',
  'learning.concept.bgp.q2.prompt': 'BGP chooses paths primarily by…',
  'learning.concept.bgp.q2.a': 'Lowest hop count',
  'learning.concept.bgp.q2.b': 'Policy and the AS-path (path-vector)',
  'learning.concept.bgp.q2.c': 'Link cost',
  'learning.concept.bgp.q2.why':
    'BGP is a path-vector protocol; operators apply policy on attributes like AS-path length and local preference.',
  'learning.concept.bgp.q3.prompt': "An 'AS' in BGP is…",
  'learning.concept.bgp.q3.a': 'A single router',
  'learning.concept.bgp.q3.b': 'A subnet',
  'learning.concept.bgp.q3.c': 'An autonomous system — a network under one administration',
  'learning.concept.bgp.q3.why': 'Each AS has a number and announces which prefixes it can reach.',
  'learning.concept.rip.name': 'RIP',
  'learning.concept.rip.q1.prompt': 'RIP selects routes by…',
  'learning.concept.rip.q1.a': 'Hop count (distance vector)',
  'learning.concept.rip.q1.b': 'Link cost',
  'learning.concept.rip.q1.c': 'AS path',
  'learning.concept.rip.q1.why':
    'RIP counts router hops; the fewest-hops path wins, regardless of link speed.',
  'learning.concept.rip.q2.prompt': "RIP's maximum usable hop count is…",
  'learning.concept.rip.q2.a': '255',
  'learning.concept.rip.q2.b': '15 (16 means unreachable)',
  'learning.concept.rip.q2.c': 'Unlimited',
  'learning.concept.rip.q2.why':
    'RIP caps at 15 hops; 16 is "infinity," which bounds its use to small networks.',
  'learning.concept.rip.q3.prompt': 'Compared with OSPF, RIP…',
  'learning.concept.rip.q3.a': 'Converges faster',
  'learning.concept.rip.q3.b': 'Scales to huge networks',
  'learning.concept.rip.q3.c': 'Is simpler but slower and limited in size',
  'learning.concept.rip.q3.why':
    "RIP's periodic distance-vector updates are easy but converge slowly and don't scale like link-state OSPF.",
  'learning.concept.http.name': 'HTTP',
  'learning.concept.http.q1.prompt': 'HTTP follows which model?',
  'learning.concept.http.q1.a': 'Request/response',
  'learning.concept.http.q1.b': 'Publish/subscribe',
  'learning.concept.http.q1.c': 'Broadcast',
  'learning.concept.http.q1.why':
    'A client sends a request (method + URL) and the server returns a response with a status and body.',
  'learning.concept.http.q2.prompt': 'Which is a safe, read-only HTTP method?',
  'learning.concept.http.q2.a': 'POST',
  'learning.concept.http.q2.b': 'GET',
  'learning.concept.http.q2.c': 'DELETE',
  'learning.concept.http.q2.why':
    'GET retrieves a resource without side effects; POST/PUT/DELETE modify state.',
  'learning.concept.http.q3.prompt': 'An HTTP 404 status means…',
  'learning.concept.http.q3.a': 'Success',
  'learning.concept.http.q3.b': 'Server error',
  'learning.concept.http.q3.c': 'The resource was not found',
  'learning.concept.http.q3.why':
    '4xx are client errors; 404 means the requested resource does not exist (2xx success, 5xx server error).',
  'learning.concept.quic.name': 'QUIC',
  'learning.concept.quic.q1.prompt': 'QUIC runs on top of…',
  'learning.concept.quic.q1.a': 'UDP',
  'learning.concept.quic.q1.b': 'TCP',
  'learning.concept.quic.q1.c': 'ICMP',
  'learning.concept.quic.q1.why':
    "QUIC builds reliability, ordering, and encryption itself, on UDP, to avoid TCP's head-of-line blocking and handshake latency.",
  'learning.concept.quic.q2.prompt': 'A key QUIC advantage over TCP+TLS is…',
  'learning.concept.quic.q2.a': 'No encryption',
  'learning.concept.quic.q2.b': 'Faster connection setup (often 1-RTT or 0-RTT)',
  'learning.concept.quic.q2.c': 'Lower throughput',
  'learning.concept.quic.q2.why':
    'QUIC folds the transport and TLS handshakes together, cutting round trips before data flows.',
  'learning.concept.quic.q3.prompt': 'QUIC carries multiple streams so that…',
  'learning.concept.quic.q3.a': 'Only one request fits per connection',
  'learning.concept.quic.q3.b': 'Packets are never lost',
  'learning.concept.quic.q3.c': "One lost packet doesn't stall the other streams",
  'learning.concept.quic.q3.why':
    "Independent streams avoid TCP's head-of-line blocking, where one loss delays everything.",
  'learning.concept.http2.name': 'HTTP/2',
  'learning.concept.http2.q1.prompt': 'HTTP/2 improves on HTTP/1.1 mainly by…',
  'learning.concept.http2.q1.a': 'Multiplexing many requests over one connection',
  'learning.concept.http2.q1.b': 'Encrypting with IPsec',
  'learning.concept.http2.q1.c': 'Using UDP instead of TCP',
  'learning.concept.http2.q1.why':
    'HTTP/2 sends concurrent streams over a single TCP connection instead of opening many connections.',
  'learning.concept.http2.q2.prompt': 'HTTP/2 frames the protocol as…',
  'learning.concept.http2.q2.a': 'Plain text lines',
  'learning.concept.http2.q2.b': 'Binary frames',
  'learning.concept.http2.q2.c': 'Fixed 1500-byte cells',
  'learning.concept.http2.q2.why':
    'HTTP/2 replaces text with a binary framing layer carrying streams, which is more efficient to parse.',
  'learning.concept.http2.q3.prompt': 'HTTP/2 compresses headers with…',
  'learning.concept.http2.q3.a': 'gzip',
  'learning.concept.http2.q3.b': 'No compression',
  'learning.concept.http2.q3.c': 'HPACK',
  'learning.concept.http2.q3.why':
    'HPACK compresses repetitive headers with a shared dynamic table, cutting overhead per request.',
  'learning.concept.http3.name': 'HTTP/3',
  'learning.concept.http3.q1.prompt': 'HTTP/3 runs over…',
  'learning.concept.http3.q1.a': 'QUIC (UDP)',
  'learning.concept.http3.q1.b': 'Raw TCP',
  'learning.concept.http3.q1.c': 'ICMP',
  'learning.concept.http3.q1.why':
    'HTTP/3 maps HTTP semantics onto QUIC, which provides streams, reliability, and TLS over UDP.',
  'learning.concept.http3.q2.prompt': 'A key HTTP/3 win over HTTP/2 is…',
  'learning.concept.http3.q2.a': 'Bigger headers',
  'learning.concept.http3.q2.b': 'No TCP head-of-line blocking across streams',
  'learning.concept.http3.q2.c': 'No encryption',
  'learning.concept.http3.q2.why':
    'Because QUIC streams are independent, one lost packet does not stall the others as it would on TCP.',
  'learning.concept.http3.q3.prompt': 'HTTP/3 compresses headers with…',
  'learning.concept.http3.q3.a': 'HPACK',
  'learning.concept.http3.q3.b': 'gzip',
  'learning.concept.http3.q3.c': 'QPACK',
  'learning.concept.http3.q3.why':
    'QPACK is HPACK adapted for QUIC, avoiding head-of-line blocking on the header table updates.',
  'learning.concept.qos.name': 'QoS / DSCP',
  'learning.concept.qos.q1.prompt': 'DSCP marks priority in…',
  'learning.concept.qos.q1.a': 'The IP header',
  'learning.concept.qos.q1.b': 'The Ethernet preamble',
  'learning.concept.qos.q1.c': 'The TCP payload',
  'learning.concept.qos.q1.why':
    'DSCP uses 6 bits of the IPv4/IPv6 ToS/Traffic-Class field to classify each packet for per-hop treatment.',
  'learning.concept.qos.q2.prompt': 'QoS is most useful when…',
  'learning.concept.qos.q2.a': 'Links are always idle',
  'learning.concept.qos.q2.b': 'Links are congested and some traffic is latency-sensitive',
  'learning.concept.qos.q2.c': 'There is only one host',
  'learning.concept.qos.q2.why':
    'Under congestion, QoS lets a router prioritize voice/video over bulk traffic instead of treating all equally.',
  'learning.concept.qos.q3.prompt': 'A router acts on DSCP by…',
  'learning.concept.qos.q3.a': 'Encrypting the packet',
  'learning.concept.qos.q3.b': 'Dropping all marked packets',
  'learning.concept.qos.q3.c': 'Applying a per-hop behavior such as priority queuing',
  'learning.concept.qos.q3.why':
    'Each hop maps the DSCP value to a queue/scheduling policy (per-hop behavior); end-to-end QoS needs consistent marking.',
  'learning.concept.ecmp.name': 'ECMP',
  'learning.concept.ecmp.q1.prompt': 'ECMP is used when…',
  'learning.concept.ecmp.q1.a': 'Several paths to a destination have equal cost',
  'learning.concept.ecmp.q1.b': 'There is only one path',
  'learning.concept.ecmp.q1.c': 'A link is down',
  'learning.concept.ecmp.q1.why':
    'When the routing protocol finds multiple equal-cost next-hops, ECMP spreads traffic across them.',
  'learning.concept.ecmp.q2.prompt': 'ECMP usually keeps a flow on one path by…',
  'learning.concept.ecmp.q2.a': 'Random per-packet choice',
  'learning.concept.ecmp.q2.b': 'Hashing the 5-tuple to pick a next-hop',
  'learning.concept.ecmp.q2.c': 'Always using the lowest IP',
  'learning.concept.ecmp.q2.why':
    'Per-flow hashing keeps a connection on one path to avoid reordering, while different flows balance across paths.',
  'learning.concept.ecmp.q3.prompt': 'The benefit of ECMP is…',
  'learning.concept.ecmp.q3.a': 'Encryption',
  'learning.concept.ecmp.q3.b': 'Fewer routes',
  'learning.concept.ecmp.q3.c': 'Load sharing and more total bandwidth',
  'learning.concept.ecmp.q3.why':
    'ECMP uses parallel links simultaneously, increasing throughput and providing redundancy.',
  'learning.concept.vrrp.name': 'VRRP / FHRP',
  'learning.concept.vrrp.q1.prompt': 'VRRP provides…',
  'learning.concept.vrrp.q1.a': 'A redundant default gateway via a virtual IP',
  'learning.concept.vrrp.q1.b': 'Name resolution',
  'learning.concept.vrrp.q1.c': 'Loop prevention',
  'learning.concept.vrrp.q1.why':
    'Hosts point at one virtual IP; VRRP lets a backup router take it over if the master fails.',
  'learning.concept.vrrp.q2.prompt': 'In VRRP, at a given time the virtual IP is owned by…',
  'learning.concept.vrrp.q2.a': 'All routers at once',
  'learning.concept.vrrp.q2.b': 'One master router (others are backups)',
  'learning.concept.vrrp.q2.c': 'The DNS server',
  'learning.concept.vrrp.q2.why':
    'One router is master and answers for the virtual IP/MAC; backups monitor and take over on failure.',
  'learning.concept.vrrp.q3.prompt': 'VRRP solves the problem of…',
  'learning.concept.vrrp.q3.a': 'Too many subnets',
  'learning.concept.vrrp.q3.b': 'Slow DNS',
  'learning.concept.vrrp.q3.c': 'A single default gateway being a single point of failure',
  'learning.concept.vrrp.q3.why':
    'Without a first-hop redundancy protocol, a dead gateway strands a whole subnet; VRRP removes that SPOF.',
  'learning.concept.multicast.name': 'Multicast / IGMP',
  'learning.concept.multicast.q1.prompt': 'Multicast delivers traffic…',
  'learning.concept.multicast.q1.a': 'From one source to a group of interested receivers',
  'learning.concept.multicast.q1.b': 'To every host on the internet',
  'learning.concept.multicast.q1.c': 'Only between two hosts',
  'learning.concept.multicast.q1.why':
    'One copy is sent and the network replicates it only toward members of the multicast group — efficient one-to-many.',
  'learning.concept.multicast.q2.prompt': 'Hosts join a multicast group using…',
  'learning.concept.multicast.q2.a': 'ARP',
  'learning.concept.multicast.q2.b': 'IGMP',
  'learning.concept.multicast.q2.c': 'BGP',
  'learning.concept.multicast.q2.why':
    'IGMP lets a host tell its local router which multicast groups it wants, so traffic is only forwarded where needed.',
  'learning.concept.multicast.q3.prompt': 'A multicast destination address identifies…',
  'learning.concept.multicast.q3.a': 'A single host',
  'learning.concept.multicast.q3.b': 'A physical port',
  'learning.concept.multicast.q3.c': 'A group (e.g. 224.0.0.0/4 in IPv4)',
  'learning.concept.multicast.q3.why':
    'Multicast uses a dedicated group address range; receivers subscribe rather than being addressed individually.',
  'learning.concept.mtu.name': 'MTU / PMTUD',
  'learning.concept.mtu.q1.prompt': 'The MTU is…',
  'learning.concept.mtu.q1.a': 'The largest payload a link can carry in one frame',
  'learning.concept.mtu.q1.b': 'The minimum packet size',
  'learning.concept.mtu.q1.c': 'A routing metric',
  'learning.concept.mtu.q1.why':
    'Each link has a maximum transmission unit; packets larger than it must be fragmented or rejected.',
  'learning.concept.mtu.q2.prompt': 'Path MTU Discovery works by…',
  'learning.concept.mtu.q2.a': 'Pinging every host',
  'learning.concept.mtu.q2.b': 'Sending DF packets and reading ICMP Fragmentation Needed',
  'learning.concept.mtu.q2.c': 'Asking DNS',
  'learning.concept.mtu.q2.why':
    'The sender marks packets DF; a router that cannot forward returns ICMP with the next-hop MTU, so the sender shrinks packets.',
  'learning.concept.mtu.q3.prompt': 'A too-large packet with DF set is…',
  'learning.concept.mtu.q3.a': 'Fragmented anyway',
  'learning.concept.mtu.q3.b': 'Silently delivered',
  'learning.concept.mtu.q3.c': 'Dropped, with an ICMP message returned',
  'learning.concept.mtu.q3.why':
    'With DF set the router cannot fragment, so it drops the packet and signals the problem via ICMP.',
  'learning.concept.gre.name': 'GRE Tunnel',
  'learning.concept.gre.q1.prompt': 'A GRE tunnel works by…',
  'learning.concept.gre.q1.a': 'Encapsulating a packet inside another IP packet',
  'learning.concept.gre.q1.b': 'Encrypting with AES',
  'learning.concept.gre.q1.c': 'Switching MAC addresses',
  'learning.concept.gre.q1.why':
    'GRE wraps the original packet in a new IP+GRE header so it can traverse an intervening network as payload.',
  'learning.concept.gre.q2.prompt': 'By itself, GRE provides…',
  'learning.concept.gre.q2.a': 'Strong encryption',
  'learning.concept.gre.q2.b': 'Encapsulation but no encryption',
  'learning.concept.gre.q2.c': 'Address assignment',
  'learning.concept.gre.q2.why':
    'GRE is a tunneling/encapsulation protocol; to secure it you pair it with IPsec.',
  'learning.concept.gre.q3.prompt': 'A tunnel makes two remote networks look…',
  'learning.concept.gre.q3.a': 'Like one host',
  'learning.concept.gre.q3.b': 'Unreachable',
  'learning.concept.gre.q3.c': 'Directly connected over the underlay',
  'learning.concept.gre.q3.why':
    'The endpoints behave like neighbors on a point-to-point link even though many hops separate them.',
  'learning.concept.mpls.name': 'MPLS',
  'learning.concept.mpls.q1.prompt': 'MPLS forwards packets by…',
  'learning.concept.mpls.q1.a': 'Swapping short labels instead of doing an IP lookup',
  'learning.concept.mpls.q1.b': 'Broadcasting',
  'learning.concept.mpls.q1.c': 'ARP resolution',
  'learning.concept.mpls.q1.why':
    'An edge router pushes a label; core routers swap labels along a pre-set path, avoiding a full routing-table lookup per hop.',
  'learning.concept.mpls.q2.prompt': 'The path a labeled packet follows is called…',
  'learning.concept.mpls.q2.a': 'A broadcast domain',
  'learning.concept.mpls.q2.b': 'A Label Switched Path (LSP)',
  'learning.concept.mpls.q2.c': 'An autonomous system',
  'learning.concept.mpls.q2.why':
    'Labels define an LSP through the MPLS core, set up independently of per-hop destination lookups.',
  'learning.concept.mpls.q3.prompt': 'MPLS sits…',
  'learning.concept.mpls.q3.a': 'Above HTTP',
  'learning.concept.mpls.q3.b': 'Below Ethernet',
  'learning.concept.mpls.q3.c': 'Between L2 and L3 (often called layer 2.5)',
  'learning.concept.mpls.q3.why':
    'MPLS adds a shim label between the link header and the network header, so it is described as layer 2.5.',
  'learning.concept.vxlan.name': 'VXLAN / EVPN',
  'learning.concept.vxlan.q1.prompt': 'VXLAN carries…',
  'learning.concept.vxlan.q1.a': 'Layer-2 frames inside UDP/IP (L2 over L3)',
  'learning.concept.vxlan.q1.b': 'Only IPv6',
  'learning.concept.vxlan.q1.c': 'Routing tables',
  'learning.concept.vxlan.q1.why':
    'VXLAN tunnels Ethernet frames in UDP so a stretched L2 segment can span a routed (L3) data-center fabric.',
  'learning.concept.vxlan.q2.prompt': 'A VXLAN segment is identified by a…',
  'learning.concept.vxlan.q2.a': 'VLAN ID (12-bit)',
  'learning.concept.vxlan.q2.b': 'VNI (24-bit network identifier)',
  'learning.concept.vxlan.q2.c': 'MAC address',
  'learning.concept.vxlan.q2.why':
    'The 24-bit VNI allows about 16 million segments, far beyond the 4094 of 802.1Q VLANs.',
  'learning.concept.vxlan.q3.prompt': 'EVPN is commonly used with VXLAN to…',
  'learning.concept.vxlan.q3.a': 'Encrypt frames',
  'learning.concept.vxlan.q3.b': 'Assign IP addresses',
  'learning.concept.vxlan.q3.c': 'Distribute MAC/IP reachability via a control plane (BGP)',
  'learning.concept.vxlan.q3.why':
    'EVPN (a BGP address family) advertises which MACs/IPs live behind which tunnel endpoints, replacing flood-and-learn.',
  'learning.concept.wifi.name': 'Wi-Fi / 802.11',
  'learning.concept.wifi.q1.prompt': 'Wi-Fi avoids collisions using…',
  'learning.concept.wifi.q1.a': 'CSMA/CA (collision avoidance)',
  'learning.concept.wifi.q1.b': 'CSMA/CD (collision detection)',
  'learning.concept.wifi.q1.c': 'Token passing',
  'learning.concept.wifi.q1.why':
    'A station cannot reliably hear collisions on radio, so 802.11 listens and backs off to avoid them rather than detecting them.',
  'learning.concept.wifi.q2.prompt': 'A wireless medium is…',
  'learning.concept.wifi.q2.a': 'Full-duplex per station',
  'learning.concept.wifi.q2.b': 'Shared and half-duplex',
  'learning.concept.wifi.q2.c': 'Collision-free',
  'learning.concept.wifi.q2.why':
    'All stations share the same channel and can only transmit or receive at a time, so the airtime is contended.',
  'learning.concept.wifi.q3.prompt': 'Before sending data, a Wi-Fi client must first…',
  'learning.concept.wifi.q3.a': 'Run OSPF',
  'learning.concept.wifi.q3.b': 'Get a public IP',
  'learning.concept.wifi.q3.c': 'Associate (and authenticate) with an access point',
  'learning.concept.wifi.q3.why':
    'A client scans, authenticates and associates with an AP (e.g. via WPA2) before it can pass traffic.',
  'learning.concept.acl.name': 'ACL / Firewall',
  'learning.concept.acl.q1.prompt': 'An ACL filters traffic by…',
  'learning.concept.acl.q1.a': 'Matching packet fields against permit/deny rules',
  'learning.concept.acl.q1.b': 'Encrypting it',
  'learning.concept.acl.q1.c': 'Compressing it',
  'learning.concept.acl.q1.why':
    'An access control list checks fields like src/dst IP and port against ordered rules and permits or denies.',
  'learning.concept.acl.q2.prompt': 'A stateful firewall differs from a stateless ACL by…',
  'learning.concept.acl.q2.a': 'Being slower always',
  'learning.concept.acl.q2.b': 'Tracking connections so replies are auto-allowed',
  'learning.concept.acl.q2.c': 'Ignoring ports',
  'learning.concept.acl.q2.why':
    'A stateful firewall remembers established flows and permits their return traffic without an explicit reverse rule.',
  'learning.concept.acl.q3.prompt': 'A common secure default for a firewall is…',
  'learning.concept.acl.q3.a': 'Permit any any',
  'learning.concept.acl.q3.b': 'No rules at all',
  'learning.concept.acl.q3.c': 'Default deny — block unless explicitly allowed',
  'learning.concept.acl.q3.why':
    'Default-deny means only explicitly permitted traffic passes, shrinking the attack surface.',
  'learning.concept.layer.fundamentals': 'Foundations',
  'learning.concept.model.name': 'TCP/IP & OSI Model',
  'learning.concept.model.q1.prompt': 'Why is networking split into layers?',
  'learning.concept.model.q1.a': 'So each layer solves one problem and can change independently',
  'learning.concept.model.q1.b': 'To make it slower',
  'learning.concept.model.q1.c': 'To use more cables',
  'learning.concept.model.q1.why':
    'Layering lets Ethernet, IP, TCP and HTTP each do one job and evolve independently — TCP does not care if the link is fibre or Wi-Fi.',
  'learning.concept.model.q2.prompt': 'Going DOWN the stack on send, data passes…',
  'learning.concept.model.q2.a': 'Link → Internet → Transport → Application',
  'learning.concept.model.q2.b': 'Application → Transport → Internet → Link',
  'learning.concept.model.q2.c': 'In random order',
  'learning.concept.model.q2.why':
    'The sender wraps app data in transport (TCP/UDP), then IP, then a link frame; the receiver unwraps in reverse.',
  'learning.concept.model.q3.prompt': 'Encapsulation means…',
  'learning.concept.model.q3.a': 'Encrypting every packet',
  'learning.concept.model.q3.b': 'Dropping all headers',
  'learning.concept.model.q3.c': 'Each layer wraps the layer above in its own header',
  'learning.concept.model.q3.why':
    'Going down, each layer adds a header (and a trailer at L2); one layer’s payload is the whole unit of the layer above.',
  'learning.concept.model.q4.prompt': 'A router primarily operates at…',
  'learning.concept.model.q4.a': 'The Network layer (L3 / IP)',
  'learning.concept.model.q4.b': 'The Application layer',
  'learning.concept.model.q4.c': 'The Physical layer',
  'learning.concept.model.q4.why':
    'Routers forward by IP address (L3); switches forward by MAC (L2); the two cooperate to move a packet end-to-end.',
  'learning.concept.model.q5.prompt': 'A switch primarily operates at…',
  'learning.concept.model.q5.a': 'The Transport layer',
  'learning.concept.model.q5.b': 'The Data-link layer (L2 / MAC)',
  'learning.concept.model.q5.c': 'The Network layer',
  'learning.concept.model.q5.why':
    'A switch forwards Ethernet frames by MAC within a LAN and never looks at the IP header.',
  'learning.concept.model.q6.prompt': 'The payload TCP delivers to a web server is…',
  'learning.concept.model.q6.a': 'Another IP header',
  'learning.concept.model.q6.b': 'A MAC address',
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
  'learning.concept.addressing.name': 'Addressing & Delivery',
  'learning.concept.addressing.q1.prompt': 'A MAC address delivers a frame…',
  'learning.concept.addressing.q1.a': 'To the next device on the local link (L2)',
  'learning.concept.addressing.q1.b': 'Across the whole internet',
  'learning.concept.addressing.q1.c': 'To a TCP port',
  'learning.concept.addressing.q1.why':
    'MAC addresses are link-local: they move a frame to the next hop on the same segment and are rewritten at each router.',
  'learning.concept.addressing.q2.prompt': 'An IP address delivers a packet…',
  'learning.concept.addressing.q2.a': 'Only within one cable',
  'learning.concept.addressing.q2.b': 'End-to-end across networks (L3)',
  'learning.concept.addressing.q2.c': 'To a specific application',
  'learning.concept.addressing.q2.why':
    'The IP src/dst stays constant end-to-end (barring NAT); routers use it to choose the path hop by hop.',
  'learning.concept.addressing.q3.prompt':
    'Sending to a host in a DIFFERENT subnet, the frame goes to…',
  'learning.concept.addressing.q3.a': 'The destination host MAC directly',
  'learning.concept.addressing.q3.b': 'A broadcast forever',
  'learning.concept.addressing.q3.c':
    'The default gateway MAC, but the packet dst IP is the final host',
  'learning.concept.addressing.q3.why':
    'Off-subnet means ARP for the gateway: the L2 destination is the gateway MAC while the L3 destination stays the final host — the core L2/L3 split.',
  'learning.concept.addressing.q4.prompt': 'Private IP ranges (10.0.0.0/8, 192.168.0.0/16) are…',
  'learning.concept.addressing.q4.a':
    'Reusable in any network and not routable on the public internet',
  'learning.concept.addressing.q4.b': 'Globally unique',
  'learning.concept.addressing.q4.c': 'Only for routers',
  'learning.concept.addressing.q4.why':
    'Private addresses are reused everywhere behind NAT; only public addresses are globally unique and routable.',
  'learning.concept.addressing.q5.prompt': 'A broadcast reaches…',
  'learning.concept.addressing.q5.a': 'One specific host',
  'learning.concept.addressing.q5.b': 'Every host in the broadcast domain',
  'learning.concept.addressing.q5.c': 'A subscribed group only',
  'learning.concept.addressing.q5.why':
    'Broadcast = all hosts on the segment (e.g. an ARP request); unicast = one host; multicast = a group that joined.',
  'learning.concept.addressing.q6.prompt': 'Why does the internet need NAT?',
  'learning.concept.addressing.q6.a': 'To encrypt traffic',
  'learning.concept.addressing.q6.b': 'To resolve names',
  'learning.concept.addressing.q6.c':
    'IPv4 addresses are scarce, so many private hosts share public ones',
  'learning.concept.addressing.q6.why':
    'NAT lets a whole private network share a few public IPv4 addresses, working around IPv4 exhaustion.',
  'learning.concept.addressing.q1.b.why':
    'A MAC only has meaning on the local link; crossing networks is the IP address’s job (L3).',
  'learning.concept.addressing.q1.c.why':
    'A TCP port picks the application (L4); a MAC just reaches the next device on the wire (L2).',
  'learning.concept.addressing.q2.a.why':
    'Staying on one cable is L2 (the MAC); an IP address routes a packet across many links end-to-end.',
  'learning.concept.addressing.q2.c.why':
    'Reaching a specific application is the port’s job (L4); IP only gets the packet to the host (L3).',
  'learning.concept.addressing.q3.a.why':
    'Off-subnet you cannot reach the host’s MAC directly — it is on another link; you ARP for the gateway instead.',
  'learning.concept.addressing.q3.b.why':
    'Broadcasts do not leave the subnet; the frame goes to the gateway’s MAC, then IP routing takes over.',
  'learning.concept.addressing.q4.b.why':
    'Only public addresses are globally unique; private ranges are reused in countless networks behind NAT.',
  'learning.concept.addressing.q4.c.why':
    'Private ranges are for any internal host, not just routers — phones, servers and laptops all use them.',
  'learning.concept.addressing.q5.a.why':
    'Reaching one specific host is unicast; a broadcast is delivered to every host in the domain.',
  'learning.concept.addressing.q5.c.why':
    'Delivery to a subscribed group is multicast; a broadcast goes to everyone in the broadcast domain.',
  'learning.concept.addressing.q6.a.why':
    'Encryption is TLS’s job, not NAT’s; NAT rewrites addresses so private hosts can share a public IP.',
  'learning.concept.addressing.q6.b.why':
    'Name resolution is DNS; NAT exists to stretch scarce IPv4 addresses, not to look up names.',
  'learning.concept.ports.name': 'Ports, Sockets & Connections',
  'learning.concept.ports.q1.prompt': 'A port number identifies…',
  'learning.concept.ports.q1.a': 'Which application/service on a host',
  'learning.concept.ports.q1.b': 'Which router to use',
  'learning.concept.ports.q1.c': 'The MAC address',
  'learning.concept.ports.q1.why':
    'IP gets you to the host; the port gets you to the right service on it (e.g. 443 for HTTPS).',
  'learning.concept.ports.q2.prompt': 'A TCP connection is uniquely identified by…',
  'learning.concept.ports.q2.a': 'Just the destination IP',
  'learning.concept.ports.q2.b': 'The 5-tuple: src IP, src port, dst IP, dst port, protocol',
  'learning.concept.ports.q2.c': 'The pair of MAC addresses',
  'learning.concept.ports.q2.why':
    'The 5-tuple lets a server keep thousands of simultaneous connections apart, even to the same port.',
  'learning.concept.ports.q3.prompt': 'HTTPS servers listen by default on port…',
  'learning.concept.ports.q3.a': '22',
  'learning.concept.ports.q3.b': '53',
  'learning.concept.ports.q3.c': '443',
  'learning.concept.ports.q3.why':
    '443 is HTTPS, 80 is HTTP, 22 is SSH, 53 is DNS — the well-known ports below 1024.',
  'learning.concept.ports.q4.prompt': 'One server handles many clients on port 443 because…',
  'learning.concept.ports.q4.a':
    'Each client uses a different source IP/port, so the 5-tuples differ',
  'learning.concept.ports.q4.b': 'It opens a new IP per client',
  'learning.concept.ports.q4.c': 'It can only serve one at a time',
  'learning.concept.ports.q4.why':
    'The server port is shared; connections are told apart by the client side of the tuple.',
  'learning.concept.ports.q5.prompt': 'A socket is…',
  'learning.concept.ports.q5.a': 'A kind of cable',
  'learning.concept.ports.q5.b': 'An endpoint = an IP address plus a port',
  'learning.concept.ports.q5.c': 'A routing protocol',
  'learning.concept.ports.q5.why':
    'A socket binds a service to (IP, port); a connection joins two sockets.',
  'learning.concept.ports.q6.prompt': 'A DNS lookup then a web fetch typically use…',
  'learning.concept.ports.q6.a': 'Both over TCP/80',
  'learning.concept.ports.q6.b': 'Both over ICMP',
  'learning.concept.ports.q6.c': 'DNS over UDP/53, then HTTPS over TCP/443',
  'learning.concept.ports.q6.why':
    'A small DNS query goes over UDP/53; the page is then fetched over a reliable TCP/443 connection.',
  'learning.concept.ports.q1.b.why':
    'Choosing a router is IP routing (L3); a port selects the application on the host (L4).',
  'learning.concept.ports.q1.c.why':
    'The MAC is an L2 hardware address; a port is an L4 number identifying the service.',
  'learning.concept.ports.q2.a.why':
    'The destination IP alone cannot separate many connections to the same server — you need the full 5-tuple.',
  'learning.concept.ports.q2.c.why':
    'MACs change at every hop and are L2; a connection is identified by the L3/L4 5-tuple.',
  'learning.concept.ports.q3.a.why': 'Port 22 is SSH; HTTPS listens on 443.',
  'learning.concept.ports.q3.b.why': 'Port 53 is DNS; HTTPS listens on 443.',
  'learning.concept.ports.q4.b.why':
    'The server keeps one IP; clients are told apart by their source IP/port, not by new server IPs.',
  'learning.concept.ports.q4.c.why':
    'Servers handle many clients at once on one port — the differing client side of the tuple keeps them separate.',
  'learning.concept.ports.q5.a.why':
    'A socket is not hardware; it is a software endpoint — an IP address paired with a port.',
  'learning.concept.ports.q5.c.why':
    'A routing protocol (like OSPF) moves packets between networks; a socket is just a connection endpoint.',
  'learning.concept.ports.q6.a.why':
    'DNS normally uses UDP/53, and the modern web uses HTTPS on TCP/443 — not plain TCP/80 for both.',
  'learning.concept.ports.q6.b.why':
    'ICMP is for diagnostics (ping); DNS uses UDP/53 and the web fetch uses TCP/443.',
  'learning.concept.ethernet.q4.prompt': 'An Ethernet frame carries a source and destination…',
  'learning.concept.ethernet.q4.a': 'MAC address',
  'learning.concept.ethernet.q4.b': 'IP address',
  'learning.concept.ethernet.q4.c': 'Port number',
  'learning.concept.ethernet.q4.why':
    'Layer-2 frames are addressed by MAC; the IP addresses live inside the payload.',
  'learning.concept.ethernet.q5.prompt': 'Connecting two switches together extends…',
  'learning.concept.ethernet.q5.a': 'Two separate internets',
  'learning.concept.ethernet.q5.b': 'The same broadcast domain',
  'learning.concept.ethernet.q5.c': 'A routing table',
  'learning.concept.ethernet.q5.why':
    'Plain switching keeps one broadcast domain; you need a router (or VLANs) to split it.',
  'learning.concept.arp.q4.prompt':
    'ARP is needed because a host knows the destination IP but not its…',
  'learning.concept.arp.q4.a': 'MAC address',
  'learning.concept.arp.q4.b': 'Port',
  'learning.concept.arp.q4.c': 'Hostname',
  'learning.concept.arp.q4.why':
    'To build the L2 frame the host must learn the MAC that owns that IP on the local link.',
  'learning.concept.arp.q5.prompt': 'ARP replies are cached so that…',
  'learning.concept.arp.q5.a': 'The network stays slow',
  'learning.concept.arp.q5.b': 'The host need not ARP before every packet',
  'learning.concept.arp.q5.c': 'IP addresses change',
  'learning.concept.arp.q5.why':
    'The ARP cache skips a broadcast lookup before each frame; entries expire after a timeout.',
  'learning.concept.ipv4.q4.prompt': 'The network vs host split of an IPv4 address is set by…',
  'learning.concept.ipv4.q4.a': 'The subnet mask / prefix length',
  'learning.concept.ipv4.q4.b': 'The TTL',
  'learning.concept.ipv4.q4.c': 'The port',
  'learning.concept.ipv4.q4.why':
    'The mask says how many leading bits are the network; the remaining bits identify the host.',
  'learning.concept.ipv4.q5.prompt': 'In a routing table, 0.0.0.0/0 is…',
  'learning.concept.ipv4.q5.a': 'A broadcast address',
  'learning.concept.ipv4.q5.b': 'The default route — it matches anything',
  'learning.concept.ipv4.q5.c': 'An invalid entry',
  'learning.concept.ipv4.q5.why':
    'The all-zeros /0 matches every destination and is used when no more specific route does.',
  'learning.concept.tcp.q4.prompt': 'When a TCP segment is lost, TCP…',
  'learning.concept.tcp.q4.a': 'Retransmits it',
  'learning.concept.tcp.q4.b': 'Ignores it',
  'learning.concept.tcp.q4.c': 'Closes the connection',
  'learning.concept.tcp.q4.why':
    'Missing acknowledgements trigger retransmission — how TCP delivers reliably over an unreliable network.',
  'learning.concept.tcp.q5.prompt': 'TCP flow and congestion control exist to…',
  'learning.concept.tcp.q5.a': 'Encrypt the data',
  'learning.concept.tcp.q5.b': 'Avoid overwhelming the receiver and the network',
  'learning.concept.tcp.q5.c': 'Assign IP addresses',
  'learning.concept.tcp.q5.why':
    'Windows adapt the send rate to the receiver buffer and to congestion signals from the network.',
  'learning.concept.udp.q4.prompt': 'If a UDP datagram is lost, the protocol…',
  'learning.concept.udp.q4.a': 'Does nothing — the application must handle it if needed',
  'learning.concept.udp.q4.b': 'Retransmits it',
  'learning.concept.udp.q4.c': 'Resets the link',
  'learning.concept.udp.q4.why':
    'UDP offers no reliability; apps that need it (or tolerate loss) build that on top.',
  'learning.concept.udp.q5.prompt': 'DNS often uses UDP because…',
  'learning.concept.udp.q5.a': 'It needs encryption',
  'learning.concept.udp.q5.b': 'A small query/response is fast and can simply be retried',
  'learning.concept.udp.q5.c': 'It needs strict ordering',
  'learning.concept.udp.q5.why':
    'A single small exchange does not justify TCP setup cost; the client just retries on loss.',
  'learning.concept.dns.q4.prompt': 'Caching DNS answers…',
  'learning.concept.dns.q4.a': 'Speeds up repeat lookups and cuts load, honoring the TTL',
  'learning.concept.dns.q4.b': 'Changes the IP address',
  'learning.concept.dns.q4.c': 'Is forbidden',
  'learning.concept.dns.q4.why':
    'Resolvers cache records for their TTL, so popular names resolve instantly without re-querying.',
  'learning.concept.dns.q5.prompt': 'An AAAA record holds…',
  'learning.concept.dns.q5.a': 'An IPv4 address',
  'learning.concept.dns.q5.b': 'An IPv6 address',
  'learning.concept.dns.q5.c': 'A mail server name',
  'learning.concept.dns.q5.why': 'A = IPv4, AAAA = IPv6, MX = mail exchanger, CNAME = alias.',
  'learning.concept.arp.q1.b.why':
    'Mapping a hostname to an IP is DNS; ARP maps a known IP to its MAC on the local link.',
  'learning.concept.arp.q1.c.why':
    'A switch learns MAC→port on its own; ARP resolves an IP to a MAC, not a MAC to a port.',
  'learning.concept.arp.q2.a.why':
    'You do not know the target’s MAC yet — that is exactly what ARP is asking for — so the request must broadcast.',
  'learning.concept.arp.q2.c.why':
    'The gateway only matters for off-subnet traffic; an ARP request broadcasts to the whole LAN.',
  'learning.concept.arp.q3.a.why':
    'ARP cannot cross routers; it works only inside one broadcast domain, never the whole internet.',
  'learning.concept.arp.q3.b.why':
    'ARP runs between hosts on a LAN, not router-to-router; it resolves IP→MAC within the segment.',
  'learning.concept.arp.q4.b.why':
    'A port (L4) selects an application, not a frame’s destination; what ARP supplies is the missing MAC.',
  'learning.concept.arp.q4.c.why':
    'The hostname was resolved earlier by DNS; what the host still lacks to build the frame is the MAC.',
  'learning.concept.arp.q5.a.why':
    'Caching makes the network FASTER, not slower — it avoids an ARP round-trip before each packet.',
  'learning.concept.arp.q5.c.why':
    'Caching does not change IP addresses; it just remembers the IP→MAC mapping for a while.',
  'learning.concept.tcp.q1.b.why':
    'FIN tears a connection DOWN; opening one is SYN → SYN-ACK → ACK.',
  'learning.concept.tcp.q1.c.why':
    'The middle step is a combined SYN-ACK and the ACK comes last: SYN → SYN-ACK → ACK.',
  'learning.concept.tcp.q2.a.why':
    'TCP trades a little latency for reliability (retransmits, ordering); UDP is the low-latency choice.',
  'learning.concept.tcp.q2.c.why':
    'TCP does not encrypt — that is TLS layered on top; TCP guarantees reliable, in-order bytes.',
  'learning.concept.tcp.q3.a.why':
    'An RST is an abrupt abort, not a graceful close; a clean shutdown is a FIN exchange.',
  'learning.concept.tcp.q3.b.why':
    'A second SYN tries to OPEN, not close; graceful teardown is a FIN/ACK in each direction.',
  'learning.concept.tcp.q4.b.why':
    'TCP never just ignores loss — that would break reliability; it retransmits the missing segment.',
  'learning.concept.tcp.q4.c.why':
    'A single loss triggers retransmission, not a close; TCP only tears down on real failure.',
  'learning.concept.tcp.q5.a.why':
    'Encryption is TLS’s job; flow and congestion control pace the sender to match receiver and network.',
  'learning.concept.tcp.q5.c.why':
    'Assigning IP addresses is DHCP; TCP’s windows throttle the send rate to avoid overload.',
  'learning.concept.dns.q1.b.why':
    'IP→MAC is ARP’s job on the local link; DNS maps human names to IP addresses.',
  'learning.concept.dns.q1.c.why':
    'Ports are just well-known numbers; DNS resolves names to IP addresses, not ports to names.',
  'learning.concept.dns.q2.a.why':
    'MX records point to mail servers, not a host’s IPv4; the name→IPv4 record is the A record.',
  'learning.concept.dns.q2.c.why':
    'A CNAME is an alias to another name, not an address; the IPv4 mapping is the A record.',
  'learning.concept.dns.q3.a.why':
    'Answering only from its own zone is an authoritative server; a recursive resolver chases the answer for you.',
  'learning.concept.dns.q3.b.why':
    'DNS caches name→IP answers, not MAC addresses; a recursive resolver queries other servers until the name resolves.',
  'learning.concept.dns.q4.b.why':
    'Caching reuses the existing answer; it never changes the IP — it just serves it until the TTL expires.',
  'learning.concept.dns.q4.c.why':
    'Caching is encouraged, not forbidden — TTLs exist precisely so resolvers can cache safely.',
  'learning.concept.dns.q5.a.why':
    'An IPv4 address lives in an A record; the quad-A (AAAA) record holds an IPv6 address.',
  'learning.concept.dns.q5.c.why':
    'A mail server name is an MX record; AAAA holds an IPv6 address.',
  'learning.concept.udp.q1.a.why':
    'Retransmission is TCP’s feature; UDP sends and forgets — any resend is up to the app.',
  'learning.concept.udp.q1.b.why':
    'Ordering is a TCP guarantee; UDP datagrams can arrive out of order or not at all.',
  'learning.concept.udp.q2.a.why':
    'Large downloads need every byte intact and ordered — that is TCP’s reliability, not UDP.',
  'learning.concept.udp.q2.c.why':
    'Bank transactions demand guaranteed delivery; that calls for TCP, not best-effort UDP.',
  'learning.concept.udp.q3.b.why':
    'Sequence/ack numbers belong to TCP’s reliability; UDP’s header is just ports, length and checksum.',
  'learning.concept.udp.q3.c.why':
    'A congestion window is TCP machinery; UDP is connectionless and has nothing to throttle.',
  'learning.concept.udp.q4.b.why':
    'Retransmission is TCP; UDP never resends — recovery, if any, is the application’s job.',
  'learning.concept.udp.q4.c.why':
    'UDP has no connection to reset; a lost datagram is simply gone unless the app resends.',
  'learning.concept.udp.q5.a.why':
    'UDP itself adds no encryption; DNS uses it because a tiny query/response is fast and easily retried.',
  'learning.concept.udp.q5.c.why':
    'A single small DNS exchange needs no ordering; that is why lightweight UDP fits — not TCP.',
  'learning.concept.ethernet.q1.b.why':
    'IP addresses are L3; an Ethernet frame is addressed at L2 by MAC.',
  'learning.concept.ethernet.q1.c.why':
    'Port numbers are L4; a frame uses L2 MAC addresses to reach the next device.',
  'learning.concept.ethernet.q2.a.why':
    'A switch does not read IP headers (that is L3 routing); it learns from L2 source MACs.',
  'learning.concept.ethernet.q2.c.why':
    'OSPF is a routing protocol for routers; a switch just learns source MACs from frames.',
  'learning.concept.ethernet.q3.a.why':
    'An unknown-destination frame is flooded, not dropped, so it can still reach the host.',
  'learning.concept.ethernet.q3.b.why':
    'Switches do not route to a gateway (that is L3); they flood unknown unicast out every other port.',
  'learning.concept.ethernet.q4.b.why':
    'The IP address rides inside the payload (L3); the frame’s own src/dst are MAC addresses.',
  'learning.concept.ethernet.q4.c.why':
    'Port numbers live in the L4 header; the Ethernet frame addresses by MAC.',
  'learning.concept.ethernet.q5.a.why':
    'Linking switches does not create separate internets; it joins them into one broadcast domain.',
  'learning.concept.ethernet.q5.c.why':
    'A routing table is a router’s L3 structure; cabling two switches just extends the L2 domain.',
  'learning.concept.dhcp.q1.a.why':
    'SYN/ACK/FIN is the TCP handshake; DHCP’s four steps are Discover, Offer, Request, Ack.',
  'learning.concept.dhcp.q1.c.why':
    'Those are not the DHCP step names; the exchange is Discover → Offer → Request → Ack (DORA).',
  'learning.concept.dhcp.q2.b.why':
    'The client has no IP and does not know the server yet, so it cannot unicast — it broadcasts.',
  'learning.concept.dhcp.q2.c.why':
    'Discover is an L2 broadcast on the LAN, not a multicast to routers; the client has no address yet.',
  'learning.concept.dhcp.q3.a.why':
    'A MAC is burned into the NIC, not handed out by DHCP; DHCP provides the gateway and DNS servers.',
  'learning.concept.dhcp.q3.b.why':
    'TCP ports are chosen by applications, not assigned by DHCP; DHCP supplies the gateway and DNS.',
  'learning.concept.icmp.q1.b.why':
    'ping is not TCP — it has no ports or handshake; it uses ICMP Echo Request/Reply.',
  'learning.concept.icmp.q1.c.why':
    'ping does not use UDP either; it rides directly on ICMP Echo Request/Reply.',
  'learning.concept.icmp.q2.a.why':
    'ARP resolves IP→MAC on the local link; an expired TTL makes the router send ICMP Time Exceeded.',
  'learning.concept.icmp.q2.c.why':
    'A TCP RST aborts a connection; TTL hitting 0 is an L3 event that yields ICMP Time Exceeded.',
  'learning.concept.icmp.q3.a.why':
    'ICMP is not for application payloads; it carries control, error and diagnostic messages.',
  'learning.concept.icmp.q3.b.why':
    'Routing tables are exchanged by routing protocols (OSPF/BGP); ICMP carries error/diagnostic messages.',
  'learning.concept.ipv4.q1.a.why':
    'TTL does not encrypt; it is a hop counter each router decrements to stop packets looping forever.',
  'learning.concept.ipv4.q1.c.why':
    'Priority is the DSCP/ToS field; TTL is a hop limit that prevents endless loops.',
  'learning.concept.ipv4.q2.b.why':
    '48 bits is a MAC address; an IPv4 address is 32 bits (four octets).',
  'learning.concept.ipv4.q2.c.why': '128 bits is an IPv6 address; IPv4 is 32 bits.',
  'learning.concept.ipv4.q3.a.why':
    'It is only dropped if DF is set; with DF clear the router fragments the packet to fit the MTU.',
  'learning.concept.ipv4.q3.b.why':
    'Routers do not encrypt; an oversized packet with DF clear is fragmented to fit the link MTU.',
  'learning.concept.ipv4.q4.b.why':
    'TTL is a hop counter, unrelated to addressing; the mask/prefix length sets the network/host split.',
  'learning.concept.ipv4.q4.c.why':
    'A port is L4; the network-vs-host boundary comes from the subnet mask / prefix length.',
  'learning.concept.ipv4.q5.a.why':
    'The broadcast is 255.255.255.255; 0.0.0.0/0 is the default route that matches every destination.',
  'learning.concept.ipv4.q5.c.why':
    '0.0.0.0/0 is perfectly valid — it is the default route, the least-specific match for any address.',
  'learning.concept.ipv6.q1.b.why': '32 bits is IPv4; an IPv6 address is 128 bits.',
  'learning.concept.ipv6.q1.c.why':
    '64 bits is just the interface-identifier half; a full IPv6 address is 128 bits.',
  'learning.concept.ipv6.q2.a.why':
    'DHCP hands out addresses; IPv6 resolves neighbors with NDP (Neighbor Discovery), replacing ARP.',
  'learning.concept.ipv6.q2.c.why':
    'STP prevents L2 loops; the IPv6 successor to ARP is Neighbor Discovery (NDP).',
  'learning.concept.ipv6.q3.a.why':
    'IPv6 of course routes; what it drops is broadcast — it uses multicast instead.',
  'learning.concept.ipv6.q3.b.why':
    'IPv6 is all about addresses (128-bit ones); what it removed is broadcast, replaced by multicast.',
  'learning.concept.nat.q1.b.why':
    'Switch MAC learning is an L2 function; NAT’s job is letting many private hosts share one public IP.',
  'learning.concept.nat.q1.c.why':
    'OSPF is a routing protocol; NAT instead rewrites addresses so a private network shares a public IP.',
  'learning.concept.nat.q2.a.why':
    'A default route sends outbound traffic out; reaching an inside server from outside needs port forwarding (DNAT).',
  'learning.concept.nat.q2.c.why':
    'A VLAN trunk carries L2 VLANs between switches; exposing an inside server uses port forwarding (DNAT).',
  'learning.concept.nat.q3.a.why':
    'NAT does not encrypt; the table exists so replies map back to the correct inside host and port.',
  'learning.concept.nat.q3.b.why':
    'Root-bridge election is STP (L2); NAT’s table matches return traffic to the right inside host.',
  'learning.concept.ospf.q1.b.why':
    'Distance-vector is RIP/EIGRP; OSPF is link-state — every router builds a full map and runs SPF.',
  'learning.concept.ospf.q1.c.why':
    'Path-vector is BGP; OSPF is a link-state IGP that floods LSAs and computes shortest paths.',
  'learning.concept.ospf.q2.a.why':
    'Hop count is RIP’s metric; OSPF sums link costs (often bandwidth-based), not raw hops.',
  'learning.concept.ospf.q2.c.why':
    'AS-path length is BGP’s; within an AS, OSPF chooses by total link cost.',
  'learning.concept.ospf.q3.a.why':
    'OSPF reacts to the topology change immediately by re-flooding LSAs, not by passively waiting on a timer.',
  'learning.concept.ospf.q3.b.why':
    'OSPF can’t ignore a failure — it re-floods LSAs and recomputes the shortest-path tree.',
  'learning.concept.bgp.q1.b.why':
    'Address assignment is DHCP; BGP routes reachability between autonomous systems across the internet.',
  'learning.concept.bgp.q1.c.why':
    'Name resolution is DNS; BGP is the inter-AS routing protocol that glues the internet together.',
  'learning.concept.bgp.q2.a.why':
    'BGP is not hop-count based (that’s RIP); it picks paths by policy and AS-path attributes.',
  'learning.concept.bgp.q2.c.why':
    'Link cost is OSPF’s intra-AS metric; BGP decides between ASes by policy and AS-path.',
  'learning.concept.bgp.q3.a.why':
    'An AS is a whole network under one administration, not a single router.',
  'learning.concept.bgp.q3.b.why':
    'A subnet is an L3 address block; an AS is an administrative domain of many networks with its own number.',
  'learning.concept.rip.q1.b.why':
    'Link cost is OSPF’s metric; RIP is distance-vector and simply counts hops.',
  'learning.concept.rip.q1.c.why': 'AS-path is BGP’s; RIP picks routes by hop count.',
  'learning.concept.rip.q2.a.why':
    'RIP caps far lower than 255 — 15 hops are usable and 16 means unreachable (limiting loops).',
  'learning.concept.rip.q2.c.why':
    'RIP is deliberately limited: 15 hops max, with 16 marking unreachable — it does not scale unbounded.',
  'learning.concept.rip.q3.a.why':
    'RIP converges slower than OSPF (periodic updates, counting to infinity), not faster.',
  'learning.concept.rip.q3.b.why':
    'RIP’s 15-hop limit keeps it small; OSPF is the one that scales to large networks.',
  'learning.concept.tls.q1.a.why':
    'Routing is IP’s job (L3); TLS adds encryption, integrity and server authentication on top of TCP.',
  'learning.concept.tls.q1.c.why':
    'Address assignment is DHCP; TLS secures a session with encryption, integrity and authentication.',
  'learning.concept.tls.q2.a.why':
    'A MAC is just an L2 hardware address, easily spoofed; TLS identity is proven with an X.509 certificate.',
  'learning.concept.tls.q2.b.why':
    'A VLAN tag segments L2 traffic; it says nothing about identity — TLS uses an X.509 certificate.',
  'learning.concept.tls.q3.b.why':
    'TLS sits above the transport, not below IP; it needs a reliable byte stream like TCP underneath.',
  'learning.concept.tls.q3.c.why':
    'TLS does not replace Ethernet (L2); it layers on top of a reliable transport such as TCP.',
  'learning.concept.http.q1.b.why':
    'Publish/subscribe is a messaging pattern (e.g. MQTT); HTTP is a client request → server response exchange.',
  'learning.concept.http.q1.c.why':
    'HTTP is not broadcast; a client sends a request and the server returns a response to that client.',
  'learning.concept.http.q2.a.why':
    'POST submits/creates data and changes server state; the safe, read-only method is GET.',
  'learning.concept.http.q2.c.why':
    'DELETE removes a resource — anything but read-only; GET is the safe method that only reads.',
  'learning.concept.http.q3.a.why':
    'Success is 2xx (e.g. 200); 404 is a client error meaning the resource was not found.',
  'learning.concept.http.q3.b.why':
    'Server errors are 5xx; 404 is a 4xx client error — the requested resource does not exist.',
  'learning.concept.quic.q1.b.why':
    'QUIC deliberately avoids TCP to escape its head-of-line blocking; it runs over UDP.',
  'learning.concept.quic.q1.c.why':
    'ICMP is for diagnostics, not data transport; QUIC is built on UDP.',
  'learning.concept.quic.q2.a.why':
    'QUIC is always encrypted (TLS 1.3 is built in); its edge is faster setup, not skipping encryption.',
  'learning.concept.quic.q2.c.why':
    'QUIC aims for equal-or-better throughput; its headline win is faster connection setup (1-RTT/0-RTT).',
  'learning.concept.quic.q3.a.why':
    'It is the opposite — independent streams let many requests share one connection concurrently.',
  'learning.concept.quic.q3.b.why':
    'QUIC cannot prevent packet loss; it limits the damage so a loss stalls only its own stream.',
  'learning.concept.http2.q1.b.why':
    'HTTP/2 does not add IPsec; its gain is multiplexing many requests over a single TCP connection.',
  'learning.concept.http2.q1.c.why':
    'HTTP/2 still uses TCP (UDP is HTTP/3’s QUIC); it multiplexes streams over one connection.',
  'learning.concept.http2.q2.a.why':
    'Plain-text lines are HTTP/1.1; HTTP/2 uses an efficient binary framing layer.',
  'learning.concept.http2.q2.c.why':
    'Fixed 1500-byte cells evoke ATM/Ethernet MTU, not HTTP/2 — it uses variable-length binary frames.',
  'learning.concept.http2.q3.a.why':
    'gzip compresses bodies; HTTP/2 headers are compressed with the purpose-built HPACK.',
  'learning.concept.http2.q3.b.why':
    'HTTP/2 does compress headers — repetitive ones especially — using HPACK.',
  'learning.concept.http3.q1.b.why':
    'Raw TCP is HTTP/1.1 and HTTP/2; HTTP/3 runs over QUIC, which is built on UDP.',
  'learning.concept.http3.q1.c.why': 'ICMP is for diagnostics; HTTP/3 runs over QUIC (UDP).',
  'learning.concept.http3.q2.a.why':
    'HTTP/3 keeps headers compact (QPACK); its win is removing TCP’s cross-stream head-of-line blocking.',
  'learning.concept.http3.q2.c.why':
    'HTTP/3 is always encrypted via QUIC/TLS 1.3; the gain is no TCP head-of-line blocking across streams.',
  'learning.concept.http3.q3.a.why':
    'HPACK is HTTP/2’s; HTTP/3 needs QPACK, which tolerates QUIC’s out-of-order stream delivery.',
  'learning.concept.http3.q3.b.why':
    'gzip is for bodies; HTTP/3 compresses headers with QPACK (HPACK adapted for QUIC).',
  'learning.concept.ssh.name': 'SSH',
  'learning.concept.ssh.q1.prompt': 'SSH provides…',
  'learning.concept.ssh.q1.a': 'An encrypted remote shell and tunnel',
  'learning.concept.ssh.q1.b': 'Plaintext file transfer',
  'learning.concept.ssh.q1.c': 'IP address assignment',
  'learning.concept.ssh.q1.why':
    'SSH secures remote login and arbitrary tunnels with encryption and authentication, replacing Telnet.',
  'learning.concept.ssh.q2.prompt': 'SSH listens on which well-known port?',
  'learning.concept.ssh.q2.a': '23',
  'learning.concept.ssh.q2.b': '22',
  'learning.concept.ssh.q2.c': '443',
  'learning.concept.ssh.q2.why': 'Port 22 is SSH; 23 is the insecure Telnet; 443 is HTTPS.',
  'learning.concept.ssh.q3.prompt': 'An SSH authentication method stronger than passwords is…',
  'learning.concept.ssh.q3.a': 'MAC filtering',
  'learning.concept.ssh.q3.b': 'A VLAN tag',
  'learning.concept.ssh.q3.c': 'Public-key authentication',
  'learning.concept.ssh.q3.why':
    'Key pairs authenticate without sending a secret over the wire; the server trusts the client public key.',
  'learning.concept.ftp.name': 'FTP',
  'learning.concept.ftp.q1.prompt': 'FTP uses…',
  'learning.concept.ftp.q1.a': 'Separate control and data connections',
  'learning.concept.ftp.q1.b': 'A single UDP datagram',
  'learning.concept.ftp.q1.c': 'ICMP messages',
  'learning.concept.ftp.q1.why':
    'FTP keeps a control channel for commands and opens separate data connections for transfers.',
  'learning.concept.ftp.q2.prompt': 'The FTP control connection uses port…',
  'learning.concept.ftp.q2.a': '80',
  'learning.concept.ftp.q2.b': '21',
  'learning.concept.ftp.q2.c': '53',
  'learning.concept.ftp.q2.why':
    'Port 21 carries FTP commands; data uses port 20 (active) or a negotiated port (passive).',
  'learning.concept.ftp.q3.prompt': 'Passive FTP was introduced to…',
  'learning.concept.ftp.q3.a': 'Encrypt the data',
  'learning.concept.ftp.q3.b': 'Speed up DNS',
  'learning.concept.ftp.q3.c': 'Work through client-side firewalls and NAT',
  'learning.concept.ftp.q3.why':
    'In passive mode the client opens the data connection, so it traverses NAT/firewalls that block inbound active-mode connections.',
  'learning.concept.smtp.name': 'SMTP',
  'learning.concept.smtp.q1.prompt': 'SMTP is used to…',
  'learning.concept.smtp.q1.a': 'Send and relay email between servers',
  'learning.concept.smtp.q1.b': 'Retrieve email to a client',
  'learning.concept.smtp.q1.c': 'Resolve hostnames',
  'learning.concept.smtp.q1.why':
    'SMTP pushes mail from client to server and server to server; retrieval is IMAP/POP3.',
  'learning.concept.smtp.q2.prompt': 'SMTP commonly uses port…',
  'learning.concept.smtp.q2.a': '110',
  'learning.concept.smtp.q2.b': '25 (or 587 for submission)',
  'learning.concept.smtp.q2.c': '22',
  'learning.concept.smtp.q2.why':
    'Port 25 is server-to-server SMTP; 587 is authenticated client submission; 110 is POP3.',
  'learning.concept.smtp.q3.prompt': 'Which DNS record says where to deliver a domain mail?',
  'learning.concept.smtp.q3.a': 'A',
  'learning.concept.smtp.q3.b': 'CNAME',
  'learning.concept.smtp.q3.c': 'MX',
  'learning.concept.smtp.q3.why': 'The MX record names the mail exchanger host for a domain.',
  'learning.concept.email.name': 'Email (IMAP/POP3)',
  'learning.concept.email.q1.prompt': 'IMAP and POP3 are used to…',
  'learning.concept.email.q1.a': 'Retrieve email from a mailbox server',
  'learning.concept.email.q1.b': 'Send email between servers',
  'learning.concept.email.q1.c': 'Assign IP addresses',
  'learning.concept.email.q1.why': 'They pull mail down to the client; SMTP is what sends it.',
  'learning.concept.email.q2.prompt': 'A key IMAP vs POP3 difference is…',
  'learning.concept.email.q2.a': 'IMAP is unencrypted only',
  'learning.concept.email.q2.b':
    'IMAP keeps mail on the server and syncs devices; POP3 typically downloads and removes',
  'learning.concept.email.q2.c': 'POP3 sends mail',
  'learning.concept.email.q2.why':
    'IMAP is server-side and multi-device; POP3 historically downloads to a single device.',
  'learning.concept.email.q3.prompt': 'Secure IMAP/POP3 runs over…',
  'learning.concept.email.q3.a': 'ICMP',
  'learning.concept.email.q3.b': 'ARP',
  'learning.concept.email.q3.c': 'TLS',
  'learning.concept.email.q3.why': 'IMAPS/POP3S wrap the session in TLS for confidentiality.',
  'learning.concept.ntp.name': 'NTP',
  'learning.concept.ntp.q1.prompt': 'NTP is used to…',
  'learning.concept.ntp.q1.a': 'Synchronize clocks across devices',
  'learning.concept.ntp.q1.b': 'Resolve hostnames',
  'learning.concept.ntp.q1.c': 'Assign addresses',
  'learning.concept.ntp.q1.why': 'NTP keeps device clocks aligned to a reference time source.',
  'learning.concept.ntp.q2.prompt': 'NTP organizes time sources into…',
  'learning.concept.ntp.q2.a': 'VLANs',
  'learning.concept.ntp.q2.b': 'Strata (stratum 0 reference, 1 servers, …)',
  'learning.concept.ntp.q2.c': 'Autonomous systems',
  'learning.concept.ntp.q2.why':
    'Stratum number is the distance from the reference clock; lower is closer and more authoritative.',
  'learning.concept.ntp.q3.prompt': 'Accurate time matters for…',
  'learning.concept.ntp.q3.a': 'Faster cables',
  'learning.concept.ntp.q3.b': 'Bigger MTUs',
  'learning.concept.ntp.q3.c': 'Logs, certificates and time-sensitive auth (TLS/Kerberos)',
  'learning.concept.ntp.q3.why':
    'Certificate validity windows, log correlation, and time-based auth all break with skewed clocks.',
  'learning.concept.snmp.name': 'SNMP',
  'learning.concept.snmp.q1.prompt': 'SNMP is used for…',
  'learning.concept.snmp.q1.a': 'Monitoring and managing network devices',
  'learning.concept.snmp.q1.b': 'Routing packets',
  'learning.concept.snmp.q1.c': 'Encrypting links',
  'learning.concept.snmp.q1.why':
    'SNMP reads and writes device state (counters, status) for network management.',
  'learning.concept.snmp.q2.prompt': 'SNMP organizes managed data as…',
  'learning.concept.snmp.q2.a': 'Routing tables',
  'learning.concept.snmp.q2.b': 'OIDs in a MIB tree',
  'learning.concept.snmp.q2.c': 'MAC tables',
  'learning.concept.snmp.q2.why':
    'Each value has an Object Identifier within the Management Information Base hierarchy.',
  'learning.concept.snmp.q3.prompt': 'An unsolicited SNMP alert a device sends on an event is a…',
  'learning.concept.snmp.q3.a': 'GET',
  'learning.concept.snmp.q3.b': 'ACK',
  'learning.concept.snmp.q3.c': 'Trap',
  'learning.concept.snmp.q3.why':
    'Traps/notifications are device-initiated alerts, versus manager-initiated GET/SET polls.',
  'learning.concept.ipsec.name': 'IPsec',
  'learning.concept.ipsec.q1.prompt': 'IPsec provides…',
  'learning.concept.ipsec.q1.a': 'Authenticated, encrypted IP packets (a secure VPN)',
  'learning.concept.ipsec.q1.b': 'Name resolution',
  'learning.concept.ipsec.q1.c': 'Switching',
  'learning.concept.ipsec.q1.why':
    'IPsec secures IP traffic itself — confidentiality, integrity, authentication — commonly for VPNs.',
  'learning.concept.ipsec.q2.prompt': 'Which IPsec protocol encrypts the payload?',
  'learning.concept.ipsec.q2.a': 'AH',
  'learning.concept.ipsec.q2.b': 'ESP',
  'learning.concept.ipsec.q2.c': 'ARP',
  'learning.concept.ipsec.q2.why':
    'ESP (Encapsulating Security Payload) encrypts and authenticates; AH only authenticates.',
  'learning.concept.ipsec.q3.prompt': 'IPsec tunnel mode…',
  'learning.concept.ipsec.q3.a': 'Encrypts only ports',
  'learning.concept.ipsec.q3.b': 'Disables routing',
  'learning.concept.ipsec.q3.c':
    'Encrypts the whole original packet inside a new one (gateway-to-gateway)',
  'learning.concept.ipsec.q3.why':
    'Tunnel mode wraps the entire packet (VPN gateways); transport mode protects the payload host-to-host.',
  'learning.concept.radius.name': 'RADIUS / 802.1X',
  'learning.concept.radius.q1.prompt': '802.1X provides…',
  'learning.concept.radius.q1.a': 'Port-based network access control (authenticate before access)',
  'learning.concept.radius.q1.b': 'Routing',
  'learning.concept.radius.q1.c': 'Name resolution',
  'learning.concept.radius.q1.why':
    '802.1X gates a switch port or Wi-Fi until the client authenticates.',
  'learning.concept.radius.q2.prompt': 'RADIUS is a…',
  'learning.concept.radius.q2.a': 'Routing protocol',
  'learning.concept.radius.q2.b': 'AAA server protocol (Authentication, Authorization, Accounting)',
  'learning.concept.radius.q2.c': 'Tunneling protocol',
  'learning.concept.radius.q2.why':
    'RADIUS centralizes who-can-access decisions and logging for network devices.',
  'learning.concept.radius.q3.prompt': 'In 802.1X, the switch/AP relaying credentials is the…',
  'learning.concept.radius.q3.a': 'Supplicant',
  'learning.concept.radius.q3.b': 'DNS server',
  'learning.concept.radius.q3.c': 'Authenticator',
  'learning.concept.radius.q3.why':
    'Supplicant (client) ↔ Authenticator (switch/AP) ↔ Authentication server (RADIUS).',
  'learning.concept.isis.name': 'IS-IS',
  'learning.concept.isis.q1.prompt': 'IS-IS is a…',
  'learning.concept.isis.q1.a': 'Link-state IGP (like OSPF), common in ISP cores',
  'learning.concept.isis.q1.b': 'Distance-vector protocol',
  'learning.concept.isis.q1.c': 'An application protocol',
  'learning.concept.isis.q1.why':
    'IS-IS floods link state and runs SPF; it is widely used in large service-provider networks.',
  'learning.concept.isis.q2.prompt': 'Compared with OSPF, IS-IS…',
  'learning.concept.isis.q2.a': 'Uses hop count',
  'learning.concept.isis.q2.b': 'Runs directly on the link layer (not inside IP)',
  'learning.concept.isis.q2.c': 'Requires TCP',
  'learning.concept.isis.q2.why':
    'IS-IS PDUs ride directly on L2 — a design difference from OSPF, which runs over IP.',
  'learning.concept.isis.q3.prompt': 'Both OSPF and IS-IS choose paths by…',
  'learning.concept.isis.q3.a': 'AS-path length',
  'learning.concept.isis.q3.b': 'MAC address',
  'learning.concept.isis.q3.c': 'Shortest total link cost (Dijkstra/SPF)',
  'learning.concept.isis.q3.why':
    'Both are link-state protocols that compute least-cost paths with SPF.',
  'learning.concept.eigrp.name': 'EIGRP',
  'learning.concept.eigrp.q1.prompt': 'EIGRP is…',
  'learning.concept.eigrp.q1.a': 'An advanced distance-vector protocol using DUAL',
  'learning.concept.eigrp.q1.b': 'A pure link-state protocol',
  'learning.concept.eigrp.q1.c': 'An application protocol',
  'learning.concept.eigrp.q1.why':
    'EIGRP is advanced distance-vector; its DUAL algorithm gives fast, loop-free convergence.',
  'learning.concept.eigrp.q2.prompt': 'A feasible successor lets EIGRP…',
  'learning.concept.eigrp.q2.a': 'Encrypt traffic',
  'learning.concept.eigrp.q2.b': 'Reconverge fast without recomputation',
  'learning.concept.eigrp.q2.c': 'Assign IPs',
  'learning.concept.eigrp.q2.why':
    'A precomputed backup route lets EIGRP switch instantly when the primary fails.',
  'learning.concept.eigrp.q3.prompt': 'EIGRP metric is based on…',
  'learning.concept.eigrp.q3.a': 'Hop count only',
  'learning.concept.eigrp.q3.b': 'AS-path',
  'learning.concept.eigrp.q3.c': 'Bandwidth and delay (composite)',
  'learning.concept.eigrp.q3.why':
    'EIGRP composites bandwidth and delay (optionally load/reliability), unlike RIP hop count.',
  'learning.concept.lacp.name': 'LACP',
  'learning.concept.lacp.q1.prompt': 'LACP is used to…',
  'learning.concept.lacp.q1.a': 'Bundle several links into one logical link',
  'learning.concept.lacp.q1.b': 'Prevent loops',
  'learning.concept.lacp.q1.c': 'Assign VLANs',
  'learning.concept.lacp.q1.why':
    'LACP negotiates a Link Aggregation Group, combining links for bandwidth and redundancy.',
  'learning.concept.lacp.q2.prompt': 'An aggregated port-channel gives…',
  'learning.concept.lacp.q2.a': 'A new IP subnet',
  'learning.concept.lacp.q2.b': 'More bandwidth and link redundancy',
  'learning.concept.lacp.q2.c': 'Encryption',
  'learning.concept.lacp.q2.why':
    'Traffic is hashed across member links; if one fails the others carry on.',
  'learning.concept.lacp.q3.prompt': 'STP treats a correct LACP bundle as…',
  'learning.concept.lacp.q3.a': 'Multiple loops to block',
  'learning.concept.lacp.q3.b': 'A router',
  'learning.concept.lacp.q3.c': 'A single logical link (not blocked as a loop)',
  'learning.concept.lacp.q3.why':
    'The bundle appears as one link to STP, so it does not block the redundant members.',
  'learning.concept.lldp.name': 'LLDP',
  'learning.concept.lldp.q1.prompt': 'LLDP lets a device…',
  'learning.concept.lldp.q1.a': 'Discover directly-connected neighbors and their capabilities',
  'learning.concept.lldp.q1.b': 'Route between subnets',
  'learning.concept.lldp.q1.c': 'Encrypt frames',
  'learning.concept.lldp.q1.why':
    'Devices advertise identity, port and capabilities so neighbors learn the local topology (CDP is the Cisco equivalent).',
  'learning.concept.lldp.q2.prompt': 'LLDP operates…',
  'learning.concept.lldp.q2.a': 'Across the whole internet',
  'learning.concept.lldp.q2.b': 'Per link, within one segment (not routed)',
  'learning.concept.lldp.q2.c': 'Over TCP',
  'learning.concept.lldp.q2.why':
    'LLDP frames are link-local and are not forwarded by switches or routers.',
  'learning.concept.lldp.q3.prompt': 'LLDP is commonly used for…',
  'learning.concept.lldp.q3.a': 'Assigning IP addresses',
  'learning.concept.lldp.q3.b': 'Choosing routes',
  'learning.concept.lldp.q3.c': 'Mapping physical topology and aiding VoIP/PoE setup',
  'learning.concept.lldp.q3.why':
    'NMS tools build wiring maps from LLDP; it also helps phones learn voice VLAN and PoE info.',
  'learning.concept.tunneling.name': 'Tunneling & encapsulation',
  'learning.concept.tunneling.q1.prompt': 'Tunneling (encapsulation) works by…',
  'learning.concept.tunneling.q1.a':
    "Wrapping an original packet inside a new outer header so it can cross a network that wouldn't otherwise carry it",
  'learning.concept.tunneling.q1.b': 'Encrypting every packet end to end',
  'learning.concept.tunneling.q1.c': 'Compressing the payload to save bandwidth',
  'learning.concept.tunneling.q1.why':
    'A tunnel adds an outer header (GRE/IP, VXLAN/UDP, MPLS, …) around the original packet; the inner packet rides as payload across the transit network.',
  'learning.concept.tunneling.q2.prompt': 'At the two ends of a tunnel…',
  'learning.concept.tunneling.q2.a': 'Both ends drop the outer header immediately',
  'learning.concept.tunneling.q2.b':
    'The ingress encapsulates (adds the outer header) and the egress decapsulates (strips it) and forwards the inner packet',
  'learning.concept.tunneling.q2.c': 'Only the receiver adds a header',
  'learning.concept.tunneling.q2.why':
    'Encapsulation happens at the tunnel ingress; decapsulation at the egress, which then routes the recovered inner packet normally.',
  'learning.concept.tunneling.q3.prompt': 'Why does tunneling lower the usable MTU?',
  'learning.concept.tunneling.q3.a': 'Because the network runs slower',
  'learning.concept.tunneling.q3.b': 'Because the inner packet is encrypted',
  'learning.concept.tunneling.q3.c':
    'The extra outer header consumes bytes, so the inner payload must be smaller or it fragments/drops',
  'learning.concept.tunneling.q3.why':
    'Outer headers are overhead. If inner + outer exceeds the path MTU with DF set, the packet is dropped — hence MSS clamping or a lower tunnel MTU.',
  'learning.concept.vpn.name': 'VPN',
  'learning.concept.vpn.q1.prompt': 'The primary purpose of a VPN is to…',
  'learning.concept.vpn.q1.a':
    'Create a secure, encrypted tunnel across an untrusted network so traffic stays private and authenticated',
  'learning.concept.vpn.q1.b': 'Speed up the internet connection',
  'learning.concept.vpn.q1.c': 'Assign public IP addresses to hosts',
  'learning.concept.vpn.q1.why':
    'A VPN encapsulates and encrypts traffic so it can traverse a public network as if it were a private link.',
  'learning.concept.vpn.q2.prompt': 'Site-to-site and remote-access VPNs differ in that…',
  'learning.concept.vpn.q2.a': 'Site-to-site needs no encryption',
  'learning.concept.vpn.q2.b':
    'Site-to-site links whole networks via gateways; remote-access connects a single client device into the network',
  'learning.concept.vpn.q2.c': 'Remote-access only works over Ethernet',
  'learning.concept.vpn.q2.why':
    'Site-to-site gateways tunnel between two subnets; remote-access (client VPN) attaches one user device to the corporate network.',
  'learning.concept.vpn.q3.prompt': 'Split tunneling means…',
  'learning.concept.vpn.q3.a': 'All traffic is blocked',
  'learning.concept.vpn.q3.b': 'The VPN encrypts everything twice',
  'learning.concept.vpn.q3.c':
    'Only some traffic (e.g. corporate subnets) goes through the VPN; the rest goes directly to the internet',
  'learning.concept.vpn.q3.why':
    'Split tunneling routes only selected destinations over the VPN — less load, but wider exposure than a full tunnel.',
  'learning.concept.wireguard.name': 'WireGuard',
  'learning.concept.wireguard.q1.prompt': 'WireGuard runs over…',
  'learning.concept.wireguard.q1.a': 'TCP, with a TLS handshake',
  'learning.concept.wireguard.q1.b': 'UDP, on a single port — lightweight and NAT-friendly',
  'learning.concept.wireguard.q1.c': 'ICMP',
  'learning.concept.wireguard.q1.why':
    'WireGuard is a UDP protocol; using one port keeps it fast and easy to pass through NAT and firewalls.',
  'learning.concept.wireguard.q2.prompt': 'WireGuard identifies each peer by…',
  'learning.concept.wireguard.q2.a': 'A username and password',
  'learning.concept.wireguard.q2.b': 'Its MAC address',
  'learning.concept.wireguard.q2.c': 'Its public key, pinned to a set of allowed IPs',
  'learning.concept.wireguard.q2.why':
    'Each peer has a static keypair; the public key plus AllowedIPs defines who may send which source addresses (cryptokey routing).',
  'learning.concept.wireguard.q3.prompt':
    'WireGuard is considered simpler and faster than IPsec because…',
  'learning.concept.wireguard.q3.a':
    'It has a tiny codebase and fixed modern crypto with no cipher negotiation, and runs in the kernel',
  'learning.concept.wireguard.q3.b': 'It skips encryption entirely',
  'learning.concept.wireguard.q3.c': 'It only works on one operating system',
  'learning.concept.wireguard.q3.why':
    'No ciphersuite negotiation (one modern set), a small auditable codebase, and an in-kernel data path give it low overhead.',
  'learning.concept.l2tp.name': 'L2TP',
  'learning.concept.l2tp.q1.prompt': 'On its own, L2TP provides…',
  'learning.concept.l2tp.q1.a': 'Strong encryption of all traffic',
  'learning.concept.l2tp.q1.b': 'No encryption — it is a tunneling protocol only',
  'learning.concept.l2tp.q1.c': 'Routing between subnets',
  'learning.concept.l2tp.q1.why':
    'L2TP encapsulates traffic but offers no confidentiality, which is why it is usually paired with IPsec (L2TP/IPsec).',
  'learning.concept.l2tp.q2.prompt': 'L2TP tunnels…',
  'learning.concept.l2tp.q2.a':
    'Layer-2 PPP frames across an IP network (between a LAC and an LNS)',
  'learning.concept.l2tp.q2.b': 'Only HTTP requests',
  'learning.concept.l2tp.q2.c': 'BGP routing tables',
  'learning.concept.l2tp.q2.why':
    'L2TP carries PPP sessions over IP between the access concentrator (LAC) and the network server (LNS).',
  'learning.concept.l2tp.q3.prompt': 'L2TP is commonly combined with IPsec because…',
  'learning.concept.l2tp.q3.a': 'IPsec makes it faster',
  'learning.concept.l2tp.q3.b': 'L2TP cannot cross NAT at all',
  'learning.concept.l2tp.q3.c':
    'L2TP supplies the tunnel/encapsulation while IPsec adds encryption and authentication',
  'learning.concept.l2tp.q3.why':
    'L2TP/IPsec is a common pairing: L2TP for the tunnel, IPsec (ESP) for confidentiality and integrity.',
  'learning.concept.pppoe.name': 'PPP / PPPoE',
  'learning.concept.pppoe.q1.prompt': 'PPP (Point-to-Point Protocol) provides…',
  'learning.concept.pppoe.q1.a':
    'Link-layer encapsulation and authentication (PAP/CHAP) over a single point-to-point link',
  'learning.concept.pppoe.q1.b': 'Routing between many networks',
  'learning.concept.pppoe.q1.c': 'Public IP allocation for the whole internet',
  'learning.concept.pppoe.q1.why':
    'PPP frames traffic on a single link and can authenticate the peer and negotiate addresses (via IPCP).',
  'learning.concept.pppoe.q2.prompt': 'PPPoE adds to PPP the ability to…',
  'learning.concept.pppoe.q2.a': 'Encrypt all packets',
  'learning.concept.pppoe.q2.b':
    'Carry PPP sessions inside Ethernet frames, so many subscribers share one Ethernet/DSL access network',
  'learning.concept.pppoe.q2.c': 'Replace IP addressing',
  'learning.concept.pppoe.q2.why':
    'PPPoE (PPP over Ethernet) runs per-subscriber PPP sessions over a shared Ethernet access network — common in DSL.',
  'learning.concept.pppoe.q3.prompt': 'The PPPoE Discovery stage (PADI/PADO/PADR/PADS)…',
  'learning.concept.pppoe.q3.a': 'Encrypts the session keys',
  'learning.concept.pppoe.q3.b': "Assigns the customer's IP address",
  'learning.concept.pppoe.q3.c':
    'Finds and selects an access concentrator and establishes a session id before the PPP session starts',
  'learning.concept.pppoe.q3.why':
    'Discovery (PADI→PADO→PADR→PADS) picks the access concentrator and assigns a session id; the PPP session phase then runs over it.',
  'learning.concept.ndp.name': 'NDP / SLAAC (IPv6)',
  'learning.concept.ndp.q1.prompt': 'In IPv6, NDP takes over the job IPv4 used which protocol for?',
  'learning.concept.ndp.q1.a':
    'ARP — resolving a neighbor IP to its link-layer (MAC) address, via ICMPv6 Neighbor Solicitation/Advertisement',
  'learning.concept.ndp.q1.b': 'Routing between autonomous systems',
  'learning.concept.ndp.q1.c': 'Encrypting traffic',
  'learning.concept.ndp.q1.why':
    'NDP runs over ICMPv6: Neighbor Solicitation/Advertisement replace ARP, and Router Solicitation/Advertisement handle router discovery.',
  'learning.concept.ndp.q2.prompt':
    'How does SLAAC let a host get an address without a DHCP server?',
  'learning.concept.ndp.q2.a': 'It guesses an address at random',
  'learning.concept.ndp.q2.b':
    'A Router Advertisement supplies a prefix, and the host forms its address from that prefix plus an interface identifier',
  'learning.concept.ndp.q2.c': "It copies the router's address",
  'learning.concept.ndp.q2.why':
    'Stateless Address Autoconfiguration: the RA carries the /64 prefix; the host appends an interface ID (EUI-64 or random) to build a global address.',
  'learning.concept.ndp.q3.prompt': 'What is Duplicate Address Detection (DAD)?',
  'learning.concept.ndp.q3.a': 'A way to encrypt the address',
  'learning.concept.ndp.q3.b': 'A method to compress addresses',
  'learning.concept.ndp.q3.c':
    'Before using an address, the host sends a Neighbor Solicitation for it to confirm no one else already has it',
  'learning.concept.ndp.q3.why':
    'DAD prevents address collisions: a tentative address is verified with an NS; if a reply comes back, the address is already in use.',
  'learning.concept.sip.name': 'SIP (VoIP signaling)',
  'learning.concept.sip.q1.prompt': 'What is SIP responsible for?',
  'learning.concept.sip.q1.a': 'Carrying the actual voice audio',
  'learning.concept.sip.q1.b':
    'Setting up, modifying and tearing down real-time sessions (calls) — the signaling, not the media',
  'learning.concept.sip.q1.c': 'Assigning IP addresses',
  'learning.concept.sip.q1.why':
    'SIP is a signaling protocol: it locates users and negotiates sessions, while the media travels in a separate stream.',
  'learning.concept.sip.q2.prompt': 'Does the voice/video itself travel inside SIP?',
  'learning.concept.sip.q2.a': 'Yes, SIP carries the audio samples',
  'learning.concept.sip.q2.b': 'Only for video, not audio',
  'learning.concept.sip.q2.c':
    'No — media flows separately (usually over RTP); SIP just negotiates it, often using SDP',
  'learning.concept.sip.q2.why':
    'SIP carries SDP to agree codecs/ports, then the media (RTP) flows directly between endpoints, separate from signaling.',
  'learning.concept.sip.q3.prompt': 'A SIP request such as INVITE most resembles…',
  'learning.concept.sip.q3.a':
    'HTTP — text-based requests/responses with methods, headers and status codes',
  'learning.concept.sip.q3.b': 'A binary routing protocol',
  'learning.concept.sip.q3.c': 'An Ethernet frame',
  'learning.concept.sip.q3.why':
    'SIP was modeled on HTTP/SMTP: human-readable methods (INVITE, BYE) and responses (200 OK, 404) make it familiar to web developers.',
  'learning.concept.rtp.name': 'RTP / RTCP',
  'learning.concept.rtp.q1.prompt': 'What does RTP carry, and over what transport?',
  'learning.concept.rtp.q1.a':
    'Real-time audio/video media, usually over UDP, with sequence numbers and timestamps',
  'learning.concept.rtp.q1.b': 'Routing tables over TCP',
  'learning.concept.rtp.q1.c': 'Email over TLS',
  'learning.concept.rtp.q1.why':
    'RTP adds sequence numbers and timestamps so the receiver can reorder, detect loss, and play media out at the right time.',
  'learning.concept.rtp.q2.prompt': 'Why does RTP usually run over UDP instead of TCP?',
  'learning.concept.rtp.q2.a': 'Because TCP cannot carry audio',
  'learning.concept.rtp.q2.b':
    'Low latency matters more than reliability — a retransmitted late packet is useless, so loss is tolerated/concealed',
  'learning.concept.rtp.q2.c': 'Because UDP is encrypted',
  'learning.concept.rtp.q2.why':
    "For live media a packet that arrives too late can't be played, so TCP's retransmit/ordering would add harmful delay; RTP conceals loss instead.",
  'learning.concept.rtp.q3.prompt': 'What does RTCP add alongside an RTP stream?',
  'learning.concept.rtp.q3.a': 'Stronger encryption',
  'learning.concept.rtp.q3.b': 'A backup copy of the media',
  'learning.concept.rtp.q3.c':
    'Control and quality feedback (jitter, packet loss, round-trip) so senders can adapt',
  'learning.concept.rtp.q3.why':
    "RTCP reports reception quality periodically, letting endpoints adjust bitrate or diagnose problems — control to RTP's data.",
  'learning.concept.stun.name': 'STUN / TURN / ICE',
  'learning.concept.stun.q1.prompt': 'What does STUN let a host behind NAT discover?',
  'learning.concept.stun.q1.a': 'The fastest route to a server',
  'learning.concept.stun.q1.b': 'The DNS name of a peer',
  'learning.concept.stun.q1.c':
    'Its own public (NAT-mapped) IP address and port, so peers can reach it through the NAT',
  'learning.concept.stun.q1.why':
    'A STUN server reflects back the source IP:port it sees, revealing the public mapping a NAT created — the basis of hole punching.',
  'learning.concept.stun.q2.prompt':
    'When direct connectivity fails (e.g. symmetric NAT), what carries the media?',
  'learning.concept.stun.q2.a': 'TURN — a relay server forwards the traffic between the two peers',
  'learning.concept.stun.q2.b': 'The DNS root servers',
  'learning.concept.stun.q2.c': 'BGP',
  'learning.concept.stun.q2.why':
    "TURN is the fallback: when peers can't reach each other directly, a relay forwards packets for both — reliable but costlier.",
  'learning.concept.stun.q3.prompt': "What is ICE's role?",
  'learning.concept.stun.q3.a': 'It encrypts the call',
  'learning.concept.stun.q3.b':
    'It gathers candidate addresses (host, STUN-reflexive, TURN-relayed) and runs connectivity checks to pick a working pair',
  'learning.concept.stun.q3.c': 'It assigns phone numbers',
  'learning.concept.stun.q3.why':
    'ICE coordinates STUN and TURN: it collects candidates from both ends and probes them to find the best path that actually works.',
  'learning.concept.dnssec.name': 'DNSSEC',
  'learning.concept.dnssec.q1.prompt': 'What does DNSSEC add to DNS?',
  'learning.concept.dnssec.q1.a':
    'Cryptographic signatures so a resolver can verify records are authentic and unmodified',
  'learning.concept.dnssec.q1.b': 'Faster lookups',
  'learning.concept.dnssec.q1.c': 'Automatic IP assignment',
  'learning.concept.dnssec.q1.why':
    'DNSSEC signs records (RRSIG) under zone keys (DNSKEY), letting resolvers detect tampering and forged answers (cache poisoning).',
  'learning.concept.dnssec.q2.prompt': 'Does DNSSEC encrypt your DNS queries?',
  'learning.concept.dnssec.q2.a': 'Yes, fully end to end',
  'learning.concept.dnssec.q2.b':
    'No — it authenticates responses for integrity; confidentiality is a different problem (DoH/DoT)',
  'learning.concept.dnssec.q2.c': 'Only for the root zone',
  'learning.concept.dnssec.q2.why':
    'DNSSEC proves answers are genuine but is sent in clear; encrypting the query is what DNS-over-HTTPS/TLS adds.',
  'learning.concept.dnssec.q3.prompt': 'How is trust established in DNSSEC?',
  'learning.concept.dnssec.q3.a': 'Every resolver trusts every zone by default',
  'learning.concept.dnssec.q3.b': 'By IP allow-lists',
  'learning.concept.dnssec.q3.c':
    "A chain of trust from the root down: each zone's key is vouched for by its parent via DS records",
  'learning.concept.dnssec.q3.why':
    "A parent zone publishes a DS record hashing the child's key, so validation walks root→TLD→domain — anchored at the trusted root key.",
  'learning.concept.review.title': 'Review',
  'learning.concept.review.start': 'Review weak spots ({{count}})',
  'learning.concept.review.mastered': '{{mastered}} / {{total}} mastered',
  'learning.concept.review.empty':
    'Answer some questions first — your weak spots will collect here for spaced review.',
  'learning.concept.review.deckProgress': '{{mastered}}/{{total}}',
  'learning.concept.review.due': 'Review due now ({{count}})',
} as const;
