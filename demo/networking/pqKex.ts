/**
 * The post-quantum key-exchange lesson (REQ-383): the TLS 1.3 key-share
 * groups a browser can offer — X25519, ML-KEM-768 alone, and the hybrid
 * X25519MLKEM768 browsers send by default — with each share's size (FIPS 203,
 * RFC 7748), what that does to the ClientHello, and who could later recover
 * a recorded session's key.
 */
export type Group = 'x25519' | 'mlkem768' | 'x25519mlkem768';
export const GROUPS: readonly Group[] = ['x25519', 'mlkem768', 'x25519mlkem768'];

export const CODEPOINT: Record<Group, number> = {
  x25519: 0x001d,
  mlkem768: 0x0201,
  x25519mlkem768: 0x11ec,
};

/** Bytes the client sends (public key / encapsulation key) and the server returns (public key / ciphertext). */
export const SHARE: Record<Group, { readonly client: number; readonly server: number }> = {
  x25519: { client: 32, server: 32 },
  mlkem768: { client: 1184, server: 1088 },
  // The hybrid concatenates both: ML-KEM first, then X25519.
  x25519mlkem768: { client: 1184 + 32, server: 1088 + 32 },
};

/** A typical browser ClientHello apart from its key share (an approximation). */
export const CLIENT_HELLO_REST = 480;
/** A TCP segment's payload on a 1500-byte Ethernet path. */
export const MSS = 1460;

export function clientHelloBytes(group: Group): number {
  return CLIENT_HELLO_REST + SHARE[group].client;
}

export const segmentsFor = (bytes: number) => Math.ceil(bytes / MSS);

/**
 * What a recorded session must outlast: today's computers, a future quantum
 * computer, or a flaw found later in ML-KEM, which is far younger than X25519.
 */
export type Attacker = 'classical' | 'quantum' | 'mlkem-flaw';
export const ATTACKERS: readonly Attacker[] = ['classical', 'quantum', 'mlkem-flaw'];

/** Whether each component holds against an attacker (current understanding). */
const HOLDS: Record<'x25519' | 'mlkem768', Record<Attacker, boolean>> = {
  // Shor's algorithm solves the elliptic-curve problem on a large quantum computer.
  x25519: { classical: true, quantum: false, 'mlkem-flaw': true },
  // A lattice problem with no known efficient quantum attack.
  mlkem768: { classical: true, quantum: true, 'mlkem-flaw': false },
};

/**
 * Whether a recorded session's key stays secret. The hybrid derives its
 * secret from both shared secrets, so it falls only if both components do.
 */
export function staysSecret(group: Group, attacker: Attacker): boolean {
  if (group === 'x25519mlkem768') return HOLDS.x25519[attacker] || HOLDS.mlkem768[attacker];
  return HOLDS[group][attacker];
}
