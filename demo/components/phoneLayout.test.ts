import { describe, expect, it } from 'vitest';
import { arrangeForPhone, snakePositions } from './phoneLayout';

const at = (id: string, x: number, y: number) => ({ id, position: { x, y } });

// TC-720: on a phone a lesson's devices stand at most three to a row, close
// together, so the fit draws them (and their names) large enough to read.
describe('the phone arrangement of a lesson’s devices (TC-720)', () => {
  it('folds a row of five into two rows of three and two, the second running back', () => {
    const positions = snakePositions([
      at('client', 60, 200),
      at('r1', 260, 200),
      at('r2', 460, 200),
      at('r3', 660, 200),
      at('server', 860, 200),
    ]);
    expect(positions).toEqual({
      client: { x: 0, y: 0 },
      r1: { x: 125, y: 0 },
      r2: { x: 250, y: 0 },
      r3: { x: 250, y: 110 },
      server: { x: 125, y: 110 },
    });
  });

  it('reads a column of hosts top to bottom before the next column', () => {
    const positions = snakePositions([
      at('sw', 360, 250),
      at('a2', 80, 180),
      at('a1', 80, 80),
      at('router', 680, 250),
    ]);
    expect(Object.keys(positions)).toEqual(['a1', 'a2', 'sw', 'router']);
    expect(positions['router']).toEqual({ x: 250, y: 110 });
  });

  it('never makes the drawing wider than three devices', () => {
    const nodes = Array.from({ length: 9 }, (_, index) => at(`n${index}`, index * 300, 0));
    const xs = Object.values(snakePositions(nodes)).map((place) => place.x);
    expect(Math.max(...xs)).toBe(250);
  });

  it('keeps each area around its own devices after they move', () => {
    const arranged = arrangeForPhone({
      nodes: [at('a', 0, 0), at('b', 500, 0), at('c', 1000, 0), at('d', 1500, 0)],
      areas: [
        {
          id: 'left',
          devices: ['a', 'b'],
          visualConfig: { x: -20, y: -20, width: 600, height: 200 },
        },
        { id: 'right', devices: ['d'], visualConfig: { x: 1480, y: -20, width: 200, height: 200 } },
      ],
    });
    const place = Object.fromEntries(arranged.nodes.map((node) => [node.id, node.position]));
    for (const area of arranged.areas) {
      const box = area.visualConfig!;
      for (const id of area.devices) {
        expect(place[id]!.x).toBeGreaterThan(box.x);
        expect(place[id]!.x).toBeLessThan(box.x + box.width);
        expect(place[id]!.y).toBeGreaterThan(box.y);
        expect(place[id]!.y).toBeLessThan(box.y + box.height);
      }
    }
    // The device outside both areas is not inside either box.
    const c = place['c']!;
    const left = arranged.areas[0]!.visualConfig!;
    expect(c.x >= left.x && c.x <= left.x + left.width && c.y <= left.y + left.height).toBe(false);
  });
});
