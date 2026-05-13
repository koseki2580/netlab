import { NetlabError } from '../errors';
import type { CapabilitySet, CryptoCurve, CryptoHash, CryptoProvider } from './CryptoProvider';
import { buildHkdfLabel } from './FakeDeterministicProvider';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const DEFAULT_CAPABILITIES: CapabilitySet = {
  ecdh: 'p-256',
  signing: 'ecdsa-p-256',
  hmacHashForWpa2: 'sha-1',
};

interface PrivateKeyBundle {
  readonly v: 1;
  readonly ecdh: CapabilitySet['ecdh'];
  readonly ecdhPriv: string;
  readonly signing: CapabilitySet['signing'];
  readonly signPriv: string;
}

interface SigningPublicKey {
  readonly signing: CapabilitySet['signing'];
  readonly pub: Uint8Array;
}

function hex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text);
}

function fromBase64(value: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(value, 'base64'));
  }
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function fromArrayBuffer(buffer: ArrayBuffer): Uint8Array {
  return new Uint8Array(buffer);
}

function cryptoBytes(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  return new Uint8Array(bytes);
}

function requireSubtle(subtle: SubtleCrypto | undefined): SubtleCrypto {
  if (!subtle) {
    throw new NetlabError({
      code: 'crypto/unsupported-operation',
      message: 'WebCryptoProvider requires crypto.subtle',
    });
  }
  return subtle;
}

