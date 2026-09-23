# Product Specification

**Status:** Draft
**Last updated:** 2026-08-19
**Source of truth for:** externally observable product behavior, acceptance criteria, and behavior-defining test cases

## 1. Purpose

netlab teaches networking by letting a learner build a topology and watch real
protocol behavior run across it. This specification covers the **topology
editor**: the surface where a learner assembles that topology, chooses which
layer of the stack to look at, and runs traffic through what they built.

The layer view is the teaching device. The same wiring carries a different
connection graph at L2 than at L3, and a learner who can show one layer at a
time sees that difference directly instead of being told about it.

## 2. Scope

Covered: the editor's element palette, per-layer display, inspector rail
(node/validation/run), the one-click Run control, and the pluggable canvas
engine seam.

Not covered here: the simulation engine's protocol behavior, the learning drills,
and the gallery — each already has its own tests and docs.

## 3. Terminology

| Term          | Meaning                                                                                   |
| ------------- | ----------------------------------------------------------------------------------------- |
| Element       | A device a learner can place: switch, router, client, server.                             |
| Layer         | A level of the network stack (`l1`, `l2`, `l3`, `l4`, `l7`) that an element belongs to.   |
| Canvas engine | The library that draws the graph. The editor supports more than one behind a common seam. |
| Run           | Sending one packet between two addressable hosts and recording what happened.             |

## 4. Functional requirements

- **REQ-001 (MUST):** The editor MUST offer elements grouped by the layer they
  belong to, and placing one MUST create a node of that layer.
- **REQ-002 (MUST):** A host MUST be able to scope the editor to a subset of
  layers; elements outside that scope MUST NOT be placeable.
- **REQ-003 (MUST):** A learner MUST be able to show or hide each layer
  independently, and hiding a layer MUST remove its nodes from the canvas.
- **REQ-004 (MUST):** Hiding a layer MUST NOT alter the topology that the
  simulation runs against.
- **REQ-005 (MUST):** A link MUST disappear with the layer when either endpoint
  is hidden, so the canvas never shows an adjacency to something it is not
  drawing.
- **REQ-006 (MUST):** The inspector rail MUST show one of node / validation /
  run at a time, and MUST NOT keep the inactive panels in the accessibility tree.
- **REQ-007 (MUST):** Run MUST state what it will do before it is used, or why
  it cannot run.
- **REQ-008 (MUST):** After a run, the learner MUST be able to read back the
  packet's hops, and selecting a hop MUST point at the link it crossed.
- **REQ-009 (SHOULD):** The editor SHOULD support swapping the canvas engine
  without changing the editor's own behavior.

### Simulator canvas

- **REQ-010 (MUST):** When a topology defines areas, zooming out far enough MUST
  collapse an area into a single cluster, and expanding it MUST restore its
  members. A learner reading a large topology needs the shape before the detail.
- **REQ-011 (MUST):** A canvas mounted as an illustration MUST NOT capture the
  page's scroll, and its nodes MUST stay out of the tab order.
- **REQ-012 (MUST):** A host MUST be able to drive the canvas entirely from
  outside — supplying the topology and receiving every change — so an embedding
  application can own the state.
- **REQ-013 (SHOULD):** Motion used to show a packet travelling SHOULD be
  suppressed when the viewer prefers reduced motion.
- **REQ-014 (MUST):** What a device or a link looks like on the canvas MUST NOT
  depend on which graph engine draws it. The same device shape, name and health
  badge, and the same link colour, weight and dashes, MUST appear either way, so
  replacing the engine is not a redrawing of every device.
- **REQ-015 (MUST):** A link whose device is not drawn — a collapsed area, a
  half-built topology — MUST be omitted rather than failing the canvas.
- **REQ-016 (MUST):** In the sandbox, right-clicking a link on the canvas MUST
  open that link's editor, so a learner can take a link down where they can see
  it rather than through a separate form.
- **REQ-017 (MUST):** When two canvases are shown for comparison, they MUST
  share one viewport: panning or zooming either MUST move both, so the learner
  is comparing the same part of the topology at the same size.
- **REQ-018 (MUST):** A link the canvas has found errors or warnings on MUST be
  marked on the link itself, and hovering the mark MUST say what is wrong.
- **REQ-052 (MUST):** The controls every lesson shares — the packet timeline,
  the step controls, the route table, the hop inspector, the packet structure
  viewer and the display filter — MUST follow the language the learner chose in
  the gallery, and so MUST the canvas's own controls, the command bar, the area
  legend, and the lesson's name and summary at the top of the page. Every
  lesson's own teaching copy MUST follow it too, and so MUST the device and link
  detail panels, the drop-event card, the keyboard cheat sheet and the topology
  editor. Hop events (`CREATE`, `FWD`, `DELIVER`, `DROP`) and drop reasons
  are codes the guide documents and a learner searches for, and stay as they
  are; so do the field names in a packet readout and the data a lesson carries —
  a device or area name, a payload, a topology's JSON. A library consumer that
  does not ask for a language MUST still get
  English, and one that names a language on `NetlabProvider` MUST still get that
  one.
- **REQ-053 (MUST):** A reader who has not said who they are MUST be treated as
  a learner: a lesson's pre-flight brief MUST open as the full card on a first
  visit, with its goal, its watch-points and a control to start, and the device
  panel MUST carry its plain-language explainer. The shorter `pro` presentation
  MUST stay available through the audience control and `?audience=`, and a
  stored or named choice MUST still win.
- **REQ-054 (MUST):** A control MUST change something a learner can see. In the
  editor, pressing a device MUST open that device's editor, so the address the
  run button asks for can be given. Pinning the device panel MUST leave it on
  screen, on that visit and on the next one, because the choice is remembered.
  Opening a device MUST NOT push the rest of the topology out of view. A lesson
  whose result is fixed MUST open without it, so running it produces something.
- **REQ-055 (MUST):** Only one thing MUST ask for the learner's attention at a
  time. A lesson opened with a guided intro or an assessment MUST NOT also open
  its own brief over them. A panel the lesson shows for reference MUST NOT take
  presses meant for what is behind it while it has nothing to show.
- **REQ-056 (MUST):** A lesson a beginner is pointed at MUST give them something
  to do and say what happened, in their language: the shape lessons at the top
  of the catalogue set one task, run it on one press, and explain the result
  with the route the packet took. Every lesson MUST offer a way back to the
  lessons, named in the learner's language. Pressing a setting in the gallery
  MUST be remembered even when it is the one already showing.
- **REQ-057 (MUST):** A learner MUST be able to build a network in the editor
  unaided: a device shows where a link starts, a link is drawn by dragging from
  it, a refused link says why and what to do instead, running the network
  reports its outcome beside the button, the checks name a device that cannot
  take part, a new device gets a readable name, and undo and redo work from the
  keyboard.
- **REQ-058 (MUST):** The canvas MUST show a link's state, not only the lesson's
  prose: a failed link and a link spanning tree blocks are each drawn distinctly
  from a healthy one, by more than colour, with a key while either is on screen;
  and routing MUST route around a failed link. Lessons MUST mark such links
  rather than delete them. Canvas controls MUST NOT cover devices, and moving
  from one lesson to another MUST NOT blank the page.
- **REQ-059 (MUST):** Panels MUST give their room to what has content: a panel
  with information MUST NOT be clipped without a way to reach the rest while an
  empty one takes the space; labels MUST NOT break into one character per line
  in Japanese; a code (hop event, AF, AD) MUST keep its name and carry a
  plain-language gloss; the device panel's overview MUST describe routers and
  switches; and a flow MUST be named by its order and endpoints.
- **REQ-060 (MUST):** A learner's progress MUST be kept from their first visit,
  in the browser they use, without a link that names them; a finished course
  step MUST count; nothing MUST be offered to resume before anything is done.
  An explicit `?learnerId=` still wins, and a browser that cannot store keeps
  progress off.
- **REQ-051 (MUST):** The product MUST ship a user guide that works opened
  straight from disk, with no server and no network, and that can be read in
  Japanese and in English, searched, and read in a light or a dark theme. It
  MUST describe only behaviour that exists. A guide that needs a server cannot
  be sent to anyone, and one in English alone does not reach the learners who
  asked for Japanese.
- **REQ-050 (MUST):** A panel drawn over the canvas MUST take its colours from
  the chosen theme, and MUST NOT cover another panel's content. A fixed dark
  box under themed text is unreadable in the light theme, and a panel stacked
  over a state badge hides the very thing its lesson is about.
