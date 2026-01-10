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
const NODE_RADIUS = 18; // El círculo visual un poco más pequeño
const HIT_SLOP = 12;    // Área "invisible" extra para tocar

interface Point {
    x: number;
    y: number;
}

interface NodeProps {
    id: number;
    x: number;
    y: number;
    onDrag: (id: number, dx: number, dy: number) => void;
    onDragStart: () => void;
    onDragEnd: () => void;
}

const Node: React.FC<NodeProps> = React.memo(({ id, x, y, onDrag, onDragStart, onDragEnd }) => {
    const [isActive, setIsActive] = useState(false);

    const pan = Gesture.Pan()
        .runOnJS(true)
        .activeOffsetX([-10, 10]) // Pequeño margen antes de iniciar el arrastre
        .activeOffsetY([-10, 10])
        .onBegin(() => {
            setIsActive(true);
            onDragStart();
        })
        .onChange((e) => {
            onDrag(id, e.changeX, e.changeY);
        })
        .onFinalize(() => {
            setIsActive(false);
            onDragEnd();
        });

    const totalRadius = NODE_RADIUS + HIT_SLOP;

    // Rendering at integer coordinates prevents jitter
    const renderX = Math.round(x);
    const renderY = Math.round(y);

    return (
        <GestureDetector gesture={pan}>
            <View
                style={{
                    position: "absolute",
                    left: renderX - totalRadius,
                    top: renderY - totalRadius,
                    width: totalRadius * 2,
                    height: totalRadius * 2,
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: isActive ? 100 : 10,
                }}
            >
                <View
                    style={[
                        styles.node,
                        {
                            width: NODE_RADIUS * 2,
                            height: NODE_RADIUS * 2,
                            borderRadius: NODE_RADIUS,
                            transform: [{ scale: isActive ? 1.3 : 1 }],
                            backgroundColor: isActive ? "#5dade2" : "#3498db",
                        },
                    ]}
                />
            </View>
        </GestureDetector>
    );
});

interface EdgeProps {
    start: Point;
    end: Point;
    isIntersecting: boolean;
}

const Edge: React.FC<EdgeProps> = React.memo(({ start, end, isIntersecting }) => {
    // Rounding coordinates for rendering prevents anti-aliasing color flickering
    const x1 = Math.round(start.x);
    const y1 = Math.round(start.y);
    const x2 = Math.round(end.x);
    const y2 = Math.round(end.y);

    return (
        <Line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={isIntersecting ? "#ff0000" : "#00ff00"}
            strokeWidth={4}
            strokeOpacity={1}
            strokeLinecap="round"
            fill="none"
        />
    );
});

interface GraphLevelProps {
    levelData: {
        id: number;
        nodes: { id: number; x: number; y: number }[];
        edges: { source: number; target: number }[];
    };
    onNextLevel: () => void;
}

const GraphLevel: React.FC<GraphLevelProps> = ({ levelData, onNextLevel }) => {
    // State to hold current positions of nodes and which edges are intersecting
    const [gameState, setGameState] = useState<{
        nodes: { [key: number]: Point };
        intersectingEdges: Set<number>;
    }>({
        nodes: {},
        intersectingEdges: new Set(),
    });

    const [isLevelComplete, setIsLevelComplete] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // Initialize nodes from level data
    useEffect(() => {
        const initialNodes: { [key: number]: Point } = {};
        levelData.nodes.forEach((node) => {
            initialNodes[node.id] = { x: node.x, y: node.y };
        });
        
        const initialIntersections = calculateIntersections(initialNodes, levelData.edges);
        setGameState({
            nodes: initialNodes,
            intersectingEdges: initialIntersections,
        });
    }, [levelData]);

    const calculateIntersections = (currentNodes: { [key: number]: Point }, edges: any[]) => {
        const intersectionSet = new Set<number>();

        for (let i = 0; i < edges.length; i++) {
            for (let j = i + 1; j < edges.length; j++) {
                const edge1 = edges[i];
                const edge2 = edges[j];

                const p1 = currentNodes[edge1.source];
                const p2 = currentNodes[edge1.target];
                const p3 = currentNodes[edge2.source];
                const p4 = currentNodes[edge2.target];

                if (p1 && p2 && p3 && p4 && doIntersect(p1, p2, p3, p4)) {
                    intersectionSet.add(i);
                    intersectionSet.add(j);
                }
            }
        }
        return intersectionSet;
    };

    const handleNodeDrag = (id: number, dx: number, dy: number) => {
        setGameState((prev) => {
            const nextNodes = {
                ...prev.nodes,
                [id]: {
                    x: prev.nodes[id].x + dx,
                    y: prev.nodes[id].y + dy,
                },
            };
            const nextIntersections = calculateIntersections(nextNodes, levelData.edges);
            
            return {
                nodes: nextNodes,
                intersectingEdges: nextIntersections,
            };
        });
    };

    useEffect(() => {
        // If the user stops dragging and the graph is clean, complete the level
        if (!isDragging && gameState.intersectingEdges.size === 0 && Object.keys(gameState.nodes).length > 0) {
            setIsLevelComplete(true);
        }
    }, [isDragging, gameState.intersectingEdges]);

    const renderEdges = () => {
        const cleanEdges: React.ReactNode[] = [];
        const dirtyEdges: React.ReactNode[] = [];

        levelData.edges.forEach((edge, index) => {
            const start = gameState.nodes[edge.source];
            const end = gameState.nodes[edge.target];
            if (!start || !end) return;

            const isIntersecting = gameState.intersectingEdges.has(index);
            const edgeComponent = (
                <Edge
                    key={`edge-${index}`}
                    start={start}
                    end={end}
                    isIntersecting={isIntersecting}
                />
            );

            if (isIntersecting) {
                dirtyEdges.push(edgeComponent);
            } else {
                cleanEdges.push(edgeComponent);
            }
        });

        // Render clean (green) edges first, so dirty (red) edges are drawn on top
        return (
            <>
                {cleanEdges}
                {dirtyEdges}
            </>
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Level {levelData.id}</Text>
            <View style={styles.graphContainer}>
                {/* Svg only for lines */}
                <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
                    {renderEdges()}
                </Svg>

                {/* Nodes as interactive Views */}
                {Object.entries(gameState.nodes).map(([id, point]) => (
                    <Node
                        key={id}
                        id={parseInt(id)}
                        x={point.x}
                        y={point.y}
                        onDrag={handleNodeDrag}
                        onDragStart={() => setIsDragging(true)}
                        onDragEnd={() => setIsDragging(false)}
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
        backgroundColor: "#3498db",
        borderWidth: 2,
        borderColor: "#2980b9",
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
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
