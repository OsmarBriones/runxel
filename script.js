class AudioController {
    // ======== INITIALIZATION ========
    // Initializes the AudioController instance.
    constructor() {
        this.ctx = null;
        this.nextNoteTime = 0;
        this.beatCount = 0;
        this.isPlaying = false;
        this.tempo = 120; // Dubstep tempo (140 BPM)
        this.lookahead = 25.0;
        this.scheduleAheadTime = 0.1;
        this.onBeat = null;
    }

    // Initializes the audio context.
    init() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    // ======== PLAYBACK CONTROL ========
    // Starts the audio engine.
    start() {
        if (this.isPlaying) return;
        if (!this.ctx) this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();

        this.isPlaying = true;
        this.nextNoteTime = this.ctx.currentTime;
        this.scheduler();
    }

    // Stops the audio engine.
    stop() {
        this.isPlaying = false;
        clearTimeout(this.timerID);
    }

    // ======== SCHEDULING ========
    // Schedules notes ahead of time.
    scheduler() {
        if (!this.isPlaying) return;
        while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
            this.scheduleNote(this.nextNoteTime);
            this.nextNote();
        }
        this.timerID = setTimeout(() => this.scheduler(), this.lookahead);
    }

    // Advances to the next beat.
    nextNote() {
        const secondsPerBeat = 60.0 / this.tempo;
        this.nextNoteTime += secondsPerBeat;
        this.beatCount++;
    }

    // Plays audio for the current beat.
    scheduleNote(time) {
        // Only trigger game logic every 4 beats (approx 1.7s at 140BPM) 
        // to match the "1 second" requirement roughly while keeping musicality.
        // Actually, 60 BPM = 1 sec/beat. Dubstep at 140 is fast.
        // Let's stick to 60 BPM for the game logic tick as per requirement (1s),
        // but maybe play 140 BPM audio? No, synchronization is key.
        // Let's do 60 BPM for now as requested (1 tick = 1 sec).

        // Kick
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
        gain.gain.setValueAtTime(1, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
        osc.start(time);
        osc.stop(time + 0.5);

        // Wobble Bass (every other beat)
        if (this.beatCount % 2 === 0) {
            const bass = this.ctx.createOscillator();
            const bassGain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            bass.type = 'sawtooth';
            bass.frequency.setValueAtTime(55, time); // A1

            filter.type = 'lowpass';
            filter.Q.value = 1;
            // Wobble LFO effect via automation
            filter.frequency.setValueAtTime(100, time);
            filter.frequency.linearRampToValueAtTime(800, time + 0.25);
            filter.frequency.linearRampToValueAtTime(100, time + 0.5);

            bass.connect(filter);
            filter.connect(bassGain);
            bassGain.connect(this.ctx.destination);

            bassGain.gain.setValueAtTime(0.5, time);
            bassGain.gain.linearRampToValueAtTime(0, time + 0.8);

            bass.start(time);
            bass.stop(time + 0.8);
        }

        // Sync visual beat
        const timeUntilBeat = (time - this.ctx.currentTime) * 1000;
        setTimeout(() => {
            if (this.onBeat) this.onBeat(this.beatCount);
        }, Math.max(0, timeUntilBeat));
    }
}

class Game {
    // ======== INITIALIZATION ========
    // Initializes the Game instance.
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridSize = 24;
        this.cellSize = this.canvas.width / this.gridSize;

        this.audio = new AudioController();
        this.audio.onBeat = (beat) => this.onBeat(beat);

        this.grid = [];
        this.player = { x: 12, y: 12 };
        this.isPlaying = false;

        // Gravity timing
        this.lastGravityTime = 0;
        this.gravityInterval = 100; // 100ms fall speed (~10 blocks/sec)

        this.initGrid();

        window.addEventListener('keydown', (e) => this.handleInput(e));
        document.getElementById('overlay').addEventListener('click', () => this.start());

