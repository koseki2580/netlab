/**
 * `defineProtocol`: validates a protocol-pack descriptor (REQ-100, REQ-101).
 * Every refusal is a NetlabError `protocol-pack/*` (REQ-310) with `context.reason`
 * and `context.path` (see ./errors.ts).
 */
import { encodeValue, fieldBits, isNumeric } from './codec';
import { descriptorError } from './errors';
import { fieldsIn } from './wire';
import type {
  Bilingual,
  HeaderField,
  HeaderSection,
  ProtocolDescriptor,
  ProtocolIdentity,
  ProtocolPack,
} from './types';

/** The protocol-pack API version this build implements (REQ-313). Descriptors state it as `apiVersion`. */
export const PROTOCOL_PACK_API_VERSION = 1;

export const SUPPORTED_PACK_API_VERSIONS: readonly number[] = [PROTOCOL_PACK_API_VERSION];

const ID_PATTERN = /^[a-z][a-z0-9-]{0,31}$/;
const KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;
const LAYERS = new Set(['L2', 'L3', 'L4', 'L7']);
const TRANSPORTS = new Set(['udp', 'tcp', 'sctp']);

function text(value: string | undefined, path: string): void {
  if (typeof value !== 'string' || value.trim() === '') {
    throw descriptorError('pack/missing-text', 'Text is empty', path);
  }
}

function bilingual(value: Bilingual | undefined, path: string): void {
  text(value?.en, `${path}.en`);
  text(value?.ja, `${path}.ja`);
}

function inRange(value: number | undefined, max: number, min: number, path: string): void {
  if (value !== undefined && (!Number.isInteger(value) || value < min || value > max)) {
    throw descriptorError('pack/value-out-of-range', `${value} is outside ${min}–${max}`, path);
  }
}

/** Checks the identity part of a pack or of a lazy registration. */
export function validateIdentity(identity: ProtocolIdentity): void {
  if (typeof identity.id !== 'string' || !ID_PATTERN.test(identity.id)) {
    throw descriptorError(
      'pack/invalid-id',
      `Pack id "${String(identity.id)}" must match ${ID_PATTERN}`,
      'id',
    );
  }
  text(identity.name?.short, 'name.short');
  bilingual(identity.name, 'name');
  if (!LAYERS.has(identity.layer)) {
    throw descriptorError(
      'pack/invalid-identity',
      `Layer "${identity.layer}" is not L2, L3, L4 or L7`,
      'layer',
    );
  }
  const numbers = identity.numbers ?? {};
  inRange(numbers.ipProtocol, 255, 0, 'numbers.ipProtocol');
  inRange(numbers.etherType, 0xffff, 0, 'numbers.etherType');
  for (const type of [...(numbers.icmpTypes?.v4 ?? []), ...(numbers.icmpTypes?.v6 ?? [])]) {
    inRange(type, 255, 0, 'numbers.icmpTypes');
  }
  for (const claim of numbers.ports ?? []) {
    if (!TRANSPORTS.has(claim.transport)) {
      throw descriptorError(
        'pack/invalid-identity',
        `Transport "${claim.transport}" is unknown`,
        'numbers.ports',
      );
    }
    inRange(claim.port, 65535, 1, 'numbers.ports');
  }
}

export function versionsOf(field: HeaderField, all: readonly string[]): readonly string[] {
  return field.in ?? all;
}

function validateVersions(d: ProtocolDescriptor): string {
  const specIds = new Set<string>();
  for (const spec of d.specs) {
    text(spec.id, 'specs');
    text(spec.title, `specs.${spec.id}.title`);
    inRange(spec.year, 9999, 1900, `specs.${spec.id}.year`);
    if (specIds.has(spec.id))
      throw descriptorError(
        'pack/duplicate-key',
        `Spec ${spec.id} is listed twice`,
        `specs.${spec.id}`,
      );
    specIds.add(spec.id);
  }
  const ids = d.versions.map((v) => v.id);
  const defaults = d.versions.filter((v) => v.default === true);
  if (ids.length === 0 || new Set(ids).size !== ids.length || defaults.length !== 1) {
    throw descriptorError(
      'pack/invalid-versions',
      'A pack needs at least one version, unique version ids and exactly one default version',
      'versions',
    );
  }
  for (const version of d.versions) {
    const path = `versions.${version.id}`;
    text(version.id, path);
    if (
      version.extends !== undefined &&
      (version.extends === version.id || !ids.includes(version.extends))
    ) {
      throw descriptorError(
        'pack/unknown-reference',
        `extends "${version.extends}", which is not another version`,
        path,
      );
    }
    const missing = version.specs.find((s) => !specIds.has(s));
    if (missing !== undefined) {
      throw descriptorError(
        'pack/unknown-reference',
        `cites "${missing}", which is not in specs`,
        path,
      );
    }
    if (version.whatsNew) bilingual(version.whatsNew, `${path}.whatsNew`);
  }
  return defaults[0]!.id;
}

