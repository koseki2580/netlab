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

45 decks / 156 questions. A **Foundations** group comes first so a learner can
build the bedrock mental model before any single protocol; the per-protocol
decks then span the whole engine surface **and** widely-taught protocols beyond
it (concept checks are knowledge quizzes, so they need not be simulated):

| Layer            | Decks                                                                    |
| ---------------- | ------------------------------------------------------------------------ |
| Foundations      | TCP/IP & OSI model, Addressing & delivery, Ports & sockets               |
| L2 — Link        | Ethernet, ARP, STP, VLAN, VXLAN/EVPN, Wi-Fi, LACP, LLDP                  |
| L3 — Network     | IPv4, IPv6, ICMP, NAT, QoS/DSCP, VRRP, Multicast, MTU/PMTUD, GRE         |
| L4 — Transport   | TCP, UDP, QUIC                                                           |
| Security         | TLS, ACL/Firewall, SSH, IPsec, RADIUS/802.1X                             |
| L7 — Application | DNS, DHCP, HTTP, HTTP/2, HTTP/3, FTP, SMTP, Email (IMAP/POP3), NTP, SNMP |
| Routing          | OSPF, BGP, RIP, ECMP, MPLS, IS-IS, EIGRP                                 |

The Foundations decks (6 questions each) build the connective concepts —
**why networking is layered and how encapsulation works; how L2 (MAC) and L3
(IP) delivery differ and cooperate; ports, sockets and the 5-tuple** — that turn
isolated protocol facts into a coherent understanding. The most fundamental
protocol decks (Ethernet, ARP, IPv4, TCP, UDP, DNS) carry 5 questions each;
the rest carry 3. `decksByLayer()` groups them in stack order for the picker.

## Panel

`ConceptCheckPanel` (exported from the package root) shows a layer-grouped deck
picker, runs the chosen deck as a quiz (answer → ✓/✗ marked options + explained
feedback → next), then a scored summary and back-to-picker. Each completed deck
records a `drill` completion (`concept-<deck>`). Chrome and content are i18n'd
(en/ja) under `learning.concept.*` and lint-enforced. Demo route
`/learning/protocols` (Basic gallery card).

## Spaced repetition

A one-shot quiz tests recall once; durable knowledge needs **repeated retrieval
spaced over time**. So every answer feeds a Leitner scheduler
(`src/learning/review/`), turning the concept checks into a long-term review
system rather than a single pass.

Each question is tracked by a stable `itemId` (`questionItemId(deckId, qId)` →
`"arp:q1"`). `gradeReview(state, itemId, correct, now)` moves the item between
five boxes:

- **correct** → promote one box (capped at `MAX_BOX = 5`), pushing the next due
  date further out along `BOX_INTERVAL_MS` (`10 min → 1 d → 3 d → 7 d → 21 d`);
- **wrong** → reset to box 1, due again in 10 minutes.

An item in the top box is **mastered** and drops out of review.
`reviewQueue(state, limit)` surfaces the non-mastered items weakest-first (lower
box, then most overdue), and `reviewStats(state, now)` reports
`{ seen, mastered, due, inReview }`. State persists under the
`netlab-review-v1` key via `createReviewStore`, which is **SSR- and
storage-failure-safe** (degrades to empty, never throws) and tolerant of
malformed/legacy stored values.

In the panel this shows up as a **"Review weak spots (N)"** button on the picker
(appears once anything is in review) and a **mastery indicator** (`mastered /
total`). The review button runs a virtual session over the weakest items, mixing
questions across decks. `reviewStore` is an injectable prop so tests and
embeddings can supply an in-memory store.

## Testing expectations

- decks: unique ids, exactly one correct option per question, varied answer
  slots, and every referenced key present in both en and ja
- panel (jsdom): the picker lists every deck; a correct answer grades, a wrong
  answer reveals the right one; a full deck reaches a scored summary; ja renders;
  after a deck the Review pool appears and is replayable
- scheduler (pure): correct promotes + delays, wrong resets to box 1, promotion
  caps at mastered, `isDue` honors the clock, `reviewQueue` orders weakest-first
  and excludes mastered, stats count seen/mastered/due/inReview
- store: round-trips through storage, tolerates malformed/legacy values, and
  degrades to empty when storage is unavailable