        this.draw();
    }

    // Generates the initial grid with random pixels.
    initGrid() {
        this.grid = [];
        for (let y = 0; y < this.gridSize; y++) {
            const row = [];
            for (let x = 0; x < this.gridSize; x++) {
                // Dynamic generation:
                // Mostly empty (0), some Green (2), fewer Red (1)
                const rand = Math.random();
                if (rand > 0.95) row.push(1); // 5% Red
                else if (rand > 0.8) row.push(2); // 15% Green
                else row.push(0); // 80% Black
            }
            this.grid.push(row);
        }
        // Ensure player start position is safe
        this.grid[12][12] = 0;
        this.grid[12][11] = 0;
        this.grid[12][13] = 0;
        this.grid[11][12] = 0;
        this.grid[13][12] = 0;
    }

    // ======== GAME STATE CONTROL ========
    // Starts the game loop.
    start() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        document.getElementById('overlay').classList.add('hidden');
        this.initGrid(); // Reset grid on start
        this.audio.start();
        this.renderLoop();
    }

    // Ends the game.
    gameOver() {
        this.isPlaying = false;
        this.audio.stop();
        document.getElementById('overlay').classList.remove('hidden');
        document.querySelector('#overlay h2').innerText = "GAME OVER";
        document.querySelector('#score').innerText = "0";
    }

    // ======== INPUT HANDLING ========
    // Handles player input.
    handleInput(e) {
        if (!this.isPlaying) return;
        let dx = 0; // Removed dy, vertical movement is controlled by gravity
        // if (e.key === 'ArrowUp') dy = -1; // Disabled for gravity
        // if (e.key === 'ArrowDown') dy = 1; // Disabled for gravity
        if (e.key === 'ArrowLeft') dx = -1;
        if (e.key === 'ArrowRight') dx = 1;

        // Allow JUMP if grounded?
        // For now, just horizontal. 
        if (e.key === 'ArrowUp' && this.isGrounded()) {
            // Simple jump logic could be added here, but let's stick to basic gravity first.
            // If the user wants jump, I'll add it. 
            // Actually, "falls until it is over a green pixel" implies just falling.
        }

        const newX = this.player.x + dx;
        // const newY = this.player.y + dy; // Controlled by gravity

        // Check horizontal collision only here
        if (newX >= 0 && newX < this.gridSize) {
            // Check if moving into a wall?
            // The game logic allows moving into empty or collecting items.
            // We just update X.
            this.player.x = newX;
            this.checkCollision();
        }
    }

    // ======== PHYSICS & COLLISION ========
    // Checks if player is on ground.
    isGrounded() {
        if (this.player.y + 1 >= this.gridSize) return true; // Bottom
        const cellBelow = this.grid[this.player.y + 1][this.player.x];
        return cellBelow === 2; // Green is platform
    }

    // Applies gravity to player.
    applyGravity() {
        if (!this.isGrounded()) {
            this.player.y += 1;
            this.checkCollision();
        }
    }

    // Checks for collisions with hazards.
    checkCollision() {
        const cell = this.grid[this.player.y][this.player.x];
        if (cell === 1) {
            this.gameOver();
        }
    }



    // ======== GAME LOOP ========
    // Main render and physics loop.
    renderLoop(time) {
        if (!this.isPlaying) return;

        // Gravity Logic
        if (!this.lastGravityTime) this.lastGravityTime = time;
        const deltaTime = time - this.lastGravityTime;

        if (deltaTime > this.gravityInterval) {
            this.applyGravity();
            this.lastGravityTime = time;
        }

        this.draw();
        requestAnimationFrame((t) => this.renderLoop(t));
    }

    // logic update on specific beats.
    onBeat(beat) {
        document.getElementById('beat-indicator').innerText = beat;
        // Update logic every 2 beats (approx 0.85s at 140 BPM) to keep game pace relatively fast but readable
        // Prompt asked for 1s. 2 beats is close. 
        if (beat % 2 === 0) {
            this.updateLogic();
        }

        // Gravity tick REMOVED from beat, now in renderLoop
        // this.applyGravity();

        // Visual effects always on beat
        this.ctx.canvas.style.transform = `scale(${1 + (beat % 2 === 0 ? 0.02 : 0)})`;
        setTimeout(() => this.ctx.canvas.style.transform = "scale(1)", 100);
    }

    // ======== UTILITIES ========
    // Gets adjacent cells.
    getNeighbors(x, y, grid) {
        // Order: Clockwise (N, E, S, W) -> Top, Right, Bottom, Left
        const neighbors = [];
        const coords = [
            { x: x, y: y - 1 }, // N
            { x: x + 1, y: y }, // E
            { x: x, y: y + 1 }, // S
            { x: x - 1, y: y }  // W
        ];

        for (let c of coords) {
            if (c.x >= 0 && c.x < this.gridSize && c.y >= 0 && c.y < this.gridSize) {
                neighbors.push({ x: c.x, y: c.y, val: grid[c.y][c.x] });
            } else {
                neighbors.push(null); // Out of bounds
            }
        }
        return neighbors;
    }



    // ======== GRID MECHANICS ========
    // Spawns new pixels randomly.
    spawnPixels(grid) {
        // Dynamic generation "por la cuadricula"
        // Try to spawn a few times
        for (let i = 0; i < 3; i++) {
            const rx = Math.floor(Math.random() * this.gridSize);
            const ry = Math.floor(Math.random() * this.gridSize);

            // Only spawn in empty
            if (grid[ry][rx] === 0) {
                // Determine type based on rarity
                // Red < Green.
                // 5% chance to spawn SOMETHING this attempt?
                if (Math.random() < 0.2) { // 20% of 3 attempts = ~50% chance of spawn per tick
                    // Type:
                    if (Math.random() < 0.15) { // 15% Red
                        grid[ry][rx] = 1;
                    } else {
                        grid[ry][rx] = 2; // 85% Green
                    }
                }
            }
        }
    }

    // Updates grid cellular automata.
    updateLogic() {
        const nextGrid = this.grid.map(row => [...row]);
        const processed = new Set();

        // Spawn new pixels dynamically
        this.spawnPixels(nextGrid);

        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const cell = this.grid[y][x];

                if (cell === 1 && !processed.has(`${x},${y}`)) { // RED
                    // If this cell was overwritten by a spawn in nextGrid, we still process the OLD red...
                    // But we should respect the spawn? No, old logic prevails. 
                    // Note: 'nextGrid' already has spawns. 

                    const neighbors = this.getNeighbors(x, y, this.grid);
                    const blackNeighbors = neighbors.filter(n => n && n.val === 0);
                    const greenNeighbors = neighbors.filter(n => n && n.val === 2);

                    if (greenNeighbors.length === 1) {
                        const target = greenNeighbors[0];
                        this.destroyConnectedGreens(target.x, target.y, nextGrid);
                    } else if (greenNeighbors.length > 1) {
                        const target = greenNeighbors[0];
                        nextGrid[target.y][target.x] = 0; // Eat
                    } else if (blackNeighbors.length > 0) {
                        // "Si todos sus vecinos son negros" -> Strict rule caused freezing when cloning (self-neighboring).
                        // Relaxing to "If valid black neighbor exists" to allow colonization/cloning as requested.

                        // Pick random neighbor to avoid just going Up (North)
                        const target = blackNeighbors[Math.floor(Math.random() * blackNeighbors.length)];
                        // Check if target is still valid in nextGrid (might be spawned on)
                        if (nextGrid[target.y][target.x] === 0) {
                            // nextGrid[y][x] = 0; // Removed to allow COPY/CLONE
                            nextGrid[target.y][target.x] = 1;
                            processed.add(`${target.x},${target.y}`);
                        }
                    } else {
                        // Stuck? Keep it.
                        // Ensure it persists in nextGrid if not moved/eaten (it is effectively persisted by copy, unless overwritten)
                        // But wait, if we didn't move it, and something else moved ONTOP of it?
                        // Collision logic handled by priority or last-write.
                        // Since we write to nextGrid, if we don't write 0 to [y][x], it stays 1 (from copy).
                        // If we move, we write 0.
                    }
                } else if (cell === 2) { // GREEN
                    const neighbors = this.getNeighbors(x, y, this.grid);
                    const blackNeighbors = neighbors.filter(n => n && n.val === 0);

                    if (blackNeighbors.length > 0) {
                        const target = blackNeighbors[0];
                        if (nextGrid[target.y][target.x] === 0) {
                            nextGrid[target.y][target.x] = 2; // Grow/Propagate
                        }
                    }
                }
            }
        }

        this.grid = nextGrid;
        this.checkCollision();
    }

    // Removes connected green pixels.
    destroyConnectedGreens(x, y, gridToUpdate) {
        // Flood fill to turn linked greens to black
        const stack = [{ x, y }];
        while (stack.length > 0) {
            const cur = stack.pop();
            if (cur.x >= 0 && cur.x < this.gridSize && cur.y >= 0 && cur.y < this.gridSize) {
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

    // ======== RENDERING ========
    // Renders the game frame.
    draw() {
        // Clear
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Grid
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const cell = this.grid[y][x];
                if (cell !== 0) {
                    this.ctx.fillStyle = cell === 1 ? '#ff0044' : '#00ff66';
                    // Glow effect
                    this.ctx.shadowBlur = 10;
                    this.ctx.shadowColor = this.ctx.fillStyle;
                    this.ctx.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize - 1, this.cellSize - 1);
                    this.ctx.shadowBlur = 0;
                }
            }
        }

        // Draw Player
        this.ctx.fillStyle = '#ffffff';
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = '#ffffff';
        this.ctx.fillRect(
            this.player.x * this.cellSize,
            this.player.y * this.cellSize,
            this.cellSize - 1,
            this.cellSize - 1
        );
        this.ctx.shadowBlur = 0;
    }
}

const game = new Game();
