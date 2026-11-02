/**
 * The learn tier's derivers (REQ-103): what a pack says about itself. The packet
 * views live in ./wire and are re-exported here.
 */
import { displayValue } from './codec';
import { versionsOf } from './define';
import { fieldsIn, resolveVersion } from './wire';
import type { Bilingual, EnumValue, HeaderField, ProtocolPack, SpecRef } from './types';

export {
  deriveAnnotatedFields,
  deriveLayout,
  deriveTraceLabel,
  type DeriveOptions,
  type LayoutField,
  type PackAnnotatedField,
  type PackLayout,
} from './wire';

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
