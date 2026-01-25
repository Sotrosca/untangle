import { useCallback, useEffect, useRef } from 'react';
import { Audio, AVPlaybackSource } from 'expo-av';

export type SoundPoolOptions = {
    volume?: number;            // 0..1
    rateRange?: [number, number]; // e.g., [0.97, 1.03] for subtle pitch variance
    autoWarm?: boolean;         // warm up silently on load to reduce first-play latency
};

// Lightweight pooled sound player using expo-av for reliable playback
export function useSoundPool(source: AVPlaybackSource, debugName?: string, options?: SoundPoolOptions) {
    const pendingPlayRef = useRef(false);
    const soundsRef = useRef<Audio.Sound[]>([]);
    const indexRef = useRef(0);
    const hasWarmedRef = useRef(false);

    const performPlay = useCallback(async (sound: Audio.Sound) => {
        const targetVolume = options?.volume ?? 1;

        try {
            if (!hasWarmedRef.current) {
                hasWarmedRef.current = true;

                // First playback on some Android devices is silent. Warm up then immediately replay audibly.
                await sound.setVolumeAsync(0);
                await sound.replayAsync();

                // Give the audio engine a moment to warm up before the first audible replay.
                await new Promise<void>((resolve) => setTimeout(resolve, 120));

                if (options?.rateRange) {
                    const [min, max] = options.rateRange;
                    const rate = Math.min(max, Math.max(min, Math.random() * (max - min) + min));
                    await sound.setRateAsync(rate, true);
                }

                await sound.setVolumeAsync(targetVolume);
                await sound.replayAsync();
                return;
            }

            if (options?.rateRange) {
                const [min, max] = options.rateRange;
                const rate = Math.min(max, Math.max(min, Math.random() * (max - min) + min));
                await sound.setRateAsync(rate, true);
            }

            await sound.setVolumeAsync(targetVolume);
            await sound.replayAsync();
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
                const { sound: firstSound } = await Audio.Sound.createAsync(source, {
                    shouldPlay: false,
                    volume: targetVolume,
                });

                if (!mounted) {
                    await firstSound.unloadAsync();
                    return;
                }

                soundsRef.current = [firstSound];

                if (pendingPlayRef.current) {
                    pendingPlayRef.current = false;
                    await performPlay(firstSound);
                } else if (options?.autoWarm ?? true) {
                    try {
                        if (!hasWarmedRef.current) {
                            hasWarmedRef.current = true;
                            await firstSound.setVolumeAsync(0);
                            await firstSound.replayAsync();
                            await new Promise<void>((resolve) => setTimeout(resolve, 120));
                            await firstSound.setVolumeAsync(targetVolume);
                        }
                    } catch (err) {
                        console.warn(`[sound] Failed to warm${debugName ? ` (${debugName})` : ''}:`, err);
                    }
                }

                // Load the rest in the background to build the pool.
                const restPromises: Promise<Audio.Sound>[] = [];
                for (let i = 1; i < poolSize; i += 1) {
                    restPromises.push(
                        Audio.Sound.createAsync(source, {
                            shouldPlay: false,
                            volume: targetVolume,
                        }).then(({ sound }) => sound)
                    );
                }

                const rest = await Promise.all(restPromises);
                if (mounted) {
                    soundsRef.current = [firstSound, ...rest];
                } else {
                    await Promise.all(rest.map((s) => s.unloadAsync()));
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
            sounds.forEach((s) => {
                s.unloadAsync().catch(() => {});
            });
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
