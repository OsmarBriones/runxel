# Technical Architecture

## Overview
Runxel is a lightweight, client-side web application that leverages modern browser APIs to deliver a synchronized audio-visual experience without external dependencies or heavy frameworks.

## Core Technologies
*   **Language**: JavaScript (ES6+). No transpilation or build steps required.
*   **Rendering**: HTML5 `<canvas>` API (2D Context) for high-performance pixel drawing.
*   **Audio**: Web Audio API for real-time procedural sound synthesis.
*   **Styling**: Vanilla CSS3 with CSS Variables for theming and animations.

## System Components

### 1. Game Loop & Logic (`Game` class)
The core game loop is driven by `requestAnimationFrame` for rendering and a custom delta-time step for consistent physics.

*   **Grid System**: A 24x24 2D array representing the game world.
    *   `0`: Empty/Black
    *   `1`: Red Pixel (Hazard)
    *   `2`: Green Pixel (Platform)
*   **Cellular Automata**: The grid evolves based on neighbor rules (Green propagates, Red consumes).
*   **Physics Engine**:
    *   **Gravity**: Applied at a fixed interval (~100ms) independent of frame rate.
    *   **Collision Detection**: AABB (Axis-Aligned Bounding Box) logic adapted for grid cells.

### 2. Audio Engine (`AudioController` class)
A custom audio scheduler inspired by reliable web audio scheduling patterns (Looking Ahead).

*   **Synthesis**:
    *   **Oscillators**: Used for generating Kick drums (Sine/Triangle) and Bass lines (Sawtooth).
    *   **Gain Nodes**: For envelope shaping (ADSR-like volume control).
    *   **Filters**: Lowpass filters modulated by LFOs to create the "Wobble" bass effect characteristic of Dubstep.
*   **Scheduling**: Uses `AudioContext.currentTime` to schedule notes precisely in the future, avoiding main-thread jitter.
*   **BPM**: Fixed at 140 BPM (Dubstep standard).

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
