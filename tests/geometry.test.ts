import { doIntersect } from "../src/utils/geometry";

describe("doIntersect", () => {
  it("detects crossing segments", () => {
    const a = { x: 0, y: 0 };
    const b = { x: 2, y: 2 };
    const c = { x: 0, y: 2 };
    const d = { x: 2, y: 0 };
    expect(doIntersect(a, b, c, d)).toBe(true);
  });

  it("returns false for shared endpoints", () => {
    const a = { x: 0, y: 0 };
    const b = { x: 2, y: 2 };
    const c = { x: 2, y: 2 };
    const d = { x: 4, y: 4 };
    expect(doIntersect(a, b, c, d)).toBe(false);
  });

  it("detects collinear overlap", () => {
    const a = { x: 0, y: 0 };
    const b = { x: 4, y: 0 };
    const c = { x: 2, y: 0 };
    const d = { x: 6, y: 0 };
    expect(doIntersect(a, b, c, d)).toBe(true);
  });

  it("returns false for non-intersecting", () => {
    const a = { x: 0, y: 0 };
    const b = { x: 1, y: 0 };
    const c = { x: 0, y: 2 };
    const d = { x: 1, y: 2 };
    expect(doIntersect(a, b, c, d)).toBe(false);
  });
});
