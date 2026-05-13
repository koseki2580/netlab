import type { HeaderTuple } from '../h2/HpackStaticTable';

export const QPACK_STATIC_TABLE: readonly HeaderTuple[] = [
  [':authority', ''],
  [':path', '/'],
  ['age', '0'],
  ['content-disposition', ''],
  ['content-length', '0'],
  ['cookie', ''],
  ['date', ''],
  ['etag', ''],
  ['if-modified-since', ''],
  ['if-none-match', ''],
  ['last-modified', ''],
  ['link', ''],
  ['location', ''],
  ['referer', ''],
  ['set-cookie', ''],
  [':method', 'CONNECT'],
  [':method', 'HEAD'],
  [':method', 'GET'],
  [':method', 'POST'],
] as const;

export function qpackStaticIndex(header: HeaderTuple): number | undefined {
  const index = QPACK_STATIC_TABLE.findIndex(
    ([name, value]) => name === header[0] && value === header[1],
  );
  return index >= 0 ? index : undefined;
}

export function qpackStaticHeader(index: number): HeaderTuple | undefined {
  return QPACK_STATIC_TABLE[index];
}
