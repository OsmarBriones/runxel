# Technical Architecture

## Overview
Runxel is a lightweight, client-side web application that leverages modern browser APIs to deliver a synchronized audio-visual experience without external dependencies or heavy frameworks.

## Core Technologies
*   **Language**: JavaScript (ES6+). No transpilation or build steps required.
*   **Rendering**: HTML5 `<canvas>` API (2D Context) for high-performance pixel drawing.
*   **Audio**: Web Audio API for real-time procedural sound synthesis.
*   **Styling**: Vanilla CSS3 with CSS Variables for theming and animations.

## System Components

### 1. Game Controller (`js/script.js` - `Game` class)
The `Game` class acts as the central coordinator, bridging input, audio, and grid mechanics.

*   **Initialization**: Sets up the canvas, audio context, and instantiates `Grid` and `AudioController`.
*   **Game State Control**: Manages the start, stop, and game-over transitions.
*   **Input Handling**: Captures keyboard events for player movement.
*   **Physics & Collision**: Applies gravity and checks for intersections with hazard pixels.
*   **Rendering**: Handles the drawing of the grid and player to the canvas.
*   **Game Loop**: The main `renderLoop` drives physics and rendering, while `onBeat` handles rhythmic game logic updates.

### 2. Grid System (`js/grid.js` - `Grid` class)
Encapsulates all logic related to the game world state and procedural generation.

*   **State Management**: Stores the 24x24 world array.
*   **Cellular Automata**: (`update` method) Evolving rules where Green pixels propagate and Red pixels consume.
*   **Spawning**: Procedural generation logic to insert new pixels.
*   **Utilities**: Helper methods for neighbor lookups and finding connected components.

### 3. Audio Engine (`js/audio.js` - `AudioController` class)
A custom audio scheduler inspired by reliable web audio scheduling patterns (Looking Ahead).

*   **Initialization**: Sets up the AudioContext.
*   **Playback Control**: Handles start/stop/resume operations.
*   **Scheduling**: Uses `AudioContext.currentTime` to schedule notes precisely in the future.
*   **Synthesis**:
    *   **Oscillators**: Used for generating Kick drums (Sine/Triangle) and Bass lines (Sawtooth).
    *   **Gain Nodes**: For envelope shaping (ADSR-like volume control).
    *   **Filters**: Lowpass filters modulated by LFOs to create the "Wobble" bass effect.

### 4. Rendering Pipeline
*   **Canvas API**: efficient clearing and redrawing of the 24x24 grid each frame.
*   **Optimization**: 
    *   Integer coordinates are used to snap pixels to the grid.
    *   Shadows (`shadowBlur`) are used for the "Neon" glow effect.

## File Structure
*   `index.html`: Entry point. Loads scripts in dependency order (`js/audio.js`, `js/grid.js`, `js/script.js`).
*   `style.css`: Handles the "crt-screen" aesthetics, fonts, and UI layout.
*   `js/audio.js`: Contains `AudioController` class for synthesis and scheduling.
*   `js/grid.js`: Contains `Grid` class for world state and logic.
*   `js/script.js`: Contains `Game` class, the main entry point and controller.

## Data Flow
1.  **Input**: User keyboard events -> `Game.handleInput()`
2.  **Update**: 
    *   `Game.renderLoop()` -> Physics & Gravity.
    *   `AudioController` -> Triggers `onBeat` callbacks.
    *   `Game.updateLogic()` -> Cellular Automata evolution (synced to beat).
3.  **Render**: `Game.draw()` -> Canvas painting.
