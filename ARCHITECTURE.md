# Technical Architecture

## Overview
Runxel is a lightweight, client-side web application that leverages modern browser APIs to deliver a synchronized audio-visual experience without external dependencies or heavy frameworks.

## Core Technologies
*   **Language**: JavaScript (ES6+). No transpilation or build steps required.
*   **Rendering**: HTML5 `<canvas>` API (2D Context) for high-performance pixel drawing.
*   **Audio**: Web Audio API for real-time procedural sound synthesis.
*   **Styling**: Vanilla CSS3 with CSS Variables for theming and animations.

## System Components

### 1. Game Logic (`Game` class)
The game logic is organized into distinct functional sections within `script.js`:

*   **Initialization**: Sets up the canvas, audio context, and initial grid state.
*   **Game State Control**: Manages the start, stop, and game-over transitions.
*   **Input Handling**: Captures keyboard events for player movement.
*   **Physics & Collision**: Applies gravity and checks for intersections with hazard pixels.
*   **Grid Mechanics**: Contains the cellular automata rules where Green pixels propagate and Red pixels consume.
*   **Rendering**: Handles the drawing of the grid and player to the canvas.
*   **Game Loop**: The main `renderLoop` drives physics and rendering, while `onBeat` handles rhythmic game logic updates.

### 2. Audio Engine (`AudioController` class)
A custom audio scheduler inspired by reliable web audio scheduling patterns (Looking Ahead).

*   **Initialization**: Sets up the AudioContext.
*   **Playback Control**: Handles start/stop/resume operations.
*   **Scheduling**: Uses `AudioContext.currentTime` to schedule notes precisely in the future.
*   **Synthesis**:
    *   **Oscillators**: Used for generating Kick drums (Sine/Triangle) and Bass lines (Sawtooth).
    *   **Gain Nodes**: For envelope shaping (ADSR-like volume control).
    *   **Filters**: Lowpass filters modulated by LFOs to create the "Wobble" bass effect.

### 3. Rendering Pipeline
*   **Canvas API**: efficient clearing and redrawing of the 24x24 grid each frame.
*   **Optimization**: 
    *   Integer coordinates are used to snap pixels to the grid.
    *   Shadows (`shadowBlur`) are used for the "Neon" glow effect.

## File Structure
*   `index.html`: Entry point. Contains the DOM structure for UI overlays and the Canvas element.
*   `style.css`: Handles the "crt-screen" aesthetics, fonts, and UI layout.
*   `script.js`: Contains all logic, split into `AudioController` and `Game` classes.

## Data Flow
1.  **Input**: User keyboard events -> `Game.handleInput()`
2.  **Update**: 
    *   `Game.renderLoop()` -> Physics & Gravity.
    *   `AudioController` -> Triggers `onBeat` callbacks.
    *   `Game.updateLogic()` -> Cellular Automata evolution (synced to beat).
3.  **Render**: `Game.draw()` -> Canvas painting.
