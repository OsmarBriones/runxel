# Runxel

Runxel is a rhythm-based pixel art survival game built with vanilla JavaScript, HTML5 Canvas, and the Web Audio API.

## 🎮 How to Play

1.  **Open the Game**: Open `index.html` in a modern web browser.
2.  **Start**: Click anywhere on the screen to initialize the audio engine and start the game.
3.  **Controls**:
    *   **Left Arrow**: Move Left
    *   **Right Arrow**: Move Right
    *   **Up/Down Arrow**: Climb (When inside Green Pixels)
    *   **Up Arrow (Mid-Air)**: Air Jump (Max 3 times, recharges on Green Pixels)
    *   *(Vertical movement is otherwise controlled by gravity)*
4.  **Objective**: Survive as long as possible!
    *   **White Pixel**: You.
    *   **Green Pixels**: Safe platforms. You can stand on these.
    *   **Red Pixels**: Danger! Touching these results in **Game Over**.
    *   **Black/Empty**: Air. You will fall through these.

### Pixel Types & Colors

| Pixel Type | Color | Hex Code | Behavior |
| :--- | :--- | :--- | :--- |
| **Player** | White | `#ffffff` | Controlled by you. Falls via gravity. |
| **Platform** | Neon Green | `#00ff66` | Safe ground. Grows into empty space. |
| **Wall** | Brown | `#8B4513` | Solid structure. Forms from dense Green clusters. Falls and crushes other pixels. |
| **Hazard** | Neon Red | `#ff0044` | Lethal. Consumes platforms. |
| **Empty** | Black | `#0a0a0a` | Vacuum. |

| **Empty** | Black | `#0a0a0a` | Vacuum. |

### Configuration

You can customize the game settings in `js/constants.js`:
*   **`GRID_SIZE`**: The resolution of the grid (default: 48).
*   **`SAFE_ZONE_RADIUS`**: The radius of the initial cleared area (default: 5).
*   **`MAX_AIR_JUMPS`**: Number of mid-air jumps allowed (default: 3).
*   **`AIR_JUMP_FLOAT_MS`**: Duration of gravity suspension after an air jump (default: 400ms).
*   **`HAZARD_DESTRUCTION_RADIUS`**: Radius of the area destroyed when a Hazard touches a Platform (default: 3).
*   **`MAX_CLUSTER_SIZE`**: Maximum size of a pixel cluster before it is destroyed (default: 100).
*   **`CLUSTER_SURVIVAL_RATIO`**: 1 in N pixels survive when a cluster is destroyed (default: 10).
*   **`TEMPO`**: Game speed (BPM).
*   **`GRAVITY_MS`**: Falling speed.

To add new pixel types, update `js/constants.js`.

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
*   **Brown Pixels (Walls)**:
    *   Solid barriers the player cannot pass through but can stand on.
    *   **Formation**: Logic transforms a Green pixel into a Wall if it is thoroughly surrounded by 8 other Green pixels (and no player is present).
    *   **Gravity**: Walls fall downwards, crushing (destroying) any Green or Red pixels beneath them, until they land on the floor, the player, or another Wall.

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