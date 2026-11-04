# Protocol Packs

> **Status**: ✅ Frozen at `apiVersion: 1` and exported from `netlab`. DNS, GRE and NTP are packs;
> DNS and GRE run inside the engine. See [Add a protocol](#add-a-protocol).

A protocol pack describes one protocol **once**. Today a protocol is spread over 20–40 files:
a payload union, three number-to-name tables, a trace label, a hand-written serializer and a
second hand-written byte layout, a filter word, hop events, packet-lab ids and lesson
registrations in five places. A pack replaces that with one registration. The views are
_derived_ from it.

Requirements: REQ-100 to REQ-106 in the
[specification](../user-guide/specifications/specification.md), accepted by AC-153 to AC-159
and exercised by TC-920 to TC-949.

## The descriptor

```typescript
import { defineProtocol } from './src/protocols/pack'; // not yet exported from 'netlab'

export const grePack = defineProtocol({
  apiVersion: 1,
  id: 'gre', // also the trace-filter token
  name: { short: 'GRE', en: 'Generic Routing Encapsulation', ja: '汎用ルーティングカプセル化' },
  layer: 'L3',
  numbers: { ipProtocol: 47 }, // or ports: [{ transport: 'udp', port: 53 }], etherType
  specs: [
    {
      id: 'RFC 2784',
      title: 'Generic Routing Encapsulation (GRE)',
      year: 2000,
      status: 'proposed-standard',
    },
    {
      id: 'RFC 2890',
      title: 'Key and Sequence Number Extensions to GRE',
      year: 2000,
      status: 'proposed-standard',
    },
  ],
  versions: [
    { id: 'rfc2784', specs: ['RFC 2784'] },
    {
      id: 'rfc2890',
      specs: ['RFC 2784', 'RFC 2890'],
      extends: 'rfc2784',
      default: true,
      whatsNew: {
        en: 'Adds the Key and Sequence Number fields',
        ja: 'Key と Sequence Number を追加',
      },
    },
  ],
  header: [
    { key: 'c', name: 'Checksum Present', type: 'flag', meaning: { en: '…', ja: '…' }, example: 0 },
    // …
    {
      key: 'key',
      name: 'Key',
      type: 'uint',
      bits: 32,
      presentIf: 'k',
      in: ['rfc2890'],
      meaning: { en: '…', ja: '…' },
      example: 42,
    },
  ],
});
```

The full GRE and DNS descriptors are the test fixtures
`src/protocols/pack/fixtures/gre.pack.ts` and `src/protocols/pack/fixtures/dns.pack.ts`.

### Identity

| Field        | Rule                                                                                  |
| ------------ | ------------------------------------------------------------------------------------- |
| `apiVersion` | The pack API version the pack was written against (today `1`).                        |
| `id`         | `^[a-z][a-z0-9-]{0,31}$`, unique in a registry. It is also the trace-filter token.    |
| `name`       | `short` (the trace label, e.g. `GRE`), `en` and `ja` full names. All non-empty.       |
| `layer`      | `L2`, `L3`, `L4` or `L7`. It becomes the layer tag of every annotated field.          |
| `numbers`    | Optional `ipProtocol` (0–255), `etherType` (0–0xFFFF), `ports` (transport + 1–65535). |

### Versions and spec references

`specs` lists every document the pack cites: `id` (`RFC 2784`, `IEEE 802.1Q-2022`), `title`,
`year`, `status` (`internet-standard`, `proposed-standard`, `draft-standard`,
`best-current-practice`, `informational`, `experimental`, `historic`, `ieee-standard`) and an
optional `url`. `versions` lists the versions a learner can choose: a unique `id`, the specs
that define it, an optional `extends` (an earlier version) and `whatsNew` (en/ja). Exactly one
version is `default`. A header field with `in: [...]` exists only in those versions; a field
without `in` exists in all of them. Two fields may share a `key` only when their `in` sets do
not overlap. This is how GRE's `Reserved0` is 12 bits in RFC 2784 and 9 bits in RFC 2890.

One protocol is one pack, whatever its versions: TLS 1.2 and TLS 1.3 are versions of `tls`,
not two packs. A new RFC that changes the wire format adds a version, not a pack.

### Header schema

`header` is the ordered list of fields on the wire. `sections` adds repeated groups after the
header (DNS questions and resource records). Each field has:

| Property     | Meaning                                                                                                   |
| ------------ | --------------------------------------------------------------------------------------------------------- |
| `key`        | Machine id, unique per version; the packet-lab field id is `<pack id>.<key>`.                             |
| `name`       | The name the RFC uses (`Protocol Type`). Shown as-is in both languages.                                   |
| `type`       | `uint`, `flag` (1 bit), `enum`, `reserved` (sent as 0), `ipv4`, `ipv6`, `mac`, `bytes`, `domain-name`.    |
| `bits`       | Width for `uint`, `enum`, `reserved`, and fixed `bytes`. Implied for `flag`/`ipv4`/`ipv6`/`mac`.          |
| `lengthFrom` | For variable `bytes`: the key of an earlier field holding its length in bytes (DNS `RDLENGTH`).           |
| `presentIf`  | The key of an earlier `flag`; the field is on the wire only when that flag is 1 (GRE `Key`).              |
| `values`     | For `enum`: `{ value, name, meaning? }` entries (DNS `RCODE` 3 = `NXDOMAIN`).                             |
| `hex`        | Display the number in hex (`0x0800`) instead of decimal.                                                  |
| `format`     | Optional `(value, siblings) => string` display override (DNS `RDATA` shown as an address when TYPE is A). |
| `meaning`    | `{ en, ja }` for learners. Required on every field, reserved ones included.                               |
| `example`    | A valid value. Required. The glossary shows it.                                                           |
| `in`         | Versions the field belongs to.                                                                            |

A section is `{ key, name, countFrom, fields }`: `countFrom` is the header field that counts
its entries (DNS `ANCOUNT`).

`defineProtocol` rejects a descriptor whose `presentIf`, `lengthFrom`, `countFrom`, `in`,
`extends` or spec ids point nowhere, whose fields do not close on a byte boundary in every
version (a variable field must also start on one), whose example or enum value does not fit
its width, or whose meaning is empty in either language. A rejection is a `NetlabError`
(`protocol/invalid-request`) whose `context.reason` names the rule (`pack/unknown-reference`,
`pack/misaligned`, …) and whose `context.path` names the field.

### Behaviour hooks and content bundle (declared, not wired)

`behaviour` and `content` are typed slots. W1 declares them so that a pack written now does
not change shape later. The engine does not call them yet.

- `behaviour.encapsulation` — `push(inner, config)` / `pop(outer)` (GRE, VXLAN, MPLS).
- `behaviour.endpoint` — request → reply packets (DNS, NTP).
- `behaviour.transit` — a per-device forwarding stage (VRRP, LACP).
- `behaviour.service` — a multi-message session (DHCP-like).
- `content` — `stage` (1–7), `lesson`, `deck`, `exam`, `exercises[]` and `i18n.{en,ja}`, each
  a loader `() => import('./…')`.

## Derivers

Every view comes from the descriptor and a **header object**: plain values keyed by field
key, sections as arrays, e.g. GRE
`{ c: 0, k: 1, s: 1, ver: 0, protocolType: 0x0800, key: 81, sequence: 7 }`. Reserved fields
default to 0; any other missing field is an error.

| Deriver                                     | Produces                                                                                                                                                                                                         |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deriveLayout(pack, header, opts)`          | `{ bytes, fields }`: the wire bytes, and every present field with `path` (`answer[0].ttl`), `bitOffset`, `bitLength`, `byteOffset`, `byteLength`. `opts.baseOffset` shifts offsets; `opts.version` picks fields. |
| `deriveAnnotatedFields(pack, header, opts)` | The hex/field view rows: today's `AnnotatedField` shape (`name`, `layer`, `byteOffset`, `byteLength`, `displayValue`) plus `key`, `path`, bit position, `value` and the en/ja `meaning`.                         |
| `deriveTraceLabel(pack, header?)`           | `name.short`, followed by the enum name of the `label.field` when the pack names one (DNS: `DNS QUERY` / `DNS RESPONSE`).                                                                                        |
| `deriveFilterToken(pack)`                   | The pack `id` (`gre`).                                                                                                                                                                                           |
| `deriveGlossary(pack)`                      | One entry for the protocol, then one per field key: term, en/ja meaning, example, versions it is in, and the specs of those versions; enum values listed with their meanings.                                    |
| `derivePacketLabFieldIds(pack, version?)`   | `<id>.<key>` (`<id>.<section>.<key>` in a section) for every non-reserved field of the version.                                                                                                                  |

Byte layout and annotation come from **one walk** of the schema, so they cannot disagree.
Today they are two hand-kept walks (`packetLayout.ts` and `packetSerializer.ts`).

A header object that disagrees with itself is rejected with `protocol/invalid-packet`:
a `countFrom` field that differs from the number of entries (`pack/count-mismatch`), a
`lengthFrom` field that differs from the bytes given (`pack/length-mismatch`), a value that
does not fit its width (`pack/value-out-of-range`), a missing value (`pack/missing-value`).

## Registry

`createProtocolPackRegistry()` returns an isolated registry. A process-wide default instance
is created at migration time (as `protocolRegistry` is for routing protocols); the trial does
not create one, so nothing is registered by importing the module.

- `register(pack)` registers a loaded pack. `registerLazy(stub)` registers only the identity
  (`id`, `name`, `layer`, `numbers`) and a `load: () => import('./gre')`.
- Lookups that the trace needs on every hop are **synchronous and identity-only**:
  `identity(id)`, `byIpProtocol(47)`, `byPort('udp', 53)`, `byEtherType(0x0800)`, `list()`.
  They never load a pack, so a trace label or number-to-name lookup costs no chunk.
- `load(id)` resolves the pack once (concurrent calls share one promise), checks that the
  loaded pack's identity equals the stub's (`pack/identity-mismatch`), and caches it. A failed
  load rejects and the next call tries again. `get(id)` returns the pack only once loaded.
- **Duplicate ids** are refused (`pack/duplicate-id`), as is a second claim on the same IP
  protocol number, EtherType or transport/port (`pack/duplicate-number`). Registering the
  same pack object twice is a no-op. `unregister(id)` frees the id and its numbers. (Layer
  plugins overwrite with a warning; packs do not, because two packs silently fighting over
  port 53 would mislabel every trace.)
- **Versions** live inside one pack; the registry has no version argument. The caller passes
  `version` to a deriver, and the default version applies otherwise.

### Bundle budgets

Superseded in part by [Two tiers](#two-tiers) and the [size gate](../dev/size-gate.md).

`ui:simulation-context` is at about 247 of 250 kB and the engine at about 432 of 435 kB.
The core (`define`, `derive`, `registry`) has no dependency on React, the i18n catalogue
(lesson L014) or any protocol. A pack's schema, meanings and content stay behind its
`load()` import, so a topology that never shows a GRE packet never downloads the GRE pack.
The built-in stubs (id, names, numbers: tens of bytes each) are the only always-loaded part.
In the trial nothing imports `src/protocols/pack/`, so `npm run size` is unchanged.

## Migration map

How each closed union or switch from survey (a) becomes registry-driven. Lines were
re-checked against commit eb1e263 (switch flooding). Nothing here is migrated in W1.

| Today (`file:line`)                                                                                                                     | What is closed                                     | Becomes                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `src/types/packets.ts:120` `TcpSegment.payload`, `:129` `UdpDatagram.payload`                                                           | L7 payload unions                                  | Add a `PackPayload { layer: 'pack'; protocol: string; header: HeaderValues }` member; existing members stay (no break). |
| `src/types/packets.ts:177`, `:180` `IpPacket.payload` / `reassemblyPayload`, `:191` IPv6, `:212` Ethernet                               | L3/L4 payload unions                               | Same `PackPayload` member; GRE leaves `RawPayload`+JSON (`GreEncap.ts`) for it.                                         |
| `src/types/packets.ts:256–296` structural guards                                                                                        | `isXxx` per protocol                               | One `isPackPayload(p, id?)`; existing guards unchanged.                                                                 |
| `src/simulation/TraceRecorder.ts:38`, `routingHelpers.ts:150`, `utils/packetSerializer.ts:78`                                           | Three number→name tables                           | `registry.byIpProtocol(n)?.name.short ?? String(n)` (identity-only, synchronous).                                       |
| `src/simulation/TraceRecorder.ts:197` `deriveTraceLabel`                                                                                | `if` chain per protocol                            | Built-ins first (byte-identical labels), then `deriveTraceLabel(pack, header)` for `PackPayload`.                       |
| `src/utils/packetSerializer.ts:104` `serializeL7`, `:338` `serializeL3` dispatch                                                        | Per-protocol serializers                           | `deriveAnnotatedFields` for `PackPayload`; DNS moves to it (fixing the wire format, see below).                         |
| `src/utils/packetLayout.ts:122` `buildApplicationPayloadBytes`, `:200` `buildTransportBytes`                                            | Second, hand-kept byte walk                        | `deriveLayout(...).bytes`; one walk for bytes and fields.                                                               |
| `src/components/simulation/traceFilter/parser.ts:51` `PROTOCOLS`                                                                        | Closed set of filter words                         | Built-in words ∪ `registry.list().map(deriveFilterToken)`.                                                              |
| `src/types/simulation.ts:128` `PacketHop.event`, `:138` `PacketHop.action`                                                              | Closed hop events/actions                          | `action: \`pack:${id}:${hook}\``(template literal, like`tls:${string}`) + `packHop?: { protocol; hook; fields }`.       |
| `src/components/simulation/HopInspector.tsx:101` `formatHopAction`                                                                      | `switch` per action                                | Falls through to the pack's hop wording (en/ja from `content.i18n`).                                                    |
| `src/components/engine/packetStory.ts:18` `HopBubbleKind`                                                                               | Closed bubble kinds                                | Adds `'pack'`; bubble text from the pack.                                                                               |
| `src/simulation/pipeline/dispatch/forwardingStages.ts:38` `FORWARDING_STAGES`                                                           | Fixed stage list                                   | A `transit`/`encapsulation` hook slot run by one fixed `packStage` (the list stays fixed and ordered).                  |
| `src/simulation/ServiceOrchestrator.ts:101,195`; `enginePort.ts:29,34`; `worker/protocol.ts:71,78,271,273`; `SimulationEngine.ts:79,87` | `simulateDhcp`/`simulateDns` mirrored per protocol | One `simulateService(protocolId, …)` through port and worker; the old methods stay as wrappers.                         |
| `src/types/topology.ts:22` `NetlabNodeData` (`:45–47` dhcp/dns fields)                                                                  | Per-protocol node config                           | `protocols?: Record<string, unknown>` keyed by pack id, validated by the pack.                                          |
| `src/sandbox/edits/types.ts:27` `Edit` union                                                                                            | Per-protocol edits                                 | Packs use the existing `registerSandboxEdit` seam.                                                                      |
| `demo/packet-lab/model.ts:28` `Carries`, `:56` `FieldId`                                                                                | Closed packet-lab sets                             | `derivePacketLabFieldIds` ids (`gre.key`) alongside the built-ins.                                                      |
| `demo/main.tsx`, `Gallery.tsx`, `galleryJa.ts`, `lessonManifest.ts`, `examQuestions.ts`                                                 | Lesson registered in five places                   | `content` loaders read by one manifest builder.                                                                         |
| `src/registry/ProtocolRegistry.ts:10`; `src/types/layers.ts:9` `LayerId`                                                                | Routing-only registry; one plugin per layer        | Unchanged. Packs are a separate registry; a routing pack may later point at a `RoutingProtocol`.                        |

Order: DNS (integrated) and GRE (sidecar → engine) first, with golden traces that must stay
byte-identical for every existing protocol; then the other sidecars.

### Discrepancies found in today's code, and their status

- **DNS hex view was not RFC 1035 — fixed (trial part 2, REQ-140/141).** `packetLayout.ts`
  wrote the ASCII text `DNS QUERY A example.com` as the UDP payload, and the UDP builder
  stamped `8 + JSON.stringify(payload).length` as the UDP Length. DNS is now carried, shown
  and exported to pcap in RFC 1035 §4.1 wire format (`buildDnsMessageBytes`), the UDP Length
  counts those bytes, and the field view lists ID, Flags, the four counts, the question and
  the answer records. The bytes are pinned to `deriveLayout(dnsPack, …)` (TC-1024) and the
  rows to `deriveAnnotatedFields` (TC-1025). Flags follow how a netlab DNS server behaves: it
  answers only from its own zones (AA 1) and does not recurse (RA 0).
- **GRE parser — fixed (REQ-144).** `parseGreHeader` now discards a header with bit 1, 4 or
  5 set (RFC 2784 §2.3: bits 1–5, of which 2 and 3 are K and S under RFC 2890) and still
  ignores bits 6–12, which RFC 2784 §2.3 says "MUST be ignored on receipt". (The W1 report
  said "bit 1 or bits 4–12"; that was wrong for bits 6–12.) `GreHeader.protocolType` is now
  any EtherType (`number`), as RFC 2784 §2.4 allows.
- **GRE is not in the hex view — open.** `GreEncap.ts` carries GRE as a `RawPayload` holding
  JSON, so the hex view shows JSON text and the IP `Protocol` field shows `47 (47)`. This
  waits for GRE pipeline wiring.
- **Still open, found in part 2.** A netlab DNS server sends nothing for a name it does not
  hold (RFC 1035 would answer NXDOMAIN, RCODE 3). The UDP Length of DHCP and raw payloads is
  still `8 + JSON.stringify(payload).length`, which does not match their bytes. In the trace
  filter, `protocol == dhcp` and `protocol == http` are accepted but match no hop (a hop's
  `protocol` is the IP protocol name); `protocol == dns` was the same and is fixed (REQ-143).
- **The W1 HTML draft's GRE schema was wrong — fixed in the draft.** It put C, K and S in
  adjacent bits with a 10-bit Reserved0. RFC 2890 places a reserved bit between C and K
  (C=bit 0, K=bit 2, S=bit 3, Reserved0 bits 4–12).

## Two tiers

The bytes of a packet are needed synchronously: `serializePacket` is a public synchronous
function, and the engine computes length, checksum and FCS on every hop. So a pack is written in
two tiers:

| Tier  | File                              | Holds                                                      | Loaded                            |
| ----- | --------------------------------- | ---------------------------------------------------------- | --------------------------------- |
| Wire  | `src/protocols/<id>/wire.ts`      | Identity, versions, structure, field and enum names, hooks | Statically; in the worker         |
| Learn | `src/protocols/<id>/pack-<id>.ts` | Spec references, meanings, examples                        | On demand, by `packLearn.ts` (UI) |

The structure has one source. `deriveLayout`, `deriveAnnotatedFields` and `deriveTraceLabel` take
a wire tier. `mergeLearn(wire, learn)` joins the tiers into a descriptor, which is what
`defineProtocol` checks; tests run that check, so the lazy chunk stays pure data.

`protocolPacks` (`src/protocols/packs.ts`) is the process-wide index of wire tiers: a read-only
lookup, small enough for the worker. The full registry (`createProtocolPackRegistry`, with
duplicate refusal and `load`) is for packs added at run time. A test holds the built-in tiers
free of clashing claims.

The worker is an ES module, so a wire tier the engine does not need on every hop is lazy there
too: `protocolPacks` holds its identity at once and loads the tier on first `loadWire`. GRE's
loads at the first router with a tunnel; NTP's is never loaded by the engine. DNS's is eager.
Where a module worker cannot start (an old browser, or the CommonJS build, whose worker URL
cannot be formed), the engine runs on the main thread.

GRE's header codec `GreHeader.ts` remains next to the GRE wire tier: `encapGre` and the public
parser use it, and TC-946 pins its bytes to the pack.

## Tunnels in the engine

`runTunnelStage` runs after the ingress stage. It calls the pack's `behaviour.encapsulation`
hook where a route leaves by an interface with a `greTunnel`, and unwraps a packet addressed to a
tunnel's source. It exits at once for a router with no tunnel. The frame carries the real wire
bytes in `RawPayload.data` and the structure in `gre` (`GreRawPayload`). The other hooks
(`endpoint`, `transit`, `service`) are still unwired.

## i18n merging

Packs carry their learner wording inline (`meaning: { en, ja }`), so the derivers need no
catalogue. Wording the UI looks up by key (hop bubbles, lesson strings) comes from
`content.i18n.en` / `.ja` loaders. At migration it is **merged** into the catalogue under the
pack's own namespace `protocol.<id>.*`, never replacing a key. A pack catalogue key outside
its namespace, or one already present, is refused. The two languages must have the same key
set (the existing i18n parity check extends to packs). The core catalogue is never imported by
the pack core (lesson L014), so packs cost nothing in bundles that show no protocol text.

## Versioning of the pack API

- Every descriptor states `apiVersion`. `defineProtocol` accepts the versions it supports
  (today `[1]`) and refuses others with `pack/unsupported-api-version`, naming the supported
  list.
- Frozen at `apiVersion: 1` (`PROTOCOL_PACK_API_VERSION`) and exported from `netlab`. Errors
  carry the `protocol-pack/*` codes (`invalid-descriptor`, `invalid-header`, `unknown-version`,
  `registry`), with the precise rule in `context.reason` (see [errors](errors.md)).
- After the freeze, additive changes (a new optional property, a new field `type`, a new
  `status`) keep `apiVersion: 1`. A breaking change adds `apiVersion: 2`. For at least the
  runway in [deprecation-lifecycle.md](deprecation-lifecycle.md), `defineProtocol` accepts
  both and upgrades v1 descriptors internally.

## Add a protocol

The API is frozen at `apiVersion: 1` and exported from `netlab`. A built-in pack lives in
`src/protocols/<id>/`. Copy [`src/protocols/_template/`](../../src/protocols/_template/), which no
bundle includes, and follow these steps in order. NTP (`src/protocols/ntp/`) was added this way.

1. **Spec first.** Add REQ, AC and `TC-*` rows to the
   [specification](../user-guide/specifications/specification.md): the RFC golden vector, text in
   both languages, the filter word, and anything the engine does with it.
2. **Identity** (`identity.ts`). Give the id (lowercase, also the filter word), the short and
   en/ja names, the layer, and the numbers it claims: `ipProtocol`, `etherType`, `ports`, or
   `icmpTypes: { v4?, v6? }` for ICMP message types.
3. **Wire tier** (`wire.ts`). Write the header fields in wire order, from the RFC's figure: key,
   the RFC's name, type, width, `presentIf`, `lengthFrom`, enum names, and `label` if one field
   names the message. Put no learner text here. Add a header-object adapter if the engine already
   has a type for the message (see `dnsMessageToValues`).
4. **Learn tier** (`pack-<id>.ts`, default export, `tier: '__netlab_learn_tier__'`). Add the
   specs and versions, and for **every** field a meaning in English and Japanese and an example,
   with enum value meanings. Key a field `key@version` where its meaning differs by version.
5. **Tests** (`<id>.test.ts`). `defineProtocol(mergeLearn(wire, learn))` must pass, and
   `deriveLayout` must write the RFC's example bytes. Check the label and the filter word.
6. **Register.** Add the identity to `src/protocols/packs.ts`. A wire tier the engine needs on
   every hop is eager; any other is `{ ...identity, loadWire: () => import('./<id>/wire') … }`,
   which the worker loads on first use. Add the learn tier to `LEARN` in
   `src/protocols/packLearn.ts`.
7. **Size.** Add `pack('<id>', '3 kB')` to `.size-limit.mjs`. `npm run size` must stay green;
   it fails if the learn tier reaches an eager closure.
8. **Engine behaviour**, when the protocol has traffic: a `behaviour` hook (`encapsulation` is
   wired; see `runTunnelStage`), hops that state what happened, and its words in both languages.
9. **Content**, once learners can see the protocol's traffic: a lesson and its stage entry
   (`demo/lessonManifest.ts`, `demo/course/stages.ts`), an exercise, and exam questions
   (`demo/course/examQuestions.ts`). Update the user guide only for what learners can see.

### Checklist

- [ ] Spec rows (REQ, AC, `TC-*`), and `npm run tc:check -- --strict` clean
- [ ] Identity with claims that clash with no other pack (the registry test catches clashes)
- [ ] Wire tier faithful to the RFC figure; versions with `in` where fields differ
- [ ] Learn tier: every field has an en and a ja meaning and an example; enum values explained
- [ ] Tests: `defineProtocol` passes, an RFC golden vector, the label, the filter word
- [ ] Registered in `packs.ts` (eager or `loadWire`) and `packLearn.ts`
- [ ] `pack('<id>', '3 kB')` in `.size-limit.mjs`; `npm run size` green
- [ ] Engine behaviour and hop wording, if the protocol has traffic
- [ ] Lesson and stage entry, exercise, exam questions, if learners can see its traffic
- [ ] User guide, if learners see something new

For NTP, steps 8 and 9 are open: the engine sends no NTP yet, so there is nothing for a lesson
to show. It took 4 new files (`identity.ts`, `wire.ts`, `pack-ntp.ts`, `ntp.test.ts`) and 4
edits (`packs.ts`, `packLearn.ts`, `.size-limit.mjs`, the specification).

### Packs outside netlab

An application can define its own packs with the exported API and keep them in a registry from
`createProtocolPackRegistry()`, which refuses duplicate ids and claims and loads lazily. The
built-in index `protocolPacks`, which the engine reads, holds the built-in packs only.
