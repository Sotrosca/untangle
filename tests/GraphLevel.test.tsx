import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Platform, Vibration } from "react-native";
import GraphLevel, {
  applyDragUpdate,
  buildInitialNodes,
  calculateCompletion,
  calculateIntersections,
} from "../src/components/GraphLevel";

describe("GraphLevel", () => {
  it("renders level header and stats", () => {
    const levelData = {
      id: 1,
      nodes: [
        { id: 0, x: 0, y: 0 },
        { id: 1, x: 100, y: 0 },
      ],
      edges: [{ source: 0, target: 1 }],
      targetMoves: 3,
    };

    const { getByText } = render(
      <GraphLevel
        levelData={levelData}
        totalScore={10}
        hapticsEnabled={false}
        soundEnabled={false}
        playPick={jest.fn()}
        playDrop={jest.fn()}
        onNextLevel={jest.fn()}
      />
    );

    expect(getByText("Level 1")).toBeTruthy();
    expect(getByText("Score: 10")).toBeTruthy();
    expect(getByText(/Moves:/)).toBeTruthy();
    expect(getByText(/Intersections:/)).toBeTruthy();
    expect(getByText("Reset Level")).toBeTruthy();
  });

  it("completes level when no intersections", async () => {
    const levelData = {
      id: 2,
      nodes: [
        { id: 0, x: 0, y: 0 },
        { id: 1, x: 100, y: 0 },
      ],
      edges: [{ source: 0, target: 1 }],
      targetMoves: 3,
    };

    const onNextLevel = jest.fn();

    const { getByTestId, getByText } = render(
      <GraphLevel
        levelData={levelData}
        totalScore={0}
        hapticsEnabled={false}
        soundEnabled={false}
        playPick={jest.fn()}
        playDrop={jest.fn()}
        onNextLevel={onNextLevel}
      />
    );

    fireEvent(getByTestId("graph-container"), "layout", {
      nativeEvent: { layout: { width: 300, height: 600 } },
    });

    await waitFor(() => expect(getByText("Level Complete")).toBeTruthy());
    expect(getByText("⭐⭐⭐⭐⭐")).toBeTruthy();
    expect(getByText("1000")).toBeTruthy();

    fireEvent.press(getByText("Next Level"));
    expect(onNextLevel).toHaveBeenCalledWith(1000);
  });

  it("shows intersections and does not complete when crossings exist", async () => {
    const levelData = {
      id: 3,
      nodes: [
        { id: 0, x: 0, y: 0 },
        { id: 1, x: 100, y: 0 },
        { id: 2, x: 100, y: 100 },
        { id: 3, x: 0, y: 100 },
      ],
      edges: [
        { source: 0, target: 2 },
        { source: 1, target: 3 },
      ],
      targetMoves: 4,
    };

    const { getByTestId, getByText, queryByText } = render(
      <GraphLevel
        levelData={levelData}
        totalScore={0}
        hapticsEnabled={false}
        soundEnabled={false}
        playPick={jest.fn()}
        playDrop={jest.fn()}
        onNextLevel={jest.fn()}
      />
    );

    fireEvent(getByTestId("graph-container"), "layout", {
      nativeEvent: { layout: { width: 300, height: 600 } },
    });

    await waitFor(() => expect(getByText("Intersections: 2")).toBeTruthy());
    expect(queryByText("Level Complete")).toBeNull();
  });

  it("increments timer while incomplete", async () => {
    jest.useFakeTimers();

    const levelData = {
      id: 4,
      nodes: [
        { id: 0, x: 0, y: 0 },
        { id: 1, x: 100, y: 0 },
        { id: 2, x: 100, y: 100 },
        { id: 3, x: 0, y: 100 },
      ],
      edges: [
        { source: 0, target: 2 },
        { source: 1, target: 3 },
      ],
      targetMoves: 4,
    };

    const { getByTestId, getByText } = render(
      <GraphLevel
        levelData={levelData}
        totalScore={0}
        hapticsEnabled={false}
        soundEnabled={false}
        playPick={jest.fn()}
        playDrop={jest.fn()}
        onNextLevel={jest.fn()}
      />
    );

    fireEvent(getByTestId("graph-container"), "layout", {
      nativeEvent: { layout: { width: 300, height: 600 } },
    });

    await waitFor(() => expect(getByText("Time: 0s")).toBeTruthy());

    await waitFor(() => expect(getByText("Time: 0s")).toBeTruthy());

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => expect(getByText("Time: 2s")).toBeTruthy());

    jest.useRealTimers();
  });

  it("triggers android haptics on completion when enabled", async () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, "OS", { value: "android" });
    const vibrateSpy = jest.spyOn(Vibration, "vibrate");

    const levelData = {
      id: 5,
      nodes: [
        { id: 0, x: 0, y: 0 },
        { id: 1, x: 100, y: 0 },
      ],
      edges: [{ source: 0, target: 1 }],
      targetMoves: 3,
    };

    const { getByTestId, getByText } = render(
      <GraphLevel
        levelData={levelData}
        totalScore={0}
        hapticsEnabled={true}
        soundEnabled={false}
        playPick={jest.fn()}
        playDrop={jest.fn()}
        onNextLevel={jest.fn()}
      />
    );

    fireEvent(getByTestId("graph-container"), "layout", {
      nativeEvent: { layout: { width: 300, height: 600 } },
    });

    await waitFor(() => expect(getByText("Level Complete")).toBeTruthy());
    expect(vibrateSpy).toHaveBeenCalled();

    vibrateSpy.mockRestore();
    Object.defineProperty(Platform, "OS", { value: originalOS });
  });

  it("builds initial nodes for empty input", () => {
    const nodes = buildInitialNodes([], { width: 300, height: 600 });
    expect(Object.keys(nodes).length).toBe(0);
  });

  it("calculates intersections for crossing edges", () => {
    const nodes = {
      0: { x: 0, y: 0 },
      1: { x: 2, y: 2 },
      2: { x: 0, y: 2 },
      3: { x: 2, y: 0 },
    };
    const edges = [
      { source: 0, target: 1 },
      { source: 2, target: 3 },
    ];

    const result = calculateIntersections(nodes, edges);
    expect(result.intersectingEdges.size).toBe(2);
  });

  it("computes completion scores and stars", () => {
    const completion = calculateCompletion({
      moves: 4,
      seconds: 6,
      nodeCount: 3,
      targetMoves: 4,
    });

    expect(completion.stars).toBe(5);
    expect(completion.levelScore).toBeGreaterThan(0);
    expect(completion.scoreBreakdown.baseScore).toBe(1000);
  });

  it("applyDragUpdate returns prev when no affected edges", () => {
    const prev = {
      nodes: { 0: { x: 0, y: 0 }, 1: { x: 1, y: 1 } },
      intersectingEdges: new Set<number>(),
      intersectionCounts: [0],
    };

    const next = applyDragUpdate(prev, {
      id: 0,
      dx: 1,
      dy: 1,
      edges: [{ source: 2, target: 3 }],
    });

    expect(next).toBe(prev);
  });

  it("applyDragUpdate updates intersections when movement changes crossing", () => {
    const prev = {
      nodes: {
        0: { x: 0, y: 0 },
        1: { x: 2, y: 2 },
        2: { x: 0, y: 2 },
        3: { x: 2, y: 0 },
      },
      intersectingEdges: new Set<number>([0, 1]),
      intersectionCounts: [1, 1],
    };

    const edges = [
      { source: 0, target: 1 },
      { source: 2, target: 3 },
    ];

    const next = applyDragUpdate(prev, {
      id: 0,
      dx: 5,
      dy: 0,
      edges,
    });

    expect(next).not.toBe(prev);
    expect(next.intersectionCounts[0]).toBeLessThanOrEqual(1);
  });
});
