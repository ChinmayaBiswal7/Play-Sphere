import { create } from 'zustand'

export const useFootballStore = create((set) => ({
  score: { red: 0, blue: 0 },
  gameState: 'LOBBY', // 'LOBBY' | 'KICKOFF' | 'PLAYING' | 'GOAL_SCRIBED' | 'GAMEOVER'
  timer: 300, // 5 minutes in seconds
  stamina: 100,
  ballPossession: null, // ID of player holding ball
  goalAlert: '',
  redGK: null,
  blueGK: null,

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
