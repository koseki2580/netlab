export type CryptoProviderId = 'fake-deterministic' | 'webcrypto';
export type CryptoCurve = 'X25519';
export type CryptoHash = 'SHA-256' | 'SHA-1';

export interface CapabilitySet {
  readonly ecdh: 'x25519' | 'p-256';
  readonly signing: 'ed25519' | 'ecdsa-p-256';
  readonly hmacHashForWpa2: 'sha-1' | 'sha-256';
}

export interface ProviderInfo {
  readonly id: CryptoProviderId;
  readonly capabilities: CapabilitySet;
  readonly source: 'auto-detected' | 'forced';
}

export interface CryptoProvider {
  readonly id: CryptoProviderId;

  /** Generates a raw X25519 key pair. Plan/81k must keep this signature stable. */
  generateKeyPair(curve: CryptoCurve): Promise<{ pub: Uint8Array; priv: Uint8Array }>;

  /** Derives a 32-byte ECDH shared secret. */
  deriveSharedSecret(ourPriv: Uint8Array, theirPub: Uint8Array): Promise<Uint8Array>;

  /** RFC 5869 Extract shape; placeholder providers may use illustrative math. */
  hkdfExtract(salt: Uint8Array, ikm: Uint8Array, hash: CryptoHash): Promise<Uint8Array>;

  /** RFC 8446 HKDF-Expand-Label shape. */
  hkdfExpandLabel(
    secret: Uint8Array,
    label: string,
    ctx: Uint8Array,
    len: number,
  ): Promise<Uint8Array>;

  /** AES-128-GCM shape; output is ciphertext plus tag. */
  aeadEncrypt(
    key: Uint8Array,
    nonce: Uint8Array,
    plaintext: Uint8Array,
    aad: Uint8Array,
  ): Promise<Uint8Array>;

  /** AES-128-GCM shape; throws on tag mismatch. */
  aeadDecrypt(
    key: Uint8Array,
    nonce: Uint8Array,
    ciphertext: Uint8Array,
    aad: Uint8Array,
  ): Promise<Uint8Array>;

  /** Deterministic randomness boundary used by replayable teaching protocols. */
  randomBytes(n: number, seed?: number): Uint8Array;

  hmac(key: Uint8Array, data: Uint8Array, hash: CryptoHash): Promise<Uint8Array>;

  pbkdf2(
    passphrase: string,
    salt: Uint8Array,
    iter: number,
    len: number,
    hash: CryptoHash,
  ): Promise<Uint8Array>;

  /** Ed25519-shaped signing hook. */
  signEd25519(privKey: Uint8Array, msg: Uint8Array): Promise<Uint8Array>;

  /** Ed25519-shaped verification hook. */
  verifyEd25519(pubKey: Uint8Array, sig: Uint8Array, msg: Uint8Array): Promise<boolean>;
}
