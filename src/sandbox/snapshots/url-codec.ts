import type { NamedSnapshot } from './types';

const PREFIX = 'sn';

export function encodeSnapshotUrlEntries(
  snapshots: readonly NamedSnapshot[],
  maxLength = 2048,
): readonly string[] {
  const entries = snapshots.map(
    (snapshot) => `${PREFIX}:${snapshot.editIndex}:${encodeURIComponent(snapshot.name)}`,
  );
  const payloadLength = entries.join(',').length;
  return payloadLength <= maxLength ? entries : [];
}

export function decodeSnapshotUrlEntries(entries: readonly string[]): readonly NamedSnapshot[] {
  return entries.flatMap((entry) => {
    const [prefix, rawIndex, rawName] = entry.split(':');
    const editIndex = Number(rawIndex);
    if (prefix !== PREFIX || !Number.isInteger(editIndex) || editIndex < 0 || !rawName) {
      return [];
    }

    const name = decodeURIComponent(rawName);
    return [
      {
        id: `url-snapshot-${editIndex}-${rawName}`,
        name,
        editIndex,
        sessionIdAtCapture: 'url-session',
        createdAt: -1,
      },
    ];
  });
}
