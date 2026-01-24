import "react-native-gesture-handler";
import { useState, useEffect, useRef } from "react";
import { Alert, Dimensions, SafeAreaView, StyleSheet, Text, TouchableOpacity, View, AppState, AppStateStatus } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Audio } from 'expo-av';
import GraphLevel from "./src/components/GraphLevel";
import levels from "./src/data/levels.json";
import { generateLevel, LevelData } from "./src/utils/levelGenerator";
import { useSoundPool } from "./src/hooks/useSoundPool";

const { width, height } = Dimensions.get("window");

export default function App() {
    const [isInMenu, setIsInMenu] = useState(true);
    const [hapticsEnabled, setHapticsEnabled] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [levelIndex, setLevelIndex] = useState(0);
    const [currentLevelData, setCurrentLevelData] = useState<LevelData>(levels[0]);
    const [totalScore, setTotalScore] = useState(0);

    // Expo Audio Players (New API) with Pooling
    const playPick = useSoundPool(
        require("./assets/sounds/pick.wav"),
        'PICK',
        { volume: 0.7, rateRange: [0.98, 1.02] }
    );
    const playDrop = useSoundPool(
        require("./assets/sounds/drop.wav"),
        'DROP',
        { volume: 0.7, rateRange: [0.95, 1.03] }
    );

    // Configure audio session on mount
    useEffect(() => {
        const configureAudio = async () => {
            try {
                await Audio.setAudioModeAsync({
                    playsInSilentModeIOS: true,
                    staysActiveInBackground: false,
                });
            } catch (err) {
                console.warn("Audio mode setup failed", err);
            }
        };

        configureAudio();
    }, []);

    useEffect(() => {
        if (levelIndex < levels.length) {
            // Story Mode
            setCurrentLevelData(levels[levelIndex]);
        } else {
            // Infinite Mode
            const difficultyMultiplier = Math.floor((levelIndex - levels.length) / 2);
            const baseNodes = 6;
            const nodeCount = Math.min(baseNodes + difficultyMultiplier, 12); // Max 12 nodes prevents chaos
            
            const newLevel = generateLevel(levelIndex + 1, nodeCount, width, height);
            setCurrentLevelData(newLevel);
        }
    }, [levelIndex]);

    const handleNextLevel = (scoreEarned: number) => {
        setTotalScore(prev => prev + scoreEarned);

        if (levelIndex === levels.length - 1) {
            Alert.alert(
                "Story Complete!",
                "You've finished the main levels. Entering Infinite Mode.",
                [{ text: "Let's Go!", onPress: () => setLevelIndex(prev => prev + 1) }]
            );
        } else {
            setLevelIndex(prev => prev + 1);
        }
    };

    if (isInMenu) {
        return (
            <SafeAreaView style={styles.menuContainer}>
                <Text style={styles.menuTitle}>Untangle</Text>
                
                <TouchableOpacity 
                    style={styles.menuButton} 
                    onPress={() => setIsInMenu(false)}
                >
                    <Text style={styles.menuButtonText}>Start Game</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.menuButton, styles.settingsButton]} 
                    onPress={() => setHapticsEnabled(!hapticsEnabled)}
                >
                    <Text style={styles.menuButtonText}>
                        Vibration: {hapticsEnabled ? "ON" : "OFF"}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.menuButton, styles.settingsButton]} 
                    onPress={() => setSoundEnabled(!soundEnabled)}
                >
                    <Text style={styles.menuButtonText}>
                        Sound: {soundEnabled ? "ON" : "OFF"}
                    </Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                     <Text style={styles.modeText}>
                                {levelIndex < levels.length ? "Story Mode" : "Infinite Mode"}
                     </Text>
                </View>
                <GraphLevel
                    key={levelIndex} // Force re-render on level change
                    levelData={currentLevelData}
                    totalScore={totalScore}
                    hapticsEnabled={hapticsEnabled}
                    soundEnabled={soundEnabled}
                    playPick={playPick}
                    playDrop={playDrop}
                    onNextLevel={handleNextLevel}
                />
            </SafeAreaView>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#ecf0f1",
    },
    header: {
        padding: 10,
        alignItems: 'center',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    modeText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#7f8c8d'
    },
    menuContainer: {
        flex: 1,
        backgroundColor: "#ecf0f1",
        justifyContent: "center",
        alignItems: "center",
    },
    menuTitle: {
        fontSize: 48,
        fontWeight: "bold",
        color: "#2c3e50",
        marginBottom: 60,
    },
    menuButton: {
        backgroundColor: "#27ae60",
        paddingHorizontal: 40,
        paddingVertical: 15,
        borderRadius: 30,
        marginBottom: 20,
        elevation: 5,
        minWidth: 200,
        alignItems: "center",
    },
    settingsButton: {
        backgroundColor: "#3498db",
    },
    menuButtonText: {
        color: "white",
        fontSize: 20,
        fontWeight: "bold",
    }
});
