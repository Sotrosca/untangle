import React, { useEffect } from "react";
import { act, render } from "@testing-library/react-native";
import { useSoundPool } from "../src/hooks/useSoundPool";
import { createAudioPlayer } from "expo-audio";

type PlayFn = () => Promise<void> | void;

const flushPromises = () => Promise.resolve();

const TestComponent: React.FC<{
  onReady: (play: PlayFn) => void;
}> = ({ onReady }) => {
  const play = useSoundPool({ uri: "test" } as any, "TEST", {
    autoWarm: false,
    rateRange: [0.98, 1.02],
    volume: 0.5,
  });

  useEffect(() => {
    onReady(play);
  }, [onReady, play]);

  return null;
};

describe("useSoundPool", () => {
  beforeEach(() => {
    jest.useRealTimers();
    (createAudioPlayer as jest.Mock).mockClear();
  });

  it("creates an audio player and plays on demand", async () => {
    let playFn: PlayFn = () => {};

    render(<TestComponent onReady={(fn) => (playFn = fn)} />);

    await act(async () => {
      await flushPromises();
    });

    expect(createAudioPlayer).toHaveBeenCalledTimes(1);
    const player = (createAudioPlayer as jest.Mock).mock.results[0].value;

    await act(async () => {
      await playFn();
      await flushPromises();
    });

    expect(player.seekTo).toHaveBeenCalled();
    expect(player.play).toHaveBeenCalled();
  });

  it("queues play before load and plays after ready", async () => {
    let playFn: PlayFn = () => {};

    render(<TestComponent onReady={(fn) => (playFn = fn)} />);

    await act(async () => {
      await playFn();
      await flushPromises();
    });

    const player = (createAudioPlayer as jest.Mock).mock.results[0].value;
    expect(player.play).toHaveBeenCalled();
  });

  it("auto-warms on load when enabled", async () => {
    jest.useFakeTimers();
    const AutoWarmComponent: React.FC = () => {
      useSoundPool({ uri: "test" } as any, "AUTO", { autoWarm: true });
      return null;
    };

    render(<AutoWarmComponent />);

    await act(async () => {
      await flushPromises();
    });

    act(() => {
      jest.runAllTimers();
    });

    await act(async () => {
      await flushPromises();
    });

    const player = (createAudioPlayer as jest.Mock).mock.results[0].value;
    expect(player.play).toHaveBeenCalled();
    expect(player.pause).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it("applies playback rate variance after warm", async () => {
    let playFn: PlayFn = () => {};

    render(<TestComponent onReady={(fn) => (playFn = fn)} />);

    await act(async () => {
      await flushPromises();
    });

    const player = (createAudioPlayer as jest.Mock).mock.results[0].value;

    await act(async () => {
      await playFn();
      await playFn();
      await flushPromises();
    });

    expect(player.setPlaybackRate).toHaveBeenCalled();
  });

  it("logs a warning when audio load fails", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    (createAudioPlayer as jest.Mock).mockImplementationOnce(() => {
      throw new Error("fail");
    });

    const ErrorComponent: React.FC = () => {
      useSoundPool({ uri: "test" } as any, "ERR", { autoWarm: false });
      return null;
    };

    render(<ErrorComponent />);

    await act(async () => {
      await flushPromises();
    });

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
