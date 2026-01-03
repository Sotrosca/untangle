import React, { useEffect, useState } from "react";
import {
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import {
    Gesture,
    GestureDetector,
    GestureHandlerRootView,
} from "react-native-gesture-handler";
import Svg, { Circle, Line } from "react-native-svg";
import { doIntersect, Point } from "../utils/geometry";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const NODE_RADIUS = 20;

interface GraphLevelProps {
    levelData: {
        id: number;
        nodes: { id: number; x: number; y: number }[];
        edges: { source: number; target: number }[];
    };
    onNextLevel: () => void;
}

const GraphLevel: React.FC<GraphLevelProps> = ({ levelData, onNextLevel }) => {
    // State to hold current positions of nodes
    const [nodes, setNodes] = useState<{ [key: number]: Point }>({});
    // State to hold intersecting edges (set of edge indices)
    const [intersectingEdges, setIntersectingEdges] = useState<Set<number>>(
        new Set()
    );
    const [isLevelComplete, setIsLevelComplete] = useState(false);

    // Initialize nodes from level data
    useEffect(() => {
        const initialNodes: { [key: number]: Point } = {};
        levelData.nodes.forEach((node) => {
            initialNodes[node.id] = { x: node.x, y: node.y };
        });
        setNodes(initialNodes);
        // Initial check
        checkIntersections(initialNodes);
    }, [levelData]);

    const checkIntersections = (currentNodes: { [key: number]: Point }) => {
        const newIntersectingEdges = new Set<number>();
        const edges = levelData.edges;

        // Check every pair of edges
        for (let i = 0; i < edges.length; i++) {
            for (let j = i + 1; j < edges.length; j++) {
                const edge1 = edges[i];
                const edge2 = edges[j];

                const p1 = currentNodes[edge1.source];
                const p2 = currentNodes[edge1.target];
                const p3 = currentNodes[edge2.source];
                const p4 = currentNodes[edge2.target];

                if (doIntersect(p1, p2, p3, p4)) {
                    newIntersectingEdges.add(i);
                    newIntersectingEdges.add(j);
                }
            }
        }

        setIntersectingEdges(newIntersectingEdges);

        if (newIntersectingEdges.size === 0) {
            setIsLevelComplete(true);
        } else {
            setIsLevelComplete(false);
        }
    };

    const handleNodeDrag = (
        id: number,
        translationX: number,
        translationY: number
    ) => {
        setNodes((prevNodes) => {
            const newNodes = {
                ...prevNodes,
                [id]: {
                    x: Math.max(
                        NODE_RADIUS,
                        Math.min(
                            SCREEN_WIDTH - NODE_RADIUS,
                            prevNodes[id].x + translationX
                        )
                    ),
                    y: Math.max(
                        NODE_RADIUS,
                        Math.min(
                            SCREEN_HEIGHT - NODE_RADIUS,
                            prevNodes[id].y + translationY
                        )
                    ),
                },
            };
            // We need to check intersections on every frame/update for visual feedback
            // For better performance, we could debounce this or use runOnJS with Reanimated
            checkIntersections(newNodes);
            return newNodes;
        });
    };

    // We need a way to track the start position for the gesture
    // Since we are using functional updates, we can just use the delta
    // But Gesture.Pan().onChange gives delta.

    // Helper to create a gesture for a node
    const Node = ({ id, x, y }: { id: number; x: number; y: number }) => {
        const pan = Gesture.Pan().onUpdate((e) => {
            // This is a bit heavy for the JS thread, but for < 20 nodes it's fine.
            // In a real production app with many nodes, we would use Reanimated SharedValues.
            // Here we update state directly to trigger re-render of lines.
            setNodes((prev) => {
                const next = { ...prev };
                next[id] = {
                    x: prev[id].x + e.changeX,
                    y: prev[id].y + e.changeY,
                };
                checkIntersections(next);
                return next;
            });
        });

        return (
            <GestureDetector gesture={pan}>
                <Circle
                    cx={x}
                    cy={y}
                    r={NODE_RADIUS}
                    fill="#3498db"
                    stroke="#2980b9"
                    strokeWidth={2}
                />
            </GestureDetector>
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Level {levelData.id}</Text>
            <GestureHandlerRootView style={styles.graphContainer}>
                <Svg height="100%" width="100%">
                    {/* Render Edges */}
                    {levelData.edges.map((edge, index) => {
                        const start = nodes[edge.source];
                        const end = nodes[edge.target];
                        if (!start || !end) return null;

                        const isIntersecting = intersectingEdges.has(index);
                        return (
                            <Line
                                key={`edge-${index}`}
                                x1={start.x}
                                y1={start.y}
                                x2={end.x}
                                y2={end.y}
                                stroke={isIntersecting ? "#e74c3c" : "#2ecc71"} // Red if intersecting, Green if clean
                                strokeWidth={3}
                            />
                        );
                    })}

                    {/* Render Nodes */}
                    {Object.entries(nodes).map(([id, point]) => (
                        <Node
                            key={id}
                            id={parseInt(id)}
                            x={point.x}
                            y={point.y}
                        />
                    ))}
                </Svg>
            </GestureHandlerRootView>

            {/* Level Clear Modal */}
            <Modal visible={isLevelComplete} transparent animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalText}>Level Clear!</Text>
                        <TouchableOpacity
                            style={styles.button}
                            onPress={onNextLevel}>
                            <Text style={styles.buttonText}>Next Level</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#ecf0f1",
        paddingTop: 50,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 20,
        color: "#2c3e50",
    },
    graphContainer: {
        flex: 1,
    },
    modalContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    modalContent: {
        backgroundColor: "white",
        padding: 30,
        borderRadius: 20,
        alignItems: "center",
        elevation: 5,
    },
    modalText: {
        fontSize: 30,
        fontWeight: "bold",
        color: "#27ae60",
        marginBottom: 20,
    },
    button: {
        backgroundColor: "#3498db",
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
    },
    buttonText: {
        color: "white",
        fontSize: 18,
        fontWeight: "bold",
    },
});

export default GraphLevel;
