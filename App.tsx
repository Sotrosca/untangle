import "react-native-gesture-handler";
import { useState, useEffect } from "react";
import { Alert, Dimensions, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import GraphLevel from "./src/components/GraphLevel";
import levels from "./src/data/levels.json";
import { generateLevel, LevelData } from "./src/utils/levelGenerator";

const { width, height } = Dimensions.get("window");

export default function App() {
    const [levelIndex, setLevelIndex] = useState(0);
    const [currentLevelData, setCurrentLevelData] = useState<LevelData>(levels[0]);
    const [totalScore, setTotalScore] = useState(0);

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
    }
});
