/**
 * What the exercise texts point at, drawn on the diagram.
 *
 * The library's boxes show a name and, for a host, one address. An exercise
 * asks for more than that: "the next router's address", "the port in VLAN 20".
 * A learner who checks the text against the picture has to find it there. As
 * the six-step course does (`demo/course/courseDiagram.ts`), the notes are
 * generated content on the library's own boxes, so they move and zoom with
 * them and nothing under `src/` changes.
 */

import type { TopologySnapshot } from '../../../src/types/topology';

export interface DiagramNote {
  readonly nodeId: string;
  /** One line per fact, in the order they are drawn. */
  readonly lines: readonly string[];
  /** The library has drawn the host's address under its box: the note joins that line. */
  readonly underAddress: boolean;
}

type Node = TopologySnapshot['nodes'][number];

/** The device plugged into `handleId` of `nodeId`, or undefined. */
function peerOf(topology: TopologySnapshot, nodeId: string, handleId: string): Node | undefined {
  for (const edge of topology.edges) {
    const peerId =
      edge.source === nodeId && edge.sourceHandle === handleId
        ? edge.target
        : edge.target === nodeId && edge.targetHandle === handleId
          ? edge.source
          : undefined;
    if (peerId !== undefined) return topology.nodes.find((node) => node.id === peerId);
  }
  return undefined;
}

/** Which way a cable leaves a device, as an arrow. */
function arrow(from: Node, to: Node | undefined): string {
  if (!to) return '';
  const dx = to.position.x - from.position.x;
  const dy = to.position.y - from.position.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? '←' : '→';
  return dy < 0 ? '↑' : '↓';
}

const ARROW_ORDER = ['←', '↑', '↓', '→', ''];

/**
 * The notes for a network: under each router, the address of each side with an
 * arrow to the side it faces; under each device on an access port of a switch
 * that uses VLANs, the port's VLAN number.
 */
export function diagramNotes(topology: TopologySnapshot): DiagramNote[] {
  const notes: DiagramNote[] = [];

  for (const node of topology.nodes) {
    if (node.data.role !== 'router') continue;
    const sides = (node.data.interfaces ?? [])
      .filter((side) => side.ipAddress !== '')
      .map((side) => ({
        way: arrow(node, peerOf(topology, node.id, side.id)),
        text: `${side.ipAddress}/${side.prefixLength}`,
      }))
      .sort((a, b) => ARROW_ORDER.indexOf(a.way) - ARROW_ORDER.indexOf(b.way));
    if (sides.length === 0) continue;
    notes.push({
      nodeId: node.id,
      lines: sides.map((side) => (side.way === '' ? side.text : `${side.way} ${side.text}`)),
      underAddress: false,
    });
  }

  // VLAN numbers only where the exercise is about them: a switch whose ports
  // are all in the default VLAN says nothing a beginner needs.
  const usesVlans = topology.nodes.some(
    (node) =>
      node.data.role === 'switch' &&
      (node.data.ports ?? []).some(
        (port) => port.vlanMode === 'trunk' || (port.accessVlan ?? 1) !== 1,
      ),
  );
  if (usesVlans) {
    for (const node of topology.nodes) {
      if (node.data.role !== 'switch') continue;
      for (const port of node.data.ports ?? []) {
        if (port.vlanMode === 'trunk') continue;
        const peer = peerOf(topology, node.id, port.id);
        // A port's number is drawn at the device it serves; a cable to another
        // switch or a router has no single device to put it under.
        if (!peer || peer.data.role === 'switch' || peer.data.role === 'router') continue;
        const hasAddress = typeof peer.data.ip === 'string' && peer.data.ip !== '';
        notes.push({
          nodeId: peer.id,
          lines: [`VLAN ${port.accessVlan ?? 1}`],
          underAddress: hasAddress,
        });
      }
    }
  }
  return notes;
}

function cssString(lines: readonly string[]): string {
  // `\A ` is a line break in generated content.
  return `"${lines.map((line) => line.replace(/\\/g, '\\\\').replace(/"/g, '\\"')).join('\\A ')}"`;
}

