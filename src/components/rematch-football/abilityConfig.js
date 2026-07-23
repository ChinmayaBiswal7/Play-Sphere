import * as THREE from 'three'

/**
 * Config-driven Ability Registry for Rematch Arcade Football
 */
export const ABILITY_REGISTRY = {
  power_shot: {
    id: 'power_shot',
    name: 'Power Shot',
    type: 'meter',
    meterCost: 35,
    cooldownDuration: 4.0,
    activationCondition: 'hasBall',
    animationTag: 'KICK_POWER',
    vfxTag: 'CYAN_TRAIL',
    execute: ({ ball, playerPos, aimDir, powerPercent = 100 }) => {
      if (!ball || !ball.api) return false
      
      const bPos = ball.position.current
      const dist = Math.hypot(bPos[0] - playerPos[0], bPos[2] - playerPos[2])
      if (dist > 2.0) return false

      const targetGoalX = 0
      const targetGoalZ = -30.0
      const dirX = targetGoalX - bPos[0]
      const dirZ = targetGoalZ - bPos[2]
      const len = Math.hypot(dirX, dirZ) || 1

      const impulseSpeed = 22 + (powerPercent / 100) * 18
      const liftY = 4.2

      ball.api.velocity.set(
        (dirX / len) * impulseSpeed,
        liftY,
        (dirZ / len) * impulseSpeed
      )
      return true
    }
  },

  sprint_burst: {
    id: 'sprint_burst',
    name: 'Sprint Burst',
    type: 'cooldown',
    cooldownDuration: 5.0,
    activeDuration: 2.2,
    activationCondition: 'always',
    animationTag: 'SPRINT_BOOST',
    vfxTag: 'WIND_LINES',
    speedMultiplier: 1.65,
    execute: ({ playerApi, aimDir }) => {
      if (!playerApi) return false
      const impulseX = aimDir.x * 16.5
      const impulseZ = aimDir.z * 16.5
      playerApi.velocity.set(impulseX, 0, impulseZ)
      return true
    }
  },

  slide_tackle: {
    id: 'slide_tackle',
    name: 'Slide Tackle',
    type: 'cooldown',
    cooldownDuration: 3.5,
    activeDuration: 0.45,
    activationCondition: 'always',
    animationTag: 'SLIDE_TACKLE',
    vfxTag: 'TURF_SPARKS',
    execute: ({ playerApi, playerPos, aimDir, ball, setPossession }) => {
      if (!playerApi) return false

      // Forward tackle dash impulse
      playerApi.velocity.set(aimDir.x * 24, 0, aimDir.z * 24)

      // Tackle ball collision check
      if (ball && ball.api) {
        const bPos = ball.position.current
        const dist = Math.hypot(bPos[0] - playerPos[0], bPos[2] - playerPos[2])
        if (dist < 1.8) {
          ball.api.velocity.set(aimDir.x * 16, 2.5, aimDir.z * 16)
          setPossession && setPossession(null)
        }
      }
      return true
    }
  }
}
