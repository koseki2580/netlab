# Terminal and simulated servers

A learner opens a terminal on a device and types the commands of a real machine. Each command runs
on the simulator, and the servers that answer — DNS, HTTP and DHCP — run in the page (REQ-358 to
REQ-361).

## Library: `runTerminalCommand`

```ts
import { runTerminalCommand } from 'netlab';

const { lines, clear } = await runTerminalCommand('ping -c 2 www', {
  engine, // useSimulation().engine, or any SimulationEnginePort
  nodeId: 'client', // the device the terminal is open on
  locale: 'ja', // errors, usage and help; command output stays as the tool prints it
  web: { www: { pages: { '/': { contentType: 'text/html', body: '<h1>Hi</h1>' } } } },
});
```

- The commands load the first time one runs (`ui:terminal`, 7 kB).
- Every send goes through the engine, so it is a trace like a lesson button's, and it moves on the
  canvas.
- No xterm.js in the library: `runTerminalCommand` returns lines. Any terminal, or none, can show
  them.

| Command                                  | Runs                                                  | Prints like                               |
| ---------------------------------------- | ----------------------------------------------------- | ----------------------------------------- |
| `ping [-c N] host`                       | `engine.ping` per request (N ≤ 10, default 4)         | iputils `ping`, without times             |
| `traceroute host`                        | `engine.traceroute`                                   | `traceroute`, `!N` for net unreachable    |
| `nslookup name`, `dig name`              | `engine.simulateDns`                                  | bind `nslookup` / `dig`                   |
| `curl [-v] [-I] http://host[:port]/path` | DNS, `tcpConnect`, `sendTransfer` ×2, `tcpDisconnect` | curl (`-v`: `>`/`<` lines; `-I`: headers) |
| `dhclient`                               | `engine.simulateDhcp`                                 | ISC dhclient                              |
| `ip addr`, `ip route`, `arp -a`, `ss -t` | state reads                                           | iproute2 / net-tools                      |

- **Names:** a host name resolves by the devices' names first, as `/etc/hosts` would (no packets),
  then by DNS on the simulator.
- **Web servers:** a web server is the `web` entry for its device id. A path it has not got answers 404. A device with no entry, or another port, refuses the connection (`curl: (7)`), with no packets
  sent.
- **No times:** the simulator has no clock, so no output shows a time.

## Demo: `/tools/terminal`

- `demo/tools/TerminalDemo.tsx` uses `src/terminal/terminalNetwork.ts`: a client, a laptop that asks
  DHCP, a DHCP server, a router, a DNS server and the web server `www`.
- `demo/terminal/TerminalPanel.tsx` draws the terminal with xterm.js (`@xterm/xterm` 6.0.0 and
  `@xterm/addon-fit` 0.11.0, pinned devDependencies). It imports them the first time the panel shows.
- The panel supports line editing, history (↑/↓), Ctrl+C and Tab completion (commands, then device
  and DNS names).
- Each command and its output also go to an `aria-live` transcript (`terminal-transcript`).
- On a phone, an input line under the terminal takes the typing, where the soft keyboard and the
  IME work.
- `size-gate-check` fails if any library entry reaches xterm.js (TC-1715).
