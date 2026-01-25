import { generateLevel } from "../src/utils/levelGenerator";

const hasDuplicateEdges = (edges: { source: number; target: number }[]) => {
  const seen = new Set<string>();
  for (const edge of edges) {
    const key = edge.source < edge.target ? `${edge.source}-${edge.target}` : `${edge.target}-${edge.source}`;
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
};

describe("generateLevel", () => {
  it("creates nodes and edges with targetMoves", () => {
    const level = generateLevel(1, 6, 400, 600);
    expect(level.nodes.length).toBe(6);
    expect(level.edges.length).toBeGreaterThanOrEqual(6);
    expect(level.targetMoves).toBe(7);
  });

  it("places nodes within bounds", () => {
    const width = 400;
    const height = 600;
    const padding = 50;
    const level = generateLevel(2, 6, width, height);
    for (const node of level.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(padding);
      expect(node.x).toBeLessThanOrEqual(width - padding);
      expect(node.y).toBeGreaterThanOrEqual(padding);
      expect(node.y).toBeLessThanOrEqual(height - padding);
    }
  });

  it("does not create duplicate edges", () => {
    const level = generateLevel(3, 8, 500, 500);
    expect(hasDuplicateEdges(level.edges)).toBe(false);
  });
});
