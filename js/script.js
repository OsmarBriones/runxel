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

        this.grid = new Grid(this.gridSize);
        this.player = { x: 12, y: 12 };
        this.isPlaying = false;

        // Gravity timing
        this.lastGravityTime = 0;
        this.gravityInterval = 100; // 100ms fall speed (~10 blocks/sec)

        // Initial draw
        this.draw(); // Draw initial state

        window.addEventListener('keydown', (e) => this.handleInput(e));
        document.getElementById('overlay').addEventListener('click', () => this.start());
    }

    // ======== GAME STATE CONTROL ========
    // Starts the game loop.
    start() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        document.getElementById('overlay').classList.add('hidden');
        this.grid.init(); // Reset grid on start
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
        if (e.key === 'ArrowLeft') dx = -1;
        if (e.key === 'ArrowRight') dx = 1;

        if (e.key === 'ArrowUp' && this.isGrounded()) {
            // Jump could be here
        }

        const newX = this.player.x + dx;

        // Check horizontal collision only here
        if (newX >= 0 && newX < this.gridSize) {
            this.player.x = newX;
            this.checkCollision();
        }
    }

    // ======== PHYSICS & COLLISION ========
    // Checks if player is on ground.
    isGrounded() {
        if (this.player.y + 1 >= this.gridSize) return true; // Bottom
        const cellBelow = this.grid.get(this.player.x, this.player.y + 1);
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
        const cell = this.grid.get(this.player.x, this.player.y);
        if (cell === 1) { // RED
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
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Grid
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const cell = this.grid.get(x, y);
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
