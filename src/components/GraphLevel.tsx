import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Platform,
    Vibration,
} from "react-native";
import {
    Gesture,
    GestureDetector,
} from "react-native-gesture-handler";
import Svg, { Line } from "react-native-svg";
import * as Haptics from 'expo-haptics';
import { doIntersect, Point } from "../utils/geometry";
const NODE_RADIUS = 18; // Slightly smaller visual circle
const HIT_SLOP = 12;    // Extra invisible touch area for input

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

    // Optimized: using useMemo so the gesture handler doesn't get re-created on every render
    const pan = useMemo(() => Gesture.Pan()
        .runOnJS(true)
        .activeOffsetX([-10, 10]) // Small drag threshold before activation
        .activeOffsetY([-10, 10])
        .onTouchesDown(() => {
            setIsActive(true);
            onDragStart();
        })
        .onChange((e) => {
            onDrag(id, e.changeX, e.changeY);
        })
        .onFinalize(() => {
            setIsActive(false);
            onDragEnd();
        }), [id, onDrag, onDragStart, onDragEnd]);

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
        targetMoves?: number;
    };
    totalScore: number;
    hapticsEnabled: boolean;
    soundEnabled: boolean;
    playPick: () => void;
    playDrop: () => void;
    onNextLevel: (score: number) => void;
}

