export interface FailureState {
  readonly downNodeIds: ReadonlySet<string>;
  readonly downEdgeIds: ReadonlySet<string>;
}

export const EMPTY_FAILURE_STATE: FailureState = {
  downNodeIds: new Set<string>(),
  downEdgeIds: new Set<string>(),
};