function validateField(
  field: HeaderField,
  earlier: readonly HeaderField[],
  scope: string,
  versions: readonly string[],
): void {
  const path = `${scope}.${String(field.key)}`;
  if (typeof field.key !== 'string' || !KEY_PATTERN.test(field.key)) {
    throw descriptorError('pack/invalid-id', `Field key must match ${KEY_PATTERN}`, path);
  }
  text(field.name, `${path}.name`);
  bilingual(field.meaning, `${path}.meaning`);
  if (field.example === undefined)
    throw descriptorError('pack/missing-example', 'Every field needs an example', path);

  const unknown = (what: string) => descriptorError('pack/unknown-reference', what, path);
  const badVersion = field.in?.find((v) => !versions.includes(v));
  if (badVersion !== undefined || field.in?.length === 0)
    throw unknown(`in: "${String(badVersion)}" is not a version`);
  if (
    field.presentIf !== undefined &&
    !earlier.some((f) => f.key === field.presentIf && f.type === 'flag')
  ) {
    throw unknown(`presentIf "${field.presentIf}" is not an earlier flag`);
  }
  if (
    field.lengthFrom !== undefined &&
    !earlier.some((f) => f.key === field.lengthFrom && isNumeric(f))
  ) {
    throw unknown(`lengthFrom "${field.lengthFrom}" is not an earlier number field`);
  }

  const width = (message: string) => descriptorError('pack/invalid-width', message, path);
  if (isNumeric(field)) {
    const bits = fieldBits(field);
    if (field.type === 'flag' && field.bits !== undefined && field.bits !== 1)
      throw width('A flag is 1 bit');
    if (bits === undefined || !Number.isInteger(bits) || bits < 1 || bits > 32)
      throw width('Number fields are 1–32 bits');
  } else if (field.type === 'bytes') {
    const fixed = field.bits !== undefined;
    if (
      fixed === (field.lengthFrom !== undefined) ||
      (fixed && (field.bits! <= 0 || field.bits! % 8 !== 0))
    ) {
      throw width('A bytes field has either whole-byte bits or lengthFrom');
    }
  } else if (field.bits !== undefined && field.bits !== fieldBits(field)) {
    throw width(`A ${field.type} field has a fixed width`);
  }

  if (field.type === 'enum') {
    if (!field.values || field.values.length === 0) throw width('An enum needs values');
    for (const v of field.values) {
      text(v.name, `${path}.values`);
      if (v.meaning) bilingual(v.meaning, `${path}.values.${v.name}.meaning`);
      if (typeof encodeValue(field, v.value) === 'string') {
        throw descriptorError(
          'pack/value-out-of-range',
          `Enum value ${v.value} does not fit`,
          path,
        );
      }
    }
  }
  const encoded = encodeValue(field, field.example);
  if (typeof encoded === 'string')
    throw descriptorError('pack/value-out-of-range', `Example: ${encoded}`, path);
}

function validateList(
  fields: readonly HeaderField[],
  scope: string,
  versions: readonly string[],
): void {
  fields.forEach((field, index) => validateField(field, fields.slice(0, index), scope, versions));
  fields.forEach((field, index) => {
    const mine = versionsOf(field, versions);
    const clash = fields
      .slice(0, index)
      .find(
        (other) =>
          other.key === field.key && versionsOf(other, versions).some((v) => mine.includes(v)),
      );
    if (clash) {
      throw descriptorError(
        'pack/duplicate-key',
        `Key "${field.key}" is used twice in one version`,
        `${scope}.${field.key}`,
      );
    }
  });
  for (const version of versions) {
    let bit = 0;
    for (const field of fieldsIn(fields, version)) {
      const bits = fieldBits(field);
      if ((bits === undefined || field.presentIf !== undefined) && bit % 8 !== 0) {
        throw descriptorError(
          'pack/misaligned',
          `Starts ${bit % 8} bits into a byte in ${version}`,
          `${scope}.${field.key}`,
        );
      }
      if (field.presentIf !== undefined && (bits ?? 0) % 8 !== 0) {
        throw descriptorError(
          'pack/misaligned',
          'A conditional field is whole bytes',
          `${scope}.${field.key}`,
        );
      }
      bit += bits ?? 0;
    }
    if (bit % 8 !== 0) {
      throw descriptorError(
        'pack/misaligned',
        `Ends ${bit % 8} bits into a byte in ${version}`,
        scope,
      );
    }
  }
}

function validateSection(
  section: HeaderSection,
  d: ProtocolDescriptor,
  versions: readonly string[],
): void {
  const path = `sections.${String(section.key)}`;
  if (typeof section.key !== 'string' || !KEY_PATTERN.test(section.key)) {
    throw descriptorError('pack/invalid-id', `Section key must match ${KEY_PATTERN}`, path);
  }
  if (
    d.header.some((f) => f.key === section.key) ||
    d.sections!.filter((s) => s.key === section.key).length > 1
  ) {
    throw descriptorError(
      'pack/duplicate-key',
      `Section key "${section.key}" is already used`,
      path,
    );
  }
  text(section.name, `${path}.name`);
  bilingual(section.meaning, `${path}.meaning`);
  if (!d.header.some((f) => f.key === section.countFrom && isNumeric(f))) {
    throw descriptorError(
      'pack/unknown-reference',
      `countFrom "${section.countFrom}" is not a header number field`,
      path,
    );
  }
  validateList(section.fields, path, versions);
}

/** Validates a descriptor and returns it as a pack (REQ-100). */
export function defineProtocol(descriptor: ProtocolDescriptor): ProtocolPack {
  const d = descriptor;
  if (!SUPPORTED_PACK_API_VERSIONS.includes(d.apiVersion)) {
    throw descriptorError(
      'pack/unsupported-api-version',
      `apiVersion ${String(d.apiVersion)} is not supported; supported: ${SUPPORTED_PACK_API_VERSIONS.join(', ')}`,
      'apiVersion',
    );
  }
  validateIdentity(d);
  const defaultVersion = validateVersions(d);
  const versions = d.versions.map((v) => v.id);
  validateList(d.header, 'header', versions);
  for (const section of d.sections ?? []) validateSection(section, d, versions);
  if (
    d.label !== undefined &&
    !d.header.some((f) => f.key === d.label!.field && f.type === 'enum')
  ) {
    throw descriptorError(
      'pack/unknown-reference',
      `label field "${d.label.field}" is not a header enum`,
      'label',
    );
  }
  return Object.freeze({ ...d, defaultVersion });
}
