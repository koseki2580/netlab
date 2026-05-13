export interface QuicPathChallenge {
  readonly oldPort: number;
  readonly newPort: number;
  readonly data: Uint8Array;
  readonly validated: boolean;
}

function byteAt(seed: number, index: number): number {
  return (seed * 1103515245 + index * 12345) & 0xff;
}

export function startPathValidation(input: {
  readonly seed: number;
  readonly oldPort: number;
  readonly newPort: number;
}): QuicPathChallenge {
  return {
    oldPort: input.oldPort,
    newPort: input.newPort,
    data: Uint8Array.from({ length: 8 }, (_, index) => byteAt(input.seed, index)),
    validated: false,
  };
}

export function respondToPathChallenge(challenge: QuicPathChallenge): QuicPathChallenge {
  return { ...challenge, data: challenge.data.slice(), validated: true };
}
