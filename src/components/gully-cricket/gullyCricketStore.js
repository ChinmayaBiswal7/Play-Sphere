import { create } from 'zustand'

export const useGullyCricketStore = create((set, get) => ({
  // Game States: 'BOOT' | 'MENU' | 'MODE_SELECT' | 'INNINGS_1' | 'INNINGS_BREAK' | 'INNINGS_2' | 'RESULT'
  gameState: 'BOOT',
  gameMode: 'STREET_SERIES', // 'STREET_SERIES' | '1V1_CHALLENGE' | 'FREE_HIT'
  
  // Match Configuration
  totalOvers: 2,
  teamSize: 5,
  currentInnings: 1, // 1 or 2
  
  // Scoreboard
  runs: 0,
  wickets: 0,
  ballsInOver: 0,
  completedOvers: 0,
  overHistory: [], // array of ball outcomes ['1', '4', 'W', '6', '1T', '0']
  
  // Target for Innings 2
  targetRuns: null,
  
  // Teams
  battingTeamName: 'GULLY KINGS',
  bowlingTeamName: 'STREET REBELS',
  
  // Player Stats
  strikerName: 'CHIKU (CAPTAIN)',
  nonStrikerName: 'GUDDU',
  bowlerName: 'MONU (FAST)',
  strikerRuns: 0,
  strikerBalls: 0,
  
  // Ball & Gameplay Phase
  // 'IDLE' | 'BOWLING_AIM' | 'BALL_IN_AIR' | 'SHOT_HIT' | 'RESULT_PAUSE'
  phase: 'IDLE',
  
  // Shot Feedback
  shotFeedback: '', // 'PERFECT!', 'GOOD', 'EARLY', 'LATE', 'MISSED'
  lastShotOutcome: '', // '4 RUNS (WALL HIT!)', 'OUT (ONE TIPPI CATCH!)', '6 RUNS (ROOF HIT!)', 'BOWLED!'
  commentaryText: 'Welcome to Gully Cricket 3D! Pitch the ball or swing for the walls!',

  // Camera Mode: 'BATTER_VIEW' | 'BOWLER_VIEW' | 'BROADCAST'
  cameraView: 'BATTER_VIEW',

  // Actions
  setGameState: (state) => set({ gameState: state }),
  setGameMode: (mode) => set({ gameMode: mode }),
  setPhase: (phase) => set({ phase }),
  setCameraView: (view) => set({ cameraView: view }),
  setShotFeedback: (fb) => set({ shotFeedback: fb }),
  setCommentaryText: (text) => set({ commentaryText: text }),

  resetMatch: () => set({
    gameState: 'INNINGS_1',
    currentInnings: 1,
    runs: 0,
    wickets: 0,
    ballsInOver: 0,
    completedOvers: 0,
    overHistory: [],
    targetRuns: null,
    strikerRuns: 0,
    strikerBalls: 0,
    phase: 'BOWLING_AIM',
    shotFeedback: '',
    lastShotOutcome: '',
    commentaryText: 'Innings 1 Started! Hit the walls for 4s & 6s. Watch out for One-Tippi catches!'
  }),

  // Add ball outcome (Runs or Wicket)
  recordBallOutcome: (type, runCount = 0, detail = '') => set((state) => {
    let newRuns = state.runs
    let newWickets = state.wickets
    let newBallsInOver = state.ballsInOver + 1
    let newCompletedOvers = state.completedOvers
    let newStrikerRuns = state.strikerRuns
    let newStrikerBalls = state.strikerBalls + 1

    let outcomeTag = '0'

    if (type === 'RUNS') {
      newRuns += runCount
      newStrikerRuns += runCount
      outcomeTag = runCount.toString()
    } else if (type === 'WICKET') {
      newWickets += 1
      outcomeTag = 'W'
    } else if (type === 'ONE_TIPPI_OUT') {
      newWickets += 1
      outcomeTag = '1T' // One Tippi Out
    } else if (type === 'WINDOW_BREAK_OUT') {
      newWickets += 1
      outcomeTag = 'OUT' // Window break penalty out
    }

    const newOverHistory = [...state.overHistory, outcomeTag]

    // Check if over completed (6 legal balls)
    if (newBallsInOver >= 6) {
      newBallsInOver = 0
      newCompletedOvers += 1
    }

    // Check Innings End Criteria
    let nextGameState = state.gameState
    let nextTarget = state.targetRuns

    if (state.currentInnings === 1) {
      if (newWickets >= state.teamSize - 1 || newCompletedOvers >= state.totalOvers) {
        nextGameState = 'INNINGS_BREAK'
        nextTarget = newRuns + 1
      }
    } else if (state.currentInnings === 2) {
      if (newRuns >= state.targetRuns) {
        nextGameState = 'RESULT'
      } else if (newWickets >= state.teamSize - 1 || newCompletedOvers >= state.totalOvers) {
        nextGameState = 'RESULT'
      }
    }

    return {
      runs: newRuns,
      wickets: newWickets,
      ballsInOver: newBallsInOver,
      completedOvers: newCompletedOvers,
      overHistory: newOverHistory,
      strikerRuns: newStrikerRuns,
      strikerBalls: newStrikerBalls,
      gameState: nextGameState,
      targetRuns: nextTarget,
      lastShotOutcome: detail || `${runCount} Runs`,
      phase: 'RESULT_PAUSE'
    }
  }),

  startInnings2: () => set((state) => ({
    currentInnings: 2,
    gameState: 'INNINGS_2',
    runs: 0,
    wickets: 0,
    ballsInOver: 0,
    completedOvers: 0,
    overHistory: [],
    strikerRuns: 0,
    strikerBalls: 0,
    battingTeamName: 'STREET REBELS',
    bowlingTeamName: 'GULLY KINGS',
    strikerName: 'ROCKY (STRIKER)',
    phase: 'BOWLING_AIM',
    commentaryText: `Innings 2! Target to win: ${state.targetRuns} Runs in ${state.totalOvers} Overs!`
  }))
}))
