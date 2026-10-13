# Packet lab: what the simulator does with a hand-built packet

For the engineer who will design the packet exercises (build a packet, fragment, read a packet).
Everything below is pinned by `contract.test.ts` in this folder; the helpers that read the facts
are in `facts.ts`. Nothing here changes the simulator.

Run: `npx vitest run demo/packet-lab`

## The short version

| Exercise kind                                               | Judged by the simulator as it is?                                                                                                                                                                                        |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Build a packet**: destination IP, TTL, DF, port, protocol | **Yes.** Send the learner's packet, read delivered / drop node / drop reason / ICMP.                                                                                                                                     |
| **Build a packet**: destination MAC                         | **Not by delivery.** Routers and hosts never check the destination MAC, so the classic mistake (the server's MAC) is delivered. It can be judged by comparing the learner's MAC with the one the engine resolves itself. |
| **Fragment**: one narrow link                               | **Yes, as a statement.** The engine's own fragment list (size, offset, MF, identification) is exact and RFC-correct; compare the learner's statement with it.                                                            |
| **Fragment**: by sending the learner's fragments            | **No.** Fragments sent as separate packets are never reassembled.                                                                                                                                                        |
| **Fragment**: two different MTUs on the path                | **No.** The second cut produces wrong offsets and MF flags and a false "reassembled".                                                                                                                                    |
| **Read a packet**: TTL, DF + MTU, no route, ACL             | **Yes.** The drop hop carries the packet as it was, the reason, and the supporting evidence.                                                                                                                             |

## How to send and what comes back

```ts
const facts = await sendPacket(prepare(topology), buildPacket({ from, to, srcIp, dstIp, ... }));
```

- `sendPacket` builds a fresh `MainThreadEngine`, calls `engine.pipeline.precompute(packet, undefined, { probe: true })`
  and disposes the engine. It never throws; an engine exception becomes `status: 'engine-error'`.
- `precompute` returns `{ trace, snapshots }`. `snapshots[i]` is the `InFlightPacket` at `trace.hops[i]`
  (same length, same order). This is where every per-hop header field comes from. The UI reads the
  same snapshots through `engine.selectHop(step)` → `state.selectedPacket`.
- `sendPacket(prepared, packet, 'send')` uses `engine.send` instead, the path of the app's Send
  button. It gives the same facts **except that it overwrites the packet's source IP** (question 3).
- ICMP errors the engine generates are appended to the **same trace**, after the packet's own hops.
  They are told apart by the snapshot's packet id (`<id>-ttl-exceeded`, `<id>-frag-needed`);
  `facts.hops` holds only the packet's own hops and `facts.icmp` the errors.

Corrections to what was assumed before these tests:

- There is no `event: 'fragment'`. A fragment leaving a router is `event: 'forward'` with
  `action: 'fragment'`. Reassembly is `event: 'deliver'` with `action: 'reassembly-pending'` or
  `'reassembly-complete'`.
- `trace.status` is taken from the last hop only. A lone fragment that arrives and waits gives
  `'delivered'`. Use `facts.status` (`'delivered' | 'dropped' | 'pending' | 'engine-error'`).
- A hop's `ttl` is the TTL **on arrival** at that node; the snapshot's `frame.payload.ttl` is the TTL
  **on leaving**. At a router they differ by one. `HopView.ttl` is the snapshot's.

## Question by question

### 1. Destination IP

Assumed: the engine routes on `dstIp`; `dstNodeId` is bookkeeping.

Real:

- `dstIp` of the server, `dstNodeId` the server: delivered. Another host of the far LAN (with its
  node id): delivered there. A host of the sender's own LAN: delivered without touching the router.
  A router's own interface address with the router's id: delivered at the router.
- An address no route covers: dropped at the first router, `reason: 'no-route'`, with
  `routingDecision.winner === null` on the drop hop. **No ICMP destination-unreachable is generated**
  (quirk).
- **`dstNodeId` matters** (quirk). Routers forward on `dstIp`, but a node only accepts a packet when
  `dstNodeId` is that node **and** it owns `dstIp`. Switches use `dstNodeId` to pick the port when the
  destination MAC does not decide. Any disagreement ends as `drop` at a host with `reason: 'no-route'`
  (a host that is handed a packet it will not accept has "nowhere to forward it").
- **An unused address inside a connected LAN** (for example `203.0.113.99`) is not dropped at the
  router: it is sent back out and dropped at the sender with `reason: 'routing-loop'` (quirk; a real
  router would fail ARP and drop it itself).

Consequences:

- Build: sound. The exercise must set `dstNodeId` itself from the learner's `dstIp` (look the owner
  up in the topology; when nobody owns it, any id that is not a node, for example the address).
  Never expose `dstNodeId` to the learner.
