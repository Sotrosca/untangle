# Next Steps (Prioritized)

## 1) Fix victory calculation state
**Problem:** The victory effect uses `moves`, `seconds`, and `levelData` without full dependencies, so stars/score can be computed with stale values.

**Impact:** Inconsistent rewards and a sense of unfairness for players.

**What to change:**
- Update the victory effect dependencies to include all referenced state.
- Ensure the final stars/score are computed from the latest values.

**Where:** Main game logic in [src/components/GraphLevel.tsx](src/components/GraphLevel.tsx).

---

## 2) Add “remaining intersections” + quick reset
**Problem:** Players don’t know how many crossings are left and can’t quickly restart.

**Impact:** Lower clarity and more friction during gameplay.

**What to change:**
- Display `intersectingEdges.size` in the HUD.
- Add a “Reset Level” button to instantly restart the current level.

**Where:** HUD and controls in [src/components/GraphLevel.tsx](src/components/GraphLevel.tsx).

---

## 3) Guarantee entangled start in generator
**Problem:** Procedural levels can spawn already solved (no intersections).

**Impact:** Trivial levels that break progression and reduce challenge.

**What to change:**
- After placing nodes, verify at least one intersection.
- If none, reshuffle positions up to a max attempt count.

**Where:** Generator in [src/utils/levelGenerator.ts](src/utils/levelGenerator.ts).

---

## 4) Optimize intersection recalculation
**Problem:** Every drag recomputes all edge intersections (O(E²)).

**Impact:** Potential lag with higher node counts in infinite mode.

**What to change:**
- Recompute intersections only for edges incident to the dragged node.
- Update the intersection set incrementally.

**Where:** Drag handling in [src/components/GraphLevel.tsx](src/components/GraphLevel.tsx).

---

## 5) Persist settings and progress
**Problem:** Sound/vibration settings and progress reset on app restart.

**Impact:** Poor continuity and reduced retention.

**What to change:**
- Store `soundEnabled`, `hapticsEnabled`, and level progress in AsyncStorage.
- Load settings on app start.

**Where:** App state management in [App.tsx](App.tsx).
