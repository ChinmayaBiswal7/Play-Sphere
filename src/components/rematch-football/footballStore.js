import { create } from 'zustand'

export const useFootballStore = create((set) => ({
  score: { red: 0, blue: 0 },
  half: 1, // 1 for 1st Half, 2 for 2nd Half
  gameState: 'BOOT', // 'BOOT' | 'MENU' | 'LOADING_MATCH' | 'KICKOFF' | 'PLAYING' | 'GOAL_SCORED' | 'GOAL_CELEBRATION' | 'GOAL_REPLAY' | 'HALF_TIME' | 'FULL_TIME'
  timer: 150, // 2.5 minutes per half
  stamina: 100,
  ballPossession: null,
  goalAlert: '',
  lastScorer: null, // 'red' | 'blue'
  kickoffTeam: 'red', // Team that takes kickoff
  redGK: null,
  blueGK: null,
  
  // Replay frame buffer
  replayBuffer: [],
  
  // Customization & Style settings
  characterPreset: 'female_striker',
  arenaStyle: 'neon',
  activeMenuTab: 'PLAY',

  pushReplayFrame: (frameData) => set((state) => {
    const newBuf = [...state.replayBuffer, frameData]
    if (newBuf.length > 90) newBuf.shift() // Keep last 90 frames (~4.5s)
    return { replayBuffer: newBuf }
  }),

  clearReplayBuffer: () => set({ replayBuffer: [] }),

  incrementScore: (team) => set((state) => {
    const newScore = { ...state.score, [team]: state.score[team] + 1 }
    // The team that DID NOT score takes the next kickoff
    const nextKickoff = team === 'red' ? 'blue' : 'red'

    return {
      score: newScore,
      lastScorer: team,
      kickoffTeam: nextKickoff,
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
  
  tickTimer: () => set((state) => {
    if (state.timer <= 1) {
      if (state.half === 1) {
        return { timer: 150, half: 2, gameState: 'HALF_TIME' }
      } else {
        return { timer: 0, gameState: 'FULL_TIME' }
      }
    }
    return { timer: state.timer - 1 }
  }),

  resetMatch: () => set({
    score: { red: 0, blue: 0 },
    half: 1,
    gameState: 'KICKOFF',
    timer: 150,
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