- Build and read: "wrong network" distractors must be addresses **no route covers**, which give a
  clean `no-route` at a router. Do not use an unused address of a connected LAN as a wrong answer or
  as a diagnose case; its `routing-loop` at the sender teaches something false.
- Read: do not show "the host dropped it: no-route" to a learner as is; translate the reason for a
  drop at a host ("this device is not the destination").

### 2. Destination MAC

Assumed: unknown whether the engine honours or overwrites the frame's `dstMac`.

Real:

- A placeholder MAC (`00:00:00:00:00:00`, `...:01`, `...:02`) means "resolve it for me": the engine
  fills in the next hop's MAC (the gateway's for another network) and the sender's own source MAC.
- Any other `dstMac` is **kept exactly as given** on the first segment (sender hop and switch hops).
- **Routers never check it** (quirk). With the server's MAC, a MAC nobody has, or broadcast, the
  router forwards the packet all the same and it is delivered. With or without a switch in between.
- **Hosts never check it either** (quirk): on the sender's own LAN a frame with a MAC nobody has is
  delivered to the host that owns the IP.
- The only wrong MAC with a visible effect is **another host's MAC on the same switch**: the switch
  hands that host the frame and it drops it (`no-route`).
- On the sender's own LAN, the gateway's MAC sends the packet through the router and back to the
  host (`pc1 > sw1 > r1 > sw1 > pc2`), delivered.
- After every router the frame is rewritten correctly: source = that router's egress interface MAC,
  destination = the next device's MAC; the IP addresses do not change. This is observable at every
  hop, both in `hop.srcMac` / `hop.dstMac` and in the snapshot's `frame`.

Consequences:

- Build: "which destination MAC?" **cannot be judged by sending**. Sound alternative available now:
  send the same packet with `dstMac` unset, read `facts.hops[0].dstMac`, and compare the learner's
  value with it. The answer key is still the simulator's, and the per-hop frames make the
  explanation ("the IP stays, the MAC changes at every router").
- Read: "the frame was dropped because of its MAC" cannot be shown. "Which MAC does the frame carry
  on this link?" (read the hop) can.
- To make it judgeable by delivery the simulator would need: a router to drop a frame whose
  destination MAC is not its ingress interface's (and not broadcast/multicast), and a host to drop a
  frame whose destination MAC is not its own, each with a distinct reason.

### 3. Source addresses

Real:

- Through the pipeline a `srcIp` that is not the sender's is carried unchanged and delivered. There
  is no source check anywhere.
- **`engine.send` replaces `srcIp`** with the sending node's own address before forwarding (quirk).
  Otherwise `send` and the pipeline agree hop for hop.
- A delivered packet gets **no reply**: the trace ends at `deliver`. (Only `engine.ping` builds an
  echo reply.) The only packets that come back are ICMP errors.
- An ICMP error is addressed to the claimed `srcIp` but carries the real sender as `dstNodeId`, so
  with a spoofed source it travels to the real sender and is dropped there (`no-route`) (quirk; a
  real network delivers it to the claimed host).
- A `srcMac` that is not the sender's is kept until the first router and changes nothing.

Consequences: no exercise should have the learner edit a source field and expect a consequence; the
simulator shows none. Exercises must not rely on a reply coming back. If an exercise is ever shown
with the app's Send button, the source IP is not the learner's to set.

### 4. TTL

Real:

- The given `ttl` is honoured; each router takes one off; switches take nothing.
- A router drops a packet arriving with TTL ≤ 1: `reason: 'ttl-exceeded'`, no `routingDecision` on
  that hop, `icmpGenerated: true`. Through N routers the smallest TTL that arrives is **N + 1**, and
  it arrives as 1. TTL k (1 ≤ k ≤ N) is dropped at the k-th router.
- The ICMP time-exceeded (type 11, code 0) is generated by that router, sourced from the interface
  the packet **came in on**, and delivered to the sender, in the same trace after the drop.
