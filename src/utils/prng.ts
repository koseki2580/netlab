export function splitmix64(seed: bigint): () => number {
  let state = seed & 0xffffffffffffffffn;

  return () => {
    state = (state + 0x9e3779b97f4a7c15n) & 0xffffffffffffffffn;
    let z = state;
    z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & 0xffffffffffffffffn;
    z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & 0xffffffffffffffffn;
    z ^= z >> 31n;
    return Number(z & 0xffffffffffffn) / Number(0x1000000000000n);
  };
}

export function drawAt(seedNumber: number, seq: number): number {
  const seed = (BigInt(seedNumber) << 32n) ^ BigInt(seq);
  return splitmix64(seed)();
}
