class Grid {
    // ======== INITIALIZATION ========
    constructor(size) {
        this.size = size;
        this.cells = [];
        this.init();
    }

    // Initializes the grid with random pixels.
    init() {
        this.cells = [];
        for (let y = 0; y < this.size; y++) {
            const row = [];
            for (let x = 0; x < this.size; x++) {
                // Dynamic generation:
                // Mostly empty (0), some Green (2), fewer Red (1)
                const rand = Math.random();
                if (rand > 0.95) row.push(PIXEL_TYPES.HAZARD); // 5% Red
                else if (rand > 0.8) row.push(PIXEL_TYPES.PLATFORM); // 15% Green
                else row.push(PIXEL_TYPES.EMPTY); // 80% Black
            }
            this.cells.push(row);
        }
        // Ensure player start position is safe (Circle shape based on radius)
        const cx = Math.floor(this.size / 2);
        const cy = Math.floor(this.size / 2);
        const radius = GAME_CONFIG.SAFE_ZONE_RADIUS;

        // Clear circle of radius
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
                if (dist <= radius) {
                    this.cells[y][x] = PIXEL_TYPES.EMPTY;
                }
            }
        }
    }

    // ======== UTILITIES ========
    // Gets value at specific coordinates.
    get(x, y) {
        if (x >= 0 && x < this.size && y >= 0 && y < this.size) {
            return this.cells[y][x];
        }
        return null;
    }

    getNeighbors(x, y, gridSnapshot) {
        // Order: Clockwise (N, E, S, W) -> Top, Right, Bottom, Left
        const neighbors = [];
        const coords = [
            { x: x, y: y - 1 }, // N
            { x: x + 1, y: y }, // E
            { x: x, y: y + 1 }, // S
            { x: x - 1, y: y }  // W
        ];

        for (let c of coords) {
            if (c.x >= 0 && c.x < this.size && c.y >= 0 && c.y < this.size) {
                neighbors.push({ x: c.x, y: c.y, val: gridSnapshot[c.y][c.x] });
            } else {
                neighbors.push(null); // Out of bounds
            }
        }
        return neighbors;
    }

    // Gets all 8 surrounding cells (Orthogonal + Diagonal)
    getAllNeighbors(x, y, gridSnapshot) {
        const neighbors = [];
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < this.size && ny >= 0 && ny < this.size) {
                    neighbors.push({ x: nx, y: ny, val: gridSnapshot[ny][nx] });
                } else {
                    neighbors.push(null);
                }
            }
        }
        return neighbors;
    }

    // ======== LOGIC ========
    // Spawns new pixels randomly.
    spawnPixels(cells) {
        // Dynamic generation "por la cuadricula"
        // Try to spawn a few times
        for (let i = 0; i < 3; i++) {
            const rx = Math.floor(Math.random() * this.size);
            const ry = Math.floor(Math.random() * this.size);

            // Only spawn in empty
            if (cells[ry][rx] === PIXEL_TYPES.EMPTY) {
                // Determine type based on rarity
                // Red < Green.
                // 5% chance to spawn SOMETHING this attempt?
                if (Math.random() < 0.2) { // 20% of 3 attempts = ~50% chance of spawn per tick
                    // Type:
                    if (Math.random() < 0.15) { // 15% Red
                        cells[ry][rx] = PIXEL_TYPES.HAZARD;
                    } else {
                        cells[ry][rx] = PIXEL_TYPES.PLATFORM; // 85% Green
                    }
                }
            }
        }
    }

    // Updates grid cellular automata.
    update(player) {
        // Initialize nextCells with EMPTY
        const nextCells = Array.from({ length: this.size }, () =>
            Array(this.size).fill(PIXEL_TYPES.EMPTY)
        );
        const processed = new Set();

        // PHASE 1: Wall Gravity (Bottom-Up)
        // Walls move first and claim their spot. They crush everything else.
        for (let y = this.size - 1; y >= 0; y--) {
            for (let x = 0; x < this.size; x++) {
                if (this.cells[y][x] === PIXEL_TYPES.WALL) {
                    const targetY = y + 1;
                    let blocked = false;

                    // Check bounds
                    if (targetY >= this.size) {
                        blocked = true; // Floor
                    } else {
                        // Check if blocked by another Wall or Player
                        // We check 'this.cells' for Walls to stack on stationary ones.
                        // (Simple gravity: stack on things that were walls last frame)
                        // Also check nextCells? If a wall fell there? 
                        // If we go bottom-up, the wall below us has already moved (if it could).
                        // If it moved, nextCells[y+1] has a wall.
                        // If it stayed, nextCells[y+1] has a wall.
                        // So checking nextCells[targetY][x] === WALL is the robust way for stacking.
                        if (nextCells[targetY][x] === PIXEL_TYPES.WALL) {
                            blocked = true;
                        }

                        // Check Player
                        if (player && player.x === x && player.y === targetY) {
                            blocked = true;
                        }
                    }

                    if (blocked) {
                        nextCells[y][x] = PIXEL_TYPES.WALL;
                    } else {
                        nextCells[targetY][x] = PIXEL_TYPES.WALL; // Move and crush
                    }
                }
            }
        }

        // PHASE 2: Other Pixels
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                const cell = this.cells[y][x];

                // If this cell spot in nextCells is already taken by a Wall, this pixel is crushed/overwritten.
                // Exception: If the wall moved FROM here, nextCells[y][x] is EMPTY (unless another wall moved in).
                // So we only skip if nextCells[y][x] is WALL.
                if (nextCells[y][x] === PIXEL_TYPES.WALL) continue;

                if (cell === PIXEL_TYPES.HAZARD && !processed.has(`${x},${y}`)) { // RED
                    // Logic...
                    const neighbors = this.getNeighbors(x, y, this.cells);
                    const blackNeighbors = neighbors.filter(n => n && n.val === PIXEL_TYPES.EMPTY);
                    const greenNeighbors = neighbors.filter(n => n && n.val === PIXEL_TYPES.PLATFORM);

                    if (greenNeighbors.length > 0) {
                        const target = greenNeighbors[0];
                        this.destroyArea(target.x, target.y, GAME_CONFIG.HAZARD_DESTRUCTION_RADIUS, nextCells);
                        // Also keep self?
                        if (nextCells[y][x] === PIXEL_TYPES.EMPTY) nextCells[y][x] = PIXEL_TYPES.HAZARD;
                    } else if (blackNeighbors.length > 0) {
                        const target = blackNeighbors[Math.floor(Math.random() * blackNeighbors.length)];
                        // Check collision in nextCells
                        if (nextCells[target.y][target.x] === PIXEL_TYPES.EMPTY) {
                            nextCells[target.y][target.x] = PIXEL_TYPES.HAZARD;
                            processed.add(`${target.x},${target.y}`);
                            // Keep self (Growth)
                            if (nextCells[y][x] === PIXEL_TYPES.EMPTY) nextCells[y][x] = PIXEL_TYPES.HAZARD;
                        } else {
                            // Blocked (by wall or something), stay
                            if (nextCells[y][x] === PIXEL_TYPES.EMPTY) nextCells[y][x] = PIXEL_TYPES.HAZARD;
                        }
                    } else {
                        // Stuck
                        if (nextCells[y][x] === PIXEL_TYPES.EMPTY) nextCells[y][x] = PIXEL_TYPES.HAZARD;
                    }

                } else if (cell === PIXEL_TYPES.PLATFORM) { // GREEN
                    // 1. Transformation
                    const allNeighbors = this.getAllNeighbors(x, y, this.cells);
                    const greenCount = allNeighbors.filter(n => n && n.val === PIXEL_TYPES.PLATFORM).length;
                    const isPlayerHere = player && player.x === x && player.y === y;

                    if (greenCount === 8 && !isPlayerHere) {
                        nextCells[y][x] = PIXEL_TYPES.WALL;
                    } else {
                        // Keep self
                        if (nextCells[y][x] === PIXEL_TYPES.EMPTY) nextCells[y][x] = PIXEL_TYPES.PLATFORM;

                        // 2. Propagation
                        const neighbors = this.getNeighbors(x, y, this.cells);
                        const blackNeighbors = neighbors.filter(n => n && n.val === PIXEL_TYPES.EMPTY);

                        if (blackNeighbors.length > 0) {
                            const target = blackNeighbors[0];
                            // Only propagate if space is empty in NEXT (not taken by wall/red)
                            if (nextCells[target.y][target.x] === PIXEL_TYPES.EMPTY) {
                                nextCells[target.y][target.x] = PIXEL_TYPES.PLATFORM;
                            }
                        }
                    }
                }
            }
        }

        // Check for overpopulation/infinite growth
        this.processOverpopulation(nextCells);

        this.cells = nextCells;
    }

    // Checks grid for clusters that are too large and removes them
    processOverpopulation(gridSnapshot) {
        const visited = new Set();
        const maxSize = GAME_CONFIG.MAX_CLUSTER_SIZE;

        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                const type = gridSnapshot[y][x];
                if (type !== PIXEL_TYPES.EMPTY && !visited.has(`${x},${y}`)) {
                    // Get cluster
                    const cluster = this.getCluster(x, y, gridSnapshot);

                    // Mark as visited
                    for (const cell of cluster) {
                        visited.add(`${cell.x},${cell.y}`);
                    }

                    // Check size
                    if (cluster.length > maxSize) {
                        const survivalChance = 1 / GAME_CONFIG.CLUSTER_SURVIVAL_RATIO;
                        // Destroy most, keep some
                        for (const cell of cluster) {
                            if (Math.random() > survivalChance) {
                                gridSnapshot[cell.y][cell.x] = PIXEL_TYPES.EMPTY;
                            }
                        }
                    }
                }
            }
        }
    }

    // Destroys pixels within a radius of the target coordinates
    destroyArea(cx, cy, radius, gridSnapshot) {
        for (let y = cy - radius; y <= cy + radius; y++) {
            for (let x = cx - radius; x <= cx + radius; x++) {
                if (x >= 0 && x < this.size && y >= 0 && y < this.size) {
                    const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
                    if (dist <= radius) {
                        if (gridSnapshot[y][x] === PIXEL_TYPES.PLATFORM) {
                            gridSnapshot[y][x] = PIXEL_TYPES.EMPTY;
                        }
                    }
                }
            }
        }
    }

    // Returns a cluster of connected pixels of the same type
    getCluster(x, y, gridSnapshot) {
        const cluster = [];
        const targetType = gridSnapshot[y][x];
        if (targetType === PIXEL_TYPES.EMPTY) return cluster; // Don't cluster empty space for now

        const stack = [{ x, y }];
        const visited = new Set();
        visited.add(`${x},${y}`);

        while (stack.length > 0) {
            const cur = stack.pop();

            // Add to cluster
            cluster.push(cur);

            // Check neighbors
            const neighbors = [
                { x: cur.x, y: cur.y - 1 },
                { x: cur.x + 1, y: cur.y },
                { x: cur.x, y: cur.y + 1 },
                { x: cur.x - 1, y: cur.y }
            ];

            for (const n of neighbors) {
                if (n.x >= 0 && n.x < this.size && n.y >= 0 && n.y < this.size) {
                    const key = `${n.x},${n.y}`;
                    if (!visited.has(key) && gridSnapshot[n.y][n.x] === targetType) {
                        visited.add(key);
                        stack.push(n);
                    }
                }
            }
        }
        return cluster;
    }
}
