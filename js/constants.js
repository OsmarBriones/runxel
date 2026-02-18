// Pixel Types
const PIXEL_TYPES = {
    EMPTY: 0,
    HAZARD: 1,
    PLATFORM: 2,
    WALL: 3
};

// Pixel Configuration (Colors, Names)
const PIXEL_CONFIG = {
    [PIXEL_TYPES.EMPTY]: { color: '#0a0a0a', name: 'Empty' },
    [PIXEL_TYPES.HAZARD]: { color: '#ff0044', name: 'Hazard' }, // Red
    [PIXEL_TYPES.PLATFORM]: { color: '#00ff66', name: 'Platform' }, // Green
    [PIXEL_TYPES.WALL]: { color: '#8B4513', name: 'Wall' } // Brown
};

// General Game Configuration
const GAME_CONFIG = {
    PLAYER_COLOR: '#ffffff',
    BACKGROUND_COLOR: '#0a0a0a',
    GRID_SIZE: 24,
    GRAVITY_MS: 100, // Fall speed in ms
    TEMPO: 120, // BPM
    TEMPO_INCREMENT: 1, // Tempo increment per beat
    SAFE_ZONE_RADIUS: 5, // Radius of cleared area around starting position
    MAX_AIR_JUMPS: 3, // Number of jumps allowed in mid-air
    AIR_JUMP_FLOAT_MS: 400, // Time to suspend gravity after an air jump
    HAZARD_DESTRUCTION_RADIUS: 3, // Radius of destruction when hazard touches platform
    MAX_CLUSTER_SIZE: 100, // Maximum number of connected pixels before they are destroyed
    CLUSTER_SURVIVAL_RATIO: 10, // 1 in N pixels survive overpopulation destruction
    GRID_UPDATE_INTERVAL: 3 // Beats between grid updates
};