- **REQ-049 (MUST):** A topology the product ships MUST NOT be drawn as faulty.
  A link that already exists is faulty only when it is physically impossible —
  a node joined to itself, or two links claiming one port. Rules that guide
  someone building a network ("put a switch between those two machines", "those
  nodes are already connected") MUST NOT be applied as verdicts on it: two
  hosts on a cable is a real network and is what the course teaches first, and
  two links between the same pair is a port-channel and is what the
  link-aggregation lesson exists to show.
- **REQ-048 (MUST):** A router MUST be able to reach every subnet it holds an
  address on, without a topology having to state that separately. Giving an
  interface an address is what makes its subnet reachable; requiring a matching
  static route as well means a topology that looks complete drops its first
  packet, and says "no route" about a machine one cable away.
- **REQ-047 (MUST):** A lesson MUST NOT be able to stop the browser. Driving the
  simulation forward MUST yield to the task queue, so a reply from the engine's
  worker can be delivered, and MUST be bounded, so a trace that never reports it
  has finished costs one unresponsive control rather than the page.
- **REQ-044 (MUST):** The product MUST offer a guided course a beginner can
  follow from the start without choosing anything. Each step MUST present one
  network small enough to read at a glance, one instruction, and one action,
  and MUST say what the step taught before offering the next. Fifty-two lessons
  behind a category list answer "what can this show me"; they do not answer
  "what do I do first", which is the question a beginner actually has.
- **REQ-045 (MUST):** The course and the gallery MUST be readable in Japanese as
  well as English, following the language the learner chose. A learner who
  cannot read the instruction cannot follow it, whatever the diagram shows.
- **REQ-046 (SHOULD):** A step whose packet is meant to fail SHOULD say so
  before the learner presses, and MUST report the failure as the expected
  result. A course that teaches "different networks cannot reach each other"
  by showing an error the learner cannot distinguish from a broken product
  teaches distrust instead.
- **REQ-043 (MUST):** When a router forwards along a directly connected route,
  it MUST send the packet towards the subnet the destination is on, not down
  whichever link happens to have a switch on it. Both ends of a router are
  usually switches, so accepting either sends a packet back the way it came and
  reports the result as a routing loop.
- **REQ-042 (MUST):** When a switch has not learned where a destination is, it
  MUST send the frame on towards a neighbour the destination is reachable
  behind over links the spanning tree left forwarding, when one exists. A real
  switch floods and every branch is walked; a trace follows one, so which
  branch it picks decides whether a lesson shows an arrival, a dead end on an
  unrelated host, or a crossing of the very segment the lesson blocked.
- **REQ-041 (MUST):** A host MUST accept an IPv4 multicast datagram addressed to
  a group it has joined, and MUST refuse one addressed to a group it has not,
  saying which. Refusing every group datagram alike, as "no route", makes the
  IGMP lesson teach the opposite of what it says: the learner joins a group,
  sends to it, and is told the network cannot reach a receiver that is one
  cable away.
- **REQ-040 (MUST):** A lesson control that changes the topology MUST record the
  change as a sandbox edit when a sandbox is present. The sandbox's history is
  what the learner changed, and an assessment reads it.
- **REQ-039 (MUST):** When a tutorial finishes, it MUST say what was observed.
  One action can satisfy several steps at once, and the steps it skipped past
  carry the things the learner was meant to notice.
- **REQ-038 (MUST):** The browser suite MUST run on Chromium, Firefox and
  WebKit. A rendering or accessibility defect that only one engine reports is
  still a defect for the learners using it.
- **REQ-036 (MUST):** Every lesson MUST be readable in the light theme, to the
  same WCAG 2 AA standard already required in dark. That standard applies to text an automated checker
  cannot compute a ratio for — through a `color-mix()` background, for one —
  just as much as to text it can: an unmeasured heading is not a readable one.
- **REQ-037 (MUST):** Each theme's text and accent tokens MUST clear 4.5:1
  against that theme's own backgrounds. A colour used as a fill MUST instead
  carry a label that clears 4.5:1 against it.
- **REQ-035 (MUST):** A control that grows its touch target with an overlay MUST
  anchor that overlay to itself. An overlay that escapes onto the surrounding
  toolbar shields every other control on it while looking entirely correct.
- **REQ-034 (MUST):** A setting the learner chooses in the gallery MUST apply to
  the lessons they open. A setting they never chose MUST NOT be recorded as
  though they had.
- **REQ-033 (MUST):** On a canvas the learner can interact with, a device MUST
  be reachable and openable by keyboard alone, and MUST say which device it is.
- **REQ-032 (MUST):** A control the learner needs MUST be reachable: visible,
  settled, and not covered by another surface. A panel the learner opened MUST
  sit above the reference panels the lesson placed, not under them.
- **REQ-031 (MUST):** A lesson's network MUST be on screen when the lesson
  opens, without scrolling. A panel beside the canvas MUST scroll within itself
  rather than growing the canvas.
- **REQ-030 (MUST):** The editor MUST open with its topology framed in the
  canvas, as the simulator canvas does.
- **REQ-029 (MUST):** A newly placed element MUST appear where the learner is
  looking, not at a fixed point in the topology's coordinates.
- **REQ-026 (MUST):** Dragging an empty part of a canvas that allows panning
  MUST move the diagram.
- **REQ-027 (MUST):** A link MUST be drawn without an arrowhead on either
  canvas: it is a cable, and an arrow reads as a direction of travel.
- **REQ-028 (MUST):** A docked editor tab MUST account for itself when it has
  nothing to show, rather than leaving the rail blank.
- **REQ-024 (MUST):** A canvas MUST open with what it draws framed inside it —
  nothing clipped by an edge. A topology too large to read at that size MAY open
  with its areas collapsed; that is the level of detail, not a failure to frame.
- **REQ-025 (MUST):** An embedded canvas MUST keep the height it was given, even
  inside a flexible page layout that would otherwise squeeze it away.
- **REQ-022 (MUST):** Every lesson with a network MUST draw its devices and the
  links between them. A device whose kind the canvas has no drawing for MUST
  still be drawn, carrying its name.
- **REQ-023 (MUST):** A lesson MUST mount without logging an error or a warning.
  A complaint the product makes and nobody reads is how a lesson stays broken
  for a long time while every test passes.
- **REQ-020 (MUST):** The canvas's own controls MUST be drawn in the theme the
  canvas was given, so a diagram embedded in a light-mode page does not carry a
  dark control cluster in its corner.
- **REQ-021 (MUST):** The canvas MUST NOT offer a control that does nothing on
  it. Snapping to a grid is offered only where devices can be dragged.
- **REQ-019 (MUST):** Opening a device MUST bring it clear of the detail panel,
  and MUST leave the rest of the topology where the learner can still reach it —
  opening devices repeatedly MUST NOT walk the drawing off the canvas.

## 5. Non-functional requirements

- **NFR-001 (accessibility):** The editor MUST have no axe-detectable WCAG 2 A/AA
  violations with the palette and inspector rail on screen.
- **NFR-002 (accessibility):** State that is conveyed by colour MUST also be
  conveyed non-visually (layer shown/hidden, selected history row, grid on/off).
- **NFR-003 (bundle size):** A canvas engine that a consumer does not mount MUST
  NOT be in the eagerly loaded entry.
- **NFR-004 (bundle size):** Both built-in languages MUST be readable with no
  network fetch once the app has loaded, so both catalogues ship in the eagerly
  loaded entry and the size budgets account for them. A learner who chose
  Japanese MUST NOT be shown English first while a translation is fetched.

## 6. Constraints and compatibility

`@xyflow/react` remains a peer dependency and the default engine.
`@maxgraph/core` is a pinned direct dependency, opt-in, and loaded on demand.
Both engines must satisfy the same seam.

## 7. Behavior

Placing an element adds a node at a free position on the canvas. Toggling a
layer changes only what is painted. Run picks two addressable hosts —
preferring a client as the source and a server as the destination, honouring an
explicit selection when there is one — sends one packet, and records the hops.

## 8. Failure behavior and edge cases

- A scope with no placeable elements shows an explicit message rather than an
  empty rail.
- Run is disabled, with the reason stated, when fewer than two nodes have an IP
  address or when no simulation is available.
- A link whose endpoint does not exist is skipped rather than drawn or thrown on.
- Hiding every layer yields an empty canvas, not an error.

## 9. Security considerations

Node labels are learner input and are rendered into the canvas engine's HTML
labels; they MUST be escaped.

## 10. Migration and backward compatibility

The default engine and the editor's public props are unchanged, so existing
embeds are unaffected. Retiring `@xyflow/react` would be a breaking change and is
not part of this specification.

## 11. Non-goals

- Porting the simulator canvas (`NetlabCanvas`) to a second engine.
- Removing React Flow.

## 12. Acceptance criteria

- **AC-001:** Given the editor, when a learner places a router from the palette,
  then a new node appears on the canvas.
- **AC-002:** Given `layers={['l3']}`, when the palette renders, then only L3
  elements are offered.
- **AC-003:** Given a topology with L3 nodes, when the learner hides L3, then
  those nodes leave the canvas and return when it is shown again.
- **AC-004:** Given a hidden layer, when a simulation runs, then its result is
  the same as if nothing were hidden.
- **AC-005:** Given the inspector rail, when a learner switches tabs, then only
  the chosen panel is present.
- **AC-006:** Given fewer than two addressable nodes, when the learner looks at
  Run, then it is disabled and says an IP address is needed.
- **AC-007:** Given a completed run, when the learner opens the run tab, then the
  hops are listed in order.
- **AC-008:** Given the editor on screen, when axe analyses it for WCAG 2 A/AA,
  then there are no violations.
- **AC-009:** Given a topology with areas, when the learner zooms out past the
  collapse threshold, then the area is shown as one cluster.
- **AC-010:** Given a collapsed area, when the learner expands it, then its
  member nodes are drawn again.
- **AC-011:** Given a canvas mounted as an illustration, when the learner
  scrolls over it, then the page scrolls rather than the diagram zooming.
- **AC-012:** Given a host-controlled canvas, when the host changes the
  topology, then the canvas shows the new topology.
- **AC-013:** Given a device with an interface down, when it is drawn with no
  graph engine mounted at all, then the device, its name and its "iface down"
  badge are all present.
- **AC-014:** Given a topology, when the canvas draws it, then every device is
  drawn showing that device's own rendering, and redrawing replaces the previous
  drawing rather than adding to it.
- **AC-015:** Given a link the canvas has marked down or highlighted, when it is
  drawn, then it keeps the colour, weight and dashes the canvas asked for; and a
  link to a device that is not drawn is omitted while the devices stay.
- **AC-016:** Given a sandbox canvas, when the learner right-clicks a link and
  takes it down, then the link editor opens and the edit is recorded in the
  sandbox's edit list.
- **AC-017:** Given compare mode, when the learner zooms one canvas, then the
  other is drawn at the same zoom.
- **AC-018:** Given a link with a validation error, when it is drawn, then it
  carries an error mark; a link with only warnings carries a warning mark, and a
  clean link carries none.
- **AC-037:** Given the OSPF lesson with its assessment open, when the learner
  presses the lesson's own "Fail link", then the sub-goal that asks for that
  link to go down passes.
- **AC-036:** Given a finished tutorial, when its completion card is shown, then
  every step's title is listed.
- **AC-035:** Given the browser suite, when it is run, then it runs on all three
  engines the configuration names, and each is installed by `e2e:install`.
- **AC-033:** Given any lesson opened after choosing Light, when it is scanned
  for WCAG 2 A/AA, then there are no violations.
- **AC-034:** Given either built-in theme, when its tokens are measured against
  its own backgrounds, then every text and accent token clears 4.5:1.
- **AC-052:** Given Japanese chosen in the gallery, when a lesson with a packet
  timeline and step controls is opened and a packet is sent, then those
  controls' headings, buttons and empty-state messages, the canvas controls and
  the lesson's name are in Japanese, while the hop events stay as codes; and
  given no choice, then they are in English.
- **AC-055:** Given Japanese chosen in the gallery, when any lesson in the
  gallery is opened and its primary action pressed, then no English sentence
  remains on the page; readouts, codes, protocol names and device names may.
- **AC-056:** Given Japanese chosen, when a device is opened and each of its
  tabs is chosen in turn, then every tab is named in Japanese and no English
  sentence remains on any of them.
- **AC-057:** Given Japanese, when the card for a dropped packet is shown for
  any drop reason the product explains, then its cause, its response and its
  explanation are in Japanese, while the reason itself stays a code.
- **AC-058:** Given a reader who has made no audience choice, when a lesson with
  a brief is opened, then the full brief card is shown; and given `?audience=pro`,
  then the compact strip is shown instead.
- **AC-059:** Given the topology editor, when a device on the canvas is
  pressed, then that device's editor opens with its address field, and the
  address can be set.
- **AC-060:** Given an open device panel, when it is pinned, then it stays
  visible inside the canvas, and a later visit with that choice remembered
  still opens a visible panel.
- **AC-061:** Given a lesson drawn on a canvas, when a device is opened, then
  the devices already on screen stay on screen.
- **AC-062:** Given the congestion lesson, when it is opened, then it shows its
  empty state; and when it is run, then the trace appears.
- **AC-063:** Given a lesson opened with a guided intro or an assessment, when
  it loads, then the guidance the learner asked for is what they can act on,
  and the lesson's own brief does not cover it.
- **AC-064:** Given a reference panel with nothing selected, when the learner
  presses what is behind it, then the press reaches it.
- **AC-065:** Given a shape lesson with Japanese chosen, when its one button is
  pressed, then the packet arrives, and a Japanese explanation appears with the
  route it took, each device once.
- **AC-066:** Given a lesson with Japanese chosen, when its navigation is read,
  then every destination is named in Japanese, and a control in the header leads
  back to the lessons.
- **AC-067:** Given the gallery showing Light, when Light is pressed and a
  lesson opened, then the lesson is light.
- **AC-068:** Given the editor, when the learner drags from a device's
  connection point to a switch, then a link is added; and when they drag a
  client onto a server, then the refusal is explained and nothing is added.
- **AC-069:** Given the editor, when the network is run, then the outcome
  appears by the button and the rail shows the result; when a device is linked
  to nothing, then the checks name it; when a device is added, then it is named
  per kind; and Ctrl+Z / Ctrl+Y undo and redo.
- **AC-070:** Given a link that is failed or blocked, when the canvas draws it,
  then it carries its state and a distinct mark, and a key names it; given the
  OSPF lesson's primary link failed, then it is drawn failed and the route
  leaves through R3.
- **AC-071:** Given a lesson open, when the learner moves to another lesson and
  back, then every page draws its devices and no error is raised.
- **AC-072:** Given the device panel, when a router's overview is opened, then
  it names its role, interfaces, subnets and neighbours; its header names the
  kind and layer in words; and there is no placeholder tab.
- **AC-073:** Given the lesson panels at 1280 and 1440 pixels wide in Japanese,
  when they are read, then no label wraps character by character, every
  failure switch and editor section is reachable, and the collector, NAT table
  and route candidates fit their panels.
- **AC-074:** Given the spanning-tree, OSPF, enterprise, link QoS, trace
  inspector, ARP, UDP and all-in-one lessons, when their tasks are done, then
  each shows its result where it is read, keeps the evidence of earlier steps,
  and names things as the canvas does.
- **AC-075:** Given a first visit, when the gallery opens, then it counts
  nothing and offers nothing to resume; and when a course step is finished,
  then the gallery counts it and offers to continue.
- **AC-054:** Given any lesson in either theme, when its text contrast is
  checked, then text whose contrast the accessibility scanner could not decide
  is measured directly and clears WCAG AA — 4.5:1, or 3:1 for large text.
- **AC-053:** Given a lesson with a route table drawn over its canvas, when the
  learner presses the table's collapse control, then the table's contents are
  hidden and the control reports itself collapsed; and pressing it again shows
  them.
- **AC-050:** Given a canvas the learner can drag devices on, when its controls
  are shown, then snapping to a grid is offered; and given a presentational
  canvas, then it is not.
- **AC-051:** Given a viewer who prefers reduced motion, when a packet travels,
  then no link is animated; and given a viewer who does not, then the travelling
  packet's link is.
- **AC-049:** Given the user guide opened from a `file://` URL with the network
  refused, when it loads, then it shows its content and has requested nothing;
  and when the language, the search box or the theme is used, then the guide
  changes accordingly.
- **AC-048:** Given the TCP handshake lesson in the light theme, when its
  overlays are drawn, then they are light; and given either theme, then neither
  state badge is covered by the teaching panel.
- **AC-047:** Given a lesson whose topology joins two hosts directly, or bundles
  two links into a port-channel, when it is drawn, then no cable is painted as a
  fault; a link that is physically impossible still is; and given the editor,
  when the learner tries to draw such a link themselves, then it is still
  refused.
- **AC-046:** Given the course, in either theme and at every stage it has — a
  step before its packet has run, a step showing a result, and the finished
  page — when it is scanned for WCAG 2 A/AA, then there are no violations.
- **AC-045:** Given a router with an address on each of two subnets and no
  static routes, when a packet is sent across it, then it is forwarded; and
  given the TCP handshake lesson, when the learner connects, then both ends
  reach ESTABLISHED.
- **AC-044:** Given a lesson that runs a request to completion, when the learner
  presses it, then the request completes, the page is still there, and the
  control can be pressed again.
- **AC-041:** Given the course opened at its first step, when the learner
  presses the step's single action and then "next" through to the end, then
  every step reports the result it predicted and the course finishes; and a
  learner who leaves partway through returns to the step they reached.
- **AC-042:** Given the course in Japanese, when any step is shown, then its
  title, instruction and takeaway are in Japanese; and the same holds in
  English.
- **AC-043:** Given the gallery in Japanese, then no sentence on the page is
  left in English — the categories and their descriptions, every lesson's title
  and description, the navigation, the filters, the settings and the progress
  panel. Protocol names and acronyms are not sentences and stay as they are.
- **AC-040:** Given the client-server lesson, when the learner sends a packet,
  then the router resolves the server's address and the packet is delivered to
  the server, with no hop dropped.
- **AC-039:** Given the spanning-tree lesson's triangle of switches, when any of
  the three pings is pressed, then the packet arrives at the host it is
  addressed to, over the legs spanning tree left forwarding, and the blocked
  segment is not used.
- **AC-038:** Given a host that has joined 224.1.2.3, when a datagram addressed
  to that group reaches it, then the datagram is delivered; and given a host
  that has not joined it, then the datagram is dropped as `not-group-member`
  rather than as `no-route`.
- **AC-032:** Given the OSPF lesson, when the learner presses "Fail link", then
  the link fails and the control offers to restore it; and no button on the
  command bar lets its hit area escape onto the toolbar; and on no lesson does
  an overlay cover an enabled navigation-rail or command-bar button.
- **AC-031:** Given the gallery, when the learner chooses Dark or Light and then
  opens a lesson, then the lesson is drawn in that theme; and a lesson opened
  without choosing keeps its own default.
- **AC-030:** Given an interactive canvas, when the learner tabs to a device and
  presses Enter, then that device's panel opens.
- **AC-029:** Given a lesson on a full-screen display, when the learner sends a
  packet, opens a hop, opens a device, closes it, and collapses an area, then
  every control involved can be pressed and every result is shown.
- **AC-028:** Given any lesson in the gallery, when it opens, then what the
  canvas drew is within the viewport rather than below or beside it.
- **AC-027:** Given a saved topology, when the editor opens it, then it is drawn
  centred in the canvas rather than in one corner.
- **AC-026:** Given an editor canvas panned away from the origin, when the
  learner places an element from the palette, then it is drawn on screen.
- **AC-024:** Given a canvas the learner can pan, when they drag an empty part
  of it, then the diagram moves with the pointer.
- **AC-025:** Given the editor's inspector rail with no device selected, when
  the Node tab is shown, then it says how to select one.
- **AC-023:** Given the embed demo, when it is opened, then every embedded
  canvas on it has real width and height.
- **AC-021:** Given a device whose kind the canvas has no drawing for, when the
  canvas draws it, then the device and its name are on screen.
- **AC-022:** Given any lesson in the gallery, when it is opened, then its
  devices and links are drawn and the page logs nothing.
- **AC-020:** Given the same topology drawn once in a light theme and once in a
  dark one, when both are on screen, then their viewport controls are drawn
  differently, the light one lighter than the dark one.
- **AC-019:** Given a device that has been opened and dismissed, when it is
  opened again, then it is drawn in the same place as the first time and stays
  within the canvas.

## 13. Behavior test cases

| Test case | Related AC | Level         | Given / precondition                                                                           | When / action                                                                     | Then / observable result                                                                      | Automated test                                                               |
| --------- | ---------- | ------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| TC-001    | AC-001     | E2E           | The editor is open                                                                             | The learner clicks the router element                                             | The canvas shows one more node                                                                | `e2e/editor-layers.spec.ts`                                                  |
| TC-002    | AC-002     | unit/behavior | `layers={['l3']}`                                                                              | The palette renders                                                               | Only the router is offered; switch and client are absent                                      | `src/editor/components/LayerPalette.test.tsx`                                |
| TC-003    | AC-003     | E2E           | The topology has routers                                                                       | The learner hides, then shows, L3                                                 | The routers leave the canvas, then return                                                     | `e2e/editor-layers.spec.ts`                                                  |
| TC-004    | AC-004     | unit/behavior | A topology and a layer selection                                                               | Visible topology is computed                                                      | The canonical topology is unchanged                                                           | `src/editor/layerVisibility.test.ts`                                         |
| TC-005    | AC-004     | unit/behavior | A hidden layer with a link to a shown one                                                      | Visible topology is computed                                                      | The link is not drawn                                                                         | `src/editor/layerVisibility.test.ts`                                         |
| TC-006    | AC-005     | E2E           | The editor is open                                                                             | The learner switches inspector tabs                                               | Only the chosen panel is present                                                              | `e2e/editor-layers.spec.ts`                                                  |
| TC-007    | AC-006     | unit/behavior | Two nodes without IP addresses                                                                 | Run is rendered                                                                   | Run is disabled and names the missing IP address                                              | `src/editor/components/EditorRunButton.test.tsx`                             |
| TC-008    | AC-007     | E2E           | The editor with addressable hosts                                                              | The learner runs, then opens the run tab                                          | The run is listed rather than reported empty                                                  | `e2e/editor-layers.spec.ts`                                                  |
| TC-009    | AC-008     | E2E           | The editor with palette and rail visible                                                       | axe analyses for WCAG 2 A/AA                                                      | No violations                                                                                 | `e2e/editor-layers.spec.ts`                                                  |
| TC-010    | AC-003     | unit/behavior | A maxGraph canvas with layers                                                                  | One layer is hidden                                                               | Only that layer's cells stop being visible                                                    | `src/editor/engine/maxGraphModel.test.ts`                                    |
| TC-011    | AC-007     | unit/behavior | A recorded run                                                                                 | A history row is selected                                                         | The link that hop crossed is reported                                                         | `src/editor/components/PacketHistoryPanel.test.tsx`                          |
| TC-013    | AC-009     | E2E           | A topology with areas                                                                          | The learner zooms out                                                             | The area is drawn as a single cluster                                                         | `e2e/canvas-areas.spec.ts`                                                   |
| TC-014    | AC-010     | E2E           | A collapsed area                                                                               | The learner expands it                                                            | Its member devices are drawn again                                                            | `e2e/canvas-areas.spec.ts`                                                   |
| TC-015    | AC-011     | E2E           | An illustration canvas mid-page                                                                | The learner scrolls over it                                                       | The page scrolls                                                                              | `e2e/canvas-areas.spec.ts`                                                   |
| TC-016    | AC-012     | E2E           | A host-controlled canvas                                                                       | The host applies a change                                                         | The canvas reflects it                                                                        | `e2e/canvas-controlled.spec.ts`                                              |
| TC-017    | AC-013     | unit/behavior | Every device drawing and the area cluster                                                      | Drawn with no graph engine mounted                                                | Each shows its device, name and badge                                                         | `src/layers/nodeEngineIndependence.test.tsx`                                 |
| TC-018    | AC-014     | unit/behavior | A topology and a device rendering for each node                                                | The canvas is drawn on maxGraph                                                   | Every device is drawn carrying its own rendering, and a redraw replaces the last one          | `src/components/engine/simulatorGraphModel.test.ts`                          |
| TC-019    | AC-015     | unit/behavior | A link to a device that is not drawn                                                           | The canvas is drawn                                                               | The link is omitted and the devices stay                                                      | `src/components/engine/simulatorGraphModel.test.ts`                          |
| TC-020    | AC-015     | unit/behavior | A link the canvas marked down                                                                  | The link is drawn                                                                 | Its colour, weight and dashes are the ones asked for                                          | `src/components/engine/simulatorGraphModel.test.ts`                          |
| TC-021    | AC-016     | E2E           | A sandbox canvas with links                                                                    | The learner right-clicks a link and takes it down                                 | The link editor opens and the edit is listed                                                  | `e2e/sandbox-link-edit.spec.ts`                                              |
| TC-022    | AC-017     | E2E           | Two canvases in compare mode                                                                   | The learner zooms one                                                             | Both are drawn at the same zoom                                                               | `e2e/canvas-compare-viewport.spec.ts`                                        |
| TC-023    | AC-018     | unit/behavior | Links with errors, with warnings, and clean                                                    | They are drawn                                                                    | Each carries the right mark, and the messages are readable                                    | `src/components/engine/simulatorGraphModel.test.ts`                          |
| TC-024    | AC-019     | E2E           | A device opened, dismissed and opened again                                                    | Its position is compared across openings                                          | It lands in the same place each time and stays on the canvas                                  | `e2e/canvas-select-pan.spec.ts`                                              |
| TC-045    | AC-037     | E2E           | The OSPF lesson's own Fail link control                                                        | It is pressed with the assessment open                                            | The matching sub-goal passes                                                                  | `e2e/assessment-completion.spec.ts`                                          |
| TC-044    | AC-016     | E2E           | An assessment reading the learner's sandbox edits                                              | The primary link is taken down by id                                              | The matching sub-goal passes                                                                  | `e2e/assessment-completion.spec.ts`                                          |
| TC-043    | AC-036     | unit/behavior | A finished tutorial                                                                            | Its completion card is rendered                                                   | Every step's title is listed                                                                  | `src/components/tutorial/TutorialStepPanel.test.tsx`                         |
| TC-041    | AC-033     | E2E           | Every lesson, opened in the light theme                                                        | It is scanned for WCAG 2 A/AA                                                     | No violations                                                                                 | `e2e/light-theme.spec.ts`                                                    |
| TC-042    | AC-034     | unit/behavior | Both built-in themes                                                                           | Token contrast is computed against each theme's backgrounds                       | Every text and accent token clears 4.5:1                                                      | `src/theme/index.test.ts`                                                    |
| TC-039    | AC-032     | E2E           | The OSPF lesson's central control                                                              | It is pressed                                                                     | The link fails and can be restored                                                            | `e2e/lesson-controls.spec.ts`                                                |
| TC-040    | AC-032     | E2E           | Command-bar and nav-rail buttons                                                               | Their positioning is read                                                         | Each anchors its own hit-area overlay                                                         | `e2e/lesson-controls.spec.ts`                                                |
| TC-106    | AC-032     | E2E           | Every lesson in the gallery                                                                    | Every enabled navigation-rail and command-bar button is tried                     | Each can be pressed, none covered by an overlay                                               | `e2e/lesson-controls.spec.ts`                                                |
| TC-107    | AC-038     | unit/behavior | A host that joined 224.1.2.3                                                                   | A datagram addressed to that group reaches it                                     | It is delivered                                                                               | `src/simulation/ForwardingPipeline.multicast.test.ts`                        |
| TC-108    | AC-038     | unit/behavior | A host that never joined the group                                                             | The same datagram reaches it                                                      | It is dropped as `not-group-member`, not as `no-route`                                        | `src/simulation/ForwardingPipeline.multicast.test.ts`                        |
| TC-109    | AC-038     | unit/behavior | A host that joined and then left the group                                                     | The same datagram reaches it                                                      | It is dropped as `not-group-member`                                                           | `src/simulation/ForwardingPipeline.multicast.test.ts`                        |
| TC-110    | AC-038     | E2E           | The IGMP snooping lesson in a browser                                                          | Both VLAN-10 receivers join, then the group is sent to                            | The datagrams are delivered, and none is refused                                              | `e2e/multicast-membership.spec.ts`                                           |
| TC-111    | AC-039     | unit/behavior | A switch with an unlearned destination two hops away                                           | It chooses where to send the frame                                                | It sends it towards the destination, not to a leaf host                                       | `src/layers/l2-datalink/SwitchForwarder.reachability.test.ts`                |
| TC-112    | AC-039     | unit/behavior | A destination behind none of the neighbours                                                    | The same choice is made                                                           | The frame is still forwarded                                                                  | `src/layers/l2-datalink/SwitchForwarder.reachability.test.ts`                |
| TC-113    | AC-039     | E2E           | The spanning-tree lesson as it opens                                                           | Its first trace is read                                                           | The packet reaches Host C via Switch C, and no blocked segment is used                        | `e2e/stp-detour.spec.ts`                                                     |
| TC-114    | AC-039     | unit/behavior | Two legs that both reach the destination                                                       | One crosses the segment spanning tree blocked                                     | The leg the tree left forwarding is chosen                                                    | `src/layers/l2-datalink/SwitchForwarder.reachability.test.ts`                |
| TC-115    | AC-039     | E2E           | All three pings the lesson offers                                                              | Each is pressed                                                                   | Each arrives by its forwarding legs, using no blocked segment                                 | `e2e/stp-detour.spec.ts`                                                     |
| TC-116    | AC-040     | unit/behavior | A router whose two neighbours are both switches                                                | It forwards along a directly connected route                                      | It sends the packet towards the subnet the destination is on                                  | `src/layers/l3-network/RouterForwarder.directRoute.test.ts`                  |
| TC-117    | AC-040     | E2E           | The client-server lesson                                                                       | The learner sends a packet                                                        | The address is resolved and the packet arrives, with nothing dropped                          | `e2e/client-server-delivery.spec.ts`                                         |
| TC-118    | AC-042     | unit/behavior | Every course step                                                                              | Its copy is read in both languages                                                | Nothing is blank, and the Japanese differs from the English                                   | `demo/course/courseSteps.test.ts`                                            |
| TC-119    | AC-041     | unit/behavior | Every course step                                                                              | Its sender and destination are looked up                                          | Both exist in that step's own network and carry an address                                    | `demo/course/courseSteps.test.ts`                                            |
| TC-120    | AC-041     | unit/behavior | The course as a sequence                                                                       | Each step's network is measured                                                   | It starts at two machines and never shrinks                                                   | `demo/course/courseSteps.test.ts`                                            |
| TC-121    | AC-041     | unit/behavior | A step whose packet is meant to fail                                                           | Its instruction is read                                                           | It says so before the learner presses                                                         | `demo/course/courseSteps.test.ts`                                            |
| TC-122    | AC-043     | unit/behavior | Every lesson the gallery lists                                                                 | The Japanese catalogue is looked up                                               | Each has a Japanese title and description                                                     | `demo/galleryJa.test.ts`                                                     |
| TC-123    | AC-043     | unit/behavior | Every gallery category                                                                         | The Japanese catalogue is looked up                                               | Each has a Japanese name                                                                      | `demo/galleryJa.test.ts`                                                     |
| TC-124    | AC-043     | unit/behavior | Every Japanese description                                                                     | Its characters are read                                                           | It contains Japanese rather than English left in place                                        | `demo/galleryJa.test.ts`                                                     |
| TC-125    | AC-041     | E2E           | The course opened at its first step                                                            | Every step is run and passed through                                              | Each reports the result it predicted, and the course finishes without complaint               | `e2e/course.spec.ts`                                                         |
| TC-126    | AC-042     | E2E           | The course with Japanese chosen                                                                | A step is shown                                                                   | Its title, goal, instruction and button are in Japanese                                       | `e2e/course.spec.ts`                                                         |
| TC-127    | AC-041     | E2E           | The gallery as it opens                                                                        | The course banner is pressed                                                      | The course opens at its first step                                                            | `e2e/course.spec.ts`                                                         |
| TC-128    | AC-043     | E2E           | The gallery with Japanese chosen                                                               | Every line of prose on the page is read                                           | None of it is left in English                                                                 | `e2e/course.spec.ts`                                                         |
| TC-129    | AC-044     | E2E           | The HTTP lesson                                                                                | "GET /" is pressed                                                                | One session is recorded, and the page survives to show it                                     | `e2e/http-request.spec.ts`                                                   |
| TC-130    | AC-044     | E2E           | The session-inspector lesson                                                                   | "Send Request" is pressed                                                         | One session is recorded, and the page survives to show it                                     | `e2e/http-request.spec.ts`                                                   |
| TC-131    | AC-045     | unit/behavior | A router with an address on two subnets and no static routes                                   | Its routes are computed                                                           | It has a direct route to each of those subnets                                                | `src/routing/connected/ConnectedProtocol.test.ts`                            |
| TC-132    | AC-045     | unit/behavior | A connected route and a static route for one subnet                                            | Their administrative distances are compared                                       | The connected route wins                                                                      | `src/routing/connected/ConnectedProtocol.test.ts`                            |
| TC-133    | AC-045     | unit/behavior | A router with no addressed interfaces                                                          | Its routes are computed                                                           | Nothing is derived                                                                            | `src/routing/connected/ConnectedProtocol.test.ts`                            |
| TC-134    | AC-045     | E2E           | The TCP handshake lesson                                                                       | The learner presses Connect                                                       | Both ends reach ESTABLISHED, so all three segments were delivered                             | `e2e/tcp-handshake-connect.spec.ts`                                          |
| TC-135    | AC-035     | unit/behavior | The browser suite's configuration and install script                                           | Both are read                                                                     | Each engine has a project and is installed by `e2e:install`                                   | `playwright.config.test.ts`                                                  |
| TC-136    | AC-046     | E2E           | The course in the dark theme, before and after a run                                           | axe analyses it for WCAG 2 A/AA                                                   | No violations at either stage                                                                 | `e2e/course-a11y.spec.ts`                                                    |
| TC-137    | AC-046     | E2E           | The course opened after choosing Light                                                         | axe analyses it for WCAG 2 A/AA                                                   | No violations                                                                                 | `e2e/course-a11y.spec.ts`                                                    |
| TC-138    | AC-046     | E2E           | The page shown when the course is finished                                                     | axe analyses it for WCAG 2 A/AA                                                   | No violations                                                                                 | `e2e/course-a11y.spec.ts`                                                    |
| TC-139    | AC-041     | E2E           | A learner who left the course partway through                                                  | They open it again from the gallery                                               | It resumes at the step they reached                                                           | `e2e/course.spec.ts`                                                         |
| TC-140    | AC-041     | E2E           | The course on a phone-width screen                                                             | Its layout is measured                                                            | The panel stacks under the diagram, and the step still runs                                   | `e2e/course.spec.ts`                                                         |
| TC-141    | AC-047     | E2E           | A lesson joining two hosts directly                                                            | Its cables are read                                                               | None is painted as a fault                                                                    | `e2e/authored-links.spec.ts`                                                 |
| TC-142    | AC-047     | unit/behavior | An existing link between two hosts                                                             | It is judged as something already authored                                        | It is not faulty                                                                              | `src/utils/connectionValidator.test.ts`                                      |
| TC-143    | AC-047     | unit/behavior | An existing self-loop                                                                          | It is judged the same way                                                         | It is still reported as a fault                                                               | `src/utils/connectionValidator.test.ts`                                      |
| TC-144    | AC-048     | E2E           | The TCP lesson opened after choosing Light                                                     | Its overlays' backgrounds are measured                                            | Both follow the light theme rather than a fixed near-black                                    | `e2e/authored-links.spec.ts`                                                 |
| TC-145    | AC-048     | E2E           | The TCP lesson's two state badges                                                              | Their boxes are compared with the teaching panel's                                | Neither is underneath it                                                                      | `e2e/authored-links.spec.ts`                                                 |
| TC-146    | AC-047     | unit/behavior | A second link between the same pair                                                            | It is judged as something already authored                                        | It is not faulty, being a port-channel                                                        | `src/utils/connectionValidator.test.ts`                                      |
| TC-147    | AC-049     | E2E           | The guide opened from a file, network refused                                                  | It loads                                                                          | Its content is shown and no request was made                                                  | `e2e/user-guide.spec.ts`                                                     |
| TC-148    | AC-049     | E2E           | The guide                                                                                      | Japanese and then English are chosen                                              | The sections are headed in the chosen language                                                | `e2e/user-guide.spec.ts`                                                     |
| TC-149    | AC-049     | E2E           | The guide                                                                                      | A word is searched for, then the search is cleared                                | Only matching sections remain, then all return                                                | `e2e/user-guide.spec.ts`                                                     |
| TC-150    | AC-049     | E2E           | The guide                                                                                      | The theme control is pressed                                                      | The theme changes between light and dark                                                      | `e2e/user-guide.spec.ts`                                                     |
| TC-151    | AC-050     | unit/behavior | An interactive canvas                                                                          | What it offers is read                                                            | Grid snap is offered                                                                          | `src/components/engine/canvasOffers.test.ts`                                 |
| TC-152    | AC-050     | unit/behavior | A presentational canvas                                                                        | What it offers is read                                                            | Grid snap is not offered                                                                      | `src/components/engine/canvasOffers.test.ts`                                 |
| TC-153    | AC-051     | E2E           | A viewer who prefers reduced motion                                                            | A packet is sent                                                                  | No link is shown animated                                                                     | `e2e/canvas-reduced-motion.spec.ts`                                          |
| TC-154    | AC-051     | E2E           | A viewer with no motion preference                                                             | A packet is sent                                                                  | The travelling packet's link is animated                                                      | `e2e/canvas-reduced-motion.spec.ts`                                          |
| TC-155    | AC-053     | E2E           | The route table over the DMZ lesson                                                            | Its collapse control is pressed twice                                             | The contents hide and return, and the control reports each state                              | `e2e/route-table.spec.ts`                                                    |
| TC-156    | AC-052     | E2E           | A lesson opened with Japanese chosen                                                           | A packet is sent                                                                  | The timeline is in Japanese and the hop events stay as codes                                  | `e2e/lesson-chrome-locale.spec.ts`                                           |
| TC-157    | AC-052     | E2E           | A lesson opened with no language chosen                                                        | A packet is sent                                                                  | The timeline is in English, as before                                                         | `e2e/lesson-chrome-locale.spec.ts`                                           |
| TC-158    | AC-052     | unit/behavior | A provider inside a page that chose Japanese                                                   | It names no language                                                              | It follows the surrounding Japanese                                                           | `src/components/NetlabProvider.test.tsx`                                     |
| TC-159    | AC-052     | unit/behavior | A provider naming English inside a Japanese page                                               | Its language is resolved                                                          | Its own choice wins                                                                           | `src/components/NetlabProvider.test.tsx`                                     |
| TC-160    | AC-052     | E2E           | A lesson opened with Japanese chosen                                                           | Its page header is read                                                           | Its name, summary and window title match the gallery's Japanese                               | `e2e/lesson-chrome-locale.spec.ts`                                           |
| TC-161    | AC-054     | E2E           | Every lesson, opened in the light theme                                                        | The contrast the scanner left undecided is measured                               | Every such text clears WCAG AA                                                                | `e2e/light-theme.spec.ts`                                                    |
| TC-162    | AC-054     | E2E           | Every lesson, in the dark theme                                                                | The contrast the scanner left undecided is measured                               | Every such text clears WCAG AA                                                                | `e2e/a11y.spec.ts`                                                           |
| TC-163    | AC-052     | E2E           | The client-server lesson with Japanese chosen                                                  | Its command bar and area legend are read                                          | The send button and the legend heading are in Japanese                                        | `e2e/lesson-chrome-locale.spec.ts`                                           |
| TC-164    | AC-052     | E2E           | The ARP lesson with Japanese chosen                                                            | Its brief and its own button are read                                             | Both are in Japanese                                                                          | `e2e/lesson-chrome-locale.spec.ts`                                           |
| TC-165    | AC-052     | E2E           | The ARP and UDP lessons with Japanese chosen                                                   | The packet viewer and, after a send, the trace summary are read                   | Both are in Japanese                                                                          | `e2e/lesson-chrome-locale.spec.ts`                                           |
| TC-166    | AC-055     | E2E           | Every lesson in the gallery, and the compare view, in Japanese                                 | It is opened and its primary action pressed                                       | No line of English prose remains; readouts, codes and names may                               | `e2e/lesson-japanese.spec.ts`                                                |
| TC-167    | AC-052     | E2E           | The session and ARP lessons with Japanese chosen                                               | The failure panel and the state-diff table's mode buttons are read                | Their short labels are in Japanese                                                            | `e2e/lesson-chrome-locale.spec.ts`                                           |
| TC-168    | AC-057     | Unit          | Every drop reason the product explains, in Japanese                                            | Its drop-event card is rendered                                                   | Cause, response and explanation are Japanese; the RFC titles stay as they are                 | `src/components/simulation/DropEventCard.test.tsx`                           |
| TC-169    | AC-056     | E2E           | A device opened on the client-server lesson, in Japanese                                       | Each tab of its detail panel is chosen in turn                                    | Every tab is named in Japanese and none leaves an English sentence                            | `e2e/lesson-chrome-locale.spec.ts`                                           |
| TC-170    | AC-058     | E2E           | The OSPF lesson opened with no audience chosen                                                 | The brief is read, then the lesson reopened with `?audience=pro`                  | The full card is shown first, the compact strip second                                        | `e2e/lesson-brief-audience.spec.ts`                                          |
| TC-171    | AC-059     | E2E           | The topology editor with its starter topology                                                  | A client on the canvas is pressed and its address typed                           | Its editor opens and keeps the address                                                        | `e2e/editor-node-editing.spec.ts`                                            |
| TC-172    | AC-060     | E2E + Unit    | An open device panel                                                                           | It is pinned, then the lesson is opened again                                     | The panel stays on screen both times                                                          | `e2e/device-panel-pin.spec.ts`<br>`src/components/NodeDetailPanel.test.tsx`  |
| TC-173    | AC-061     | E2E           | The client-server lesson, with every device on screen                                          | The rightmost device is opened                                                    | The devices that were on screen are still on screen                                           | `e2e/canvas-selection-view.spec.ts`                                          |
| TC-174    | AC-062     | E2E + Unit    | The congestion lesson                                                                          | It is opened, then run                                                            | It opens empty and the trace appears on the run                                               | `e2e/tcp-congestion.spec.ts`<br>`demo/simulation/TcpCongestionDemo.test.tsx` |
| TC-175    | AC-063     | E2E           | The OSPF lesson opened with a guided intro, and with an assessment                             | The intro is started and the link editor opened from the canvas                   | Both flows are reachable; the lesson's brief does not block them                              | `e2e/sandbox-intro-ospf.spec.ts`<br>`e2e/assessment-completion.spec.ts`      |
| TC-176    | AC-065     | E2E           | Each of the three shape lessons, in Japanese                                                   | The lesson's one button is pressed                                                | It arrives, is explained, and the route ends at the server with no device twice               | `e2e/basic-lessons-task.spec.ts`                                             |
| TC-177    | AC-066     | E2E           | The client-server lesson, in Japanese                                                          | The navigation is read and the back control pressed                               | Every name is Japanese and the gallery opens                                                  | `e2e/lesson-chrome-locale.spec.ts`                                           |
| TC-178    | AC-067     | E2E           | The gallery as it first opens, showing Light                                                   | Light is pressed and a lesson opened                                              | The lesson is light                                                                           | `e2e/settings-carry.spec.ts`                                                 |
| TC-179    | AC-068     | E2E           | The editor's starter network                                                                   | A client is added and linked to the switch from its connection point              | It is named Client-2, opens its editor, and the link is drawn                                 | `e2e/editor-linking.spec.ts`                                                 |
| TC-180    | AC-068     | E2E           | The editor's starter network                                                                   | Client-1 is dragged onto Server-1                                                 | A Japanese explanation appears and no link is added                                           | `e2e/editor-linking.spec.ts`                                                 |
| TC-181    | AC-069     | E2E           | The editor's starter network                                                                   | It is run                                                                         | An outcome appears by the button and the rail turns to the result                             | `e2e/editor-linking.spec.ts`                                                 |
| TC-182    | AC-069     | E2E           | The editor with a new, unlinked router                                                         | The checks are opened                                                             | The router is named as an issue                                                               | `e2e/editor-linking.spec.ts`                                                 |
| TC-183    | AC-069     | E2E           | The editor after a device is added                                                             | Ctrl+Z then Ctrl+Y are pressed                                                    | The device goes and comes back                                                                | `e2e/editor-linking.spec.ts`                                                 |
| TC-184    | AC-075     | E2E           | A first visit                                                                                  | The gallery is read, a course step finished, the gallery read again               | 0 and no resume first; 1 and a resume after                                                   | `e2e/progress-course.spec.ts`                                                |
| TC-185    | AC-071     | E2E           | Three lessons in turn                                                                          | Each is opened, then back is pressed                                              | Every page draws its devices; no error                                                        | `e2e/lesson-navigation.spec.ts`                                              |
| TC-186    | AC-070     | Unit          | Two routers joined by a link marked down                                                       | Their adjacency is built                                                          | Neither lists the other                                                                       | `src/routing/graphBuilder.test.ts`                                           |
| TC-187    | AC-070     | E2E           | The failure lesson, the spanning-tree lesson and the OSPF lesson                               | A link is failed, a link is blocked, the primary link is failed                   | Each is drawn with its state and mark, and the key names it                                   | `e2e/canvas-link-states.spec.ts`                                             |
| TC-188    | AC-070     | E2E           | The congestion and data-transfer lessons at several widths                                     | The canvas is framed                                                              | No device sits under the canvas controls                                                      | `e2e/canvas-link-states.spec.ts`                                             |
| TC-189    | AC-072     | E2E           | A router opened on a lesson                                                                    | Its overview, header, interfaces and resize edge are read                         | Role, interfaces, subnets, neighbours, kind and layer in words, MTU once, a visible grip      | `e2e/device-panel-overview.spec.ts`                                          |
| TC-190    | AC-073     | E2E           | The sandbox, a failure panel, the collector, NAT, step routes and the OSPF hint, at two widths | Each is opened and measured                                                       | Labels stay whole, everything is reachable, nothing overlaps                                  | `e2e/panel-layout.spec.ts`                                                   |
| TC-191    | AC-074     | E2E           | The spanning-tree lesson                                                                       | It opens, a root is re-elected, its ports are read                                | It opens idle naming the blocked link, the link moves, ports are named by devices             | `e2e/lesson-stp-blocked-link.spec.ts`                                        |
| TC-192    | AC-074     | E2E           | The OSPF lesson                                                                                | A probe is sent, the link failed, the probe sent again                            | The previous route is kept beside the new one; every route table opens off the canvas         | `e2e/lesson-ospf-compare.spec.ts`                                            |
| TC-193    | AC-074     | E2E           | The enterprise lesson                                                                          | Its steps are run in order                                                        | Each shows done/current/not yet and keeps its result, NAT rows included                       | `e2e/lesson-enterprise-steps.spec.ts`                                        |
| TC-194    | AC-074     | E2E           | The link QoS lesson                                                                            | Its fields are read and its button pressed                                        | Units and the loss value are shown; a result appears under the button                         | `e2e/lesson-link-qos-fields.spec.ts`                                         |
| TC-195    | AC-074     | E2E           | The trace inspector, ARP, UDP and all-in-one lessons                                           | They are run                                                                      | Hops fill the room, the timeline is on the first screen, labels stay whole, flows are ① … → … | `e2e/lesson-layout-balance.spec.ts`                                          |
| TC-038    | AC-031     | E2E           | The gallery's theme setting                                                                    | A theme is chosen, then a lesson opened                                           | The lesson follows the choice, and an unmade choice changes nothing                           | `e2e/settings-carry.spec.ts`                                                 |
| TC-037    | AC-030     | E2E           | An interactive canvas                                                                          | The learner tabs to a device and presses Enter                                    | The device is focusable, named, and opens                                                     | `e2e/canvas-keyboard.spec.ts`                                                |
| TC-036    | AC-029     | E2E           | A laptop display, and the sandbox                                                              | The same lesson is worked through, and a device is edited and the edit taken back | Every control is pressable and every result appears                                           | `e2e/user-journey.spec.ts`                                                   |
| TC-035    | AC-029     | E2E           | A full-screen display                                                                          | The learner works through a lesson and the editor                                 | Every control is pressable and every result appears                                           | `e2e/user-journey.spec.ts`                                                   |
| TC-034    | AC-028     | E2E           | Every lesson in the gallery                                                                    | It is opened                                                                      | What the canvas drew is inside the viewport                                                   | `e2e/smoke.spec.ts`                                                          |
| TC-033    | AC-027     | E2E           | The editor opened on a saved topology                                                          | Device positions are measured                                                     | The topology is centred in the canvas                                                         | `e2e/editor-framing.spec.ts`                                                 |
| TC-032    | AC-026     | E2E           | An editor canvas panned away from the origin                                                   | An element is placed from the palette                                             | It is drawn within the canvas                                                                 | `e2e/editor-placement.spec.ts`                                               |
| TC-029    | AC-025     | unit/behavior | The editor's node tab, docked, with nothing selected                                           | It is rendered                                                                    | It tells the learner to select a device                                                       | `src/editor/components/NodeEditorPanel.test.tsx`                             |
| TC-030    | REQ-027    | unit/behavior | A link drawn by the editor                                                                     | Its style is read                                                                 | It carries no arrowhead                                                                       | `src/editor/engine/maxGraphModel.test.ts`                                    |
| TC-031    | AC-024     | E2E           | A canvas the learner can pan                                                                   | An empty part of it is dragged                                                    | The diagram moves                                                                             | `e2e/canvas-pan.spec.ts`                                                     |
| TC-028    | AC-023     | E2E           | The embed demo's three embedded canvases                                                       | The page is opened                                                                | Each has real width and height                                                                | `e2e/embed-sizing.spec.ts`                                                   |
| TC-026    | AC-021     | unit/behavior | A device of a kind the canvas does not know                                                    | It is drawn                                                                       | The device and its name are present                                                           | `src/components/DefaultNode.test.tsx`                                        |
| TC-027    | AC-022     | E2E           | Every lesson in the gallery                                                                    | It is opened                                                                      | Devices and links are drawn, and nothing is logged                                            | `e2e/smoke.spec.ts`                                                          |
| TC-025    | AC-020     | E2E           | The embed demo's light and dark canvases                                                       | Their viewport controls are compared                                              | The light canvas's controls are drawn light                                                   | `e2e/canvas-theme.spec.ts`                                                   |
| TC-012    | REQ-009    | unit/behavior | A stand-in engine                                                                              | The editor drives it                                                              | The whole topology and the visible-layer set are handed over                                  | `src/editor/engine/engineContract.test.tsx`                                  |

Regression scenarios kept permanently:

| Test case | Level         | Defect it pins                                                                                                                         | Automated test                                   |
| --------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| TC-105    | E2E           | A link that names the router interfaces it joins was not drawn at all, so the OSPF convergence lesson showed six routers and no cables | `e2e/canvas-interface-links.spec.ts`             |
| TC-104    | E2E           | Zooming out collapsed the areas but never drew the clusters that replace them, so the canvas went nearly blank                         | `e2e/canvas-areas.spec.ts`                       |
| TC-101    | E2E           | Run recorded nothing because the editor subscribed to a simulation context it rendered itself                                          | `e2e/editor-layers.spec.ts`                      |
| TC-102    | unit/behavior | Two elements created in the same millisecond shared a node id                                                                          | `src/editor/palette.test.ts`                     |
| TC-103    | unit/behavior | Clearing learner progress left the exported JSON on screen                                                                             | `src/components/progress/ProgressPanel.test.tsx` |

## 14. Examples

`<TopologyEditor layers={['l3']} />` mounts a router-only exercise.
`<TopologyEditor engine={MaxGraphEngine} />` swaps the canvas for maxGraph, whose
layers are the engine's own rather than a filtered redraw.

## 15. Assumptions / open questions

- L1 and L4 have no placeable elements yet, so those groups do not appear.
  Whether to add a hub and a transport-layer element is open.
- **The OSPF backup-path assessment cannot be finished in a browser.** Its
  second required sub-goal waits for an `ospf:reconverged` event, and nothing in
  the app emits one — the only producer is the CLI, which assumes it: "a
  link.state edit went down, therefore reconverged". Emitting it honestly means
  deciding what reconvergence _is_ here, and this engine has no discrete
  recompute to point at: a downed link is avoided by the forwarding pipeline
  rather than triggering a routing pass. Deciding that is a design question, and
  guessing at it would reproduce the CLI's assumption in the product. Recorded
  rather than guessed. `e2e/assessment-completion.spec.ts` covers the sub-goals
  that do work and says where it stops. (The related question — whether the
  lesson's own "Fail link" should count — is answered: it records a sandbox edit
  now, as the controlled-topology demo's buttons always have.)
- **What stays in English inside a lesson.** Every lesson, the device and link
  panels and the editor are translated, so what remains in English is there on
  purpose: hop events and drop reasons, packet field names, protocol names,
  device and area names authored in a topology, addresses, and the data a lesson
  carries — a payload, a topology's JSON, an RFC's title. Those are what a
  learner searches for by name, and translating them would break the search.
- One action can satisfy several tutorial steps at once (all three ARP
  predicates are true after the first packet). The completion card lists what
  was observed; whether the steps should instead gate on distinct moments is a
  content decision, left to the author.

## 16. Specification quality checklist

- [x] Purpose and scope are explicit.
- [x] Requirements are externally observable.
- [x] Acceptance criteria are unambiguous.
- [x] Behavior test cases carry levels and traceability.
- [x] Failure and edge behavior is defined.
- [x] Security considerations addressed (label escaping) .
- [x] Migration impact stated.
- [x] Open questions recorded rather than guessed.

## 17. Traceability

Each requirement against the criteria that accept it, the test cases that
exercise those, and where a user reads about it. Requirement-to-criterion
links were not recorded when most of these were written; they are paired
here by reading each requirement against the criteria, and a requirement
with no criterion or no test is shown as such rather than given one.

| Requirement | Acceptance                     | Test case                                                                                      | Test evidence                                                                                                                                                         | User guide section  | Status   |
| ----------- | ------------------------------ | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | -------- |
| REQ-001     | AC-001                         | TC-001                                                                                         | `e2e/editor-layers.spec.ts`                                                                                                                                           | —                   | Verified |
| REQ-002     | AC-002                         | TC-002                                                                                         | `src/editor/components/LayerPalette.test.tsx`                                                                                                                         | —                   | Verified |
| REQ-003     | AC-003                         | TC-003, TC-010                                                                                 | `e2e/editor-layers.spec.ts`<br>`src/editor/engine/maxGraphModel.test.ts`                                                                                              | —                   | Verified |
| REQ-004     | AC-004                         | TC-004, TC-005                                                                                 | `src/editor/layerVisibility.test.ts`                                                                                                                                  | —                   | Verified |
| REQ-005     | AC-004                         | TC-004, TC-005                                                                                 | `src/editor/layerVisibility.test.ts`                                                                                                                                  | —                   | Verified |
| REQ-006     | AC-005                         | TC-006                                                                                         | `e2e/editor-layers.spec.ts`                                                                                                                                           | —                   | Verified |
| REQ-007     | AC-006                         | TC-007                                                                                         | `src/editor/components/EditorRunButton.test.tsx`                                                                                                                      | —                   | Verified |
| REQ-008     | AC-007                         | TC-008, TC-011                                                                                 | `e2e/editor-layers.spec.ts`<br>`src/editor/components/PacketHistoryPanel.test.tsx`                                                                                    | —                   | Verified |
| REQ-009     | —                              | TC-012                                                                                         | `src/editor/engine/engineContract.test.tsx`                                                                                                                           | —                   | Verified |
| REQ-010     | AC-009, AC-010                 | TC-013, TC-014                                                                                 | `e2e/canvas-areas.spec.ts`                                                                                                                                            | —                   | Verified |
| REQ-011     | AC-011                         | TC-015                                                                                         | `e2e/canvas-areas.spec.ts`                                                                                                                                            | —                   | Verified |
| REQ-012     | AC-012                         | TC-016                                                                                         | `e2e/canvas-controlled.spec.ts`                                                                                                                                       | —                   | Verified |
| REQ-013     | AC-051                         | TC-153, TC-154                                                                                 | `e2e/canvas-reduced-motion.spec.ts`                                                                                                                                   | —                   | Verified |
| REQ-014     | AC-013, AC-014                 | TC-017, TC-018                                                                                 | `src/layers/nodeEngineIndependence.test.tsx`<br>`src/components/engine/simulatorGraphModel.test.ts`                                                                   | —                   | Verified |
| REQ-015     | AC-015                         | TC-019, TC-020                                                                                 | `src/components/engine/simulatorGraphModel.test.ts`                                                                                                                   | —                   | Verified |
| REQ-016     | AC-016                         | TC-021, TC-044                                                                                 | `e2e/sandbox-link-edit.spec.ts`<br>`e2e/assessment-completion.spec.ts`                                                                                                | The sandbox         | Verified |
| REQ-017     | AC-017                         | TC-022                                                                                         | `e2e/canvas-compare-viewport.spec.ts`                                                                                                                                 | —                   | Verified |
| REQ-018     | AC-018                         | TC-023                                                                                         | `src/components/engine/simulatorGraphModel.test.ts`                                                                                                                   | Reading a lesson    | Verified |
| REQ-019     | AC-019                         | TC-024                                                                                         | `e2e/canvas-select-pan.spec.ts`                                                                                                                                       | —                   | Verified |
| REQ-020     | AC-020                         | TC-025                                                                                         | `e2e/canvas-theme.spec.ts`                                                                                                                                            | —                   | Verified |
| REQ-021     | AC-050, AC-053                 | TC-151, TC-152, TC-155                                                                         | `src/components/engine/canvasOffers.test.ts`<br>`e2e/route-table.spec.ts`                                                                                             | —                   | Verified |
| REQ-022     | AC-021, AC-022                 | TC-026, TC-027                                                                                 | `src/components/DefaultNode.test.tsx`<br>`e2e/smoke.spec.ts`                                                                                                          | Reading a lesson    | Verified |
| REQ-023     | AC-022                         | TC-027                                                                                         | `e2e/smoke.spec.ts`                                                                                                                                                   | —                   | Verified |
| REQ-024     | AC-028                         | TC-034                                                                                         | `e2e/smoke.spec.ts`                                                                                                                                                   | —                   | Verified |
| REQ-025     | AC-023                         | TC-028                                                                                         | `e2e/embed-sizing.spec.ts`                                                                                                                                            | —                   | Verified |
| REQ-026     | AC-024                         | TC-031                                                                                         | `e2e/canvas-pan.spec.ts`                                                                                                                                              | Reading a lesson    | Verified |
| REQ-027     | —                              | TC-030                                                                                         | `src/editor/engine/maxGraphModel.test.ts`                                                                                                                             | —                   | Verified |
| REQ-028     | AC-025                         | TC-029                                                                                         | `src/editor/components/NodeEditorPanel.test.tsx`                                                                                                                      | —                   | Verified |
| REQ-029     | AC-026                         | TC-032                                                                                         | `e2e/editor-placement.spec.ts`                                                                                                                                        | —                   | Verified |
| REQ-030     | AC-027                         | TC-033                                                                                         | `e2e/editor-framing.spec.ts`                                                                                                                                          | —                   | Verified |
| REQ-031     | AC-028, AC-029                 | TC-034, TC-035, TC-036                                                                         | `e2e/smoke.spec.ts`<br>`e2e/user-journey.spec.ts`                                                                                                                     | Reading a lesson    | Verified |
| REQ-032     | AC-029, AC-032                 | TC-035, TC-036, TC-039, TC-040, TC-106                                                         | `e2e/user-journey.spec.ts`<br>`e2e/lesson-controls.spec.ts`                                                                                                           | Reading a lesson    | Verified |
| REQ-033     | AC-030                         | TC-037                                                                                         | `e2e/canvas-keyboard.spec.ts`                                                                                                                                         | Keyboard            | Verified |
| REQ-034     | AC-031                         | TC-038                                                                                         | `e2e/settings-carry.spec.ts`                                                                                                                                          | Using the gallery   | Verified |
| REQ-035     | AC-032                         | TC-039, TC-040, TC-106                                                                         | `e2e/lesson-controls.spec.ts`                                                                                                                                         | —                   | Verified |
| REQ-036     | AC-033, AC-054                 | TC-041, TC-161, TC-162                                                                         | `e2e/light-theme.spec.ts`<br>`e2e/a11y.spec.ts`                                                                                                                       | Using the gallery   | Verified |
| REQ-037     | AC-034                         | TC-042                                                                                         | `src/theme/index.test.ts`                                                                                                                                             | —                   | Verified |
| REQ-038     | AC-035                         | TC-135                                                                                         | `playwright.config.test.ts`                                                                                                                                           | —                   | Verified |
| REQ-039     | AC-036                         | TC-043                                                                                         | `src/components/tutorial/TutorialStepPanel.test.tsx`                                                                                                                  | —                   | Verified |
| REQ-040     | AC-037                         | TC-045                                                                                         | `e2e/assessment-completion.spec.ts`                                                                                                                                   | The sandbox         | Verified |
| REQ-041     | AC-038                         | TC-107, TC-108, TC-109, TC-110                                                                 | `src/simulation/ForwardingPipeline.multicast.test.ts`<br>`e2e/multicast-membership.spec.ts`                                                                           | Troubleshooting     | Verified |
| REQ-042     | AC-039                         | TC-111, TC-112, TC-113, TC-114, TC-115                                                         | `src/layers/l2-datalink/SwitchForwarder.reachability.test.ts`<br>`e2e/stp-detour.spec.ts`                                                                             | —                   | Verified |
| REQ-043     | AC-040                         | TC-116, TC-117                                                                                 | `src/layers/l3-network/RouterForwarder.directRoute.test.ts`<br>`e2e/client-server-delivery.spec.ts`                                                                   | Troubleshooting     | Verified |
| REQ-044     | AC-041, AC-046                 | TC-119, TC-120, TC-121, TC-125, TC-127, TC-136, TC-137, TC-138, TC-139, TC-140                 | `demo/course/courseSteps.test.ts`<br>`e2e/course.spec.ts`<br>`e2e/course-a11y.spec.ts`                                                                                | The six-step course | Verified |
| REQ-045     | AC-042, AC-043                 | TC-118, TC-122, TC-123, TC-124, TC-126, TC-128                                                 | `demo/course/courseSteps.test.ts`<br>`e2e/course.spec.ts`<br>`demo/galleryJa.test.ts`                                                                                 | Using the gallery   | Verified |
| REQ-046     | AC-041                         | TC-119, TC-120, TC-121, TC-125, TC-127, TC-139, TC-140                                         | `demo/course/courseSteps.test.ts`<br>`e2e/course.spec.ts`                                                                                                             | The six-step course | Verified |
| REQ-047     | AC-044                         | TC-129, TC-130                                                                                 | `e2e/http-request.spec.ts`                                                                                                                                            | Reading a lesson    | Verified |
| REQ-048     | AC-045                         | TC-131, TC-132, TC-133, TC-134                                                                 | `src/routing/connected/ConnectedProtocol.test.ts`<br>`e2e/tcp-handshake-connect.spec.ts`                                                                              | Reading a lesson    | Verified |
| REQ-049     | AC-047                         | TC-141, TC-142, TC-143, TC-146                                                                 | `e2e/authored-links.spec.ts`<br>`src/utils/connectionValidator.test.ts`                                                                                               | Reading a lesson    | Verified |
| REQ-050     | AC-048                         | TC-144, TC-145                                                                                 | `e2e/authored-links.spec.ts`                                                                                                                                          | Reading a lesson    | Verified |
| REQ-051     | AC-049                         | TC-147, TC-148, TC-149, TC-150                                                                 | `e2e/user-guide.spec.ts`                                                                                                                                              | Getting started     | Verified |
| REQ-052     | AC-052, AC-055, AC-056, AC-057 | TC-156, TC-157, TC-158, TC-159, TC-160, TC-163, TC-164, TC-165, TC-166, TC-167, TC-168, TC-169 | `e2e/lesson-chrome-locale.spec.ts`<br>`e2e/lesson-japanese.spec.ts`<br>`src/components/NetlabProvider.test.tsx`<br>`src/components/simulation/DropEventCard.test.tsx` | Using the gallery   | Verified |
| REQ-053     | AC-058                         | TC-170                                                                                         | `e2e/lesson-brief-audience.spec.ts`                                                                                                                                   | Reading a lesson    | Verified |
| REQ-054     | AC-059, AC-060, AC-061, AC-062 | TC-171, TC-172, TC-173, TC-174                                                                 | `e2e/editor-node-editing.spec.ts`<br>`e2e/device-panel-pin.spec.ts`<br>`e2e/canvas-selection-view.spec.ts`<br>`e2e/tcp-congestion.spec.ts`                            | Building a topology | Verified |
| REQ-055     | AC-063, AC-064                 | TC-175                                                                                         | `e2e/sandbox-intro-ospf.spec.ts`<br>`e2e/assessment-completion.spec.ts`                                                                                               | Reading a lesson    | Verified |
| REQ-056     | AC-065, AC-066, AC-067         | TC-176, TC-177, TC-178                                                                         | `e2e/basic-lessons-task.spec.ts`<br>`e2e/lesson-chrome-locale.spec.ts`<br>`e2e/settings-carry.spec.ts`                                                                | Getting started     | Verified |
| REQ-057     | AC-068, AC-069                 | TC-179, TC-180, TC-181, TC-182, TC-183                                                         | `e2e/editor-linking.spec.ts`                                                                                                                                          | Building a topology | Verified |
| REQ-058     | AC-070, AC-071                 | TC-185, TC-186, TC-187, TC-188                                                                 | `e2e/canvas-link-states.spec.ts`<br>`e2e/lesson-navigation.spec.ts`<br>`src/routing/graphBuilder.test.ts`                                                             | Reading a lesson    | Verified |
| REQ-059     | AC-072, AC-073, AC-074         | TC-189, TC-190, TC-191, TC-192, TC-193, TC-194, TC-195                                         | `e2e/device-panel-overview.spec.ts`<br>`e2e/panel-layout.spec.ts`<br>`e2e/lesson-*.spec.ts`                                                                           | Reading a lesson    | Verified |
| REQ-060     | AC-075                         | TC-184                                                                                         | `e2e/progress-course.spec.ts`                                                                                                                                         | Getting started     | Verified |
