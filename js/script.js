class Game {
    // ======== INITIALIZATION ========
    // Initializes the Game instance.
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridSize = GAME_CONFIG.GRID_SIZE;
        this.cellSize = this.canvas.width / this.gridSize;

        this.audio = new AudioController();
        this.audio.onBeat = (beat) => this.onBeat(beat);

        this.grid = new Grid(this.gridSize);
        this.player = { x: 12, y: 12 };
        this.airJumpsLeft = GAME_CONFIG.MAX_AIR_JUMPS;
        this.lastAirJumpTime = 0;
        this.isPlaying = false;

        // Gravity timing
        this.lastGravityTime = 0;
        this.gravityInterval = GAME_CONFIG.GRAVITY_MS; // 100ms fall speed (~10 blocks/sec)

        // Initial draw
        this.draw(); // Draw initial state

        window.addEventListener('keydown', (e) => this.handleInput(e));
        window.addEventListener('resize', () => this.resize()); // Responsive
        document.getElementById('overlay').addEventListener('click', () => this.start());

        // Initial resize
        this.resize();
    }

    // Resizes canvas to fit window
    resize() {
        // Available space (minus header/padding approx 150px)
        const availableHeight = window.innerHeight - 180;
        const availableWidth = window.innerWidth - 40;

        // Keep it square
        const size = Math.min(availableWidth, availableHeight);
        const safeSize = Math.max(size, 300); // 300px min

        this.canvas.width = safeSize;
        this.canvas.height = safeSize;
        this.cellSize = this.canvas.width / this.gridSize;

        // Redraw if needed (e.g. while paused)
        this.draw();
    }

    // ======== GAME STATE CONTROL ========
    // Starts the game loop.
    start() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        document.getElementById('overlay').classList.add('hidden');
        this.grid.init(); // Reset grid on start

        // Reset player position to center (safe zone)
        this.player = {
            x: Math.floor(this.gridSize / 2),
            y: Math.floor(this.gridSize / 2)
        };
        this.airJumpsLeft = GAME_CONFIG.MAX_AIR_JUMPS;
        this.lastAirJumpTime = 0;
        this.lastGravityTime = 0; // Reset gravity timer

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
        let dx = 0;
        let dy = 0;
        if (e.key === 'ArrowLeft') dx = -1;
        if (e.key === 'ArrowRight') dx = 1;

        if (e.key === 'ArrowUp') {
            if (this.canClimb() || (this.isGrounded() && this.grid.get(this.player.x, this.player.y) === PIXEL_TYPES.PLATFORM)) {
                dy = -1;
            } else if (this.airJumpsLeft > 0) {
                // Air Jump
                dy = -1;
                this.airJumpsLeft--;
                this.lastAirJumpTime = performance.now();
                console.log("Air Jump! Left:", this.airJumpsLeft);
            }
        }
        if (e.key === 'ArrowDown') {
            // Allow moving down if already climbing OR if standing on top of a platform (to enter it)
            if (this.canClimb() || this.isGrounded()) {
                dy = 1;
            }
        }

        const newX = this.player.x + dx;
        const newY = this.player.y + dy;

        // Check horizontal collision only here
        if (newX >= 0 && newX < this.gridSize) {
            this.player.x = newX;
            this.checkCollision();
        }

        // Check vertical collision/movement
        if (dy !== 0 && newY >= 0 && newY < this.gridSize) {
            this.player.y = newY;
            this.checkCollision();
        }

        // Recharge jumps if touching green
        if (this.canClimb() || this.isGrounded()) {
            this.airJumpsLeft = GAME_CONFIG.MAX_AIR_JUMPS;
        }
    }

    // Checks if the player is currently overlapping a climbable object (Platform/Green)
    canClimb() {
        // We are climbing if our current cell is a PLATFORM
        const currentCell = this.grid.get(this.player.x, this.player.y);
        return currentCell === PIXEL_TYPES.PLATFORM;
    }

    // ======== PHYSICS & COLLISION ========
    // Checks if player is on ground.
    isGrounded() {
        if (this.player.y + 1 >= this.gridSize) return true; // Bottom
        const cellBelow = this.grid.get(this.player.x, this.player.y + 1);
        return cellBelow === PIXEL_TYPES.PLATFORM; // Green is platform
    }

    // Applies gravity to player.
    applyGravity() {
        // If climbing, gravity does not apply
        if (this.canClimb()) {
            this.airJumpsLeft = GAME_CONFIG.MAX_AIR_JUMPS; // Also recharge while climbing
            return;
        }

        if (!this.isGrounded()) {
            this.player.y += 1;
            this.checkCollision();
        }
    }

    // Checks for collisions with hazards.
    checkCollision() {
        const cell = this.grid.get(this.player.x, this.player.y);
        if (cell === PIXEL_TYPES.HAZARD) { // RED
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
            // Check if floating after air jump
            const isFloating = (time - this.lastAirJumpTime) < GAME_CONFIG.AIR_JUMP_FLOAT_MS;

            if (!isFloating) {
                this.applyGravity();
            }
            this.lastGravityTime = time;
        }

        this.draw();
        requestAnimationFrame((t) => this.renderLoop(t));
    }

    // logic update on specific beats.
    onBeat(beat) {
        document.getElementById('beat-indicator').innerText = beat;
        document.getElementById('tempo').innerText = Math.round(this.audio.tempo);
        // Update logic every 2 beats
        if (beat % 2 === 0) {
            this.grid.update();
            this.checkCollision(); // Check again in case a red pixel spawned on us
        }

        // Visual effects always on beat
        this.ctx.canvas.style.transform = `scale(${1 + (beat % 2 === 0 ? 0.02 : 0)})`;
        setTimeout(() => this.ctx.canvas.style.transform = "scale(1)", 100);
    }

    // ======== RENDERING ========
    // Renders the game frame.
    draw() {
        // Clear
        this.ctx.fillStyle = GAME_CONFIG.BACKGROUND_COLOR;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Grid
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const cell = this.grid.get(x, y);
                if (cell !== PIXEL_TYPES.EMPTY) {
                    const pixelConfig = PIXEL_CONFIG[cell];
                    this.ctx.fillStyle = pixelConfig ? pixelConfig.color : '#ff00ff'; // Fallback to magenta
                    // Glow effect
                    this.ctx.shadowBlur = 10;
                    this.ctx.shadowColor = this.ctx.fillStyle;
                    this.ctx.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize - 1, this.cellSize - 1);
                    this.ctx.shadowBlur = 0;
                }
            }
        }

        // Draw Player
        this.ctx.fillStyle = GAME_CONFIG.PLAYER_COLOR;
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = GAME_CONFIG.PLAYER_COLOR;
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