function parsePrivateBundle(privKey: Uint8Array): PrivateKeyBundle {
  const parsed = JSON.parse(decoder.decode(privKey)) as PrivateKeyBundle;
  if (parsed.v !== 1) {
    throw new NetlabError({
      code: 'crypto/unsupported-operation',
      message: 'Unsupported WebCrypto key bundle',
    });
  }
  return parsed;
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function ecdhAlgorithm(ecdh: CapabilitySet['ecdh']): EcKeyAlgorithm | AlgorithmIdentifier {
  return ecdh === 'x25519'
    ? ({ name: 'X25519' } as AlgorithmIdentifier)
    : { name: 'ECDH', namedCurve: 'P-256' };
}

function signingAlgorithm(signing: CapabilitySet['signing']): EcKeyAlgorithm | AlgorithmIdentifier {
  return signing === 'ed25519'
    ? ({ name: 'Ed25519' } as AlgorithmIdentifier)
    : { name: 'ECDSA', namedCurve: 'P-256' };
}

function signVerifyAlgorithm(signing: CapabilitySet['signing']): AlgorithmIdentifier | EcdsaParams {
  return signing === 'ed25519'
    ? ({ name: 'Ed25519' } as AlgorithmIdentifier)
    : { name: 'ECDSA', hash: 'SHA-256' };
}

export function aeadNonce(derivedIv: Uint8Array, packetNumber: bigint): Uint8Array {
  const out = derivedIv.slice();
  let value = packetNumber;
  for (let index = 0; index < Math.min(8, out.length); index += 1) {
    out[out.length - 1 - index] = (out[out.length - 1 - index] ?? 0) ^ Number(value & 0xffn);
    value >>= 8n;
  }
  return out;
}

export class WebCryptoProvider implements CryptoProvider {
  readonly id = 'webcrypto' as const;
  readonly capabilities: CapabilitySet;
  private readonly subtle: SubtleCrypto;
  private readonly signingPublicByEcdhPublic = new Map<string, SigningPublicKey>();

  constructor(
    options: { readonly capabilities?: CapabilitySet; readonly subtle?: SubtleCrypto } = {},
  ) {
    this.subtle = requireSubtle(options.subtle ?? globalThis.crypto?.subtle);
    this.capabilities = options.capabilities ?? DEFAULT_CAPABILITIES;
  }

  async generateKeyPair(curve: CryptoCurve): Promise<{ pub: Uint8Array; priv: Uint8Array }> {
    if (curve !== 'X25519') {
      throw new NetlabError({
        code: 'crypto/unsupported-operation',
        message: `Unsupported curve ${curve}`,
      });
    }

    const ecdhPair = (await this.subtle.generateKey(ecdhAlgorithm(this.capabilities.ecdh), true, [
      'deriveBits',
    ])) as CryptoKeyPair;
    const signPair = (await this.subtle.generateKey(
      signingAlgorithm(this.capabilities.signing),
      true,
      ['sign', 'verify'],
    )) as CryptoKeyPair;

    const ecdhPub = fromArrayBuffer(await this.subtle.exportKey('raw', ecdhPair.publicKey));
    const signPub =
      this.capabilities.signing === 'ed25519'
        ? fromArrayBuffer(await this.subtle.exportKey('raw', signPair.publicKey))
        : fromArrayBuffer(await this.subtle.exportKey('spki', signPair.publicKey));
    const bundle: PrivateKeyBundle = {
      v: 1,
      ecdh: this.capabilities.ecdh,
      ecdhPriv: toBase64(
        fromArrayBuffer(await this.subtle.exportKey('pkcs8', ecdhPair.privateKey)),
      ),
      signing: this.capabilities.signing,
      signPriv: toBase64(
        fromArrayBuffer(await this.subtle.exportKey('pkcs8', signPair.privateKey)),
      ),
    };
    this.signingPublicByEcdhPublic.set(hex(ecdhPub), {
      signing: this.capabilities.signing,
      pub: signPub,
    });
    return { pub: ecdhPub, priv: encoder.encode(JSON.stringify(bundle)) };
  }

  async deriveSharedSecret(ourPriv: Uint8Array, theirPub: Uint8Array): Promise<Uint8Array> {
    const bundle = parsePrivateBundle(ourPriv);
    const privateKey = await this.subtle.importKey(
      'pkcs8',
      cryptoBytes(fromBase64(bundle.ecdhPriv)),
      ecdhAlgorithm(bundle.ecdh),
      false,
      ['deriveBits'],
    );
    const publicKey = await this.subtle.importKey(
      'raw',
      cryptoBytes(theirPub),
      ecdhAlgorithm(bundle.ecdh),
      false,
      [],
    );
    return fromArrayBuffer(
      await this.subtle.deriveBits(
        { name: bundle.ecdh === 'x25519' ? 'X25519' : 'ECDH', public: publicKey },
        privateKey,
        256,
      ),
    );
  }

  async hkdfExtract(salt: Uint8Array, ikm: Uint8Array, hash: CryptoHash): Promise<Uint8Array> {
    const key = salt.length > 0 ? salt : new Uint8Array(hash === 'SHA-1' ? 20 : 32);
    return this.hmac(key, ikm, hash);
  }

  async hkdfExpandLabel(
    secret: Uint8Array,
    label: string,
    ctx: Uint8Array,
    len: number,
  ): Promise<Uint8Array> {
    const info = buildHkdfLabel(label, ctx, len);
    const blocks: Uint8Array[] = [];
    let previous: Uint8Array<ArrayBufferLike> = new Uint8Array();
    let remaining = len;
    for (let counter = 1; remaining > 0; counter += 1) {
      previous = await this.hmac(
        secret,
        concat([previous, info, new Uint8Array([counter])]),
        'SHA-256',
      );
      blocks.push(previous);
      remaining -= previous.length;
    }
    return concat(blocks).slice(0, len);
  }

  async aeadEncrypt(
    key: Uint8Array,
    nonce: Uint8Array,
    plaintext: Uint8Array,
    aad: Uint8Array,
  ): Promise<Uint8Array> {
    const cryptoKey = await this.subtle.importKey(
      'raw',
      cryptoBytes(key),
      { name: 'AES-GCM' },
      false,
      ['encrypt'],
    );
    return fromArrayBuffer(
      await this.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: cryptoBytes(nonce),
          additionalData: cryptoBytes(aad),
          tagLength: 128,
        },
        cryptoKey,
        cryptoBytes(plaintext),
      ),
    );
  }

  async aeadDecrypt(
    key: Uint8Array,
    nonce: Uint8Array,
    ciphertext: Uint8Array,
    aad: Uint8Array,
  ): Promise<Uint8Array> {
    try {
      const cryptoKey = await this.subtle.importKey(
        'raw',
        cryptoBytes(key),
        { name: 'AES-GCM' },
        false,
        ['decrypt'],
      );
      return fromArrayBuffer(
        await this.subtle.decrypt(
          {
            name: 'AES-GCM',
            iv: cryptoBytes(nonce),
            additionalData: cryptoBytes(aad),
            tagLength: 128,
          },
          cryptoKey,
          cryptoBytes(ciphertext),
        ),
      );
    } catch (error) {
      throw new NetlabError({
        code: 'crypto/bad-tag',
        message: 'WebCrypto AES-GCM authentication failed',
        cause: error,
      });
    }
  }

  randomBytes(n: number): Uint8Array {
    const out = new Uint8Array(n);
    for (let offset = 0; offset < out.length; offset += 65536) {
      globalThis.crypto.getRandomValues(out.subarray(offset, Math.min(offset + 65536, out.length)));
    }
    return out;
  }

  async hmac(key: Uint8Array, data: Uint8Array, hash: CryptoHash): Promise<Uint8Array> {
    const cryptoKey = await this.subtle.importKey(
      'raw',
      cryptoBytes(key),
      { name: 'HMAC', hash },
      false,
      ['sign'],
    );
    return fromArrayBuffer(await this.subtle.sign('HMAC', cryptoKey, cryptoBytes(data)));
  }

  async pbkdf2(
    passphrase: string,
    salt: Uint8Array,
    iter: number,
    len: number,
    hash: CryptoHash,
  ): Promise<Uint8Array> {
    const passKey = await this.subtle.importKey(
      'raw',
      cryptoBytes(encoder.encode(passphrase)),
      'PBKDF2',
      false,
      ['deriveBits'],
    );
    return fromArrayBuffer(
      await this.subtle.deriveBits(
        { name: 'PBKDF2', salt: cryptoBytes(salt), iterations: iter, hash },
        passKey,
        len * 8,
      ),
    );
  }

  async signEd25519(privKey: Uint8Array, msg: Uint8Array): Promise<Uint8Array> {
    const bundle = parsePrivateBundle(privKey);
    const key = await this.subtle.importKey(
      'pkcs8',
      cryptoBytes(fromBase64(bundle.signPriv)),
      signingAlgorithm(bundle.signing),
      false,
      ['sign'],
    );
    return fromArrayBuffer(
      await this.subtle.sign(signVerifyAlgorithm(bundle.signing), key, cryptoBytes(msg)),
    );
  }

  async verifyEd25519(pubKey: Uint8Array, sig: Uint8Array, msg: Uint8Array): Promise<boolean> {
    const signing = this.signingPublicByEcdhPublic.get(hex(pubKey));
    if (!signing) return false;
    const key = await this.subtle.importKey(
      signing.signing === 'ed25519' ? 'raw' : 'spki',
      cryptoBytes(signing.pub),
      signingAlgorithm(signing.signing),
      false,
      ['verify'],
    );
    return this.subtle.verify(
      signVerifyAlgorithm(signing.signing),
      key,
      cryptoBytes(sig),
      cryptoBytes(msg),
    );
  }
}
