import { descriptorError } from './errors';
import type {
  HeaderField,
  ProtocolDescriptor,
  ProtocolLearn,
  ProtocolWire,
  WireField,
} from './types';

/** Joins a wire tier and its learn tier into one descriptor (REQ-302). */
export function mergeLearn(wire: ProtocolWire, learn: ProtocolLearn): ProtocolDescriptor {
  const withText = (field: WireField): HeaderField => {
    const text = learn.fields[`${field.key}@${field.in?.[0]}`] ?? learn.fields[field.key];
    if (!text) throw descriptorError('pack/missing-text', 'Field has no text', field.key);
    const { values, ...rest } = text;
    return {
      ...field,
      ...rest,
      ...(field.values
        ? {
            values: field.values.map((v) => ({
              ...v,
              ...(values?.[v.value] ? { meaning: values[v.value]! } : {}),
            })),
          }
        : {}),
    };
  };
  const { defaultVersion: _derived, versions: _ids, sections: _sections, ...identity } = wire;
  return {
    ...identity,
    apiVersion: 1,
    specs: learn.specs,
    versions: learn.versions,
    header: wire.header.map(withText),
    ...(wire.sections
      ? {
          sections: wire.sections.map((section) => ({
            ...section,
            meaning: learn.sections?.[section.key] ?? { en: '', ja: '' },
            fields: section.fields.map(withText),
          })),
        }
      : {}),
  };
}
