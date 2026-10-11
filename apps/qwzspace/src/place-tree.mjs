// place-tree — a world of nested places, told as a tree and laid out as a city.
//
// A place tree is a list of places, each naming the place that holds it (`up`, null at the root).
// Packed for the wire, a place names its holder by its index in the list, and a field that extends
// its holder's value (an identifier, a path) travels as its tail; nothing a reader can derive
// travels. Unpacked, every place stands whole again, in the same order.
//
// Laid out, the tree is a squarified treemap terraced by depth: a place stands on the place that
// holds it, its footprint the share of the tree it holds, one storey higher, so the same tree gives
// the same city wherever it is drawn. Siblings tile in the order the tree lists them; no identifier
// enters the layout, so a tree whose identifiers were renamed (an anonymised view) stands the same.
//
// No game here: no room, no atlas, no frame. Those are the caller's.

/** @typedef {{ id: string, up: string | null } & Record<string, unknown>} Place */

/** `places` for the wire: `up` an index, and each field of `tails` ({field: separator}) that
 *  extends its holder's value as `<field>Tail`. */
export function packPlaceTree(places, tails = {}) {
  const index = new Map(places.map((place, at) => [place.id, at]));
  const byId = new Map(places.map((place) => [place.id, place]));
  return Object.freeze(places.map((place) => {
    const holder = place.up === null || place.up === undefined ? undefined : byId.get(place.up);
    const packed = { ...place, up: holder === undefined ? null : index.get(place.up) };
    for (const [field, separator] of Object.entries(tails)) {
      const own = place[field], held = holder?.[field];
      if (typeof own !== "string" || typeof held !== "string" || !own.startsWith(held + separator)) continue;
      delete packed[field];
      packed[`${field}Tail`] = own.slice(held.length + separator.length);
    }
    return Object.freeze(packed);
  }));
}

/** The places `packPlaceTree` packed, whole again and in order. */
export function unpackPlaceTree(packed, tails = {}) {
  const whole = new Array(packed.length);
  const resolve = (at, seen = new Set()) => {
    if (whole[at] !== undefined) return whole[at];
    if (seen.has(at)) throw new TypeError(`place tree: place ${at} holds itself`);
    seen.add(at);
    const { up, ...place } = packed[at];
    const holder = up === null || up === undefined ? undefined : resolve(up, seen);
    for (const [field, separator] of Object.entries(tails)) {
      const tail = place[`${field}Tail`];
      if (tail === undefined) continue;
      if (holder === undefined || typeof holder[field] !== "string") throw new TypeError(`place tree: place ${at} tells a ${field} tail without a holder's ${field}`);
      delete place[`${field}Tail`];
      place[field] = holder[field] + separator + tail;
    }
    return (whole[at] = Object.freeze({ ...place, up: holder === undefined ? null : holder.id }));
  };
  for (let at = 0; at < packed.length; at += 1) resolve(at);
  return Object.freeze(whole);
}

const worst = (row, side) => {
  const sum = row.reduce((total, item) => total + item.area, 0);
  const max = Math.max(...row.map((item) => item.area)), min = Math.min(...row.map((item) => item.area));
  return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min));
};

/** Squarified treemap (Bruls, Huizing and van Wijk, 2000): `items` ({key, weight}) tiled into the
 *  rectangle [x0, y0, x1, y1], heaviest first; items of equal weight keep their given order. */
export function squarify(items, [x0, y0, x1, y1]) {
  const placed = new Map();
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  if (total <= 0 || items.length === 0) return placed;
  const scale = ((x1 - x0) * (y1 - y0)) / total;
  let pending = [...items].sort((a, b) => b.weight - a.weight).map((item) => ({ ...item, area: item.weight * scale }));
  let rect = [x0, y0, x1, y1];
  while (pending.length > 0) {
    const [rx0, ry0, rx1, ry1] = rect;
    const width = rx1 - rx0, height = ry1 - ry0, side = Math.min(width, height);
    const row = [pending[0]];
    let next = 1;
    while (next < pending.length && worst([...row, pending[next]], side) <= worst(row, side)) row.push(pending[next++]);
    pending = pending.slice(next);
    const sum = row.reduce((total, item) => total + item.area, 0);
    if (width >= height) {
      // A column along the left edge.
      const thick = pending.length === 0 ? width : sum / height;
      let y = ry0;
      for (const item of row) {
        const h = item.area / thick;
        placed.set(item.key, [rx0, y, rx0 + thick, y + h]);
        y += h;
      }
      rect = [rx0 + thick, ry0, rx1, ry1];
    } else {
      // A row along the bottom edge.
      const thick = pending.length === 0 ? height : sum / width;
      let x = rx0;
      for (const item of row) {
        const w = item.area / thick;
        placed.set(item.key, [x, ry0, x + w, ry0 + thick]);
        x += w;
      }
      rect = [rx0, ry0 + thick, rx1, ry1];
    }
  }
  return placed;
}

const shrink = ([x0, y0, x1, y1], fraction) => {
  const by = Math.min(x1 - x0, y1 - y0) * fraction;
  return [x0 + by, y0 + by, x1 - by, y1 - by];
};
const round = (n) => Math.round(n * 1000) / 1000;
/** A rectangle as an enclosed region: its footprint counterclockwise in (east, north). */
const regionOf = ([x0, y0, x1, y1], z) => Object.freeze({
  body: Object.freeze({ footprint: Object.freeze([[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => Object.freeze([round(x), round(y)]))), z: Object.freeze(z.map(round)) }),
  enclosed: true,
});

// The share of a place's top it keeps as its own open ground.
const OWN = Symbol("own ground");

/**
 * Where every place stands: `up` maps each place but `root` to the place that holds it, siblings in
 * the map's order. A place weighs one plus everything it holds; the places it holds tile its top,
 * inside a margin, a storey above it; its own share stays open ground. `city` is the root's side
 * and slab ([floor, top]), one storey, and the margin and gap as fractions of a footprint's side.
 * @param {Map<string, string>} up
 * @param {string} root
 * @param {{ side: number, ground: [number, number], storey: number, margin: number, gap: number }} city
 */
export function terracedTreemap(up, root, city) {
  const children = new Map();
  for (const [place, holder] of up) {
    if (!children.has(holder)) children.set(holder, []);
    children.get(holder).push(place);
  }
  const weight = new Map();
  const weigh = (place) => {
    if (!weight.has(place)) weight.set(place, 1 + (children.get(place) ?? []).reduce((sum, child) => sum + weigh(child), 0));
    return weight.get(place);
  };
  weigh(root);
  const regions = new Map();
  const half = city.side / 2;
  const lay = (place, rect, floor) => {
    const top = place === root ? city.ground[1] : floor + city.storey;
    regions.set(place, regionOf(rect, place === root ? city.ground : [floor, top]));
    const inside = (children.get(place) ?? []).map((key) => ({ key, weight: weight.get(key) }));
    const tiled = squarify([...inside, { key: OWN, weight: 1 }], shrink(rect, city.margin));
    for (const { key } of inside) lay(key, shrink(tiled.get(key), city.gap), top);
  };
  lay(root, [-half, -half, half, half], city.ground[0]);
  return regions;
}

