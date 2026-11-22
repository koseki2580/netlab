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

## Learner-written server app (REQ-416)

`TerminalContext.apps` maps a server device id to a `ServerApp` (`handle(raw) → SandboxResult`); while one is
set, `curl` sends the HTTP/1.1 request through the engine, asks the app for the response and sends that back
with `sendTransfer`, which splits it into segments of 1400 bytes (or the path MTU − 40). `curl -v` prints
`* Response sent in N segments: …` from the transfer's chunk count. `-X`, `-H`, `-d` and `-i` are supported.

- Core: `src/terminal/serverApp/serverApp.ts` — `parseHttpRequest`, `serializeHttpResponse`, `runServerApp`
  (Express-like `app.get/post/put/delete`, `:param`, `req.query/params/headers/body`, `res.status/set/send/json`;
  404 for no route, 500 for a throwing handler, `console.log` captured). Route matching reuses
  `HttpServer` from `src/layers/l7-application/HttpServer.ts`.
- Sandbox: `appSandbox.ts` owns a dedicated module Worker (`sandbox.worker.ts`), created on Start and
  terminated on Stop or when a request exceeds 1000 ms. The worker shadows `fetch`, `XMLHttpRequest`,
  `WebSocket`, `EventSource`, `importScripts`, `indexedDB` and `caches` before running the code — defence in
  depth for the learner's own code, not a security boundary.
- Demo: `demo/tools/ServerAppCard.tsx` keeps the code in localStorage (`netlab-terminal-www-app`), never in the
  URL. Before the first Start, www serves its built-in pages; after Start, the app; after Stop, nothing.

### Hardening and `ss -l` (REQ-418, REQ-419)

- `ss -l` / `-lu` / `-a` list listening sockets derived from the context (site or running app on TCP; a device's
  `dnsServer` / `dhcpServer` role on UDP 53 / 67). Plain `ss` lists established connections only.
- Body cap `MAX_BODY_BYTES` (64 KiB) in `res.send/json` (500 + log) and again in curl (error 56; head over 16 KiB
  too). Log capped at 200 × 500 chars per request. CR/LF in header names/values → TypeError, status outside
  100–999 → RangeError, both as 500 + log.
- curl prints server-supplied lines through `visible()`, which shows C0/C1 controls like `cat -v`; xterm is given a
  `linkHandler` that opens nothing.
- The worker also shadows `Worker`, `SharedWorker`, `WebTransport`, `BroadcastChannel`, `navigator.storage`;
  `appSandbox` accepts only replies for pending ids with a valid shape and stops after 50 stray messages.
- The card keeps the code it was started with and shows a restart notice when the editor differs; the built-in www
  answers an unknown path with a hint to press Start.
