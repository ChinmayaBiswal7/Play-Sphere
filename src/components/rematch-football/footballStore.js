import { create } from 'zustand'

export const useFootballStore = create((set) => ({
  score: { red: 0, blue: 0 },
  gameState: 'MENU', // 'MENU' | 'CUSTOMIZATION' | 'KICKOFF' | 'PLAYING' | 'GOAL_SCRIBED' | 'GAMEOVER'
  timer: 300, // 5 minutes in seconds
  stamina: 100,
  ballPossession: null, // ID of player holding ball
  goalAlert: '',
  redGK: null,
  blueGK: null,
  
  // Customization & Style settings (matching Rematch reference UI)
  characterPreset: 'female_striker', // 'female_striker' | 'male_hoodie' | 'captain_pro'
  arenaStyle: 'neon', // 'neon' (Neon Palms Stadium) | 'desert' (Desert Oasis Arena)
  activeMenuTab: 'PLAY', // 'PLAY' | 'SEASON 0' | 'CUSTOMIZATION' | 'PROFILE' | 'STORE'

  incrementScore: (team) => set((state) => {
    const newScore = { ...state.score, [team]: state.score[team] + 1 }
    const isGameOver = newScore[team] >= 5 || state.timer <= 0 // First to 5 wins
    return {
      score: newScore,
      gameState: isGameOver ? 'GAMEOVER' : 'GOAL_SCRIBED',
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
      return { timer: 0, gameState: 'GAMEOVER' }
    }
    return { timer: state.timer - 1 }
  }),

  resetMatch: () => set({
    score: { red: 0, blue: 0 },
    gameState: 'KICKOFF',
    timer: 300,
    stamina: 100,
    ballPossession: null,
    goalAlert: '',
    redGK: null,
    blueGK: null,
  })
}))
