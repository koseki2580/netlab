/**
 * Protocol pack descriptor types (trial — not exported from `netlab`).
 * Design: docs/core/protocol-packs.md. Requirements: REQ-100..REQ-106.
 */

/** Learner-facing text in both supported languages. */
export interface Bilingual {
  readonly en: string;
  readonly ja: string;
}

export type PackLayer = 'L2' | 'L3' | 'L4' | 'L7';
export type Transport = 'udp' | 'tcp' | 'sctp';

export type SpecStatus =
  | 'internet-standard'
  | 'proposed-standard'
  | 'draft-standard'
  | 'best-current-practice'
  | 'informational'
  | 'experimental'
  | 'historic'
  | 'ieee-standard';

export interface SpecRef {
  /** e.g. `RFC 2784`, `IEEE 802.1Q-2022`. */
  readonly id: string;
  readonly title: string;
  readonly year: number;
  readonly status: SpecStatus;
  readonly url?: string;
}

export interface ProtocolVersion {
  readonly id: string;
  /** Ids of the `specs` entries that define this version. */
  readonly specs: readonly string[];
  readonly extends?: string;
  readonly default?: boolean;
  readonly whatsNew?: Bilingual;
}

export interface PortClaim {
  readonly transport: Transport;
  readonly port: number;
}

export interface ProtocolNumbers {
  readonly ipProtocol?: number;
  readonly etherType?: number;
  readonly ports?: readonly PortClaim[];
  /**
   * ICMP (v4) or ICMPv6 (v6) message types the pack owns, without owning the IP
   * protocol: a Neighbour Discovery pack claims `{ v6: [135, 136] }` (REQ-311).
   */
  readonly icmpTypes?: { readonly v4?: readonly number[]; readonly v6?: readonly number[] };
}

export interface ProtocolPackName extends Bilingual {
  /** Short name used as the trace label, e.g. `GRE`. */
  readonly short: string;
}

/** The part of a pack the registry keeps eagerly (cheap, synchronous lookups). */
export interface ProtocolIdentity {
  readonly id: string;
  readonly name: ProtocolPackName;
  readonly layer: PackLayer;
  readonly numbers?: ProtocolNumbers;
}

export type FieldType =
  | 'uint'
  | 'flag'
  | 'enum'
  | 'reserved'
  | 'ipv4'
  | 'ipv6'
  | 'mac'
  | 'bytes'
  | 'domain-name';

export type FieldValue = number | boolean | string | readonly number[];

/** A parsed header: values keyed by field key; sections as arrays of entries. */
export type HeaderValues = Readonly<
  Record<string, FieldValue | readonly HeaderValues[] | undefined>
>;

export interface EnumValue {
  readonly value: number;
  readonly name: string;
  readonly meaning?: Bilingual;
}

/** What the wire needs of a field: everything but the learner's text. */
export interface WireField {
  readonly key: string;
  /** The name the RFC uses; shown as-is in both languages. */
  readonly name: string;
  readonly type: FieldType;
  /** Width for uint/enum/reserved and fixed bytes; implied for flag/ipv4/ipv6/mac. */
  readonly bits?: number;
  /** Variable `bytes`: key of an earlier field holding the length in bytes. */
  readonly lengthFrom?: string;
  /** Key of an earlier flag; the field is on the wire only when that flag is 1. */
  readonly presentIf?: string;
  readonly values?: readonly EnumValue[];
  readonly hex?: boolean;
  readonly format?: (value: FieldValue, siblings: HeaderValues) => string;
  /** Versions the field belongs to; all versions when absent. */
  readonly in?: readonly string[];
}

export interface HeaderField extends WireField {
  readonly meaning: Bilingual;
  readonly example: FieldValue;
}

export interface WireSection<Field extends WireField = WireField> {
  readonly key: string;
  readonly name: string;
  /** Key of a header field counting this section's entries. */
  readonly countFrom: string;
  readonly fields: readonly Field[];
}

export interface HeaderSection extends WireSection<HeaderField> {
  readonly meaning: Bilingual;
}

export type Loader<T> = () => Promise<T | { readonly default: T }>;

/** Engine seams — declared in W1, not called by the engine yet. */
export interface ProtocolBehaviour<Packet = unknown, Config = unknown, Context = unknown> {
  readonly encapsulation?: {
    readonly push: (inner: Packet, config: Config) => Packet;
    readonly pop: (outer: Packet) => { readonly inner: Packet };
  };
  readonly endpoint?: (request: Packet, ctx: Context) => readonly Packet[];
  readonly transit?: (packet: Packet, ctx: Context) => Packet | null;
  readonly service?: (ctx: Context) => Promise<readonly Packet[]>;
}

/** Content bundle — declared in W1, not loaded by the app yet. */
export interface ProtocolContent {
  readonly stage?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  readonly lesson?: Loader<unknown>;
  readonly deck?: Loader<unknown>;
  readonly exam?: Loader<unknown>;
  readonly exercises?: readonly Loader<unknown>[];
  readonly i18n?: {
    readonly en?: Loader<Readonly<Record<string, string>>>;
    readonly ja?: Loader<Readonly<Record<string, string>>>;
  };
}

/**
 * The eager tier of a pack (REQ-302): enough to write, read and label packets
 * synchronously, in the worker too. A full pack is also a valid wire tier.
 */
export interface ProtocolWire extends ProtocolIdentity {
  readonly defaultVersion: string;
  readonly versions: readonly { readonly id: string }[];
  readonly header: readonly WireField[];
  readonly sections?: readonly WireSection[];
  /** An enum header field whose value name follows the short name in the trace label. */
  readonly label?: { readonly field: string };
  readonly behaviour?: ProtocolBehaviour;
}

/** One field's text. Keyed by field key, or `key@version` where versions differ. */
export interface LearnField {
  readonly meaning: Bilingual;
  readonly example: FieldValue;
  /** Meanings of named enum values, by value. */
  readonly values?: Readonly<Record<number, Bilingual>>;
}

/** The lazy tier of a pack (REQ-302): loaded when a learner reads about the protocol. */
export interface ProtocolLearn {
  /** The size gate looks for this string to find a learn tier in an eager closure. */
  readonly tier: '__netlab_learn_tier__';
  readonly specs: readonly SpecRef[];
  readonly versions: readonly ProtocolVersion[];
  readonly fields: Readonly<Record<string, LearnField>>;
  readonly sections?: Readonly<Record<string, Bilingual>>;
}

export interface ProtocolDescriptor extends ProtocolIdentity {
  readonly apiVersion: 1;
  readonly specs: readonly SpecRef[];
  readonly versions: readonly ProtocolVersion[];
  readonly header: readonly HeaderField[];
  readonly sections?: readonly HeaderSection[];
  /** An enum header field whose value name follows the short name in the trace label. */
  readonly label?: { readonly field: string };
  readonly behaviour?: ProtocolBehaviour;
  readonly content?: ProtocolContent;
}

/** A descriptor that passed `defineProtocol`. */
export interface ProtocolPack extends ProtocolDescriptor {
  readonly defaultVersion: string;
}
