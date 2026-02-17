# Runxel

Runxel is a rhythm-based pixel art survival game built with vanilla JavaScript, HTML5 Canvas, and the Web Audio API.

## 🎮 How to Play

1.  **Open the Game**: Open `index.html` in a modern web browser.
2.  **Start**: Click anywhere on the screen to initialize the audio engine and start the game.
3.  **Controls**:
    *   **Left Arrow**: Move Left
    *   **Right Arrow**: Move Right
    *   *(Vertical movement is controlled by gravity)*
4.  **Objective**: Survive as long as possible!
    *   **White Pixel**: You.
    *   **Green Pixels**: Safe platforms. You can stand on these.
    *   **Red Pixels**: Danger! Touching these results in **Game Over**.
    *   **Black/Empty**: Air. You will fall through these.

## 🛠 Installation & Setup

No installation is required. This is a client-side web application.

1.  Clone the repository:
    ```bash
    git clone https://github.com/OsmarBriones/runxel.git
    ```
2.  Navigate to the project folder.
3.  Open `index.html` in your browser.

---

# Game Design Document (GDD)

## 1. Game Concept
**Genre**: Arcade / Survival 
**Platform**: Web (Desktop/Mobile)
**Target Audience**: Brackeys Game Jam Players

**Core Loop**: The player controls a falling pixel in a chaotic, procedurally regenerating grid, representing an strange place where pixels are alive and move. They must navigate onto safe platforms while avoiding dangerous. The game action is loosely synchronized to a synthesized dubstep beat.

## 2. Mechanics

### 2.1 Player Character (The White Pixel)
*   **Movement**: Restricted to horizontal movement (Left/Right).
*   **Physics**: Affected by constant gravity. Falls 1 grid cell every ~100ms when not supported by a Green pixel.
*   **States**:
    *   *Falling*: When moving through Black (Empty) pixels.
    *   *Grounded*: When directly above a Green pixel or the bottom of the map.

### 2.2 Environment & Grid Logic
The game world is a 24x24 grid that evolves dynamically.

*   **Green Pixels (Platforms)**:
    *   Act as solid ground for the player.
    *   **Behavior**: They propagate (grow) into empty adjacent spaces if conditions are met.
*   **Red Pixels (Hazards)**:
    *   Lethal to the player.
    *   **Behavior**: They "eat" Green pixels (turning them empty) and can spawn or spread into darkness.
*   **Spawning**:
    *   New pixels spawn randomly on the grid to keep the layout changing.
    *   Spawning probabilities: ~15% Red, ~85% Green (variable based on random ticks).

### 2.3 Audio System
*   **Engine**: Custom `AudioController` using the Web Audio API.
*   **Music**: Real-time synthesized Dubstep beat.
    *   **Kick**: Oscillator-based percussive synthesis.
    *   **Bass**: Sawtooth wave with LFO-modulated Lowpass filter (Wobble Bass).
*   **Synchronization**: Visual elements (screen shake/pulse) react to the beat. Game logic updates (spawning/cellular automata) occur on rhythmic intervals.

## 3. Visual Style
*   **Aesthetics**: Minimalist "Neon" Cyberpunk.
*   **Palette**:
    *   Background: Deep Black (`#050505`)
    *   Player: Bright White (`#ffffff`) with glow.
    *   Danger: Neon Red (`#ff0044`) with glow.
    *   Safe: Neon Green (`#00ff66`) with glow.
    *   UI: Cyan (`#00ffff`).
*   **Effects**:
    *   CSS `box-shadow` for glowing pixels.
    *   Screen pulse on musical beats.
    *   Scanline/CRT effects (via font and colors).

## 4. Technical Architecture
Detailed technical documentation including system components, audio engine internals, and rendering pipeline can be found in [ARCHITECTURE.md](ARCHITECTURE.md).