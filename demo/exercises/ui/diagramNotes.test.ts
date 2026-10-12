// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { exerciseById } from '../exerciseSource';
import { applyChanges } from '../model/settings';
import { cablePressed } from './cablePress';
import { diagramNotes, diagramNotesCss, diagramNotesLines, noAddressNote } from './diagramNotes';

function exercise(id: string) {
  const found = exerciseById(id, 'ja');
  if (!found) throw new Error(`no ${id}`);
  return found;
}

// TC-549
describe('what the diagram shows besides names', () => {
  it('puts every address a static route can name as its next device under a router', () => {
    const { start } = exercise('l2-static-missing~0');
    const shown = diagramNotes(start)
      .flatMap((note) => note.lines)
      .join(' ');
    for (const node of start.nodes) {
      if (node.data.role !== 'router') continue;
      for (const side of node.data.interfaces ?? []) {
        expect(shown, `${node.id}.${side.id}`).toContain(`${side.ipAddress}/${side.prefixLength}`);
      }
    }
    // Each side says which way it faces.
    expect(shown).toMatch(/[←→↑↓] \d+\.\d+\.\d+\.\d+\/\d+/);
  });

  it('shows the VLAN number of an access port at the device plugged into it, and follows a change', () => {
    const vlan = exercise('l2-vlan-access~0');
    const fix = vlan.reference.find((change) => change.kind === 'port-vlan');
    if (!fix || fix.kind !== 'port-vlan' || fix.accessVlan === undefined) {
      throw new Error('l2-vlan-access is not fixed by an access port');
    }
    const before = diagramNotes(vlan.start).filter((note) =>
      /^VLAN \d+$/.test(note.lines[0] ?? ''),
    );
    expect(before.length).toBeGreaterThanOrEqual(2);
    const after = diagramNotes(applyChanges(vlan.start, [fix]));
    expect(after).not.toEqual(diagramNotes(vlan.start));
    expect(after.some((note) => note.lines.includes(`VLAN ${fix.accessVlan}`))).toBe(true);
  });

  it('says nothing about VLANs where the exercise is not about them', () => {
    const { start } = exercise('l1-host-address~0');
    expect(
      diagramNotes(start)
        .flatMap((note) => note.lines)
        .join(' '),
    ).not.toContain('VLAN');
  });

  it('draws the notes on the library’s boxes and says them in plain text as well', () => {
    const { start } = exercise('l2-static-missing~0');
    const css = diagramNotesCss(start, '[data-x]');
    const router = start.nodes.find((node) => node.data.role === 'router');
    expect(css).toContain(
      `[data-x] [data-id="${router?.id}"] [data-testid="topology-node"]::after`,
    );
    expect(diagramNotesLines(start, 'ja').join(' ')).toContain(String(router?.data.label));
  });
});

// TC-612
describe('a press where two cables are within reach', () => {
  it('is taken for the unplugged one, however near the other is', () => {
    expect(
      cablePressed([
        { id: 'healthy', distance: 0, down: false },
        { id: 'broken', distance: 12, down: true },
      ]),
    ).toBe('broken');
  });

  it('is taken for the nearest among equals, and for nothing when none is within reach', () => {
    expect(
      cablePressed([
        { id: 'a', distance: 9, down: false },
        { id: 'b', distance: 4, down: false },
      ]),
    ).toBe('b');
    expect(
      cablePressed([
        { id: 'a', distance: 9, down: true },
        { id: 'b', distance: 4, down: true },
      ]),
    ).toBe('b');
    expect(cablePressed([])).toBeNull();
  });
});

// TC-615
describe('the mark on a device without an address', () => {
  it('is explained where a device has none, and only there', () => {
    const blank = exercise('l1-host-blank~0');
    expect(noAddressNote(blank.start, 'ja')).toBe(
      '⚠ は「この機器にまだアドレスがない」という印です。故障ではありません。',
    );
    expect(noAddressNote(blank.start, 'en')).toBe(
      '⚠ means "this device has no address yet". It is not a fault.',
    );
    expect(noAddressNote(applyChanges(blank.start, blank.reference), 'ja')).toBeNull();
    expect(noAddressNote(exercise('l1-host-address~0').start, 'ja')).toBeNull();
  });
});
