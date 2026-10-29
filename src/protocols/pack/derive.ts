/**
 * Derivers (REQ-102, REQ-103, REQ-105): every view comes from one walk of the
 * pack's schema over a header object, so bytes and field rows cannot disagree.
 */
import type { AnnotatedField } from '../../utils/packetSerializer';
import { displayValue, encodeValue } from './codec';
import { fieldsIn, versionsOf } from './define';
import { descriptorError, valueError } from './errors';
import type {
  Bilingual,
  EnumValue,
  FieldValue,
  HeaderField,
  HeaderValues,
  ProtocolPack,
  SpecRef,
} from './types';

export interface DeriveOptions {
  /** A version id of the pack; the pack's default version when absent. */
  readonly version?: string;
  /** Byte offset of the pack's first byte within the whole frame. */
  readonly baseOffset?: number;
}

export interface LayoutField {
  readonly key: string;
  /** `key` in the header, `<section>[<i>].<key>` in a section. */
  readonly path: string;
  readonly name: string;
  readonly bitOffset: number;
  readonly bitLength: number;
  readonly byteOffset: number;
  readonly byteLength: number;
  readonly value: FieldValue;
}

export interface PackLayout {
  readonly bytes: number[];
  readonly fields: readonly LayoutField[];
}

/** A hex/field-view row: today's `AnnotatedField` plus what the pack knows. */
export type PackAnnotatedField = AnnotatedField & LayoutField & { readonly meaning: Bilingual };

export interface GlossaryEntry {
  /** `<pack>` for the protocol, `<pack>.<key>` or `<pack>.<section>.<key>` for a field. */
  readonly id: string;
  readonly protocolId: string;
  readonly term: string;
  readonly meaning: Bilingual;
  readonly example?: string;
  readonly versions: readonly string[];
  readonly specs: readonly SpecRef[];
  readonly values?: readonly EnumValue[];
}

interface WalkEntry extends LayoutField {
  readonly field: HeaderField;
  readonly siblings: HeaderValues;
}

function resolveVersion(pack: ProtocolPack, version: string | undefined): string {
  const id = version ?? pack.defaultVersion;
  if (!pack.versions.some((v) => v.id === id)) {
    throw descriptorError(
      'pack/unknown-version',
      `Pack "${pack.id}" has no version "${id}"`,
      'version',
    );
  }
  return id;
}

function walk(
  pack: ProtocolPack,
  header: HeaderValues,
  options: DeriveOptions,
): { bytes: number[]; entries: WalkEntry[] } {
  const version = resolveVersion(pack, options.version);
  const base = options.baseOffset ?? 0;
  const bytes: number[] = [];
  const entries: WalkEntry[] = [];
  let bit = 0;

  const writeBit = (one: boolean) => {
    if (bit % 8 === 0) bytes.push(0);
    if (one) bytes[bytes.length - 1]! |= 0x80 >> (bit % 8);
    bit += 1;
  };

  const writeList = (fields: readonly HeaderField[], values: HeaderValues, prefix: string) => {
    for (const field of fieldsIn(fields, version)) {
      const path = `${prefix}${field.key}`;
      if (field.presentIf !== undefined && Number(values[field.presentIf] ?? 0) !== 1) continue;
      const given = values[field.key] as FieldValue | undefined;
      if (given === undefined && field.type !== 'reserved') {
        throw valueError('pack/missing-value', `No value for ${field.name}`, path);
      }
      const value = given ?? 0;
      const encoded = encodeValue(field, value);
      if (typeof encoded === 'string') throw valueError('pack/value-out-of-range', encoded, path);
      if (
        field.lengthFrom !== undefined &&
        'bytes' in encoded &&
        values[field.lengthFrom] !== encoded.bytes.length
      ) {
        throw valueError(
          'pack/length-mismatch',
          `${field.lengthFrom} says ${String(values[field.lengthFrom])} bytes; ${encoded.bytes.length} given`,
          path,
        );
      }
      const start = bit;
      if ('bytes' in encoded) {
        for (const byte of encoded.bytes)
          for (let i = 7; i >= 0; i -= 1) writeBit(((byte >> i) & 1) === 1);
      } else {
        for (let i = encoded.bits - 1; i >= 0; i -= 1)
          writeBit(Math.floor(encoded.number / 2 ** i) % 2 === 1);
      }
      const firstByte = Math.floor(start / 8);
      entries.push({
        key: field.key,
        path,
        name: field.name,
        bitOffset: base * 8 + start,
        bitLength: bit - start,
        byteOffset: base + firstByte,
        byteLength: Math.ceil(bit / 8) - firstByte,
        value,
        field,
        siblings: values,
      });
    }
  };

  writeList(pack.header, header, '');
  for (const section of pack.sections ?? []) {
    const list = (header[section.key] ?? []) as readonly HeaderValues[];
    if (header[section.countFrom] !== list.length) {
      throw valueError(
        'pack/count-mismatch',
        `${section.countFrom} says ${String(header[section.countFrom])}; ${list.length} ${section.name} entries given`,
        section.countFrom,
      );
    }
    list.forEach((entry, i) => writeList(section.fields, entry, `${section.key}[${i}].`));
  }
  return { bytes, entries };
}

