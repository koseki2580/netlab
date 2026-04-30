export const RESERVED_SNAPSHOT_PREFIX = '__';
export const DEFAULT_MAX_NAMED_SNAPSHOTS = 10;
export const SNAPSHOT_NAME_MAX_LENGTH = 80;

export interface NamedSnapshot {
  readonly id: string;
  readonly name: string;
  readonly editIndex: number;
  readonly sessionIdAtCapture: string;
  readonly createdAt: number;
}

export type SnapshotEdit =
  | {
      readonly kind: 'snapshot.create';
      readonly snapshot: NamedSnapshot;
      readonly internal?: boolean;
    }
  | {
      readonly kind: 'snapshot.rename';
      readonly id: string;
      readonly before: string;
      readonly after: string;
    }
  | {
      readonly kind: 'snapshot.delete';
      readonly id: string;
      readonly before: NamedSnapshot;
      readonly orphaned?: boolean;
    };

export function isReservedSnapshotName(name: string): boolean {
  return name.startsWith(RESERVED_SNAPSHOT_PREFIX);
}
