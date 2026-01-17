import { useCallback, useEffect, useRef, useState } from 'react';
import { Audio, AVPlaybackSource } from 'expo-av';

export type SoundPoolOptions = {
    volume?: number;            // 0..1
    rateRange?: [number, number]; // e.g., [0.97, 1.03] for subtle pitch variance
};

// Lightweight pooled sound player using expo-av for reliable playback
export function useSoundPool(source: AVPlaybackSource, debugName?: string, options?: SoundPoolOptions) {
    const [ready, setReady] = useState(false);
    const soundsRef = useRef<Audio.Sound[]>([]);
    const indexRef = useRef(0);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            try {
                const poolSize = 4;
                const created: Audio.Sound[] = [];
                const targetVolume = options?.volume ?? 1;

                for (let i = 0; i < poolSize; i += 1) {
                    const { sound } = await Audio.Sound.createAsync(source, {
                        shouldPlay: false,
                        volume: targetVolume,
                    });
                    created.push(sound);
                }

                if (mounted) {
                    soundsRef.current = created;
                    setReady(true);
                } else {
                    await Promise.all(created.map((s) => s.unloadAsync()));
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
        if (!ready) return;

        const sounds = soundsRef.current;
        if (!sounds.length) return;

        const idx = indexRef.current;
        indexRef.current = (idx + 1) % sounds.length;

        const sound = sounds[idx];
        try {
            // Small pitch/tempo variance to avoid sounding synthetic
            if (options?.rateRange) {
                const [min, max] = options.rateRange;
                const rate = Math.min(max, Math.max(min, Math.random() * (max - min) + min));
                await sound.setRateAsync(rate, true);
            }

            await sound.setPositionAsync(0);
            await sound.playAsync();
        } catch (err) {
            console.warn(`[sound] Failed to play${debugName ? ` (${debugName})` : ''}:`, err);
        }
    }, [ready, debugName, options?.rateRange]);

    return play;
}
