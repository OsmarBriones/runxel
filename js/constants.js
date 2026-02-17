// Pixel Types
const PIXEL_TYPES = {
    EMPTY: 0,
    HAZARD: 1,
    PLATFORM: 2
};

// Pixel Configuration (Colors, Names)
const PIXEL_CONFIG = {
    [PIXEL_TYPES.EMPTY]: { color: '#0a0a0a', name: 'Empty' },
    [PIXEL_TYPES.HAZARD]: { color: '#ff0044', name: 'Hazard' }, // Red
    [PIXEL_TYPES.PLATFORM]: { color: '#00ff66', name: 'Platform' } // Green
};

// General Game Configuration
const GAME_CONFIG = {
    PLAYER_COLOR: '#ffffff',
    BACKGROUND_COLOR: '#0a0a0a',
    GRID_SIZE: 24,
    GRAVITY_MS: 100, // Fall speed in ms
    TEMPO: 120, // BPM
    SAFE_ZONE_RADIUS: 5 // Radius of cleared area around starting position
};
