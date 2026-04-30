import { describe, expect, it } from 'vitest';
import type { NamedSnapshot } from './types';
import { decodeSnapshotUrlEntries, encodeSnapshotUrlEntries } from './url-codec';

const snapshots: NamedSnapshot[] = [
  {
    id: 'snapshot-a',
    name: 'Before MTU',
    editIndex: 1,
    sessionIdAtCapture: 'default-session',
    createdAt: -1,
  },
  {
    id: 'snapshot-b',
    name: 'After MTU',
    editIndex: 3,
    sessionIdAtCapture: 'default-session',
    createdAt: 2,
  },
];

describe('snapshot url codec', () => {
  it('encodes compact snapshot entries for short names', () => {
    expect(encodeSnapshotUrlEntries(snapshots, 2048)).toEqual([
      'sn:1:Before%20MTU',
      'sn:3:After%20MTU',
    ]);
  });

  it('decodes compact entries into deterministic snapshot bookmarks', () => {
    expect(decodeSnapshotUrlEntries(['sn:1:Before%20MTU'])).toEqual([
      {
        id: 'url-snapshot-1-Before%20MTU',
        name: 'Before MTU',
        editIndex: 1,
        sessionIdAtCapture: 'url-session',
        createdAt: -1,
      },
    ]);
  });

  it('skips snapshot entries when the encoded payload exceeds the URL budget', () => {
    expect(encodeSnapshotUrlEntries(snapshots, 10)).toEqual([]);
  });

  it('ignores malformed entries while decoding', () => {
    expect(decodeSnapshotUrlEntries(['bad', 'sn:x:Name', 'sn:2:Good'])).toEqual([
      {
        id: 'url-snapshot-2-Good',
        name: 'Good',
        editIndex: 2,
        sessionIdAtCapture: 'url-session',
        createdAt: -1,
      },
    ]);
  });
});
