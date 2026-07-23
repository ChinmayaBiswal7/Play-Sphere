import { create } from 'zustand'

export const useAbilityStore = create((set, get) => ({
  abilities: {
    player1: {
      meter: 100, // 0 to 100
      activeAbility: null,
      cooldowns: {
        power_shot: 0,
        sprint_burst: 0,
        slide_tackle: 0
      },
      states: {
        power_shot: 'idle', // 'idle' | 'charging' | 'active' | 'cooldown'
        sprint_burst: 'idle',
        slide_tackle: 'idle'
      }
    },
    bot1: {
      meter: 100,
      activeAbility: null,
      cooldowns: {
        power_shot: 0,
        sprint_burst: 0,
        slide_tackle: 0
      },
      states: {
        power_shot: 'idle',
        sprint_burst: 'idle',
        slide_tackle: 'idle'
      }
    }
  },

  // Add meter on actions (passing, tackling, distance sprinted)
  addMeter: (playerId, amount) => set((state) => {
    const pData = state.abilities[playerId] || { meter: 0, cooldowns: {}, states: {} }
    const newMeter = Math.min(100, pData.meter + amount)
    return {
      abilities: {
        ...state.abilities,
        [playerId]: { ...pData, meter: newMeter }
      }
    }
  }),

  // Consume meter
  consumeMeter: (playerId, amount) => set((state) => {
    const pData = state.abilities[playerId] || { meter: 0, cooldowns: {}, states: {} }
    const newMeter = Math.max(0, pData.meter - amount)
    return {
      abilities: {
        ...state.abilities,
        [playerId]: { ...pData, meter: newMeter }
      }
    }
  }),

  // Set ability state
  setAbilityState: (playerId, abilityId, status) => set((state) => {
    const pData = state.abilities[playerId] || { meter: 0, cooldowns: {}, states: {} }
    return {
      abilities: {
        ...state.abilities,
        [playerId]: {
          ...pData,
          states: { ...pData.states, [abilityId]: status },
          activeAbility: status === 'active' ? abilityId : null
        }
      }
    }
  }),

  // Set cooldown remaining seconds
  setCooldown: (playerId, abilityId, durationSecs) => set((state) => {
    const pData = state.abilities[playerId] || { meter: 0, cooldowns: {}, states: {} }
    return {
      abilities: {
        ...state.abilities,
        [playerId]: {
          ...pData,
          cooldowns: { ...pData.cooldowns, [abilityId]: durationSecs }
        }
      }
    }
  }),

  // Tick cooldown timers down per frame
  tickCooldowns: (playerId, dt) => set((state) => {
    const pData = state.abilities[playerId]
    if (!pData) return state

    const newCooldowns = { ...pData.cooldowns }
    const newStates = { ...pData.states }
    let changed = false

    Object.keys(newCooldowns).forEach((abId) => {
      if (newCooldowns[abId] > 0) {
        newCooldowns[abId] = Math.max(0, newCooldowns[abId] - dt)
        changed = true
        if (newCooldowns[abId] === 0 && newStates[abId] === 'cooldown') {
          newStates[abId] = 'idle'
        }
      }
    })

    if (!changed) return state

    return {
      abilities: {
        ...state.abilities,
        [playerId]: {
          ...pData,
          cooldowns: newCooldowns,
          states: newStates
        }
      }
    }
  })
}))
