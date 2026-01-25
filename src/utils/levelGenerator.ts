import { doIntersect, Point } from './geometry';

export interface LevelData {
    id: number;
    nodes: { id: number; x: number; y: number }[];
    edges: { source: number; target: number }[];
    targetMoves?: number;
}

/**
 * Generates a random planar graph level.
 * 
 * Strategy:
 * 1. Arrange nodes in a circle (Solved State).
 * 2. Connect adjacent nodes to form a loop (guaranteed planar).
 * 3. Add random non-intersecting chords (inner edges) to increase complexity.
 * 4. Shuffle the node positions randomly on the screen to "entangle" the graph.
 */
export const generateLevel = (id: number, nodeCount: number, width: number, height: number): LevelData => {
    const nodes: { id: number; x: number; y: number }[] = [];
    const edges: { source: number; target: number }[] = [];
    
    // 1. Create nodes in a circle (Solved State visualization)
    // We use this "virtual" layout to determine valid edges
    const radius = Math.min(width, height) / 3;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Virtual positions for validity checking
    const solvedNodes: Point[] = [];

    for (let i = 0; i < nodeCount; i++) {
        const angle = (2 * Math.PI * i) / nodeCount;
        solvedNodes.push({
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle),
        });
        
        // The actual nodes will get random positions later
        nodes.push({ id: i, x: 0, y: 0 });
    }

    // 2. Connect the perimeter (Forms a cycle)
    for (let i = 0; i < nodeCount; i++) {
        edges.push({
            source: i,
            target: (i + 1) % nodeCount,
        });
    }

    // 3. Add random chords (inner edges)
    // Try to add extra edges without crossing existing ones in the SOLVED state
    const MAX_ATTEMPTS = nodeCount * 10;
    let attempts = 0;
    
    while (attempts < MAX_ATTEMPTS) {
        attempts++;
        const u = Math.floor(Math.random() * nodeCount);
        const v = Math.floor(Math.random() * nodeCount);

        // Conditions to skip:
        // - Same node
        if (u === v) continue;
        // - Adjacent nodes (already connected by perimeter)
        if (Math.abs(u - v) === 1 || Math.abs(u - v) === nodeCount - 1) continue;
        // - Edge already exists
        const exists = edges.some(e => 
            (e.source === u && e.target === v) || (e.source === v && e.target === u)
        );
        if (exists) continue;

        // Check intersection with ALL existing edges in the SOLVED layout
        const p1 = solvedNodes[u];
        const p2 = solvedNodes[v];
        
        let intersects = false;
        for (const edge of edges) {
            const p3 = solvedNodes[edge.source];
            const p4 = solvedNodes[edge.target];
            
            // Checking intersection on the circular layout guarantees planarity
            // Note: doIntersect returns true if endpoints touch, but we share endpoints.
            // We need to check strict intersection efficiently.
            // However, our doIntersect utility might handle shared points as 'false' or 'true'.
            // For a "chord" inside a polygon, we mainly care if it crosses another chord.
            
            // Basic filtering: if the new edge shares a point with an existing edge, it doesn't "cross" it in a blocking way
            // unless it overlaps (which we handled with 'exists' check).
            if (edge.source === u || edge.source === v || edge.target === u || edge.target === v) continue;

            if (doIntersect(p1, p2, p3, p4)) {
                intersects = true;
                break;
            }
        }

        if (!intersects) {
            edges.push({ source: u, target: v });
        }
    }

    const hasIntersection = (currentNodes: { id: number; x: number; y: number }[], currentEdges: { source: number; target: number }[]) => {
        for (let i = 0; i < currentEdges.length; i++) {
            for (let j = i + 1; j < currentEdges.length; j++) {
                const edge1 = currentEdges[i];
                const edge2 = currentEdges[j];

                const p1 = currentNodes[edge1.source];
                const p2 = currentNodes[edge1.target];
                const p3 = currentNodes[edge2.source];
                const p4 = currentNodes[edge2.target];

                if (p1 && p2 && p3 && p4 && doIntersect(p1, p2, p3, p4)) {
                    return true;
                }
            }
        }
        return false;
    };

    // 4. Shuffle positions ("Entangle" the graph)
    // Place nodes randomly within the screen bounds with some padding
    const padding = 50;
    const placeRandomPositions = () => {
        nodes.forEach(node => {
            node.x = padding + Math.random() * (width - 2 * padding);
            node.y = padding + Math.random() * (height - 2 * padding);
        });
    };

    const MAX_SHUFFLE_ATTEMPTS = 30;
    let shuffleAttempts = 0;
    let entangled = false;
    while (shuffleAttempts < MAX_SHUFFLE_ATTEMPTS && !entangled) {
        placeRandomPositions();
        entangled = hasIntersection(nodes, edges);
        shuffleAttempts += 1;
    }

    return {
        id,
        nodes,
        edges,
        targetMoves: nodeCount + 1,
    };
};
