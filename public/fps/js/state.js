/* ==========================================================================
   DELHI DEFIANCE - GLOBAL STATE MANAGEMENT
   ========================================================================== */

// Game States
const STATES = {
  SPLASH: 0,
  LOGIN: 1,
  LOBBY: 2,
  PLAY_SELECT: 3,
  AGENT_SELECT: 4,
  MATCH_LOADING: 5,
  GAMEPLAY: 6,
  GAME_OVER: 7
};

// Global State Object
const FPSState = {
  gameState: STATES.SPLASH,
  activeTab: 'lobby',
  gameMode: 'AI', // 'AI' or 'PVP'
  isPauseActive: false,

  // Player Profile
  currentUser: {
    username: 'GuestAgent',
    avatar: '1',
    coins: 500,
    premium: 100,
    xp: 250,
    level: 1,
    rank: 'SENTINEL I'
  },

  // Agent Selection
  selectedAgentId: 'agni',
  lockedAgentId: null,

  // Weapon Skins Loadout
  loadout: {
    primarySkin: 'default',   // 'default', 'neon', 'crimson'
    secondarySkin: 'default'  // 'default', 'chrome'
  },

  // Match Scoring & Round Data
  matchData: {
    roundNumber: 1,
    scores: {
      attackers: 0,
      defenders: 0
    },
    playerKills: 0,
    playerDeaths: 0,
    playerHeadshots: 0,
    isSpikePlanted: false,
    spikeState: 'idle', // 'idle', 'planting', 'planted', 'defusing', 'exploded', 'defused'
    spikeCarrier: 'PLAYER_1' // 'PLAYER_1' or 'BOT'
  },

  // Synthesized settings
  settings: {
    mouseSensitivity: 0.002,
    crosshairColor: '#00d2ff',
    volume: 0.5
  }
};

// Expose state globally
window.FPSState = FPSState;
window.STATES = STATES;
