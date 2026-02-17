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

    // Gets adjacent cells.
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
    update() {
        const nextCells = this.cells.map(row => [...row]);
        const processed = new Set();

        // Spawn new pixels dynamically
        this.spawnPixels(nextCells);

        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                const cell = this.cells[y][x];

                if (cell === PIXEL_TYPES.HAZARD && !processed.has(`${x},${y}`)) { // RED
                    // If this cell was overwritten by a spawn in nextCells, we still process the OLD red...
                    // But we should respect the spawn? No, old logic prevails. 
                    const neighbors = this.getNeighbors(x, y, this.cells);
                    const blackNeighbors = neighbors.filter(n => n && n.val === PIXEL_TYPES.EMPTY);
                    const greenNeighbors = neighbors.filter(n => n && n.val === PIXEL_TYPES.PLATFORM);

                    if (greenNeighbors.length === 1) {
                        const target = greenNeighbors[0];
                        // Identify and destroy the connected cluster
                        const cluster = this.getCluster(target.x, target.y, nextCells);
                        cluster.forEach(p => {
                            nextCells[p.y][p.x] = PIXEL_TYPES.EMPTY;
                        });
                    } else if (greenNeighbors.length > 1) {
                        const target = greenNeighbors[0];
                        nextCells[target.y][target.x] = PIXEL_TYPES.EMPTY; // Eat
                    } else if (blackNeighbors.length > 0) {
                        // Pick random neighbor to avoid just going Up (North)
                        const target = blackNeighbors[Math.floor(Math.random() * blackNeighbors.length)];
                        // Check if target is still valid in nextCells (might be spawned on)
                        if (nextCells[target.y][target.x] === PIXEL_TYPES.EMPTY) {
                            nextCells[target.y][target.x] = PIXEL_TYPES.HAZARD;
                            processed.add(`${target.x},${target.y}`);
                        }
                    } else {
                        // Stuck? Keep it.
                    }
                } else if (cell === PIXEL_TYPES.PLATFORM) { // GREEN
                    const neighbors = this.getNeighbors(x, y, this.cells);
                    const blackNeighbors = neighbors.filter(n => n && n.val === PIXEL_TYPES.EMPTY);

                    if (blackNeighbors.length > 0) {
                        const target = blackNeighbors[0];
                        if (nextCells[target.y][target.x] === PIXEL_TYPES.EMPTY) {
                            nextCells[target.y][target.x] = PIXEL_TYPES.PLATFORM; // Grow/Propagate
                        }
                    }
                }
            }
        }

        this.cells = nextCells;
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
