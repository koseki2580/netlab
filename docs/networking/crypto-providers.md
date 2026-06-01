# Crypto Providers

Netlab protocol code calls cryptography through `CryptoProvider`. The default teaching path can use a deterministic provider for repeatable traces, while browsers with `crypto.subtle` can use `WebCryptoProvider` for real ECDH, HKDF, AES-GCM, HMAC, PBKDF2, and signing primitives.

## Providers

| Provider                    | Source                       | Use case                                                                                            |
| --------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------- |
| `FakeDeterministicProvider` | Netlab deterministic math    | Snapshot tests, replayable demos, URL-restored sandbox sessions, byte-exact assertions              |
| `WebCryptoProvider`         | Browser/Node `crypto.subtle` | Correctness checks, real TLS/WPA teaching runs, environments where real AEAD authentication matters |

`selectProvider()` returns `WebCryptoProvider` when `crypto.subtle` is available and falls back to `FakeDeterministicProvider` otherwise. `<NetlabProvider cryptoProvider="auto">` uses the same rule synchronously; pass `"fake-deterministic"`, `"webcrypto"`, or a custom `CryptoProvider` to force a provider.

## Capability Matrix

| Operation           | Preferred WebCrypto algorithm | Fallback                                           |
| ------------------- | ----------------------------- | -------------------------------------------------- |
| ECDH key exchange   | `X25519`                      | `ECDH` with `P-256`                                |
| Sign/verify         | `Ed25519`                     | `ECDSA` with `P-256` and `SHA-256`                 |
| HKDF extract/expand | `HMAC` with `SHA-256`         | none                                               |
| AEAD                | `AES-GCM` with 128-bit tags   | none                                               |
| WPA2 PBKDF2         | `PBKDF2` with `SHA-1`         | `SHA-256` only when selected by capability probing |

The synchronous provider used by React starts with conservative `P-256`/`ECDSA` capabilities because WebCrypto capability probing is asynchronous. Call `selectProvider()` when code needs the probed `X25519` or `Ed25519` path.

## Key Formats

Public ECDH key shares remain the TLS/WPA call-site boundary. `WebCryptoProvider` exports X25519/P-256 public keys as WebCrypto `raw` bytes. Private keys are provider-local bundles that contain an ECDH private key and a signing private key in `pkcs8` form. This keeps `CryptoProvider.generateKeyPair('X25519')` stable for existing TLS and WPA call sites while allowing WebCrypto to use separate ECDH and signature key material internally.

## Provider Selection

```ts
const { provider, info } = await selectProvider();
```

`info.capabilities` records the detected ECDH, signing, and WPA2 hash behavior. Forced fake selection is required when tests assert exact bytes or when sandbox replay must reproduce the same random values.

```tsx
<NetlabProvider topology={topology} cryptoProvider="fake-deterministic">
  {children}
</NetlabProvider>
```

## Teaching Deviations

TLS traces still use the teaching handshake structure. The cryptographic math is real when `WebCryptoProvider` is active, but the handshake remains a compact educational subset rather than a full TLS stack with certificates, transcript verification, or every extension from RFC 8446.

WPA2 four-way handshake demos derive PMK/PTK through the shared `CryptoProvider` surface. Real WPA2 PMK derivation uses PBKDF2-SHA1; deterministic demos continue to use the fake provider so their outputs stay replayable.

## Validation

- `src/crypto/WebCryptoProvider.test.ts` verifies ECDH agreement, HKDF output shape, AES-GCM tag rejection, HMAC/PBKDF2 output, signing, TLS orchestration, and WPA orchestration.
- `scripts/bench-tls.mjs --ci` runs 100 WebCrypto TLS handshakes and fails if median latency exceeds 50 ms or p95 exceeds 120 ms.
