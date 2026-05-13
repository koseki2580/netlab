# QUIC

Netlab models an educational QUIC subset for HTTP/3 teaching.

## Wire Pieces

- QUIC varints in `QuicVarint.ts`.
- CRYPTO, STREAM, ACK, PATH_CHALLENGE, and PATH_RESPONSE frame helpers in `QuicFrame.ts`.
- AES-GCM payload protection through `CryptoProvider` in `QuicPacketProtection.ts`.
- A compact handshake model in `QuicHandshake.ts` that emits Initial, Handshake, and 1-RTT annotations.

## Key Schedule

The initial salt follows RFC 9001 v1. `deriveQuicKeys()` uses HKDF labels `client in`, `server in`, `quic key`, and `quic iv` through the configured `CryptoProvider`. Header protection is skipped so learners can read packet numbers directly.

## Streams And Migration

`QuicStream.ts` decodes stream initiator/direction bits and reassembles chunks by offset. `QuicPathValidation.ts` models path change as PATH_CHALLENGE followed by PATH_RESPONSE.

## Out Of Scope

0-RTT, Retry, Version Negotiation, connection-ID rotation, header protection, advanced loss recovery, and QUIC congestion control. Congestion-control teaching remains in the plan/53 TCP congestion model.
