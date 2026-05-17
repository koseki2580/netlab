# Shell Chrome

The demo shell chrome owns the frame around learner-facing simulator routes. It
keeps global navigation separate from scenario controls so each simulator can
use the same canvas-first layout without reintroducing per-demo headers.

## Nav Rail

Simulator routes use a 48px left navigation rail when they are not embedded.
The rail is global chrome, not scenario content.

- Width is fixed at 48px.
- The top brand button and the `Browse` item navigate to the gallery route.
- `Browse` is active on the gallery route. `Run` is active on simulator routes.
- `Sandbox` and `Settings` are visible placeholders until those global surfaces
  are wired. Disabled rail items must not be focusable and must not fire
  handlers.
- The bottom help button opens the global keyboard shortcut popover. It is
  part of shell chrome and must be omitted in embedded mode with the rest of
  the rail.

Embedded simulator routes omit the nav rail because their host page owns global
navigation.

## Command Bar

Simulator routes use `NetlabAppShellV2`, which renders a single 40px
`CommandBar` above the canvas frame. The earlier four-zone `NetlabAppShell`
API has been removed; migrate scene-specific controls to command-bar
`extraActions` or `overflowActions`.

The command bar owns scenario-level controls:

- scenario identity chip: `scenario://<id>` plus an optional layer subline
- run controls: play/pause, step, reset
- step counter: current step plus optional total
- status: labeled status pill, reduced to a dot at narrow widths
- palette affordance: `⌘K` button wired to the global command palette
- overflow affordance: secondary topology/inspect/sandbox controls
- export affordance: PCAP/download action when supplied

The bar must stay one row (`flex-wrap: nowrap`). Width fallbacks are measured
against the bar's own container with `ResizeObserver`:

- below 1280px: hide the scenario subline
- below 1024px: hide the step-count total denominator
- below 800px: hide the status label and keep the status dot

Scene-specific primary actions, such as OSPF's `Send Probe` and
`Fail link`/`Restore link`, belong in `extraActions`.

## Command Palette and Keymap

Simulator routes install one global keymap through `installKeymap(...)`.
Individual widgets must not install competing global listeners when the shell
owns those shortcuts.

The shell-level keymap owns:

- `⌘K` on macOS and `Ctrl+K` elsewhere: open or close the command palette
- `?`: open the keyboard shortcut popover from the nav rail help affordance
- `Escape`: close shell overlays when focus is not inside a text field
- packet scrub shortcuts supplied by the active simulator: `Space`,
  `ArrowLeft`, `ArrowRight`, `Shift+ArrowLeft`, `Shift+ArrowRight`, `Home`, and
  `End`

The command palette is a modal search surface. It receives command items from
the current shell, supports fuzzy matching across labels, subtitles, and
keywords, and executes the highlighted command with `Enter`. It must include
scenario navigation entries, a gallery navigation command, and help commands.
Active simulators can register trace-local entries, such as current packet
hops, through shell chrome so the palette searches the scenario list and the
current trace in one place.
`CommandBar`'s `⌘K` affordance calls the same shell action as the global
keyboard shortcut.

When a simulator supplies packet-scrub actions to the shell keymap, its local
`PacketScrubTimeline` must render with `ownKeyboard={false}` so a single
listener owns global packet controls.

## Verification

Shell chrome changes should be covered by component tests that assert:

- rail item labels and disabled behavior
- route-aware active state
- gallery navigation from the rail
- embedded mode omits global shell navigation
- command bar required controls and no-wrap layout
- command bar narrow-width fallback behavior
- route migration keeps existing scene controls reachable
- command palette filtering, keyboard selection, and command execution
- global keymap ignores text-entry targets and dispatches shell shortcuts
- `⌘K` from the browser opens the palette and can navigate to OSPF in e2e