- Quirks: TTL 0 still leaves the sender (dropped at the first router, delivered on the own LAN); a
  TTL above 255 is accepted.

Consequences: build ("smallest TTL that arrives", "make it die at the second router") and read
("why did this router drop it?") are both sound. Limit the field to 1–255 in the UI.

### 5. Ports and protocol

Real:

- An inbound ACL permitting TCP port 80 behaves as a real one: TCP 80 passes and the hop's
  `aclMatch.matchedRule` names the rule; TCP 22, UDP 80 and ICMP are dropped at the router with
  `reason: 'acl-deny'` and `aclMatch.matchedRule === null` (implicit deny). No ICMP is generated.
- `protocol` is **trusted, never checked against the payload** (quirk). Without an ACL a mismatch is
  delivered. For an ACL the packet is TCP only if `protocol === 6` **and** the payload is a TCP
  segment (same for UDP with 17); a mismatch is neither and matches only `protocol: 'any'` rules.
  `protocol === 1` is ICMP for an ACL whatever the payload is.
- The hop's `protocol` is a name derived from the number; `srcPort` / `dstPort` come from the payload.

Consequences: build ("choose the port the firewall lets through", "TCP or UDP?") and read ("which
field did the ACL refuse?") are sound **as long as the protocol number and the payload are changed
together**. Offer "TCP / UDP / ICMP" as one choice that sets both; do not let the learner edit the
number alone.

### 6. DF and MTU

Real:

- MTU is set on a link as `edge.data.mtuBytes` or on a router interface as `interface.mtu`; the
  smaller applies. It is checked **only by a router, on the link it sends onto**.
- DF clear, packet larger than the MTU: the router cuts it there. One hop per fragment,
  `action: 'fragment'`, with `fragmentIndex`, `fragmentCount`, `identification`, `nextHopMtu`.
- DF set: dropped at that router, `reason: 'fragmentation-needed'`, `nextHopMtu` on the drop hop,
  `icmpGenerated: true`. The router answers with ICMP type 3 code 4, sourced from its ingress
  interface, delivered to the sender, in the same trace. The next-hop MTU is stored in the ICMP
  message's `sequenceNumber` (`IcmpView.nextHopMtu` reads it).
- A packet exactly the size of the MTU is not cut. The receiving interface's MTU is ignored.
- Quirks: **a host never checks its own link's MTU** (neither fragments nor refuses); a given
  `totalLength` is believed over the real payload size; an MTU under 28 makes the engine **throw**
  (`facts.status === 'engine-error'`).

Consequences: build ("set DF so the router answers instead of cutting") and read ("why was it
dropped, and what MTU did the router report?") are sound. Put the narrow link **between routers or
after the last router**, never on the sender's own cable. Do not expose `totalLength`; leave it
unset so the size is the payload's. Keep MTUs ≥ 68.

### 7. Fragments in detail

Real:

- Every fragment is fully observable: `totalLength`, `fragmentOffset`, `flags.mf`, `flags.df` and
  `identification` are in the snapshot at each `action: 'fragment'` hop (the hop itself has only
  index, count, identification and MTU). `facts.fragments` lists them.
- `fragmentOffset` is in **8-byte units**. Every fragment but the last carries
  `floor((MTU − 20) / 8) × 8` bytes, as RFC 791 requires. The 8-byte ICMP or UDP header is part of
  what is cut. All fragments carry the packet's `identification` (the one given, else one derived
  from the addresses, the same on every run).
- Pinned lists for 1200 bytes of ICMP data (1208 bytes to carry, a 1228-byte packet):

  | MTU | `[totalLength, fragmentOffset, MF]`                                                 |
  | --- | ----------------------------------------------------------------------------------- |
  | 604 | `[604, 0, true] [604, 73, true] [60, 146, false]`                                   |
  | 300 | `[300, 0, true] [300, 35, true] [300, 70, true] [300, 105, true] [108, 140, false]` |

- The trace is depth-first: each fragment travels to the destination (`reassembly-pending`) before
  the next is cut. Fragments keep their fields on the way.
- The destination reassembles: the last hop is `deliver` with `action: 'reassembly-complete'`,
  `fragmentCount`, and a snapshot holding the whole packet again (`facts.reassembled`).
- A wider link after the narrow one changes nothing.
- **Two cuts are wrong** (quirk). A narrower second link does cut the fragments again and this is
  observable, but offsets restart at 0 inside each fragment and MF is cleared on the last sub-piece.
  For 604 then 300 the engine gives offsets `0, 35, 70 | 0, 35, 70 | 146` where RFC 791 gives
  `0, 35, 70, 73, 108, 143, 146`. The destination then reassembles the first three into one 604-byte
  packet, reports `reassembly-complete`, and leaves the rest pending. `facts.status` is `delivered`;
  `facts.reassembled.totalLength` (604, not 1228) is the only sign.

Consequences: the fragment exercise is sound for **one narrow link**, with the engine's list as the
answer key (count, each size, each offset in 8-byte units, each MF). Vary the payload size, the MTU,
ICMP or UDP, where the narrow link is, and DF (expect no fragments and an ICMP). **Two MTUs must
wait**: `fragment()` in `src/simulation/fragmentation.ts` has to add the incoming fragment's offset
and keep MF set when the incoming fragment had it.

### 8. A learner-supplied fragment set

Real:

- A fragment sent on its own travels, arrives, and waits (`reassembly-pending`).
- **Fragments sent as separate packets are never put together**, even on one engine: the
  reassembler lives inside one `precompute` call (quirk).
- The reassembler (`src/simulation/Reassembler.ts`) called directly completes the engine's own
  fragments in any order and returns null while one is missing. It restores the payload from an
  **internal field, `reassemblyPayload`, on the offset-0 fragment**; plain hand-built fragments
  never complete (quirk).
- `fragmentsFromStatement(whole, pieces)` supplies that field. With it the reassembler accepts a
  right split and **any other gapless split** (it does not know the MTU), and rejects (returns null
  for) a gap, an overlap, MF set on the last piece, a non-final size that is not a multiple of 8, a
  wrong total, and offsets given in bytes.
- It does **not** notice MF cleared on a middle piece (quirk).
- A hand-built fragment larger than a link's MTU is cut again by the router, with the same wrong
  offset/MF handling as in question 7.

Consequences: the fragment exercise is judged by **comparing the learner's statement with the
engine's own fragmentation**, not by sending fragments. `reassemble(fragmentsFromStatement(...))` is
usable as a second opinion for feedback ("these pieces leave a gap") but not as the judge, because
of the MF hole and because it accepts splits no router would make. To judge by sending, the
simulator would need a reassembler that outlives one send, reassembly from the fragments' own bytes,
and an MF check.

### 9. Determinism and cost

- The same packet on a fresh engine gives the same trace, snapshots, fragments and ICMP; only
  `hop.timestamp` (wall clock) differs. The derived identification depends on the addresses, not on
  the packet id or the clock.
- One send plus reading the facts (a fragmented packet over three routers, 13 hops), 50 times on a
  fresh engine each: mean 3.6 ms, median 3.3 ms, max 8.9 ms on a quiet machine; the mean rose to
  17–46 ms while other test runs shared the machine. The last test prints the figures. Cheap enough
  to send on every edit.

## Engine quirks, in one list

1. Delivery needs `dstNodeId` to name the owner of `dstIp`; a mismatch is a `no-route` drop at a host.
2. An unused address of a connected LAN bounces back: `routing-loop` at the sender.
3. No ICMP destination-unreachable for `no-route` (nor for `acl-deny`).
4. Routers and hosts never check the destination MAC.
5. `engine.send` overwrites the source IP.
6. An ICMP error for a spoofed source goes to the real sender and is dropped there.
7. TTL 0 is sent; TTL above 255 is accepted.
8. `protocol` is not checked against the payload; an ACL treats a mismatch as neither TCP nor UDP.
9. A host never checks its own link's MTU.
10. `totalLength`, when given, is believed.
11. An MTU under 28 throws.
12. A second fragmentation restarts offsets at 0 and clears MF, and the destination then reports a
    partial reassembly as complete.
13. `trace.status` is `delivered` for a fragment that is only waiting.
14. Separately sent fragments are never reassembled; reassembly depends on the internal
    `reassemblyPayload`; MF cleared on a middle piece goes unnoticed.

## Recommendation

### Sound to build now

Each idea lists what the learner edits and what is checked. "Checked" always means facts read from
the simulator after sending the learner's packet, unless it says "compared".

**Level 1**

- _Send it to the server._ Edits: destination IP (empty). Checked: `deliveredTo` is the server.
  Wrong answers: another host's address (delivered to the wrong device, shown), an address no route
  covers (`no-route` at the router).
- _Same network or another?_ Edits: destination IP, choosing between a neighbour and the server.
  Checked: `path` does or does not contain the router.
- _Read: where did it stop?_ Shown: a packet to an address no route covers. Answer: the destination
  IP. Evidence: `drop.reason === 'no-route'`, `routingDecision.winner === null`.

**Level 2**

- _Through the firewall._ Edits: destination port, and TCP / UDP as one choice. Checked: delivered,
  and `aclMatches[0].matchedRule` is the permit rule; a wrong answer shows `acl-deny` at the router.
- _Whose MAC goes on the frame?_ Edits: destination MAC, from a list of the devices' MACs.
  **Compared** with `hops[0].dstMac` of the same packet sent with the MAC unset. Then the per-hop
  frames are shown: the IP stays, the MAC changes at the router.
- _Read: the firewall said no._ Shown: a packet dropped with `acl-deny`. Answer: the port, or the
  protocol.
- _Read: the frame after the router._ Shown: the hop list. Answer: which source and destination MAC
  the frame has on the far link.

**Level 3**

- _Just enough TTL._ Edits: TTL. Checked: delivered and the arriving TTL is 1 (the smallest that
  works is routers + 1).
- _Make it die at the second router._ Edits: TTL. Checked: `drop` is `{ r2, 'ttl-exceeded' }` and
  `icmp[0]` is type 11 from that router.
- _Do not cut it._ Edits: the DF flag. Checked: `drop.reason === 'fragmentation-needed'`,
  `fragments` is empty, `icmp[0]` is type 3 code 4 with `nextHopMtu` equal to the link's MTU.
- _How is it split?_ States: the number of fragments and, for each, size, offset (8-byte units) and
  MF. **Compared** with `facts.fragments` for the packet actually sent over one narrow link.
- _Read: TTL or DF?_ Shown: a dropped packet and the ICMP that came back. Answer: the field; for DF
  also the MTU the router reported.

**Level 4**

- _Several fields at once._ Edits: destination IP, port and protocol, TTL, DF, on a path with an
  ACL, three routers and a narrow link. Checked: delivered; each wrong field has its own drop node
  and reason for the feedback.
- _Largest packet that is not cut._ Edits: the payload size, with DF set. Checked: delivered with no
  fragments, and one byte more is dropped (`fragmentation-needed`).
- _Split with a twist._ States the split for a UDP payload, an MTU that is not a round number
  (577), or a narrow **last** link (asked: which router cuts it?). Compared with `facts.fragments`.
- _Read: which of four?_ A mixed set of drops (`no-route`, `ttl-exceeded`, `acl-deny`,
  `fragmentation-needed`) on one topology; name the field and the device.

Rules every template must follow, from the quirks above: set `dstNodeId` from the learner's
`dstIp`; never use an unused address of a connected LAN; change the protocol number and the payload
together; keep the narrow link off the sender's cable; leave `totalLength` unset; one narrow link
per path; do not let the learner edit source fields; judge with the pipeline path, not `engine.send`.

### Should wait for an engine change

| Exercise                                                         | What has to change in the simulator                                                                                     |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Destination MAC judged by delivery (the server's MAC is dropped) | Router and host check the frame's destination MAC, with a reason of its own.                                            |
| Fragmentation over two different MTUs                            | `fragment()` keeps the base offset and the MF flag of the fragment it cuts.                                             |
| Send your own fragments and see them reassembled (or not)        | A reassembler that outlives one send, reassembly from the fragments' bytes instead of `reassemblyPayload`, an MF check. |
| "The address is on that LAN but nobody has it"                   | The router drops after a failed ARP instead of sending the packet back.                                                 |
| A host that will not send an oversized packet                    | Hosts check the MTU of their own link.                                                                                  |
| "Destination unreachable came back"                              | Routers generate ICMP type 3 for `no-route` (and optionally for `acl-deny`).                                            |
| Spoofed source and where the reply goes                          | ICMP errors routed to the owner of the claimed source; a reply to a delivered packet.                                   |
