import { create } from 'zustand'

export const useFootballStore = create((set) => ({
  score: { red: 0, blue: 0 },
  half: 1, // 1 for 1st Half (0-45 mins), 2 for 2nd Half (45-90 mins)
  gameState: 'BOOT', // 'BOOT' | 'MENU' | 'LOADING_MATCH' | 'KICKOFF' | 'PLAYING' | 'GOAL_CELEBRATION' | 'GOAL_REPLAY' | 'HALF_TIME' | 'FULL_TIME'
  matchMinute: 0, // 0 to 90 minutes
  stamina: 100,
  ballPossession: null,
  goalAlert: '',
  lastScorer: null, // 'red' | 'blue'
  kickoffTeam: 'red',
  redGK: null,
  blueGK: null,
  
  // Celebration cutscene state
  celebrationType: 'slide', // 'slide' | 'pole' | 'jump'
  
  // Replay frame buffer
  replayBuffer: [],
  
  // Customization & Style settings
  characterPreset: 'female_striker',
  arenaStyle: 'neon',
  activeMenuTab: 'PLAY',

  // ── MULTIPLAYER STATE ──
  matchMode: 'SINGLE_PLAYER', // 'SINGLE_PLAYER' | 'FRIEND_ROOM' | 'ONLINE_MATCH'
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
  
  // EA FC Style 90-Minute Match Clock (10 real minutes = 90 match minutes)
  tickMatchClock: () => set((state) => {
    if (state.gameState !== 'PLAYING') return state

    const newMinute = state.matchMinute + 0.15 // ~6.6s per match minute
    
    if (state.half === 1 && newMinute >= 45) {
      return { matchMinute: 45, half: 2, gameState: 'HALF_TIME' }
    } else if (state.half === 2 && newMinute >= 90) {
      return { matchMinute: 90, gameState: 'FULL_TIME' }
    }
    
    return { matchMinute: newMinute }
  }),

  resetMatch: () => set({
    score: { red: 0, blue: 0 },
    half: 1,
    matchMinute: 0,
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
