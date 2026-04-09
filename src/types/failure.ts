export function makeInterfaceFailureId(nodeId: string, interfaceId: string): string {
  return `${nodeId}:${interfaceId}`;
}

export interface FailureState {
  readonly downNodeIds: ReadonlySet<string>;
  readonly downEdgeIds: ReadonlySet<string>;
  readonly downInterfaceIds: ReadonlySet<string>;
}

export const EMPTY_FAILURE_STATE: FailureState = {
  downNodeIds: new Set<string>(),
  downEdgeIds: new Set<string>(),
  downInterfaceIds: new Set<string>(),
};
