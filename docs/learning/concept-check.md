# Protocol Concept Checks

The breadth track of the learning surface: a data-driven, active-recall quiz
that scales across protocols. Where Packet Journey and the Resilience Lab go
_deep_ on one idea with the live engine, concept checks go _wide_ — a small
deck of multiple-choice questions per protocol, so a learner can sweep the
whole stack.

## Why data-driven

Adding a protocol must be cheap, or "almost all protocols" never happens. So a
deck is **pure data** (`CONCEPT_DECKS`) whose every string is an i18n key:

```ts
{
  id: 'arp',
  layer: 'l2',
  nameKey: 'learning.concept.arp.name',
  questions: [
    {
      id: 'q1',
      promptKey: 'learning.concept.arp.q1.prompt',
      explanationKey: 'learning.concept.arp.q1.why',
      options: [
        { key: 'learning.concept.arp.q1.a', correct: true },
        { key: 'learning.concept.arp.q1.b' },
        { key: 'learning.concept.arp.q1.c' },
      ],
    },
    // …
  ],
}
```

**To add a protocol:** append a deck to `src/learning/concept-check/decks.ts`
and its `learning.concept.<deck>.*` keys to the en/ja sub-catalogs
(`src/i18n/locales/{en,ja}/conceptCheck.ts`). A structural test fails if any
referenced key is missing in either language, if a question lacks exactly one
correct option, or if the correct answer never moves slot — so new decks can't
drift.

## Shipped decks

Thirty protocols across the stack (layer → decks):

| Layer            | Decks                                                            |
| ---------------- | ---------------------------------------------------------------- |
| L2 — Link        | Ethernet, ARP, STP, VLAN, VXLAN/EVPN, Wi-Fi                      |
| L3 — Network     | IPv4, IPv6, ICMP, NAT, QoS/DSCP, VRRP, Multicast, MTU/PMTUD, GRE |
| L4 — Transport   | TCP, UDP, QUIC                                                   |
| Security         | TLS, ACL/Firewall                                                |
| L7 — Application | DNS, DHCP, HTTP, HTTP/2, HTTP/3                                  |
| Routing          | OSPF, BGP, RIP, ECMP, MPLS                                       |

`decksByLayer()` groups them in stack order for the picker. This is essentially
the protocol surface the netlab engine itself simulates.

## Panel

`ConceptCheckPanel` (exported from the package root) shows a layer-grouped deck
picker, runs the chosen deck as a quiz (answer → ✓/✗ marked options + explained
feedback → next), then a scored summary and back-to-picker. Each completed deck
records a `drill` completion (`concept-<deck>`). Chrome and content are i18n'd
(en/ja) under `learning.concept.*` and lint-enforced. Demo route
`/learning/protocols` (Basic gallery card).

## Testing expectations

- decks: unique ids, exactly one correct option per question, varied answer
  slots, and every referenced key present in both en and ja
- panel (jsdom): the picker lists every deck; a correct answer grades, a wrong
  answer reveals the right one; a full deck reaches a scored summary; ja renders
