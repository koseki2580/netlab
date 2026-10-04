import type { NetworkTopology } from '../../src/types/topology';
import type { CourseLocale, CourseStep, DiagramNote } from './courseSteps';

/**
 * The names the diagram's boxes carry in Japanese. The text beside the diagram
 * says 「スイッチ」 and 「ルータ」, so a box labelled `Switch` is a second name for
 * the same thing, which a beginner reads as a second thing.
 */
const JA_LABELS: Readonly<Record<string, string>> = {
  Switch: 'スイッチ',
  'Switch-1': 'スイッチ1',
  'Switch-2': 'スイッチ2',
  Router: 'ルータ',
};

/** What a device is called, in the learner's language. */
export function deviceLabel(label: string, locale: CourseLocale): string {
  return locale === 'ja' ? (JA_LABELS[label] ?? label) : label;
}

/** Distance between neighbouring devices on a narrow screen, by how many stand in the row. */
function narrowColumnStep(columns: number): number {
  return columns <= 3 ? 150 : 115;
}

/**
 * The step's network with its boxes named in the learner's language, and on a
 * narrow screen drawn closer together: the wide layout fitted to a phone drew
 * each box at under half size, with its address too small to read.
 */
export function localizedTopology(
  step: CourseStep,
  locale: CourseLocale,
  narrow = false,
): NetworkTopology {
  const columns = [...new Set(step.topology.nodes.map((node) => node.position.x))].sort(
    (a, b) => a - b,
  );
  const columnStep = narrowColumnStep(columns.length);
  return {
    ...step.topology,
    nodes: step.topology.nodes.map((node) => ({
      ...node,
      ...(narrow
        ? { position: { x: columns.indexOf(node.position.x) * columnStep, y: node.position.y } }
        : {}),
      data: { ...node.data, label: deviceLabel(node.data.label, locale) },
    })),
  };
}

/** The name the diagram shows for one of the step's devices. */
export function labelOf(step: CourseStep, nodeId: string, locale: CourseLocale): string {
  const node = step.topology.nodes.find((candidate) => candidate.id === nodeId);
  return node ? deviceLabel(node.data.label, locale) : nodeId;
}

const SCOPE = '[data-course-diagram]';

const NOTE_BASE =
  'position:absolute;white-space:nowrap;pointer-events:none;font-family:monospace;' +
  'font-size:10px;font-weight:400;line-height:1.2;color:var(--netlab-text-secondary);';

const NOTE_PLACE: Readonly<Record<DiagramNote['place'], { pseudo: string; css: string }>> = {
  // Under a host's IP address, which the library draws 3px under the box.
  below: { pseudo: '::after', css: 'top:calc(100% + 17px);left:50%;transform:translateX(-50%);' },
  // A router's two sides: each address sits under the half of the box its cable leaves from.
  'below-left': { pseudo: '::before', css: 'top:calc(100% + 4px);right:calc(50% + 4px);' },
  'below-right': { pseudo: '::after', css: 'top:calc(100% + 4px);left:calc(50% + 4px);' },
};

function cssString(text: string): string {
  return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/**
 * The styles that put on the diagram what the step's text points at.
 *
 * The device boxes belong to the library and draw a name and, for a host, one
 * address. The course says more than that — a router's address on each side, a
 * PC's MAC address, `/24` after an address — and a learner who checks the text
 * against the picture has to find it there. These are drawn as generated
 * content on the library's own boxes, so they move and zoom with them.
 */
export function diagramCss(step: CourseStep): string {
  const rules: string[] = [
    // The packet itself: the library's 14px dot is hard to follow on a phone.
    `${SCOPE} [data-testid="canvas-packet"]{width:20px !important;height:20px !important;margin:-3px 0 0 -3px;}`,
    // `/24` joins each address only once the learner has opened the text that explains it.
    `${SCOPE}[data-prefix] [data-testid="topology-node-ip"]::after{content:"/24";color:var(--netlab-text-primary);font-weight:700;}`,
  ];
  for (const note of step.notes ?? []) {
    const place = NOTE_PLACE[note.place];
    rules.push(
      `${SCOPE} [data-id="${note.nodeId}"] [data-testid="topology-node"]${place.pseudo}{content:${cssString(note.text)};${NOTE_BASE}${place.css}}`,
    );
  }
  return rules.join('\n');
}

/** Every address and number a learner can find on the step's diagram. */
export function diagramText(step: CourseStep): string {
  const shown: string[] = [];
  for (const node of step.topology.nodes) {
    shown.push(node.data.label);
    if (node.data.role === 'client' && node.data.ip) shown.push(node.data.ip);
  }
  for (const note of step.notes ?? []) shown.push(note.text);
  return shown.join(' ');
}
