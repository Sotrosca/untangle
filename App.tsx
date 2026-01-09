import "react-native-gesture-handler";
import { useState } from "react";
import { Alert, SafeAreaView, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import GraphLevel from "./src/components/GraphLevel";
import levels from "./src/data/levels.json";

export default function App() {
    const [currentLevelIndex, setCurrentLevelIndex] = useState(0);

    const handleNextLevel = () => {
        if (currentLevelIndex < levels.length - 1) {
            setCurrentLevelIndex(currentLevelIndex + 1);
        } else {
            Alert.alert(
                "Congratulations!",
                "You have completed all available levels.",
                [{ text: "Restart", onPress: () => setCurrentLevelIndex(0) }]
            );
        }
    };

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={styles.container}>
                <GraphLevel
                    key={currentLevelIndex} // Force re-render on level change to reset state
                    levelData={levels[currentLevelIndex]}
                    onNextLevel={handleNextLevel}
                />
            </SafeAreaView>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
});
