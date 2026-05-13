import type { MplsLabel, MplsLabelStack } from '../../../types/tunneling';

export function serializeMplsStack(stack: MplsLabelStack): Uint8Array {
  const bytes = new Uint8Array(stack.length * 4);
  stack.forEach((entry, index) => {
    const value =
      ((entry.label & 0xfffff) << 12) |
      ((entry.tc & 0x7) << 9) |
      (entry.endOfStack ? 0x100 : 0) |
      (entry.ttl & 0xff);
    const offset = index * 4;
    bytes[offset] = (value >>> 24) & 0xff;
    bytes[offset + 1] = (value >>> 16) & 0xff;
    bytes[offset + 2] = (value >>> 8) & 0xff;
    bytes[offset + 3] = value & 0xff;
  });
  return bytes;
}

export function parseMplsStack(bytes: Uint8Array): MplsLabel[] {
  if (bytes.length % 4 !== 0) throw new RangeError('MPLS stack length must be a multiple of 4');
  const labels: MplsLabel[] = [];
  for (let offset = 0; offset < bytes.length; offset += 4) {
    const value =
      ((bytes[offset]! << 24) |
        (bytes[offset + 1]! << 16) |
        (bytes[offset + 2]! << 8) |
        bytes[offset + 3]!) >>>
      0;
    labels.push({
      label: (value >>> 12) & 0xfffff,
      tc: (value >>> 9) & 0x7,
      endOfStack: (value & 0x100) !== 0,
      ttl: value & 0xff,
    });
  }
  return labels;
}

export function pushMplsLabel(stack: MplsLabelStack, label: MplsLabel): MplsLabel[] {
  const rest = stack.map((entry) => ({ ...entry, endOfStack: false }));
  return [
    { ...label, endOfStack: rest.length === 0 },
    ...rest.map((entry, index) => ({ ...entry, endOfStack: index === rest.length - 1 })),
  ];
}

export function popMplsLabel(stack: MplsLabelStack): { popped: MplsLabel; stack: MplsLabel[] } {
  if (stack.length === 0) throw new RangeError('cannot pop empty MPLS stack');
  const [, ...rest] = stack;
  return {
    popped: stack[0]!,
    stack: rest.map((entry, index) => ({ ...entry, endOfStack: index === rest.length - 1 })),
  };
}

export function swapMplsLabel(stack: MplsLabelStack, nextLabel: number): MplsLabel[] {
  if (stack.length === 0) throw new RangeError('cannot swap empty MPLS stack');
  return [{ ...stack[0]!, label: nextLabel }, ...stack.slice(1)];
}
