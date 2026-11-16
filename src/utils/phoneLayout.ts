/**
 * A lesson's devices arranged for a phone.
 *
 * A lesson lays its devices out for a wide canvas: five in a row 200px apart,
 * or a column of hosts beside a switch and a router. Fitted to a 390px phone
 * that drawing shrank to a third of its size and the names and addresses on
 * the devices to 4–7px. Here they stand at most three to a row, 125px apart,
 * the rows running back and forth so neighbours in the wide picture stay
 * neighbours; the drawing is then about as wide as the phone and is fitted at
 * full size.
 */

/** Where each device stands, by id. */
export type PhonePlaces = Record<string, { x: number; y: number }>;

interface Placed {
  readonly id: string;
  readonly position: { readonly x: number; readonly y: number };
}

interface AreaBox {
  readonly devices: readonly string[];
  readonly visualConfig?: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
}

const PER_ROW = 3;
const COLUMN_GAP = 125;
const ROW_GAP = 110;
/** Rows far enough apart that the boxes of areas in two rows do not overlap. */
const AREA_ROW_GAP = 150;

/**
 * Room an area keeps around its devices: a device box is about 80 by 80, its
 * address under it, and the area's name above.
 */
const AREA_PAD = { left: 12, top: 36, right: 92, bottom: 102 };

/**
 * Three to a row, in the order the wide picture reads (left to right, then top
 * to bottom), every other row running right to left.
 */
export function snakePositions(nodes: readonly Placed[], rowGap = ROW_GAP): PhonePlaces {
  const order = [...nodes].sort(
    (a, b) => a.position.x - b.position.x || a.position.y - b.position.y,
  );
  const places: PhonePlaces = {};
  order.forEach((node, index) => {
    const row = Math.floor(index / PER_ROW);
    const column = index % PER_ROW;
    const x = row % 2 === 0 ? column : PER_ROW - 1 - column;
    places[node.id] = { x: x * COLUMN_GAP, y: row * rowGap };
  });
  return places;
}

/**
 * The topology with its devices at `places` (by default `snakePositions`), and
 * every area with a drawn box redrawn around its own devices.
 */
export function arrangeForPhone<
  Topology extends { readonly nodes: readonly Placed[]; readonly areas?: readonly AreaBox[] },
>(
  topology: Topology,
  places: PhonePlaces = snakePositions(
    topology.nodes,
    topology.areas?.some((area) => area.visualConfig) ? AREA_ROW_GAP : ROW_GAP,
  ),
): Topology {
  const nodes = topology.nodes.map((node) => {
    const place = places[node.id];
    return place ? { ...node, position: { x: place.x, y: place.y } } : node;
  });
  const at = new Map(nodes.map((node) => [node.id, node.position]));
  const areas = topology.areas?.map((area) => {
    const members = area.devices
      .map((id) => at.get(id))
      .filter((place): place is { x: number; y: number } => place !== undefined);
    if (!area.visualConfig || members.length === 0) return area;
    const xs = members.map((place) => place.x);
    const ys = members.map((place) => place.y);
    const left = Math.min(...xs) - AREA_PAD.left;
    const top = Math.min(...ys) - AREA_PAD.top;
    return {
      ...area,
      visualConfig: {
        ...area.visualConfig,
        x: left,
        y: top,
        width: Math.max(...xs) + AREA_PAD.right - left,
        height: Math.max(...ys) + AREA_PAD.bottom - top,
      },
    };
  });
  return { ...topology, nodes, ...(areas ? { areas } : {}) };
}
