import { create } from 'zustand'

export const useLagoriStore = create((set) => ({
  // Game Flow States: 'BOOT' | 'MENU' | 'AIM_THROW' | 'STACK_KNOCKED' | 'REBUILD_DEFEND' | 'ROUND_OVER'
  gameState: 'MENU',
  
  // Teams & Match State
  score: { seekers: 0, defenders: 0 },
  round: 1,
  currentTurnTeam: 'seekers', // 'seekers' (Team A) | 'defenders' (Team B)
  
  // Stone Stack State
  stonesRebuilt: 0, // 0 to 7
  heldStonesCount: 0, // Stones currently carried by player
  isStackKnockedDown: false,
  stonePositions: [], // Positions of 7 stones
  
  // Ball & Player State
  ballCarrier: null, // 'player1' | 'bot1' | null (on ground)
  playerEliminated: false,
  stamina: 100,
  roundResultAlert: '',

  // ── MULTIPLAYER STATE ──
  matchMode: 'SINGLE_PLAYER', // 'SINGLE_PLAYER' | 'MULTIPLAYER'
  multiplayerSubSection: 'ONLINE_MATCH', // 'ONLINE_MATCH' | 'PLAY_WITH_FRIEND'
  multiplayerFormat: '1v1', // '1v1' | '2v2' | '3v3' | '5v5'
  roomCode: '',
  isHost: false,
  matchmakingStatus: 'IDLE', // 'IDLE' | 'SEARCHING' | 'FOUND' | 'CONNECTED'
  connectedPlayers: [],

  // Actions
  setMatchMode: (mode) => set({ matchMode: mode }),
  setMultiplayerSubSection: (sec) => set({ multiplayerSubSection: sec }),
  setMultiplayerFormat: (format) => set({ multiplayerFormat: format }),
  setRoomCode: (code) => set({ roomCode: code }),
  setIsHost: (isHost) => set({ isHost }),
  setMatchmakingStatus: (status) => set({ matchmakingStatus: status }),
  setConnectedPlayers: (players) => set({ connectedPlayers: players }),

  setGameState: (state) => set({ gameState: state }),
  
  setStonesRebuilt: (count) => set((state) => {
    const newCount = Math.min(7, Math.max(0, count))
    if (newCount >= 7) {
      return {
        stonesRebuilt: 7,
        gameState: 'ROUND_OVER',
        score: { ...state.score, seekers: state.score.seekers + 1 },
        roundResultAlert: 'SEEKERS REBUILT THE LAGORI STACK! TEAM A WINS!'
      }
    }
    return { stonesRebuilt: newCount }
  }),

  setHeldStonesCount: (count) => set({ heldStonesCount: Math.max(0, count) }),

  knockDownStack: () => set({
    isStackKnockedDown: true,
    gameState: 'REBUILD_DEFEND'
  }),

  eliminatePlayer: () => set((state) => ({
    playerEliminated: true,
    gameState: 'ROUND_OVER',
    score: { ...state.score, defenders: state.score.defenders + 1 },
    roundResultAlert: 'DEFENDERS TAGGED THE PLAYER! TEAM B WINS!'
  })),

  setBallCarrier: (carrier) => set({ ballCarrier: carrier }),
  setStamina: (val) => set({ stamina: val }),

  resetRound: () => set((state) => ({
    gameState: 'AIM_THROW',
    stonesRebuilt: 0,
    heldStonesCount: 0,
    isStackKnockedDown: false,
    ballCarrier: null,
    playerEliminated: false,
    stamina: 100,
    roundResultAlert: '',
    round: state.round + 1
  })),

  resetMatch: () => set({
    gameState: 'AIM_THROW',
    score: { seekers: 0, defenders: 0 },
    round: 1,
    currentTurnTeam: 'seekers',
    stonesRebuilt: 0,
    heldStonesCount: 0,
    isStackKnockedDown: false,
    ballCarrier: null,
    playerEliminated: false,
    stamina: 100,
    roundResultAlert: ''
  })
}))
