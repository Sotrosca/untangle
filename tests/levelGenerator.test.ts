import { generateLevel } from "../src/utils/levelGenerator";
import { doIntersect, Point } from "../src/utils/geometry";

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

  it("creates a perimeter cycle", () => {
    const nodeCount = 7;
    const level = generateLevel(4, nodeCount, 400, 400);
    for (let i = 0; i < nodeCount; i++) {
      const next = (i + 1) % nodeCount;
      const exists = level.edges.some(
        (e) => (e.source === i && e.target === next) || (e.source === next && e.target === i)
      );
      expect(exists).toBe(true);
    }
  });

  it("does not create self-loops and keeps edge ids in range", () => {
    const nodeCount = 9;
    const level = generateLevel(5, nodeCount, 600, 600);
    for (const edge of level.edges) {
      expect(edge.source).not.toBe(edge.target);
      expect(edge.source).toBeGreaterThanOrEqual(0);
      expect(edge.source).toBeLessThan(nodeCount);
      expect(edge.target).toBeGreaterThanOrEqual(0);
      expect(edge.target).toBeLessThan(nodeCount);
    }
  });

  it("produces planar edges in the solved layout", () => {
    const nodeCount = 10;
    const width = 500;
    const height = 400;
    const level = generateLevel(6, nodeCount, width, height);

    const radius = Math.min(width, height) / 3;
    const centerX = width / 2;
    const centerY = height / 2;
    const solvedNodes: Point[] = [];

    for (let i = 0; i < nodeCount; i++) {
      const angle = (2 * Math.PI * i) / nodeCount;
      solvedNodes.push({
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      });
    }

    for (let i = 0; i < level.edges.length; i++) {
      for (let j = i + 1; j < level.edges.length; j++) {
        const edge1 = level.edges[i];
        const edge2 = level.edges[j];

        const sharesEndpoint =
          edge1.source === edge2.source ||
          edge1.source === edge2.target ||
          edge1.target === edge2.source ||
          edge1.target === edge2.target;
        if (sharesEndpoint) continue;

        const p1 = solvedNodes[edge1.source];
        const p2 = solvedNodes[edge1.target];
        const p3 = solvedNodes[edge2.source];
        const p4 = solvedNodes[edge2.target];

        expect(doIntersect(p1, p2, p3, p4)).toBe(false);
      }
    }
  });

  it("skips chords that would intersect in the solved layout", () => {
    jest.resetModules();
    jest.doMock("../src/utils/geometry", () => ({
      doIntersect: jest.fn(() => true),
    }));

    // Re-require after mocking geometry
    const { generateLevel: generateLevelMocked } = require("../src/utils/levelGenerator");
    const nodeCount = 6;
    const level = generateLevelMocked(7, nodeCount, 400, 400);

    // With doIntersect always true, only perimeter edges should remain
    expect(level.edges.length).toBe(nodeCount);
  });
});
