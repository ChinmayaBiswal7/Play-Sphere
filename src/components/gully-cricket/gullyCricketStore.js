import { create } from 'zustand'

export const DRAFT_PLAYERS_POOL = [
  { id: 'p1', name: 'CHIKU (CAPTAIN)', bat: 94, bowl: 65, field: 88, trait: 'Wall Sixer King', color: '#facc15' },
  { id: 'p2', name: 'ROCKY (PACER)', bat: 70, bowl: 95, field: 82, trait: 'Express Yorker', color: '#ef4444' },
  { id: 'p3', name: 'MONU (SPINNER)', bat: 62, bowl: 92, field: 78, trait: 'Street Leg-Spin', color: '#3b82f6' },
  { id: 'p4', name: 'GUDDU (ALL-ROUNDER)', bat: 85, bowl: 84, field: 86, trait: 'One-Tippi Master', color: '#10b981' },
  { id: 'p5', name: 'BUNTY (SLOGGER)', bat: 98, bowl: 45, field: 70, trait: 'Roof Breaker', color: '#a855f7' },
  { id: 'p6', name: 'SONU (KEEPER)', bat: 78, bowl: 50, field: 96, trait: 'Lightning Hands', color: '#f97316' },
  { id: 'p7', name: 'KAKU (FAST)', bat: 65, bowl: 89, field: 80, trait: 'Inswing Bouncer', color: '#06b6d4' },
  { id: 'p8', name: 'TINKU (DEFENSIVE)', bat: 84, bowl: 72, field: 85, trait: 'Solid Wall Defense', color: '#e11d48' },
  { id: 'p9', name: 'RAJU (STREET CHAMP)', bat: 90, bowl: 80, field: 91, trait: 'Cover Drive King', color: '#8b5cf6' },
  { id: 'p10', name: 'CHOTU (AGILE)', bat: 74, bowl: 60, field: 98, trait: 'Direct Hit Throw', color: '#14b8a6' }
]

export const FIELD_PRESETS = {
  DEFAULT: [
    { id: 'f1', name: 'GULLY (SLIP)', pos: [-4.5, 0, 8.0] },
    { id: 'f2', name: 'POINT', pos: [-7.0, 0, 0] },
    { id: 'f3', name: 'COVER', pos: [-6.5, 0, -10.0] },
    { id: 'f4', name: 'MID-ON', pos: [4.0, 0, -16.0] },
    { id: 'f5', name: 'MID-OFF', pos: [-4.0, 0, -16.0] },
    { id: 'f6', name: 'SQUARE LEG', pos: [6.5, 0, 4.0] }
  ],
  SLIP_ATTACK: [
    { id: 'f1', name: '1ST SLIP', pos: [-2.5, 0, 10.0] },
    { id: 'f2', name: '2ND SLIP', pos: [-4.2, 0, 9.5] },
    { id: 'f3', name: 'GULLY', pos: [-5.8, 0, 7.0] },
    { id: 'f4', name: 'POINT', pos: [-7.5, 0, -2.0] },
    { id: 'f5', name: 'MID-OFF', pos: [-3.5, 0, -15.0] },
    { id: 'f6', name: 'MID-ON', pos: [3.5, 0, -15.0] }
  ],
  WALL_GUARD: [
    { id: 'f1', name: 'LEFT WALL GUARD', pos: [-9.5, 0, 2.0] },
    { id: 'f2', name: 'LEFT WALL BACK', pos: [-9.5, 0, -15.0] },
    { id: 'f3', name: 'RIGHT WALL GUARD', pos: [9.5, 0, 2.0] },
    { id: 'f4', name: 'RIGHT WALL BACK', pos: [9.5, 0, -15.0] },
    { id: 'f5', name: 'STRAIGHT WALL', pos: [0, 0, -42.0] },
    { id: 'f6', name: 'DEEP COVER', pos: [-8.0, 0, -25.0] }
  ]
}