const GraphLevel: React.FC<GraphLevelProps> = ({ 
    levelData, 
    totalScore, 
    hapticsEnabled, 
    soundEnabled, 
    playPick,
    playDrop,
    onNextLevel 
}) => {
    const playSound = useCallback((fn?: () => void) => {
        if (soundEnabled) fn?.();
    }, [soundEnabled]);

    const hapticImpact = useCallback((style: Haptics.ImpactFeedbackStyle, androidMs: number) => {
        if (!hapticsEnabled) return;
        if (Platform.OS === 'android') {
            Vibration.vibrate(androidMs);
            return;
        }
        Haptics.impactAsync(style).catch(() => Vibration.vibrate(androidMs));
    }, [hapticsEnabled]);

    const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);
    // State to hold current positions of nodes and which edges are intersecting
    const [gameState, setGameState] = useState<{
        nodes: { [key: number]: Point };
        intersectingEdges: Set<number>;
        intersectionCounts: number[];
    }>({
        nodes: {},
        intersectingEdges: new Set(),
        intersectionCounts: [],
    });

    const [isLevelComplete, setIsLevelComplete] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    
    // Gamification State
    const [moves, setMoves] = useState(0);
    const [seconds, setSeconds] = useState(0);
    const [stars, setStars] = useState(0);
    const [levelScore, setLevelScore] = useState(0);
    const [scoreBreakdown, setScoreBreakdown] = useState<{ baseScore: number; timePenalty: number; movePenalty: number; finalScore: number } | null>(null);
    const remainingIntersections = gameState.intersectingEdges.size;


    // Timer
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (!isLevelComplete) {
            interval = setInterval(() => {
                setSeconds(s => s + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isLevelComplete]);

    const initializeLevel = useCallback(() => {
        if (!containerSize) return;

        const initialNodes: { [key: number]: Point } = {};

        // 1. Calculate bounding box of the original data
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        if (levelData.nodes.length > 0) {
            levelData.nodes.forEach((n) => {
                minX = Math.min(minX, n.x);
                maxX = Math.max(maxX, n.x);
                minY = Math.min(minY, n.y);
                maxY = Math.max(maxY, n.y);
            });
        } else {
             minX = 0; maxX = 100; minY = 0; maxY = 100;
        }

        const dataWidth = maxX - minX || 1;
        const dataHeight = maxY - minY || 1;
        const dataCenterX = (minX + maxX) / 2;
        const dataCenterY = (minY + maxY) / 2;

        // 2. Determine available graph space from measured container
        const PADDING = 40;
        const availWidth = containerSize.width - (PADDING * 2);
        const availHeight = containerSize.height - (PADDING * 2);

        // 3. Calculate Scale Factor
        const scaleX = availWidth / dataWidth;
        const scaleY = availHeight / dataHeight;
        // Check nan
        const safeScaleX = isFinite(scaleX) ? scaleX : 1;
        const safeScaleY = isFinite(scaleY) ? scaleY : 1;
        
        // Use the smaller scale to fit both dimensions
        // Cap at 1.6 to ensure it doesn't look ridiculously large on simple levels
        const scale = Math.min(safeScaleX, safeScaleY, 1.6); 

        // 4. Center logic
        // Center of the graph container area
        // We add specific vertical offset to push it slightly down from the very top edge
        const screenCenterX = containerSize.width / 2;
        const screenCenterY = containerSize.height / 2;

        levelData.nodes.forEach((node) => {
            initialNodes[node.id] = { 
                x: screenCenterX + (node.x - dataCenterX) * scale,
                y: screenCenterY + (node.y - dataCenterY) * scale
            };
        });
        
        const initialIntersections = calculateIntersections(initialNodes, levelData.edges);
        setGameState({
            nodes: initialNodes,
            intersectingEdges: initialIntersections.intersectingEdges,
            intersectionCounts: initialIntersections.intersectionCounts,
        });

        // Reset Gamification Stats
        setMoves(0);
        setSeconds(0);
        setIsLevelComplete(false);
        setStars(0);
        setLevelScore(0);
        setScoreBreakdown(null);
    }, [levelData, containerSize]);

    // Initialize nodes from level data with auto-scaling and centering once layout is known
    useEffect(() => {
        initializeLevel();
    }, [initializeLevel]);

    const handleResetLevel = useCallback(() => {
        setIsLevelComplete(false);
        initializeLevel();
    }, [initializeLevel]);

    const calculateIntersections = (currentNodes: { [key: number]: Point }, edges: any[]) => {
        const intersectionSet = new Set<number>();
        const intersectionCounts = new Array(edges.length).fill(0);

        for (let i = 0; i < edges.length; i++) {
            for (let j = i + 1; j < edges.length; j++) {
                const edge1 = edges[i];
                const edge2 = edges[j];

                const p1 = currentNodes[edge1.source];
                const p2 = currentNodes[edge1.target];
                const p3 = currentNodes[edge2.source];
                const p4 = currentNodes[edge2.target];

                if (p1 && p2 && p3 && p4 && doIntersect(p1, p2, p3, p4)) {
                    intersectionCounts[i] += 1;
                    intersectionCounts[j] += 1;
                }
            }
        }

        for (let i = 0; i < intersectionCounts.length; i++) {
            if (intersectionCounts[i] > 0) intersectionSet.add(i);
        }

        return { intersectingEdges: intersectionSet, intersectionCounts };
    };

    const handleNodeDrag = useCallback((id: number, dx: number, dy: number) => {
        setGameState((prev) => {
            const nextNodes = {
                ...prev.nodes,
                [id]: {
                    x: prev.nodes[id].x + dx,
                    y: prev.nodes[id].y + dy,
                },
            };

            const affectedEdges: number[] = [];
            for (let i = 0; i < levelData.edges.length; i++) {
                const edge = levelData.edges[i];
                if (edge.source === id || edge.target === id) {
                    affectedEdges.push(i);
                }
            }

            if (affectedEdges.length === 0) {
                return prev;
            }

            const nextCounts = prev.intersectionCounts.slice();
            const affectedSet = new Set(affectedEdges);

            for (const i of affectedEdges) {
                const edge1 = levelData.edges[i];

                for (let j = 0; j < levelData.edges.length; j++) {
                    if (i === j) continue;
                    if (affectedSet.has(j) && j < i) continue;
                    const edge2 = levelData.edges[j];

                    const prevP1 = prev.nodes[edge1.source];
                    const prevP2 = prev.nodes[edge1.target];
                    const prevP3 = prev.nodes[edge2.source];
                    const prevP4 = prev.nodes[edge2.target];

                    const nextP1 = nextNodes[edge1.source];
                    const nextP2 = nextNodes[edge1.target];
                    const nextP3 = nextNodes[edge2.source];
                    const nextP4 = nextNodes[edge2.target];

                    if (!prevP1 || !prevP2 || !prevP3 || !prevP4 || !nextP1 || !nextP2 || !nextP3 || !nextP4) {
                        continue;
                    }

                    const prevIntersect = doIntersect(prevP1, prevP2, prevP3, prevP4);
                    const nextIntersect = doIntersect(nextP1, nextP2, nextP3, nextP4);

                    if (prevIntersect === nextIntersect) continue;

                    if (prevIntersect) {
                        nextCounts[i] = Math.max(0, nextCounts[i] - 1);
                        nextCounts[j] = Math.max(0, nextCounts[j] - 1);
                    }

                    if (nextIntersect) {
                        nextCounts[i] += 1;
                        nextCounts[j] += 1;
                    }
                }
            }

            const nextIntersections = new Set<number>();
            for (let i = 0; i < nextCounts.length; i++) {
                if (nextCounts[i] > 0) nextIntersections.add(i);
            }

            return {
                nodes: nextNodes,
                intersectingEdges: nextIntersections,
                intersectionCounts: nextCounts,
            };
        });
    }, [levelData.edges]);

    const handleDragStart = useCallback(() => {
        playSound(playPick);
        setIsDragging(true);
        hapticImpact(Haptics.ImpactFeedbackStyle.Light, 60);
    }, [playSound, hapticImpact]);

    const handleDragEnd = useCallback(() => {
        playSound(playDrop);
        setIsDragging(false);
        setMoves(m => m + 1);
        hapticImpact(Haptics.ImpactFeedbackStyle.Medium, 80);
    }, [playSound, hapticImpact, playDrop]);

    useEffect(() => {
        if (isLevelComplete) return;

        // If the user stops dragging and the graph is clean, complete the level
        if (!isDragging && gameState.intersectingEdges.size === 0 && Object.keys(gameState.nodes).length > 0) {
            
            // Success Haptics (Heavy)
            hapticImpact(Haptics.ImpactFeedbackStyle.Heavy, 120);
            
            // Calculate Stars based on moves (5 Star System)
            const nodeCount = levelData.nodes.length;
            let calculatedStars = 1;
            
            if (moves <= nodeCount + 1) calculatedStars = 5;       // Perfect + 1 slip
            else if (moves <= nodeCount * 1.5) calculatedStars = 4; // Great
            else if (moves <= nodeCount * 2) calculatedStars = 3;   // Good
            else if (moves <= nodeCount * 3) calculatedStars = 2;   // Okay
            else calculatedStars = 1;                               // Struggled
            
            // Calculate Score based on Stars and Time
            // Base Score from Stars + Time Efficiency Bonus
            const baseScore = calculatedStars * 200; 
            const timePenalty = Math.floor(seconds / 2); // Lose 1 point every 2 seconds
            const targetMoves = levelData.targetMoves ?? (nodeCount + 1);
            const excessMoves = Math.max(0, moves - targetMoves);
            const movePenalty = excessMoves * 5; // Lose 5 points per move beyond target
            const finalScore = Math.max(50, baseScore - timePenalty - movePenalty); // Minimum 50 pts

            setStars(calculatedStars);
            setLevelScore(finalScore);
            setScoreBreakdown({ baseScore, timePenalty, movePenalty, finalScore });
            setIsLevelComplete(true);
        }
    }, [isDragging, gameState.intersectingEdges, gameState.nodes, hapticImpact, isLevelComplete, levelData.nodes.length, moves, seconds]);

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
            <View style={styles.headerInfo}>
                <Text style={styles.title}>Level {levelData.id}</Text>
                <Text style={styles.totalScore}>Score: {totalScore}</Text>
            </View>
            <View style={styles.statsContainer}>
                <Text style={styles.statText}>Moves: {moves}/{levelData.targetMoves ?? (levelData.nodes.length + 1)}</Text>
                <Text style={styles.statText}>Time: {seconds}s</Text>
                <Text style={styles.statText}>Intersections: {remainingIntersections}</Text>
            </View>
            <View style={styles.controlsRow}>
                <TouchableOpacity style={styles.resetButton} onPress={handleResetLevel}>
                    <Text style={styles.resetButtonText}>Reset Level</Text>
                </TouchableOpacity>
            </View>
            <View
                style={styles.graphContainer}
                onLayout={(e) => {
                    const { width, height } = e.nativeEvent.layout;
                    setContainerSize({ width, height });
                }}
            >
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
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    />
                ))}
            </View>

            {/* Level Clear Modal */}
            <Modal visible={isLevelComplete} transparent animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Level Complete</Text>
                            <Text style={styles.stars}>{"⭐".repeat(stars)}</Text>
                        </View>

                        <View style={styles.scoreBlock}>
                            <Text style={styles.scoreLabel}>Score</Text>
                            <Text style={styles.scoreValue}>{levelScore}</Text>
                        </View>

                        {scoreBreakdown && (
                            <View style={styles.breakdownBlock}>
                                <Text style={styles.sectionTitle}>Score Breakdown</Text>
                                <View style={styles.breakdownRow}>
                                    <Text style={styles.rowLabel}>Stars</Text>
                                    <Text style={styles.rowValue}>{stars} x 200 = {scoreBreakdown.baseScore}</Text>
                                </View>
                                <View style={styles.breakdownRow}>
                                    <Text style={styles.rowLabel}>Time penalty</Text>
                                    <Text style={styles.rowValue}>-{scoreBreakdown.timePenalty}</Text>
                                </View>
                                <View style={styles.breakdownRow}>
                                    <Text style={styles.rowLabel}>Move penalty</Text>
                                    <Text style={styles.rowValue}>-{scoreBreakdown.movePenalty}</Text>
                                </View>
                            </View>
                        )}

                        <View style={styles.metaBlock}>
                                <Text style={styles.sectionTitle}>Performance</Text>
                                <View style={styles.breakdownRow}>
                                    <Text style={styles.rowLabel}>Moves</Text>
                                    <Text style={styles.rowValue}>{moves}/{levelData.targetMoves ?? (levelData.nodes.length + 1)}</Text>
                                </View>
                            <View style={styles.breakdownRow}>
                                <Text style={styles.rowLabel}>Time</Text>
                                <Text style={styles.rowValue}>{seconds}s</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.button}
                            onPress={() => onNextLevel(levelScore)}>
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
        paddingTop: 10,
    },
    headerInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 5,
    },
    totalScore: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#f39c12", // Gold color for score
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#2c3e50",
    },
    statsContainer: {
        flexDirection: "row",
        justifyContent: "space-between", // Spread out
        marginBottom: 10,
        paddingHorizontal: 20,
        backgroundColor: "#fff",
        paddingVertical: 8,
        marginHorizontal: 20,
        borderRadius: 10,
        elevation: 2,
    },
    statText: {
        fontSize: 16,
        color: "#34495e",
        fontWeight: "600",
    },
    controlsRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        paddingHorizontal: 20,
        marginBottom: 8,
    },
    resetButton: {
        backgroundColor: "#e74c3c",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: "center",
    },
    resetButtonText: {
        color: "white",
        fontSize: 14,
        fontWeight: "700",
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
        paddingVertical: 24,
        paddingHorizontal: 22,
        borderRadius: 20,
        alignItems: "stretch",
        elevation: 6,
        width: "88%",
        maxWidth: 420,
    },
    modalHeader: {
        alignItems: "center",
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 26,
        fontWeight: "700",
        color: "#27ae60",
        marginBottom: 6,
    },
    stars: {
        fontSize: 32,
    },
    scoreBlock: {
        backgroundColor: "#f8f9fb",
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignItems: "center",
        marginBottom: 16,
    },
    scoreLabel: {
        fontSize: 14,
        color: "#7f8c8d",
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 4,
    },
    scoreValue: {
        fontSize: 28,
        fontWeight: "800",
        color: "#2c3e50",
    },
    breakdownBlock: {
        borderTopWidth: 1,
        borderTopColor: "#ecf0f1",
        paddingTop: 12,
        marginBottom: 12,
    },
    metaBlock: {
        borderTopWidth: 1,
        borderTopColor: "#ecf0f1",
        paddingTop: 12,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: "#34495e",
        marginBottom: 8,
        textTransform: "uppercase",
        letterSpacing: 0.8,
    },
    breakdownRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 4,
    },
    rowLabel: {
        fontSize: 15,
        color: "#7f8c8d",
    },
    rowValue: {
        fontSize: 16,
        fontWeight: "600",
        color: "#2c3e50",
    },
    button: {
        backgroundColor: "#3498db",
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: "center",
    },
    buttonText: {
        color: "white",
        fontSize: 18,
        fontWeight: "bold",
    },
});

export default GraphLevel;
