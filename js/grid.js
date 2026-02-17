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
                if (rand > 0.95) row.push(1); // 5% Red
                else if (rand > 0.8) row.push(2); // 15% Green
                else row.push(0); // 80% Black
            }
            this.cells.push(row);
        }
        // Ensure player start position is safe
        this.cells[12][12] = 0;
        this.cells[12][11] = 0;
        this.cells[12][13] = 0;
        this.cells[11][12] = 0;
        this.cells[13][12] = 0;
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
            if (cells[ry][rx] === 0) {
                // Determine type based on rarity
                // Red < Green.
                // 5% chance to spawn SOMETHING this attempt?
                if (Math.random() < 0.2) { // 20% of 3 attempts = ~50% chance of spawn per tick
                    // Type:
                    if (Math.random() < 0.15) { // 15% Red
                        cells[ry][rx] = 1;
                    } else {
                        cells[ry][rx] = 2; // 85% Green
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

                if (cell === 1 && !processed.has(`${x},${y}`)) { // RED
                    // If this cell was overwritten by a spawn in nextCells, we still process the OLD red...
                    // But we should respect the spawn? No, old logic prevails. 
                    const neighbors = this.getNeighbors(x, y, this.cells);
                    const blackNeighbors = neighbors.filter(n => n && n.val === 0);
                    const greenNeighbors = neighbors.filter(n => n && n.val === 2);

                    if (greenNeighbors.length === 1) {
                        const target = greenNeighbors[0];
                        this.destroyConnectedGreens(target.x, target.y, nextCells);
                    } else if (greenNeighbors.length > 1) {
                        const target = greenNeighbors[0];
                        nextCells[target.y][target.x] = 0; // Eat
                    } else if (blackNeighbors.length > 0) {
                        // Pick random neighbor to avoid just going Up (North)
                        const target = blackNeighbors[Math.floor(Math.random() * blackNeighbors.length)];
                        // Check if target is still valid in nextCells (might be spawned on)
                        if (nextCells[target.y][target.x] === 0) {
                            nextCells[target.y][target.x] = 1;
                            processed.add(`${target.x},${target.y}`);
                        }
                    } else {
                        // Stuck? Keep it.
                    }
                } else if (cell === 2) { // GREEN
                    const neighbors = this.getNeighbors(x, y, this.cells);
                    const blackNeighbors = neighbors.filter(n => n && n.val === 0);

                    if (blackNeighbors.length > 0) {
                        const target = blackNeighbors[0];
                        if (nextCells[target.y][target.x] === 0) {
                            nextCells[target.y][target.x] = 2; // Grow/Propagate
                        }
                    }
                }
            }
        }

        this.cells = nextCells;
    }

    // Removes connected green pixels.
    destroyConnectedGreens(x, y, gridToUpdate) {
        // Flood fill to turn linked greens to black
        const stack = [{ x, y }];
        while (stack.length > 0) {
            const cur = stack.pop();
            if (cur.x >= 0 && cur.x < this.size && cur.y >= 0 && cur.y < this.size) {
                if (gridToUpdate[cur.y][cur.x] === 2) {
                    gridToUpdate[cur.y][cur.x] = 0;
                    // Add neighbors
                    stack.push({ x: cur.x, y: cur.y - 1 });
                    stack.push({ x: cur.x + 1, y: cur.y });
                    stack.push({ x: cur.x, y: cur.y + 1 });
                    stack.push({ x: cur.x - 1, y: cur.y });
                }
            }
        }
    }
}
