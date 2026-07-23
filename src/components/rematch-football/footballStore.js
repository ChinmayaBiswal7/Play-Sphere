import { create } from 'zustand'

export const useFootballStore = create((set) => ({
  score: { red: 0, blue: 0 },
  half: 1, // 1 for 1st Half (0-45 mins), 2 for 2nd Half (45-90 mins)
  gameState: 'BOOT', // 'BOOT' | 'MENU' | 'LOADING_MATCH' | 'KICKOFF' | 'PLAYING' | 'GOAL_CELEBRATION' | 'GOAL_REPLAY' | 'HALF_TIME' | 'FULL_TIME'
  matchSeconds: 0, // In-game seconds (0 to 5400)
  stamina: 100,
  ballPossession: null,
  goalAlert: '',
  lastScorer: null, // 'red' | 'blue'
  kickoffTeam: 'red',
  redGK: null,
  blueGK: null,
  
  // Celebration cutscene state
  celebrationType: 'slide', // 'slide' | 'pole' | 'jump'
  
  // Camera Mode: 'FOLLOW' | 'AUTO_BALL'
  cameraMode: 'FOLLOW',
  
  // Replay frame buffer
  replayBuffer: [],
  
  // Customization & Style settings
  characterPreset: 'female_striker',
  arenaStyle: 'neon',
  activeMenuTab: 'PLAY',

  // ── MULTIPLAYER STATE ──
  matchMode: 'SINGLE_PLAYER',
  multiplayerFormat: '1v1',
  roomCode: '',
  isHost: false,
  matchmakingStatus: 'IDLE',
  connectedPlayers: [],
  remotePlayersData: {},

  // Actions
  setMatchMode: (mode) => set({ matchMode: mode }),
  setMultiplayerFormat: (format) => set({ multiplayerFormat: format }),
  setRoomCode: (code) => set({ roomCode: code }),
  setIsHost: (isHost) => set({ isHost }),
  setMatchmakingStatus: (status) => set({ matchmakingStatus: status }),
  setConnectedPlayers: (players) => set({ connectedPlayers: players }),
  
  toggleCameraMode: () => set((state) => ({
    cameraMode: state.cameraMode === 'FOLLOW' ? 'AUTO_BALL' : 'FOLLOW'
  })),

  pushReplayFrame: (frameData) => set((state) => {
    const newBuf = [...state.replayBuffer, frameData]
    if (newBuf.length > 90) newBuf.shift()
    return { replayBuffer: newBuf }
  }),

  clearReplayBuffer: () => set({ replayBuffer: [] }),

  incrementScore: (team) => set((state) => {
    const newScore = { ...state.score, [team]: state.score[team] + 1 }
    const nextKickoff = team === 'red' ? 'blue' : 'red'
    const celebrations = ['slide', 'pole', 'jump']
    const randomCeleb = celebrations[Math.floor(Math.random() * celebrations.length)]

    return {
      score: newScore,
      lastScorer: team,
      kickoffTeam: nextKickoff,
      celebrationType: randomCeleb,
      gameState: 'GOAL_CELEBRATION',
      goalAlert: `GOAL ${team.toUpperCase()}!`,
    }
  }),

  setGameState: (status) => set({ gameState: status }),
  setActiveMenuTab: (tab) => set({ activeMenuTab: tab }),
  setCharacterPreset: (preset) => set({ characterPreset: preset }),
  setArenaStyle: (style) => set({ arenaStyle: style }),
  setGoalAlert: (alert) => set({ goalAlert: alert }),
  setPossession: (playerID) => set({ ballPossession: playerID }),
  setStamina: (val) => set({ stamina: val }),
  setGKs: (red, blue) => set({ redGK: red, blueGK: blue }),
  
  // EA FC 90-Minute Match Clock (10 real minutes = 90 in-game minutes = 5400 seconds)
  // Ticks +9 in-game seconds every real second for smooth, continuous clock progression!
  tickMatchClock: () => set((state) => {
    if (state.gameState !== 'PLAYING') return state

    const nextSecs = state.matchSeconds + 9 // +9 in-game seconds per real second
    
    if (state.half === 1 && nextSecs >= 2700) {
      return { matchSeconds: 2700, half: 2, gameState: 'HALF_TIME' }
    } else if (state.half === 2 && nextSecs >= 5400) {
      return { matchSeconds: 5400, gameState: 'FULL_TIME' }
    }
    
    return { matchSeconds: nextSecs }
  }),

  resetMatch: () => set({
    score: { red: 0, blue: 0 },
    half: 1,
    matchSeconds: 0,
    gameState: 'KICKOFF',
    stamina: 100,
    ballPossession: null,
    goalAlert: '',
    lastScorer: null,
    kickoffTeam: 'red',
    redGK: null,
    blueGK: null,
    replayBuffer: []
  })
}))
