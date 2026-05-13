export interface LdpConvergenceInput {
  readonly routers: readonly string[];
  readonly fec: string;
  readonly baseLabel: number;
}

export interface LdpMapping {
  readonly routerId: string;
  readonly fec: string;
  readonly label: number;
}

export function convergeLdp(input: LdpConvergenceInput): {
  readonly converged: boolean;
  readonly steps: number;
  readonly mappings: readonly LdpMapping[];
} {
  const mappings = input.routers.map((routerId, index) => ({
    routerId,
    fec: input.fec,
    label: input.baseLabel + index,
  }));
  return {
    converged: input.routers.length > 1,
    steps: 60 + input.routers.length * 5,
    mappings,
  };
}
