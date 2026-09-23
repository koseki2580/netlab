import type { NetlabNode } from '../../types/topology';

/** The name stem per device kind, matching the example topology's own names. */
const NAME_STEM: Readonly<Record<string, string>> = {
  router: 'R',
  switch: 'SW',
  client: 'Client',
  server: 'Server',
};

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Give a newly placed device a name a learner can read — `Client-2` — instead
 * of the internal id it was created with. The number continues from the
 * highest one already in use for that kind, so names never repeat. The id is
 * left untouched: edges, selection and routes are keyed by it.
 */
export function nameNewNode(node: NetlabNode, existing: readonly NetlabNode[]): NetlabNode {
  const stem = NAME_STEM[node.data.role] ?? node.data.role;
  const pattern = new RegExp(`^${escapeRegExp(stem)}-(\\d+)$`);
  let highest = 0;
  for (const other of existing) {
    const match = pattern.exec(other.data.label);
    if (match) highest = Math.max(highest, Number(match[1]));
  }
  return { ...node, data: { ...node.data, label: `${stem}-${highest + 1}` } };
}
