export interface Point {
  x: number;
  y: number;
}

export interface Edge {
  source: number; // Node ID
  target: number; // Node ID
}

/**
 * Calculates the cross product of vectors (b-a) and (c-a).
 * value > 0 : c is to the left of ab
 * value < 0 : c is to the right of ab
 * value = 0 : a, b, c are collinear
 */
const crossProduct = (a: Point, b: Point, c: Point): number => {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
};

/**
 * Checks if point c lies on the segment ab.
 * Assumes a, b, c are collinear.
 */
const onSegment = (a: Point, b: Point, c: Point): boolean => {
  return (
    c.x >= Math.min(a.x, b.x) &&
    c.x <= Math.max(a.x, b.x) &&
    c.y >= Math.min(a.y, b.y) &&
    c.y <= Math.max(a.y, b.y)
  );
};

/**
 * Checks if two line segments (p1-p2) and (p3-p4) intersect.
 * Returns true only if they intersect at a point strictly inside both segments.
 * If they share an endpoint, it returns false (valid graph connection).
 */
export const doIntersect = (p1: Point, p2: Point, p3: Point, p4: Point): boolean => {
  // Check if they share an endpoint
  if (
    (p1.x === p3.x && p1.y === p3.y) ||
    (p1.x === p4.x && p1.y === p4.y) ||
    (p2.x === p3.x && p2.y === p3.y) ||
    (p2.x === p4.x && p2.y === p4.y)
  ) {
    return false;
  }

  const d1 = crossProduct(p3, p4, p1);
  const d2 = crossProduct(p3, p4, p2);
  const d3 = crossProduct(p1, p2, p3);
  const d4 = crossProduct(p1, p2, p4);

  // General case: strictly intersecting
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }

  // Special cases: collinear points (usually not needed for this game if nodes are distinct, but good for robustness)
  // We generally don't want collinear overlaps either, but for "Untangle" usually just crossing is the main mechanic.
  // If we want to prevent overlapping collinear segments:
  if (d1 === 0 && onSegment(p3, p4, p1)) return true;
  if (d2 === 0 && onSegment(p3, p4, p2)) return true;
  if (d3 === 0 && onSegment(p1, p2, p3)) return true;
  if (d4 === 0 && onSegment(p1, p2, p4)) return true;

  return false;
};
