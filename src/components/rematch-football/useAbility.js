import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { ABILITY_REGISTRY } from './abilityConfig'
import { useAbilityStore } from './abilityStore'
import { useFootballStore } from './footballStore'

export function useAbility(playerId = 'player1') {
  const tickCooldowns = useAbilityStore((state) => state.tickCooldowns)
  const setAbilityState = useAbilityStore((state) => state.setAbilityState)
  const setCooldown = useAbilityStore((state) => state.setCooldown)
  const consumeMeter = useAbilityStore((state) => state.consumeMeter)
  const addMeter = useAbilityStore((state) => state.addMeter)

  const activeDurationTimer = useRef({})

  // Drive state machine and cooldown timers per frame
  useFrame((state, dt) => {
    tickCooldowns(playerId, dt)

    // Manage active state duration countdowns
    Object.keys(activeDurationTimer.current).forEach((abId) => {
      if (activeDurationTimer.current[abId] > 0) {
        activeDurationTimer.current[abId] -= dt
        if (activeDurationTimer.current[abId] <= 0) {
          activeDurationTimer.current[abId] = 0
          const config = ABILITY_REGISTRY[abId]
          setAbilityState(playerId, abId, 'cooldown')
          setCooldown(playerId, abId, config ? config.cooldownDuration : 3.0)
        }
      }
    })

    // Slowly recharge meter over time
    addMeter(playerId, dt * 4.0)
  })

  const triggerAbility = (abilityId, params = {}) => {
    const config = ABILITY_REGISTRY[abilityId]
    if (!config) return false

    const pData = useAbilityStore.getState().abilities[playerId] || { meter: 0, cooldowns: {}, states: {} }

    // Check cooldown
    if (pData.cooldowns[abilityId] > 0) return false

    // Check meter cost
    if (config.type === 'meter' && pData.meter < config.meterCost) return false

    // Check activation condition
    if (config.activationCondition === 'hasBall') {
      const possession = useFootballStore.getState().ballPossession
      if (possession !== playerId) return false
    }

    // Execute physics effect
    const success = config.execute(params)
    if (success) {
      if (config.type === 'meter') {
        consumeMeter(playerId, config.meterCost)
      }

      setAbilityState(playerId, abilityId, 'active')

      if (config.activeDuration) {
        activeDurationTimer.current[abilityId] = config.activeDuration
      } else {
        setAbilityState(playerId, abilityId, 'cooldown')
        setCooldown(playerId, abilityId, config.cooldownDuration)
      }

      // Socket emit for multiplayer sync
      if (window.gameSocket && typeof window.gameSocket.emit === 'function') {
        window.gameSocket.emit('ability:activate', {
          playerId,
          abilityId,
          timestamp: Date.now()
        })
      }
      return true
    }
    return false
  }

  return { triggerAbility }
}
