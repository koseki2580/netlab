# TCP Congestion Control

Netlab models TCP congestion control as an educational sender-side state machine
that starts after the three-way handshake reaches `ESTABLISHED`.

The model covers:

- slow start with initial window `IW = 1 * MSS`;
- congestion avoidance with additive increase;
- fast retransmit after the third duplicate ACK;
- NewReno-style fast recovery;
- simplified RTO fallback with RTO clamped to 1000-60000 ms.

This intentionally uses `IW = 1` instead of RFC 6928's larger initial window so
learners can see slow start expand over multiple ACK rounds.

Loss is deterministic. Tests and demos use `TcpLossInjector` implementations
rather than random packet drops in the simulation runtime.

Congestion state is observable through `TcpCongestionEvent` values. Runtime
integrations should emit those events rather than mutating cwnd silently.

## State

`TcpCongestionState` stores byte-oriented values:

- `cwnd`: congestion window in bytes;
- `ssthresh`: slow-start threshold in bytes, floored at `2 * MSS` after loss;
- `mss`: segment size in bytes;
- `inflight`: unacknowledged bytes;
- `dupAckCount`: duplicate ACK count for the current ACK number;
- `rttSmoothedMs`, `rttVarMs`, `rtoMs`: RFC 6298-style RTT estimate with RTO
  clamped to 1000-60000 ms.

The effective send allowance is `min(cwnd - inflight, rwnd)`.

## Event Order

Every congestion mutation emits a `TcpCongestionEvent`. If a single ACK changes
both phase and cwnd, the phase event is emitted before the cwnd event. This keeps
timeline renderers from showing a window update under the previous phase.

## Deterministic Loss

`NullLossInjector` is the default and never drops segments.
`DeterministicLossInjector` drops configured sequence numbers per connection.
By default it drops retransmissions of the same sequence number again; `oneShot`
mode consumes a configured drop after the first match for demos that need a clean
recovery path.

The gallery demo at `/simulation/tcp-congestion` uses one-shot deterministic
drops at sequence numbers 3001 and 9001. The first loss produces duplicate ACKs
and fast retransmit; the second has no recovery ACKs and falls back to RTO.

## UI

`TcpCongestionPanel` renders the event stream as an inline SVG timeline. The
chart exposes an accessible title and `aria-label`, displays the latest phase,
`cwnd`, and approximated `inflight` bytes, and lists phase/loss markers in text
so the demo remains inspectable without relying on exact pixel positions.

## Retransmit Queue

`TcpRetransmitQueue` tracks unacknowledged segments by sequence number. ACKs are
cumulative and must land on segment boundaries. A partial ACK inside a queued
segment is rejected with `tcp/partial-segment-ack` so callers do not silently
mis-account bytes.

## RTT Estimation

`TcpRttEstimator` follows the RFC 6298 SRTT/RTTVAR update constants. Karn's
algorithm is represented as a caller contract: pass `isRetransmit = true` to
ignore retransmitted-segment samples.