const NOTE_BASE =
  'position:absolute;left:50%;transform:translateX(-50%);white-space:pre;pointer-events:none;' +
  'text-align:center;font-family:ui-monospace,monospace;font-size:10px;font-weight:600;' +
  'line-height:1.25;color:var(--netlab-text-primary);';

/** The notes as styles on the library's boxes, inside `scope`. */
export function diagramNotesCss(topology: TopologySnapshot, scope: string): string {
  return diagramNotes(topology)
    .map((note) => {
      const box = `${scope} [data-id=${JSON.stringify(note.nodeId)}] [data-testid="topology-node"]`;
      // Beside the address the library draws under a host, on the same line:
      // a second line there ran into the device drawn below.
      if (note.underAddress) {
        return `${scope} [data-id=${JSON.stringify(note.nodeId)}] [data-testid="topology-node-ip"]::after{content:${cssString([` · ${note.lines.join(' · ')}`])};font-weight:700;color:var(--netlab-text-primary);}`;
      }
      return `${box}::after{content:${cssString(note.lines)};${NOTE_BASE}top:calc(100% + 4px);}`;
    })
    .join('\n');
}

/** Every note as plain text, one device per line: for a reader, or a screen, that cannot show them on the boxes. */
export function diagramNotesLines(topology: TopologySnapshot, locale: 'en' | 'ja'): string[] {
  const label = (nodeId: string) =>
    topology.nodes.find((node) => node.id === nodeId)?.data.label ?? nodeId;
  return diagramNotes(topology).map(
    (note) => `${label(note.nodeId)}: ${note.lines.join(locale === 'ja' ? '、' : ', ')}`,
  );
}

/**
 * Every device with what a learner reads off it, one device per line, for a
 * screen on which the picture is too small to read: a name and an address are
 * a few pixels high on a phone. Hosts with their address (and VLAN number),
 * routers with the address of each side, switches with what the exercise is
 * about: the list of a trunk, the priority where spanning tree is set.
 * In the order of the picture, left to right and then top to bottom.
 */
export function diagramLegendLines(topology: TopologySnapshot, locale: 'en' | 'ja'): string[] {
  const notes = new Map(diagramNotes(topology).map((note) => [note.nodeId, note.lines]));
  const comma = locale === 'ja' ? '、' : ', ';
  const usesStp = topology.nodes.some((node) => node.data.stpConfig !== undefined);
  const lines: string[] = [];
  const ordered = [...topology.nodes].sort(
    (a, b) => a.position.x - b.position.x || a.position.y - b.position.y,
  );
  for (const node of ordered) {
    const facts: string[] = [];
    if (node.data.role === 'switch') {
      for (const port of node.data.ports ?? []) {
        if (port.vlanMode !== 'trunk') continue;
        const peer = peerOf(topology, node.id, port.id);
        const list = (port.trunkAllowedVlans ?? []).join(', ');
        facts.push(
          locale === 'ja'
            ? `トランク${arrow(node, peer)}（通す VLAN: ${list === '' ? 'なし' : list}）`
            : `trunk ${arrow(node, peer)} (carries VLAN: ${list === '' ? 'none' : list})`,
        );
      }
      if (usesStp) {
        const priority = node.data.stpConfig?.priority ?? 32768;
        facts.push(locale === 'ja' ? `優先度 ${priority}` : `priority ${priority}`);
      }
    } else if (node.data.role === 'router') {
      facts.push(...(notes.get(node.id) ?? []));
    } else {
      const ip = typeof node.data.ip === 'string' && node.data.ip !== '' ? node.data.ip : null;
      facts.push(
        ip ?? (locale === 'ja' ? 'アドレスなし' : 'no address'),
        ...(notes.get(node.id) ?? []),
      );
    }
    if (facts.length > 0) lines.push(`${node.data.label}: ${facts.join(comma)}`);
  }
  if (topology.edges.some((edge) => edge.data?.state === 'down')) {
    lines.push(
      locale === 'ja' ? '赤い点線: ぬけているケーブル' : 'Red dotted line: an unplugged cable',
    );
  }
  return lines;
}
