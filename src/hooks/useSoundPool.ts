import { useAudioPlayer } from 'expo-audio';
import { useRef, useCallback } from 'react';
import { AudioSource } from 'expo-audio/build/Audio.types';

export function useSoundPool(source: AudioSource, debugName?: string) {
    // 5 players for better concurrency
    const p1 = useAudioPlayer(source);
    const p2 = useAudioPlayer(source);
    const p3 = useAudioPlayer(source);
    const p4 = useAudioPlayer(source);
    const p5 = useAudioPlayer(source);
    
    const playersRef = useRef([p1, p2, p3, p4, p5]);
    const indexRef = useRef(0);

    const play = useCallback(() => {
        const players = playersRef.current;
        const player = players[indexRef.current];
        indexRef.current = (indexRef.current + 1) % players.length;
        
        // Simple approach: reset and play
        player.seekTo(0);
        player.play();
    }, []);

    return play;
}
