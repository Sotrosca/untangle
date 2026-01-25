import levels from "../src/data/levels.json";

describe("levels.json", () => {
  it("has unique level ids", () => {
    const ids = levels.map((l) => l.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("has unique node ids per level", () => {
    for (const level of levels) {
      const nodeIds = level.nodes.map((n) => n.id);
      const unique = new Set(nodeIds);
      expect(unique.size).toBe(nodeIds.length);
    }
  });

  it("edges reference valid node ids", () => {
    for (const level of levels) {
      const nodeIds = new Set(level.nodes.map((n) => n.id));
      for (const edge of level.edges) {
        expect(nodeIds.has(edge.source)).toBe(true);
        expect(nodeIds.has(edge.target)).toBe(true);
      }
    }
  });

  it("targetMoves is positive when provided", () => {
    for (const level of levels) {
      if (typeof level.targetMoves === "number") {
        expect(level.targetMoves).toBeGreaterThan(0);
      }
    }
  });
});