const toLayoutField = ({ field: _f, siblings: _s, ...layout }: WalkEntry): LayoutField => layout;

/** The wire bytes and the position of every field on the wire. */
export function deriveLayout(
  pack: ProtocolPack,
  header: HeaderValues,
  options: DeriveOptions = {},
): PackLayout {
  const { bytes, entries } = walk(pack, header, options);
  return { bytes, fields: entries.map(toLayoutField) };
}

/** The hex/field-view rows, in today's `AnnotatedField` shape plus key, path, value and meaning. */
export function deriveAnnotatedFields(
  pack: ProtocolPack,
  header: HeaderValues,
  options: DeriveOptions = {},
): PackAnnotatedField[] {
  return walk(pack, header, options).entries.map((entry) => ({
    ...toLayoutField(entry),
    layer: pack.layer,
    displayValue: displayValue(entry.field, entry.value, entry.siblings),
    meaning: entry.field.meaning,
  }));
}

/** `GRE`, or `DNS QUERY` when the pack names a label field and a header is given. */
export function deriveTraceLabel(pack: ProtocolPack, header?: HeaderValues): string {
  const key = pack.label?.field;
  if (key === undefined || header === undefined) return pack.name.short;
  const value = Number(header[key]);
  const named = pack.header.find((f) => f.key === key)?.values?.find((v) => v.value === value);
  return named ? `${pack.name.short} ${named.name}` : pack.name.short;
}

export function deriveFilterToken(pack: ProtocolPack): string {
  return pack.id;
}

function lists(
  pack: ProtocolPack,
): { readonly prefix: string; readonly fields: readonly HeaderField[] }[] {
  return [
    { prefix: '', fields: pack.header },
    ...(pack.sections ?? []).map((s) => ({ prefix: `${s.key}.`, fields: s.fields })),
  ];
}

/** `<pack>.<key>` (`<pack>.<section>.<key>` in a section) for every non-reserved field of a version. */
export function derivePacketLabFieldIds(pack: ProtocolPack, version?: string): string[] {
  const id = resolveVersion(pack, version);
  return lists(pack).flatMap(({ prefix, fields }) =>
    fieldsIn(fields, id)
      .filter((f) => f.type !== 'reserved')
      .map((f) => `${pack.id}.${prefix}${f.key}`),
  );
}

/** The protocol, then one entry per field key (merged across versions). */
export function deriveGlossary(pack: ProtocolPack): GlossaryEntry[] {
  const all = pack.versions.map((v) => v.id);
  const specsFor = (versions: readonly string[]) => {
    const cited = new Set(
      pack.versions.filter((v) => versions.includes(v.id)).flatMap((v) => v.specs),
    );
    return pack.specs.filter((s) => cited.has(s.id));
  };
  const entries: GlossaryEntry[] = [
    {
      id: pack.id,
      protocolId: pack.id,
      term: pack.name.short,
      meaning: { en: pack.name.en, ja: pack.name.ja },
      versions: all,
      specs: pack.specs,
    },
  ];
  for (const { prefix, fields } of lists(pack)) {
    const keys = [...new Set(fields.map((f) => f.key))];
    for (const key of keys) {
      const same = fields.filter((f) => f.key === key);
      const versions = all.filter((v) => same.some((f) => versionsOf(f, all).includes(v)));
      const primary =
        same.find((f) => versionsOf(f, all).includes(pack.defaultVersion)) ?? same[0]!;
      entries.push({
        id: `${pack.id}.${prefix}${key}`,
        protocolId: pack.id,
        term: primary.name,
        meaning: primary.meaning,
        example: displayValue(primary, primary.example, {}),
        versions,
        specs: specsFor(versions),
        ...(primary.values ? { values: primary.values } : {}),
      });
    }
  }
  return entries;
}
