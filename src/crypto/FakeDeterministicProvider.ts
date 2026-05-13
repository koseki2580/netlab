import { NetlabError } from '../errors';
import type { CryptoCurve, CryptoHash, CryptoProvider } from './CryptoProvider';

const ENCRYPTED_PREFIX = '[ENCRYPTED:';
const ENCRYPTED_SUFFIX = ']';
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toU32(value: number): number {
  return value >>> 0;
}

function splitmix32(seed: number): () => number {
  let state = toU32(seed);
  return () => {
    state = toU32(state + 0x9e3779b9);
    let z = state;
    z = toU32((z ^ (z >>> 16)) * 0x85ebca6b);
    z = toU32((z ^ (z >>> 13)) * 0xc2b2ae35);
    return toU32(z ^ (z >>> 16));
  };
}

function repeatTo(bytes: Uint8Array, len: number): Uint8Array {
  const out = new Uint8Array(len);
  for (let index = 0; index < len; index += 1) {
    out[index] = bytes[index % Math.max(bytes.length, 1)] ?? 0;
  }
  return out;
}

function xorTo(a: Uint8Array, b: Uint8Array, len: number): Uint8Array {
  const out = new Uint8Array(len);
  for (let index = 0; index < len; index += 1) {
    out[index] = (a[index % Math.max(a.length, 1)] ?? 0) ^ (b[index % Math.max(b.length, 1)] ?? 0);
  }
  return out;
}

function hashStub(bytes: Uint8Array, len = 32): Uint8Array {
  const out = new Uint8Array(len);
  for (let index = 0; index < bytes.length; index += 1) {
    const target = index % len;
    out[target] = ((out[target] ?? 0) + (bytes[index] ?? 0) + index) & 0xff;
  }
  return out;
}

function hex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function unhex(value: string): Uint8Array {
  const out = new Uint8Array(value.length / 2);
  for (let index = 0; index < out.length; index += 1) {
    out[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return out;
}

function tagFor(key: Uint8Array, aad: Uint8Array): Uint8Array {
  return xorTo(key, aad.length > 0 ? aad : new Uint8Array([0]), 16);
}

export function buildHkdfLabel(label: string, ctx: Uint8Array, len: number): Uint8Array {
  const labelBytes = encoder.encode(`tls13 ${label}`);
  const out = new Uint8Array(2 + 1 + labelBytes.length + 1 + ctx.length);
  out[0] = (len >> 8) & 0xff;
  out[1] = len & 0xff;
  out[2] = labelBytes.length;
  out.set(labelBytes, 3);
  out[3 + labelBytes.length] = ctx.length;
  out.set(ctx, 4 + labelBytes.length);
  return out;
}

export class FakeDeterministicProvider implements CryptoProvider {
  readonly id = 'fake-deterministic' as const;
  private keySeed = 0;

  async generateKeyPair(curve: CryptoCurve): Promise<{ pub: Uint8Array; priv: Uint8Array }> {
    if (curve !== 'X25519') {
      throw new NetlabError({
        code: 'crypto/unsupported-operation',
        message: `Unsupported curve ${curve}`,
      });
    }
    const priv = this.randomBytes(32, this.keySeed);
    this.keySeed += 1;
    return { priv, pub: Uint8Array.from([...priv].reverse()) };
  }

  async deriveSharedSecret(ourPriv: Uint8Array, theirPub: Uint8Array): Promise<Uint8Array> {
    const theirPrivShape = Uint8Array.from([...theirPub].reverse());
    const ordered = [hex(ourPriv), hex(theirPrivShape)].sort().join('');
    return hashStub(encoder.encode(ordered), 32);
  }

  async hkdfExtract(salt: Uint8Array, ikm: Uint8Array, _hash: CryptoHash): Promise<Uint8Array> {
    return xorTo(salt.length > 0 ? salt : new Uint8Array([0]), ikm, 32);
  }

  async hkdfExpandLabel(
    secret: Uint8Array,
    label: string,
    ctx: Uint8Array,
    len: number,
  ): Promise<Uint8Array> {
    return xorTo(repeatTo(secret, len), buildHkdfLabel(label, ctx, len), len);
  }

  async aeadEncrypt(
    key: Uint8Array,
    _nonce: Uint8Array,
    plaintext: Uint8Array,
    aad: Uint8Array,
  ): Promise<Uint8Array> {
    const body = encoder.encode(`${ENCRYPTED_PREFIX}${hex(plaintext)}${ENCRYPTED_SUFFIX}`);
    const tag = tagFor(key, aad);
    const out = new Uint8Array(body.length + tag.length);
    out.set(body, 0);
    out.set(tag, body.length);
    return out;
  }

  async aeadDecrypt(
    key: Uint8Array,
    _nonce: Uint8Array,
    ciphertext: Uint8Array,
    aad: Uint8Array,
  ): Promise<Uint8Array> {
    const body = ciphertext.slice(0, -16);
    const tag = ciphertext.slice(-16);
    const expected = tagFor(key, aad);
    if (hex(tag) !== hex(expected)) {
      throw new NetlabError({
        code: 'crypto/bad-tag',
        message: 'TLS placeholder AEAD tag mismatch',
      });
    }
    const text = decoder.decode(body);
    if (!text.startsWith(ENCRYPTED_PREFIX) || !text.endsWith(ENCRYPTED_SUFFIX)) {
      throw new NetlabError({
        code: 'crypto/bad-tag',
        message: 'TLS placeholder ciphertext malformed',
      });
    }
    return unhex(text.slice(ENCRYPTED_PREFIX.length, -ENCRYPTED_SUFFIX.length));
  }

  randomBytes(n: number, seed = 0): Uint8Array {
    const next = splitmix32(seed);
    const out = new Uint8Array(n);
    for (let index = 0; index < n; index += 1) {
      out[index] = next() & 0xff;
    }
    return out;
  }

  async hmac(key: Uint8Array, data: Uint8Array, _hash: CryptoHash): Promise<Uint8Array> {
    const bytes = new Uint8Array(key.length + data.length);
    bytes.set(key, 0);
    bytes.set(data, key.length);
    return hashStub(bytes, 32);
  }

  async pbkdf2(
    passphrase: string,
    salt: Uint8Array,
    iter: number,
    len: number,
    _hash: CryptoHash,
  ): Promise<Uint8Array> {
    let block: Uint8Array<ArrayBufferLike> = encoder.encode(passphrase);
    for (let round = 0; round < Math.max(1, iter); round += 1) {
      const bytes = new Uint8Array(block.length + salt.length + 4);
      bytes.set(block, 0);
      bytes.set(salt, block.length);
      bytes[bytes.length - 1] = round & 0xff;
      block = hashStub(bytes, 32);
    }
    return repeatTo(block, len);
  }

  async signEd25519(privKey: Uint8Array, msg: Uint8Array): Promise<Uint8Array> {
    return xorTo(privKey, hashStub(msg, 32), 32);
  }

  async verifyEd25519(pubKey: Uint8Array, sig: Uint8Array, msg: Uint8Array): Promise<boolean> {
    const privShape = Uint8Array.from([...pubKey].reverse());
    return hex(await this.signEd25519(privShape, msg)) === hex(sig);
  }
}
