export type HeaderTuple = readonly [name: string, value: string];

export const HPACK_STATIC_TABLE: readonly HeaderTuple[] = [
  [':authority', ''],
  [':method', 'GET'],
  [':method', 'POST'],
  [':path', '/'],
  [':path', '/index.html'],
  [':scheme', 'http'],
  [':scheme', 'https'],
  [':status', '200'],
  [':status', '204'],
  [':status', '206'],
  [':status', '304'],
  [':status', '400'],
  [':status', '404'],
  [':status', '500'],
] as const;

export function hpackStaticIndex(header: HeaderTuple): number | undefined {
  const index = HPACK_STATIC_TABLE.findIndex(
    ([name, value]) => name === header[0] && value === header[1],
  );
  return index >= 0 ? index + 1 : undefined;
}

export function hpackStaticHeader(index: number): HeaderTuple | undefined {
  return HPACK_STATIC_TABLE[index - 1];
}