export const useGullyCricketStore = create((set, get) => ({
  // Game States: 'BOOT' | 'MENU' | 'DRAFT_TOSS' | 'MEGA_DRAFT' | 'MATCH_TOSS' | 'INNINGS_1' | 'INNINGS_BREAK' | 'INNINGS_2' | 'RESULT'
  gameState: 'BOOT',
  gameMode: 'STREET_SERIES',

  // Match Config
  totalOvers: 2,
  teamSize: 5,
  currentInnings: 1,

  // Mega Draft State
  draftPool: [...DRAFT_PLAYERS_POOL],
  userSquad: [],
  aiSquad: [],
  draftTurn: 'USER', // 'USER' | 'AI'
  draftTossWinner: null, // 'USER' | 'AI'

  // Match Toss State
  matchTossWinner: null, // 'USER' | 'AI'
  userElected: null, // 'BAT' | 'BOWL'

  // Fielder Placement Presets
  currentFieldPreset: 'DEFAULT',
  fielderPositions: FIELD_PRESETS.DEFAULT,

  // Scoreboard
  runs: 0,
  wickets: 0,
  ballsInOver: 0,
  completedOvers: 0,
  overHistory: [],
  targetRuns: null,

  // Teams
  battingTeamName: 'CHINMAYA XI',
  bowlingTeamName: 'STREET REBELS',

  // Player Active Stats
  strikerName: 'CHIKU (CAPTAIN)',
  nonStrikerName: 'GUDDU',
  bowlerName: 'ROCKY (PACER)',
  strikerRuns: 0,
  strikerBalls: 0,

  // Phase
  phase: 'IDLE',
  shotFeedback: '',
  lastShotOutcome: '',
  commentaryText: 'Welcome to Gully Cricket 3D!',
  cameraView: 'BATTER_VIEW',

  // Actions
  setGameState: (state) => set({ gameState: state }),
  setGameMode: (mode) => set({ gameMode: mode }),
  setPhase: (phase) => set({ phase }),
  setCameraView: (view) => set({ cameraView: view }),
  setShotFeedback: (fb) => set({ shotFeedback: fb }),
  setCommentaryText: (text) => set({ commentaryText: text }),

  setFieldPreset: (presetKey) => {
    const preset = FIELD_PRESETS[presetKey] || FIELD_PRESETS.DEFAULT
    set({ currentFieldPreset: presetKey, fielderPositions: preset })
  },

  startMegaDraftFlow: () => set({
    gameState: 'DRAFT_TOSS',
    draftPool: [...DRAFT_PLAYERS_POOL],
    userSquad: [],
    aiSquad: [],
    draftTurn: 'USER',
    draftTossWinner: null,
    matchTossWinner: null,
    userElected: null
  }),

  pickDraftPlayer: (playerId) => set((state) => {
    const player = state.draftPool.find(p => p.id === playerId)
    if (!player) return state

    const newPool = state.draftPool.filter(p => p.id !== playerId)

    if (state.draftTurn === 'USER') {
      const newUserSquad = [...state.userSquad, player]
      // Check if AI should pick next
      let nextTurn = 'AI'
      let aiPickedSquad = [...state.aiSquad]

      // Auto AI pick if pool has remaining players and AI squad needs players
      if (newPool.length > 0 && aiPickedSquad.length < state.teamSize) {
        const aiPickIndex = Math.floor(Math.random() * newPool.length)
        const aiPick = newPool[aiPickIndex]
        newPool.splice(aiPickIndex, 1)
        aiPickedSquad.push(aiPick)
        nextTurn = 'USER'
      }

      // Check draft completion
      let nextGameState = state.gameState
      if (newUserSquad.length >= state.teamSize && aiPickedSquad.length >= state.teamSize) {
        nextGameState = 'MATCH_TOSS'
      }

      return {
        draftPool: newPool,
        userSquad: newUserSquad,
        aiSquad: aiPickedSquad,
        draftTurn: nextTurn,
        gameState: nextGameState
      }
    }
    return state
  }),

  resetMatch: () => set((state) => {
    const striker = state.userSquad.length > 0 ? state.userSquad[0].name : 'CHIKU (CAPTAIN)'
    const bowler = state.aiSquad.length > 0 ? state.aiSquad[0].name : 'ROCKY (PACER)'

    return {
      gameState: 'INNINGS_1',
      currentInnings: 1,
      runs: 0,
      wickets: 0,
      ballsInOver: 0,
      completedOvers: 0,
      overHistory: [],
      targetRuns: null,
      strikerName: striker,
      bowlerName: bowler,
      strikerRuns: 0,
      strikerBalls: 0,
      phase: 'BOWLING_AIM',
      shotFeedback: '',
      lastShotOutcome: '',
      commentaryText: 'Innings 1 Started! Hit the walls for 4s & 6s. Watch out for One-Tippi catches!'
    }
  }),

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
      outcomeTag = '1T'
    } else if (type === 'WINDOW_BREAK_OUT') {
      newWickets += 1
      outcomeTag = 'OUT'
    }

    const newOverHistory = [...state.overHistory, outcomeTag]

    if (newBallsInOver >= 6) {
      newBallsInOver = 0
      newCompletedOvers += 1
    }

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

  startInnings2: () => set((state) => {
    const striker = state.aiSquad.length > 0 ? state.aiSquad[0].name : 'ROCKY (STRIKER)'
    const bowler = state.userSquad.length > 0 ? state.userSquad[0].name : 'CHIKU (BOWLER)'

    return {
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
      bowlingTeamName: 'CHINMAYA XI',
      strikerName: striker,
      bowlerName: bowler,
      phase: 'BOWLING_AIM',
      commentaryText: `Innings 2! Target to win: ${state.targetRuns} Runs in ${state.totalOvers} Overs!`
    }
  })
}))
