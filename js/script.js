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
        this.airJumpsLeft = GAME_CONFIG.MAX_AIR_JUMPS;
        this.lastAirJumpTime = 0;
        this.isPlaying = false;
        this.hasWon = false;

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

        // Update overlay text with config
        const winText = document.getElementById('win-condition-text');
        if (winText) winText.innerText = GAME_CONFIG.WIN_BEAT_CONDITION;
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
        const isRestarting = this.hasWon; // Are we restarting from a win state?

        // Allow start if not playing OR if we won (restart)
        if (this.isPlaying && !isRestarting) return;

        this.isPlaying = true;
        this.hasWon = false;
        document.getElementById('overlay').classList.add('hidden');
        document.getElementById('progress-container').classList.add('hidden'); // Hide bar on restart
        this.grid.init(); // Reset grid on start
        this.audio.stop(); // Reset audio/beats
        this.audio.start();

        // Reset player position to center (safe zone)
        this.player = { x: Math.floor(this.gridSize / 2), y: Math.floor(this.gridSize / 2) };
        this.lastPlayerPos = { x: this.player.x, y: this.player.y };

        // Reset Physics
        this.airJumpsLeft = GAME_CONFIG.MAX_AIR_JUMPS;
        this.lastAirJumpTime = 0;
        this.lastGravityTime = 0; // Reset gravity delta

        // Reset Camping Counters
        this.campingBeatCount = 0;
        // Line Camping (Row/Col)
        this.lineCampingRowBeatCount = 0;
        this.lineCampingColBeatCount = 0;

        // Latch flags for intra-beat movement
        this.hasLeftRow = false;
        this.hasLeftCol = false;
        this.snapshotPos = { x: 0, y: 0 }; // Position at start of beat interval

        this.audio.start();
        this.renderLoop();
    }

    // Ends the game. Returns true if game ended, false if prevented (invincible).
    gameOver(reason) {
        if (GAME_CONFIG.INVINCIBLE_MODE) {
            console.log(`Invincible Mode: Prevented Game Over (${reason})`);
            return false;
        }

        this.isPlaying = false;
        this.audio.stop();
        document.getElementById('overlay').classList.remove('hidden');
        document.querySelector('#overlay h2').innerText = "GAME OVER";

        // Show specific reason
        const reasonElement = document.querySelector('#overlay p:first-of-type');
        if (reasonElement) {
            reasonElement.innerText = reason || "Avoid RED pixels.";
        }

        // Show beat count in second paragraph (instead of "Move on the BEAT")
        const beatElement = document.querySelector('#overlay p:nth-of-type(2)');
        if (beatElement) {
            const current = this.currentBeat || 0;
            const target = GAME_CONFIG.WIN_BEAT_CONDITION;
            beatElement.innerText = `Beat ${current} of ${target}`;

            // Update Progress Bar
            const percentage = Math.min((current / target) * 100, 100);
            const progressBar = document.getElementById('progress-container');
            const progressFill = document.getElementById('progress-fill');
            if (progressBar && progressFill) {
                progressBar.classList.remove('hidden');
                progressFill.style.width = `${percentage}%`;
            }
        }

        document.querySelector('#score').innerText = "0";
        return true;
    }

    // Handles winning the game
    gameWin() {
        if (this.hasWon) return; // Prevent re-triggering
        this.hasWon = true;

        // Decrease volume or change music? Keeping same for now.
        // Show overlay with opaque background? No, keep it as is.

        document.getElementById('overlay').classList.remove('hidden');
        document.querySelector('#overlay h2').innerText = "YOU WON!";

        const reasonElement = document.querySelector('#overlay p:first-of-type');
        if (reasonElement) {
            reasonElement.innerText = `You survived ${GAME_CONFIG.WIN_BEAT_CONDITION} beats!`;
        }
        document.querySelector('#score').innerText = GAME_CONFIG.WIN_BEAT_CONDITION;

        // We do NOT stop isPlaying or Audio. Loop continues.
    }

    // ======== INPUT HANDLING ========
    // Handles player input.
    handleInput(e) {
        if (!this.isPlaying || this.hasWon) return;

        const key = e.key;
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
            // Check for Wall
            if (this.grid.get(newX, this.player.y) !== PIXEL_TYPES.WALL) {
                this.player.x = newX;
                // Update Latch
                if (this.player.x !== this.snapshotPos.x) this.hasLeftCol = true;
                this.checkCollision();
            }
        }

        // Check vertical collision/movement
        if (dy !== 0 && newY >= 0 && newY < this.gridSize) {
            // Check for Wall
            if (this.grid.get(this.player.x, newY) !== PIXEL_TYPES.WALL) {
                this.player.y = newY;
                // Update Latch
                if (this.player.y !== this.snapshotPos.y) this.hasLeftRow = true;
                this.checkCollision();
            }
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
    isGrounded() {
        if (this.player.y + 1 >= this.gridSize) return true; // Bottom
        const cellBelow = this.grid.get(this.player.x, this.player.y + 1);
        return cellBelow === PIXEL_TYPES.PLATFORM || cellBelow === PIXEL_TYPES.WALL; // Green or Brown
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
            // Update Latch
            if (this.player.y !== this.snapshotPos.y) this.hasLeftRow = true;
            this.checkCollision();
        }
    }

    // Checks for collisions with hazards.
    checkCollision() {
        const cell = this.grid.get(this.player.x, this.player.y);
        if (cell === PIXEL_TYPES.HAZARD) { // RED
            this.gameOver("You touched a RED pixel!");
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

            if (!isFloating && !this.hasWon) {
                this.applyGravity();
            }
            this.lastGravityTime = time;
        }

        this.draw();
        requestAnimationFrame((t) => this.renderLoop(t));
    }

    // logic update on specific beats.
    onBeat(beat) {
        this.currentBeat = beat;
        document.getElementById('beat-indicator').innerText = `${beat} / ${GAME_CONFIG.WIN_BEAT_CONDITION}`;
        document.getElementById('tempo').innerText = Math.round(this.audio.tempo);

        // Check Winning Condition
        if (beat >= GAME_CONFIG.WIN_BEAT_CONDITION) {
            this.gameWin();
        }

        // Skip camping/gameover logic if won
        if (this.hasWon) {
            // Only update grid (spectator mode)
            if (beat % GAME_CONFIG.GRID_UPDATE_INTERVAL === 0) {
                // Pass null for player so walls don't stop for invisible player
                this.grid.update(null);
            }
        } else {
            // Line Camping Check (Row/Col)
            // Check Row (If Y is same as LAST Y, increment. If Y changed, reset).
            if (this.player.y === this.lastPlayerPos.y) {
                this.lineCampingRowBeatCount++;
            } else {
                this.lineCampingRowBeatCount = 0;
            }

            // Check Col (If X is same as LAST X, increment. If X changed, reset).
            if (this.player.x === this.lastPlayerPos.x) {
                this.lineCampingColBeatCount++;
            } else {
                this.lineCampingColBeatCount = 0;
            }

            // Update lastPlayerPos AFTER checking camping
            if (this.player.x !== this.lastPlayerPos.x || this.player.y !== this.lastPlayerPos.y) {
                this.campingBeatCount = 0;
                this.lastPlayerPos = { x: this.player.x, y: this.player.y };
            } else {
                // Static Camping Check
                this.campingBeatCount++;
                if (this.campingBeatCount >= GAME_CONFIG.MAX_CAMPING_BEATS) {
                    console.log("Game Over: Camping");
                    if (this.gameOver("You stood still for too long!")) return;
                }
            }

            if (this.lineCampingRowBeatCount >= GAME_CONFIG.MAX_ROW_CAMPING_BEATS) {
                console.log("Game Over: Row Camping");
                if (this.gameOver("You stayed in the same ROW for too long!")) return;
            }

            if (this.lineCampingColBeatCount >= GAME_CONFIG.MAX_COL_CAMPING_BEATS) {
                console.log("Game Over: Col Camping");
                if (this.gameOver("You stayed in the same COLUMN for too long!")) return;
            }

            // Update logic every N beats (Normal Play)
            if (beat % GAME_CONFIG.GRID_UPDATE_INTERVAL === 0) {
                this.grid.update(this.player);
                this.checkCollision(); // Check again in case a red pixel spawned on us
            }
        }

        // Visual effects always on beat
        if (beat % GAME_CONFIG.GRID_UPDATE_INTERVAL === 0) {
            this.ctx.canvas.style.transform = `scale(1.02)`;
        } else {
            this.ctx.canvas.style.transform = `scale(1)`;
        }
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

        // Draw Player (Only if NOT won)
        if (!this.hasWon) {
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

            // Draw Beat Count on Player
            if (this.currentBeat !== undefined) {
                this.ctx.fillStyle = '#000000'; // Black text
                this.ctx.font = `bold ${Math.floor(this.cellSize / 2)}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(
                    this.currentBeat,
                    this.player.x * this.cellSize + this.cellSize / 2,
                    this.player.y * this.cellSize + this.cellSize / 2
                )
            }
        }
    }
}

const game = new Game();
