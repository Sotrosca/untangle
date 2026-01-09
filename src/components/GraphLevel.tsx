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
} from "react-native-gesture-handler";
import Svg, { Circle, Line } from "react-native-svg";
import { doIntersect, Point } from "../utils/geometry";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const NODE_RADIUS = 20;

interface Point {
    x: number;
    y: number;
}

interface NodeProps {
    id: number;
    x: number;
    y: number;
    onDrag: (id: number, dx: number, dy: number) => void;
}

const Node: React.FC<NodeProps> = ({ id, x, y, onDrag }) => {
    const pan = Gesture.Pan()
        .runOnJS(true)
        .activeOffsetX(0)
        .activeOffsetY(0)
        .onChange((e) => {
            onDrag(id, e.changeX, e.changeY);
        });

    return (
        <GestureDetector gesture={pan}>
            <View
                style={[
                    styles.node,
                    {
                        left: x - NODE_RADIUS,
                        top: y - NODE_RADIUS,
                    },
                ]}
            />
        </GestureDetector>
    );
};

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

                if (p1 && p2 && p3 && p4 && doIntersect(p1, p2, p3, p4)) {
                    newIntersectingEdges.add(i);
                    newIntersectingEdges.add(j);
                }
            }
        }

        setIntersectingEdges(newIntersectingEdges);

        if (newIntersectingEdges.size === 0 && Object.keys(currentNodes).length > 0) {
            setIsLevelComplete(true);
        } else {
            setIsLevelComplete(false);
        }
    };

    const handleNodeDrag = (id: number, dx: number, dy: number) => {
        setNodes((prev) => {
            const next = {
                ...prev,
                [id]: {
                    x: prev[id].x + dx,
                    y: prev[id].y + dy,
                },
            };
            checkIntersections(next);
            return next;
        });
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Level {levelData.id}</Text>
            <View style={styles.graphContainer}>
                {/* Svg only for lines */}
                <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
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
                                stroke={isIntersecting ? "#e74c3c" : "#2ecc71"}
                                strokeWidth={3}
                            />
                        );
                    })}
                </Svg>

                {/* Nodes as interactive Views */}
                {Object.entries(nodes).map(([id, point]) => (
                    <Node
                        key={id}
                        id={parseInt(id)}
                        x={point.x}
                        y={point.y}
                        onDrag={handleNodeDrag}
                    />
                ))}
            </View>

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
        position: "relative",
    },
    node: {
        position: "absolute",
        width: NODE_RADIUS * 2,
        height: NODE_RADIUS * 2,
        borderRadius: NODE_RADIUS,
        backgroundColor: "#3498db",
        borderWidth: 2,
        borderColor: "#2980b9",
        zIndex: 10,
        elevation: 10,
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
