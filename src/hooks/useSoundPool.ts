import { useCallback, useEffect, useRef } from 'react';
import { createAudioPlayer } from 'expo-audio';

type AudioSource = Parameters<typeof createAudioPlayer>[0];
type AudioPlayer = ReturnType<typeof createAudioPlayer>;

export type SoundPoolOptions = {
    volume?: number;              // 0..1
    rateRange?: [number, number]; // e.g., [0.97, 1.03] for subtle pitch variance
    autoWarm?: boolean;           // warm up silently on load to reduce first-play latency
};

// Lightweight pooled sound player using expo-audio for reliable playback
export function useSoundPool(source: AudioSource, debugName?: string, options?: SoundPoolOptions) {
    const pendingPlayRef = useRef(false);
    const soundsRef = useRef<AudioPlayer[]>([]);
    const indexRef = useRef(0);
    const hasWarmedRef = useRef(false);

    const performPlay = useCallback(async (player: AudioPlayer) => {
        const targetVolume = options?.volume ?? 1;

        try {
            if (!hasWarmedRef.current) {
                hasWarmedRef.current = true;

                // First playback on some Android devices is silent. Warm up then immediately replay audibly.
                player.volume = 0;
                await player.seekTo(0);
                player.play();

                // Give the audio engine a moment to warm up before the first audible replay.
                await new Promise<void>((resolve) => setTimeout(resolve, 120));

                player.pause();

                if (options?.rateRange) {
                    const [min, max] = options.rateRange;
                    const rate = Math.min(max, Math.max(min, Math.random() * (max - min) + min));
                    player.setPlaybackRate(rate, 'medium');
                }

                player.volume = targetVolume;
                await player.seekTo(0);
                player.play();
                return;
            }

            if (options?.rateRange) {
                const [min, max] = options.rateRange;
                const rate = Math.min(max, Math.max(min, Math.random() * (max - min) + min));
                player.setPlaybackRate(rate, 'medium');
            }

            player.volume = targetVolume;
            await player.seekTo(0);
            player.play();
        } catch (err) {
            console.warn(`[sound] Failed to play${debugName ? ` (${debugName})` : ''}:`, err);
        }
    }, [debugName, options?.rateRange, options?.volume]);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            try {
                const poolSize = 1;
                const targetVolume = options?.volume ?? 1;

                // Load the first sound immediately so we can play right away.
                const firstPlayer = createAudioPlayer(source, {
                    downloadFirst: true,
                    keepAudioSessionActive: false,
                });
                firstPlayer.volume = targetVolume;

                if (!mounted) {
                    firstPlayer.remove();
                    return;
                }

                soundsRef.current = [firstPlayer];

                if (pendingPlayRef.current) {
                    pendingPlayRef.current = false;
                    await performPlay(firstPlayer);
                } else if (options?.autoWarm ?? true) {
                    try {
                        if (!hasWarmedRef.current) {
                            hasWarmedRef.current = true;
                            firstPlayer.volume = 0;
                            await firstPlayer.seekTo(0);
                            firstPlayer.play();
                            await new Promise<void>((resolve) => setTimeout(resolve, 120));
                            firstPlayer.pause();
                            firstPlayer.volume = targetVolume;
                        }
                    } catch (err) {
                        console.warn(`[sound] Failed to warm${debugName ? ` (${debugName})` : ''}:`, err);
                    }
                }

                // Load the rest in the background to build the pool.
                const restPromises: Promise<AudioPlayer>[] = [];
                for (let i = 1; i < poolSize; i += 1) {
                    restPromises.push(
                        Promise.resolve(createAudioPlayer(source, {
                            downloadFirst: true,
                            keepAudioSessionActive: false,
                        })).then((player) => {
                            player.volume = targetVolume;
                            return player;
                        })
                    );
                }

                const rest = await Promise.all(restPromises);
                if (mounted) {
                    soundsRef.current = [firstPlayer, ...rest];
                } else {
                    rest.forEach((s) => s.remove());
                }
            } catch (err) {
                console.warn(`[sound] Failed to load${debugName ? ` (${debugName})` : ''}:`, err);
            }
        };

        load();

        return () => {
            mounted = false;
            const sounds = soundsRef.current;
            soundsRef.current = [];
            sounds.forEach((s) => s.remove());
        };
    }, [source, debugName, options?.volume]);

    const play = useCallback(async () => {
        const sounds = soundsRef.current;
        if (!sounds.length) {
            pendingPlayRef.current = true;
            return;
        }

        const idx = indexRef.current;
        indexRef.current = (idx + 1) % sounds.length;

        const sound = sounds[idx];
        await performPlay(sound);
    }, [performPlay]);

    return play;
}
