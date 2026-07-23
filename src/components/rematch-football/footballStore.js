import { create } from 'zustand'

export const useFootballStore = create((set) => ({
  score: { red: 0, blue: 0 },
  half: 1, // 1 for 1st Half, 2 for 2nd Half
  gameState: 'BOOT', // 'BOOT' | 'MENU' | 'LOADING_MATCH' | 'KICKOFF' | 'PLAYING' | 'GOAL_SCORED' | 'HALF_TIME' | 'FULL_TIME'
  timer: 150, // 2.5 minutes per half (150s)
  stamina: 100,
  ballPossession: null, // ID of player holding ball
  goalAlert: '',
  redGK: null,
  blueGK: null,
  
  // Customization & Style settings
  characterPreset: 'female_striker', // 'female_striker' | 'male_hoodie' | 'captain_pro'
  arenaStyle: 'neon', // 'neon' (Neon Palms Stadium) | 'desert' (Desert Oasis Arena)
  activeMenuTab: 'PLAY', // 'PLAY' | 'SEASON 0' | 'CUSTOMIZATION' | 'PROFILE' | 'STORE'

  incrementScore: (team) => set((state) => {
    const newScore = { ...state.score, [team]: state.score[team] + 1 }
    return {
      score: newScore,
      gameState: 'GOAL_SCORED',
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
    redGK: null,
    blueGK: null,
  })
}))
