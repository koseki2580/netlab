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

| Test case | Related AC | Level         | Given / precondition                            | When / action                                     | Then / observable result                                                             | Automated test                                      |
| --------- | ---------- | ------------- | ----------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------- |
| TC-001    | AC-001     | E2E           | The editor is open                              | The learner clicks the router element             | The canvas shows one more node                                                       | `e2e/editor-layers.spec.ts`                         |
| TC-002    | AC-002     | unit/behavior | `layers={['l3']}`                               | The palette renders                               | Only the router is offered; switch and client are absent                             | `src/editor/components/LayerPalette.test.tsx`       |
| TC-003    | AC-003     | E2E           | The topology has routers                        | The learner hides, then shows, L3                 | The routers leave the canvas, then return                                            | `e2e/editor-layers.spec.ts`                         |
| TC-004    | AC-004     | unit/behavior | A topology and a layer selection                | Visible topology is computed                      | The canonical topology is unchanged                                                  | `src/editor/layerVisibility.test.ts`                |
| TC-005    | AC-004     | unit/behavior | A hidden layer with a link to a shown one       | Visible topology is computed                      | The link is not drawn                                                                | `src/editor/layerVisibility.test.ts`                |
| TC-006    | AC-005     | E2E           | The editor is open                              | The learner switches inspector tabs               | Only the chosen panel is present                                                     | `e2e/editor-layers.spec.ts`                         |
| TC-007    | AC-006     | unit/behavior | Two nodes without IP addresses                  | Run is rendered                                   | Run is disabled and names the missing IP address                                     | `src/editor/components/EditorRunButton.test.tsx`    |
| TC-008    | AC-007     | E2E           | The editor with addressable hosts               | The learner runs, then opens the run tab          | The run is listed rather than reported empty                                         | `e2e/editor-layers.spec.ts`                         |
| TC-009    | AC-008     | E2E           | The editor with palette and rail visible        | axe analyses for WCAG 2 A/AA                      | No violations                                                                        | `e2e/editor-layers.spec.ts`                         |
| TC-010    | AC-003     | unit/behavior | A maxGraph canvas with layers                   | One layer is hidden                               | Only that layer's cells stop being visible                                           | `src/editor/engine/maxGraphModel.test.ts`           |
| TC-011    | AC-007     | unit/behavior | A recorded run                                  | A history row is selected                         | The link that hop crossed is reported                                                | `src/editor/components/PacketHistoryPanel.test.tsx` |
| TC-013    | AC-009     | E2E           | A topology with areas                           | The learner zooms out                             | The area is drawn as a single cluster                                                | `e2e/canvas-areas.spec.ts`                          |
| TC-014    | AC-010     | E2E           | A collapsed area                                | The learner expands it                            | Its member devices are drawn again                                                   | `e2e/canvas-areas.spec.ts`                          |
| TC-015    | AC-011     | E2E           | An illustration canvas mid-page                 | The learner scrolls over it                       | The page scrolls                                                                     | `e2e/canvas-areas.spec.ts`                          |
| TC-016    | AC-012     | E2E           | A host-controlled canvas                        | The host applies a change                         | The canvas reflects it                                                               | `e2e/canvas-controlled.spec.ts`                     |
| TC-017    | AC-013     | unit/behavior | Every device drawing and the area cluster       | Drawn with no graph engine mounted                | Each shows its device, name and badge                                                | `src/layers/nodeEngineIndependence.test.tsx`        |
| TC-018    | AC-014     | unit/behavior | A topology and a device rendering for each node | The canvas is drawn on maxGraph                   | Every device is drawn carrying its own rendering, and a redraw replaces the last one | `src/components/engine/simulatorGraphModel.test.ts` |
| TC-019    | AC-015     | unit/behavior | A link to a device that is not drawn            | The canvas is drawn                               | The link is omitted and the devices stay                                             | `src/components/engine/simulatorGraphModel.test.ts` |
| TC-020    | AC-015     | unit/behavior | A link the canvas marked down                   | The link is drawn                                 | Its colour, weight and dashes are the ones asked for                                 | `src/components/engine/simulatorGraphModel.test.ts` |
| TC-021    | AC-016     | E2E           | A sandbox canvas with links                     | The learner right-clicks a link and takes it down | The link editor opens and the edit is listed                                         | `e2e/sandbox-link-edit.spec.ts`                     |
| TC-022    | AC-017     | E2E           | Two canvases in compare mode                    | The learner zooms one                             | Both are drawn at the same zoom                                                      | `e2e/canvas-compare-viewport.spec.ts`               |
| TC-023    | AC-018     | unit/behavior | Links with errors, with warnings, and clean     | They are drawn                                    | Each carries the right mark, and the messages are readable                           | `src/components/engine/simulatorGraphModel.test.ts` |
| TC-024    | AC-019     | E2E           | A device opened, dismissed and opened again     | Its position is compared across openings          | It lands in the same place each time and stays on the canvas                         | `e2e/canvas-select-pan.spec.ts`                     |
| TC-026    | AC-021     | unit/behavior | A device of a kind the canvas does not know     | It is drawn                                       | The device and its name are present                                                  | `src/components/DefaultNode.test.tsx`               |
| TC-027    | AC-022     | E2E           | Every lesson in the gallery                     | It is opened                                      | Devices and links are drawn, and nothing is logged                                   | `e2e/smoke.spec.ts`                                 |
| TC-025    | AC-020     | E2E           | The embed demo's light and dark canvases        | Their viewport controls are compared              | The light canvas's controls are drawn light                                          | `e2e/canvas-theme.spec.ts`                          |
| TC-012    | REQ-009    | unit/behavior | A stand-in engine                               | The editor drives it                              | The whole topology and the visible-layer set are handed over                         | `src/editor/engine/engineContract.test.tsx`         |

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
- `npm run e2e` requests chromium, firefox and webkit while `e2e:install`
  installs only chromium. Runs here are chromium-only.

## 16. Specification quality checklist

- [x] Purpose and scope are explicit.
- [x] Requirements are externally observable.
- [x] Acceptance criteria are unambiguous.
- [x] Behavior test cases carry levels and traceability.
- [x] Failure and edge behavior is defined.
- [x] Security considerations addressed (label escaping) .
- [x] Migration impact stated.
- [x] Open questions recorded rather than guessed.
