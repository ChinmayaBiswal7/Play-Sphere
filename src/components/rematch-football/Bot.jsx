import React, { useRef, useEffect } from 'react'
import { useSphere } from '@react-three/cannon'
import { useFrame } from '@react-three/fiber'
import { useFootballStore } from './footballStore'
import { HumanModel } from './HumanModel'
import * as THREE from 'three'

export function Bot({ id = 'bot1' }) {
  // Use Cannon sphere instead of Rapier capsule
  const [ref, api] = useSphere(() => ({
    mass: 72,
    position: [0, 1.2, -12],
    args: [0.62],
    fixedRotation: true,
    linearDamping: 0.1
  }))

  // Zustand state subscriptions
  const gameState = useFootballStore((state) => state.gameState)
  const setPossession = useFootballStore((state) => state.setPossession)
  const ballPossession = useFootballStore((state) => state.ballPossession)
  const blueGK = useFootballStore((state) => state.blueGK)

  // Dive and tackle timings
  const diveCooldown = useRef(0)
  const isDiving = useRef(false)
  const diveTime = useRef(0)

  const botPos = useRef([0, 1.2, -12])
  const botVel = useRef([0, 0, 0])

  useEffect(() => {
    // Subscribe to physics states
    const unsubPos = api.position.subscribe(v => (botPos.current = v))
    const unsubVel = api.velocity.subscribe(v => (botVel.current = v))

    // Set globally on window
    window.footballBot = {
      position: botPos,
      velocity: botVel,
      api: api
    }

    return () => {
      unsubPos()
      unsubVel()
      window.footballBot = null
    }
  }, [api])

  // Reset positions at kickoff
  useEffect(() => {
    if (gameState === 'KICKOFF' || gameState === 'LOBBY') {
      api.position.set(0, 1.2, -12)
      api.velocity.set(0, 0, 0)
    }
  }, [gameState, api])

  useFrame((state, dt) => {
    if (gameState === 'GOAL_SCRIBED' || gameState === 'GAMEOVER') return

    const pos = botPos.current
    const vel = botVel.current
    const isGK = blueGK === id

    // Retrieve global positions
    const ball = window.footballBall
    const player = window.footballPlayer
    if (!ball) return

    const bPos = ball.position.current
    const distToBall = Math.hypot(bPos[0] - pos[0], bPos[2] - pos[2])

    // Update timers
    if (diveCooldown.current > 0) diveCooldown.current -= dt
    if (isDiving.current) {
      diveTime.current -= dt
      if (diveTime.current <= 0) isDiving.current = false
      return // Lock normal AI logic during active dives/lunges
    }

    // ── 1. GOALKEEPER ROLE BEHAVIOR ──
    if (isGK) {
      // Stand in front of its goal (Z = -30)
      const targetGKX = THREE.MathUtils.clamp(bPos[0], -4.5, 4.5)
      const targetGKZ = -29.0
      
      const dx = targetGKX - pos[0]
      const dz = targetGKZ - pos[2]
      const distToGKPos = Math.hypot(dx, dz)

      if (distToGKPos > 0.3) {
        api.velocity.set(Math.sign(dx) * 7.0, vel[1], Math.sign(dz) * 7.0)
      } else {
        api.velocity.set(0, vel[1], 0)
      }

      // Dive if ball comes close
      if (bPos[2] < -25 && Math.abs(bPos[0]) < 5.5 && diveCooldown.current <= 0) {
        isDiving.current = true
        diveTime.current = 0.4
        diveCooldown.current = 2.5
        const diveDirection = Math.sign(bPos[0] - pos[0]) || (Math.random() > 0.5 ? 1 : -1)
        api.velocity.set(diveDirection * 15, 5.5, 5.0)
      }
      return
    }

    // ── 2. STATE MACHINE AI PATHFINDING ──
    let targetX = 0
    let targetZ = 0
    let speed = 6.2

    const hasPossession = ballPossession === id

    if (hasPossession) {
      // Run to player's goal (Z = 30)
      targetX = 0
      targetZ = 30
      speed = 7.2

      // Shoot if inside strike range
      if (pos[2] > 14) {
        strikeBall(85)
      }
    } else {
      const pPos = player ? player.position.current : [0, 1.2, 12]
      
      // Defending half ball checks
      const playerDistToBall = Math.hypot(bPos[0] - pPos[0], bPos[2] - pPos[2])
      const botDistToBall = distToBall

      if (bPos[2] < 6 || botDistToBall < playerDistToBall) {
        // STATE: CHASE BALL
        targetX = bPos[0]
        targetZ = bPos[2]
      } else {
        // STATE: MARK OPPONENT (Stay between player and goal at Z = -30)
        targetX = pPos[0] * 0.7
        targetZ = pPos[2] - 5.0
      }

      // Slide tackle trigger if player is close
      if (ballPossession === 'player1' && distToBall < 1.6 && Math.random() < 0.22) {
        isDiving.current = true
        diveTime.current = 0.25
        const dashDirX = Math.sign(bPos[0] - pos[0])
        const dashDirZ = Math.sign(bPos[2] - pos[2])
        api.velocity.set(dashDirX * 16, vel[1], dashDirZ * 16)
        return
      }
    }

    // Apply AI calculated velocities
    const dx = targetX - pos[0]
    const dz = targetZ - pos[2]
    const distToTarget = Math.hypot(dx, dz)

    if (distToTarget > 0.4) {
      api.velocity.set((dx / distToTarget) * speed, vel[1], (dz / distToTarget) * speed)
    } else {
      api.velocity.set(0, vel[1], 0)
    }

    // Dribble trigger
    if (distToBall < 1.3 && !hasPossession && ballPossession !== 'player1') {
      setPossession(id)
    }

    if (hasPossession) {
      // Pull ball smoothly
      const targetX = pos[0]
      const targetZ = pos[2] + 0.8
      
      const dx = targetX - bPos[0]
      const dz = targetZ - bPos[2]

      ball.api.velocity.set(
        botVel.current[0] + dx * 8,
        ball.velocity.current[1],
        botVel.current[2] + dz * 8
      )

      if (distToBall > 1.45) {
        setPossession(null)
      }
    }
  })

  // Strike ball function
  const strikeBall = (powerPercent) => {
    const ball = window.footballBall
    if (!ball) return

    const pos = botPos.current
    const bPos = ball.position.current
    const dist = Math.hypot(bPos[0] - pos[0], bPos[2] - pos[2])

    if (dist < 1.55) {
      const targetGoalX = 0
      const targetGoalZ = 30.0
      
      const dirX = targetGoalX - bPos[0]
      const dirZ = targetGoalZ - bPos[2]
      const len = Math.hypot(dirX, dirZ)

      const speedVal = 14 + (powerPercent / 100) * 16
      ball.api.velocity.set((dirX / len) * speedVal, 3.2, (dirZ / len) * speedVal)
      setPossession(null)
    }
  }

  const isGK = blueGK === id
  const botVelocityVec = new THREE.Vector3(botVel.current[0], botVel.current[1], botVel.current[2])

  return (
    <group ref={ref}>
      {/* Visual Human Model */}
      <HumanModel 
        teamColor="#1d4ed8" 
        secColor="#fb7185" 
        number={9} 
        isGoalkeeper={isGK}
        velocity={botVelocityVec}
        isTackling={isDiving.current && !isGK} // slide tackle triggers running lunge visual
      />

      {/* GK Aura Ring */}
      {isGK && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.61, 0]}>
          <ringGeometry args={[0.6, 0.7, 32]} />
          <meshBasicMaterial color="#3b82f6" />
        </mesh>
      )}
    </group>
  )
}
