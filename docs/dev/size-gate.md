# Size Gate

`npm run size` builds the library, runs [`size-limit`](https://github.com/ai/size-limit) with
[`.size-limit.mjs`](../../.size-limit.mjs), then runs
[`scripts/size-gate-check.mjs`](../../scripts/size-gate-check.mjs). No dependency beyond
`size-limit` and its `esbuild` and `file` plugins, which the project already had.

## What is measured

| Check                      | Measures                                                                                       |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| Eager checks               | What a consumer downloads up front: the entry and all it statically imports, npm packages too. |
| `pack:<id>`                | One lazily loaded learn chunk (`dist/pack-<id>-*.mjs`) on its own. Limit: 3 kB gzipped.        |
| `concept:<locale>:<chunk>` | One concept-check string chunk (`dist/concept-<locale>-<chunk>-*.mjs`, REQ-365) on its own.    |

`size-limit` bundles a check with esbuild and no code splitting, so without help a dynamic
`import()` is inlined and counted in the entry that reaches it. `withoutLazyChunks`
([`scripts/size-gate.mjs`](../../scripts/size-gate.mjs)) keeps dynamic imports out of each check.

The worker is an ES module: its check counts the entry and the chunks it imports statically,
not a wire tier it loads on first use (GRE, NTP).

## The learn-tier guard

A pack's learn tier ([protocol packs](../core/protocol-packs.md)) carries the string
`__netlab_learn_tier__`. `size-gate-check` walks the static imports of every eager entry in `dist`
and fails, naming the entry and the chunk, if the string appears in the closure. That also catches
a tier inlined into the worker, where there is nothing to walk.

## The locale guard

The Japanese catalog is its own entry, `dist/locales/ja.js` (`locale:ja`, 25 kB), loaded on demand
by `I18nProvider` (REQ-356). `size-gate-check` fails, naming the entry and the file, if any other
eager entry's static imports reach a `dist/locales/*` file or a concept-check chunk.

## The concept-check chunks

The concept checks' strings, English and Japanese alike, load in chunks only when a view needs them
([i18n](i18n.md)). Each chunk has its own check, with a limit of its measured size plus about 10 %
(gzipped, kB = 1000 bytes; measured 2026-11-22):

| Chunk        | en measured | en limit | ja measured | ja limit |
| ------------ | ----------- | -------- | ----------- | -------- |
| core         | 1.23        | 1.4      | 1.56        | 1.8      |
| fundamentals | 5.86        | 6.5      | 7.02        | 7.8      |
| l2           | 5.96        | 6.6      | 7.08        | 7.8      |
| l3           | 7.57        | 8.4      | 8.98        | 9.9      |
| l4           | 2.66        | 3        | 3.34        | 3.7      |
| l5           | 4.64        | 5.2      | 5.67        | 6.3      |
| l7web        | 3.30        | 3.7      | 4.00        | 4.5      |
| l7apps       | 5.33        | 5.9      | 6.46        | 7.2      |
| routing      | 3.90        | 4.3      | 4.67        | 5.2      |

`ui:concept-check` (the panel, 26.3 kB) went from 110 kB to 29 kB once its English strings moved
out. The locale guard covers the chunks too: `size-gate-check` fails if another eager entry's
static imports reach a `dist/concept-<locale>-<chunk>-*` file. A deck that outgrows its chunk's
limit belongs in a new chunk, not a raised limit.

## The xterm.js guard

xterm.js is the demo's terminal (REQ-361). `size-gate-check` fails if an eager entry's closure
contains xterm.js's `xterm-helper-textarea`. The terminal's commands are their own chunk,
`ui:terminal` (8 kB; raised from 7 kB for `ss -l` and curl's response limits, REQ-418/419).
The engine worker is at 45,999 of 46,000 bytes after the TCP numbering and ACKs (REQ-417), which load
lazily from `tcpSegmentation.ts`: any further eager worker code must move out first.

## Adding a pack

Add a `pack('<id>', '3 kB')` line to `.size-limit.mjs`, name the learn file `pack-<id>.ts`, and
add its loader to `src/protocols/packLearn.ts`. Only UI code may import that module.

## Why the limits look loose

The eager limits were set under the old measure, which counted every lazy chunk. They were kept as
they were, so most now sit far above their figures. Lowering them is a separate decision.

### Concept-check chunks after the lesson decks (REQ-423)

The 26 lesson decks grew the group chunks; limits are measured + 10 %. `routing` is the largest (ja 16.0 kB,
nine lesson decks on top of seven protocol decks). If it grows again, split it — e.g. IGP decks (ospf, rip,
isis, eigrp, redistribution, bfd) from provider decks (bgp, ecmp, mpls, rpki, anycast, mplste, pim, sdwan,
segrouting, spineleaf) — rather than raising the limit further.

### After the twelve lessons of REQ-429..440 (measured 2026-11-24)

Twelve more lesson decks went into `l2` (maclearning, optical, lossless), `l3` (ipv6addr, cgnat,
mobilecore), `l4` (plpmtud, cubic), `l7web` (websocket), `l7apps` (dhcplease, timesync) and `routing`
(routereflector); their names went into `core`. Limits are again measured + 10 %:

| Chunk   | en measured | en limit | ja measured | ja limit |
| ------- | ----------- | -------- | ----------- | -------- |
| core    | 1.81        | 2        | 2.33        | 2.6      |
| l2      | 11.79       | 13       | 14.25       | 15.7     |
| l3      | 12.55       | 13.9     | 15.08       | 16.6     |
| l4      | 9.70        | 10.7     | 12.01       | 13.3     |
| l7web   | 7.14        | 7.9      | 8.82        | 9.8      |
| l7apps  | 9.75        | 10.8     | 11.81       | 13       |
| routing | 14.31       | 15.8     | 17.53       | 19.3     |

Each chunk loads once, when a learner first opens a deck of its group, so a learner who never opens
a group never downloads it. The next deck that pushes a chunk past its limit splits that chunk
(lesson decks from protocol decks), as described for `routing` above.
