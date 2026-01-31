import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import App from "../App";

jest.mock("../src/hooks/useSoundPool", () => ({
  useSoundPool: () => jest.fn(),
}));

let mockAutoCompleteNextLevel = false;

jest.mock("../src/components/GraphLevel", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return (props: { onNextLevel: (score: number) => void }) => {
    React.useEffect(() => {
      if (mockAutoCompleteNextLevel) {
        mockAutoCompleteNextLevel = false;
        props.onNextLevel(50);
      }
    }, [props]);
    return React.createElement(Text, null, "GraphLevel");
  };
});

jest.mock("../src/utils/levelGenerator", () => ({
  generateLevel: jest.fn(() => ({
    id: 999,
    nodes: [],
    edges: [],
    targetMoves: 1,
  })),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

describe("App", () => {
  beforeEach(() => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockClear();
    mockAutoCompleteNextLevel = false;
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    (Alert.alert as jest.Mock).mockRestore();
  });

  it("shows menu and can start new game", async () => {
    const { getByText, queryByText } = render(<App />);

    await waitFor(() => expect(getByText("Untangle")).toBeTruthy());
    expect(getByText("New Game")).toBeTruthy();

    fireEvent.press(getByText("New Game"));
    expect(queryByText("GraphLevel")).toBeTruthy();
  });

  it("toggles vibration and sound labels", async () => {
    const { getByText } = render(<App />);

    await waitFor(() => expect(getByText("Untangle")).toBeTruthy());

    const vibration = getByText(/Vibration:/);
    fireEvent.press(vibration);
    expect(getByText(/Vibration: (ON|OFF)/)).toBeTruthy();

    const sound = getByText(/Sound:/);
    fireEvent.press(sound);
    expect(getByText(/Sound: (ON|OFF)/)).toBeTruthy();
  });

  it("hydrates saved progress and allows continue", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({
        hapticsEnabled: false,
        soundEnabled: false,
        levelIndex: 1,
        totalScore: 10,
      })
    );

    const { getByText, queryByText } = render(<App />);

    await waitFor(() => expect(getByText("Untangle")).toBeTruthy());

    fireEvent.press(getByText("Continue"));
    expect(queryByText("GraphLevel")).toBeTruthy();
  });

  it("persists settings after toggles", async () => {
    const { getByText } = render(<App />);

    await waitFor(() => expect(getByText("Untangle")).toBeTruthy());

    fireEvent.press(getByText(/Vibration:/));
    fireEvent.press(getByText(/Sound:/));

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "untangle_settings_v1",
        expect.stringContaining("hapticsEnabled")
      );
    });
  });

  it("alerts when finishing story mode", async () => {
    mockAutoCompleteNextLevel = true;
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({
        levelIndex: 4,
        totalScore: 10,
        hapticsEnabled: true,
        soundEnabled: true,
      })
    );

    const { getByText } = render(<App />);
    await waitFor(() => expect(getByText("Untangle")).toBeTruthy());

    fireEvent.press(getByText("Continue"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });
  });
});
