# TCP Flow Control and Options

`src/layers/l4-transport/TcpFlowControl.ts` models the receive window and the
options of the handshake as plain data; `TcpOrchestrator.transfer` turns a plan
into segments on the simulator. The accepted behaviour is REQ-150 to REQ-157 in
`docs/user-guide/specifications/specification.md`.

## The model

- **Rounds.** Time is counted in rounds. A round stands for one round trip and
  also for a retransmission timeout, so the first zero-window probe comes one
  round after the window closed and the gap then doubles.
- **Sender.** Bytes in flight stay within min(cwnd, rwnd), with cwnd from
  `TcpCongestionControl`. It sends a full segment, or the last of the data, or
  half the largest window seen, or whatever fits when nothing is in flight
  (RFC 9293 §3.8.6.2.1, with the override timeout read as "nothing in flight").
- **Receiver.** Every segment is acknowledged. The application reads a set number
  of bytes a round. The window opens by at least min(buffer / 2, MSS)
  (RFC 9293 §3.8.6.2.2) and never shrinks; a window update is sent when it opens.
- **Zero window.** One-byte probes carry the next byte; the receiver answers with
  its window and does not take the byte (RFC 9293 §3.8.6.1).

## Options

| Option         | SYN    | SYN-ACK                | In use when     |
| -------------- | ------ | ---------------------- | --------------- |
| MSS            | always | always                 | each direction  |
| Window scale   | if set | only if the SYN had it | both offered it |
| SACK-permitted | if set | only if the SYN had it | both offered it |

The window field of a SYN or SYN-ACK is never scaled (RFC 7323 §2.2). A segment's
`options` are on the packet, and not yet in the bytes: `packetSerializer` and
`packetLayout` still write a data offset of 5.

## Limits

- `TcpOrchestrator.transfer` does not lose or retransmit anything: a segment that
  does not arrive ends the transfer. Selective acknowledgement is offered in the
  handshake and not performed.
- `transfer` is on `TcpOrchestrator`, not on the engine port. A lesson runs it
  through `engine.send`, as `demo/simulation/tcpFlowLesson.ts` does.
- `DataTransferController` has no ACKs and does not use any of this: connecting it
  would add segments to the data transfer lesson's traces.
