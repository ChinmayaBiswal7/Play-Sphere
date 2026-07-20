import React, { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CapsuleCollider } from '@react-three/rapier'
import { useFootballStore } from './footballStore'
import * as THREE from 'three'

export function Bot({ id = 'bot1' }) {
  const bodyRef = useRef()
  
  // Zustand State
  const gameState = useFootballStore((state) => state.gameState)
  const setPossession = useFootballStore((state) => state.setPossession)
  const ballPossession = useFootballStore((state) => state.ballPossession)
  const blueGK = useFootballStore((state) => state.blueGK)

  // Bot local parameters
  const diveCooldown = useRef(0)
  const isDiving = useRef(false)
  const diveTime = useRef(0)

  useEffect(() => {
    if ((gameState === 'KICKOFF' || gameState === 'LOBBY') && bodyRef.current) {
      bodyRef.current.setTranslation({ x: 0, y: 1, z: -12 }, true)
      bodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
    }
  }, [gameState])

  useFrame((state, dt) => {
    const body = bodyRef.current
    if (!body || gameState === 'GOAL_SCRIBED' || gameState === 'GAMEOVER') return

    const pos = body.translation()
    const vel = body.linvel()
    const isGK = blueGK === id

    // ── 1. RETRIEVE BALL PHYSICS AND OTHER POSITIONS ──
    const ballBody = window.footballBallBody
    const playerBody = window.footballPlayerBody
    if (!ballBody) return

    const ballPos = ballBody.translation()
    const ballVel = ballBody.linvel()
    const distToBall = Math.hypot(ballPos.x - pos.x, ballPos.z - pos.z)

    // Reset dive timers
    if (diveCooldown.current > 0) diveCooldown.current -= dt
    if (isDiving.current) {
      diveTime.current -= dt
      if (diveTime.current <= 0) isDiving.current = false
      return // skip normal bot movement while diving
    }

    // ── 2. GOALKEEPER BEHAVIOR ──
    if (isGK) {
      // Stand in front of blue's goal (Z = -30)
      const targetGKX = THREE.MathUtils.clamp(ballPos.x, -4.5, 4.5)
      const targetGKZ = -29.0
      
      const dx = targetGKX - pos.x
      const dz = targetGKZ - pos.z
      const distToGKPos = Math.hypot(dx, dz)

      if (distToGKPos > 0.3) {
        body.setLinvel({
          x: Math.sign(dx) * 7,
          y: vel.y,
          z: Math.sign(dz) * 7
        }, true)
      } else {
        body.setLinvel({ x: 0, y: vel.y, z: 0 }, true)
      }

      // Save/Dive triggers if ball approaches the goal line
      if (ballPos.z < -25 && Math.abs(ballPos.x) < 5.5 && diveCooldown.current <= 0) {
        // Dive in the direction of the ball's X coordinate relative to the bot
        isDiving.current = true
        diveTime.current = 0.4
        diveCooldown.current = 2.5

        const diveDirection = Math.sign(ballPos.x - pos.x) || (Math.random() > 0.5 ? 1 : -1)
        body.setLinvel({
          x: diveDirection * 15,
          y: 5.5,
          z: 5.0
        }, true)
      }
      return
    }

    // ── 3. STATE MACHINE MOVEMENT ──
    let targetX = 0
    let targetZ = 0
    let speed = 6.2

    const hasPossession = ballPossession === id

    if (hasPossession) {
      // 🚨 ATTACKING STATE: Run towards player's goal (Z = 30)
      targetX = 0
      targetZ = 30
      speed = 7.5

      // Shoot if close to opponent goal
      if (pos.z > 14) {
        strikeBall(85)
      }
    } else {
      // 🛡️ DEFENSIVE / TACTICAL STATES
      const playerPos = playerBody ? playerBody.translation() : { x: 0, y: 1, z: 12 }
      
      // If ball is on defending half (Z < 0) or closer to ball than player is
      const playerDistToBall = Math.hypot(ballPos.x - playerPos.x, ballPos.z - playerPos.z)
      const botDistToBall = distToBall

      if (ballPos.z < 6 || botDistToBall < playerDistToBall) {
        // STATE: CHASE_BALL
        targetX = ballPos.x
        targetZ = ballPos.z
      } else {
        // STATE: MARK_OPPONENT (Stand between player and goal at Z = -30)
        targetX = playerPos.x * 0.7
        targetZ = playerPos.z - 5.0
      }

      // Slide Tackle trigger if close to dribbling player
      if (ballPossession === 'player1' && distToBall < 1.6 && Math.random() < 0.25) {
        // Slide tackle!
        isDiving.current = true // lock normal controls
        diveTime.current = 0.25
        const dashDirX = Math.sign(ballPos.x - pos.x)
        const dashDirZ = Math.sign(ballPos.z - pos.z)
        body.setLinvel({
          x: dashDirX * 16,
          y: vel.y,
          z: dashDirZ * 16
        }, true)
        return
      }
    }

    // Move bot towards target
    const dx = targetX - pos.x
    const dz = targetZ - pos.z
    const distToTarget = Math.hypot(dx, dz)

    if (distToTarget > 0.4) {
      body.setLinvel({
        x: (dx / distToTarget) * speed,
        y: vel.y,
        z: (dz / distToTarget) * speed
      }, true)
    }

    // ── 4. DRIBBLE AND LOOSE CONTROLS ──
    if (distToBall < 1.3 && !hasPossession && ballPossession !== 'player1') {
      setPossession(id)
    }

    if (hasPossession) {
      // Push ball loosely in front
      const dribbleTarget = new THREE.Vector3(pos.x, 0.5, pos.z + 0.75)
      const force = new THREE.Vector3()
        .subVectors(dribbleTarget, ballPos)
        .multiplyScalar(8 * dt)
      ballBody.applyImpulse({ x: force.x, y: 0.1 * dt, z: force.z }, true)

      if (distToBall > 1.4) {
        setPossession(null)
      }
    }
  })

  // Strike ball function
  const strikeBall = (powerPercent) => {
    const ballBody = window.footballBallBody
    const botBody = bodyRef.current
    if (!ballBody || !botBody) return

    const pos = botBody.translation()
    const ballPos = ballBody.translation()
    const dist = Math.hypot(ballPos.x - pos.x, ballPos.z - pos.z)

    if (dist < 1.5) {
      const targetGoal = new THREE.Vector3(0, 0.5, 30)
      const shootDir = new THREE.Vector3()
        .subVectors(targetGoal, ballPos)
        .normalize()
      
      shootDir.y = 0.22 // lift slightly
      const force = shootDir.multiplyScalar(16 + (powerPercent / 100) * 18)

      ballBody.setLinvel({ x: force.x, y: force.y, z: force.z }, true)
      setPossession(null)
    }
  }

  const isGK = blueGK === id
  const bodyColor = isGK ? '#60a5fa' : '#1d4ed8' // light-blue goalie vs deep blue jersey

  return (
    <RigidBody
      ref={bodyRef}
      position={[0, 1, -12]}
      colliders={false}
      enabledRotations={[false, false, false]}
      angularDamping={0.5}
      linearDamping={0.1}
    >
      <CapsuleCollider args={[0.5, 0.4]} friction={0.5} mass={2.0} />
      
      {/* Bot Visual Model */}
      <mesh castShadow position={[0, 0, 0]}>
        <capsuleGeometry args={[0.4, 1.0, 4, 8]} />
        <meshStandardMaterial color={bodyColor} roughness={0.4} />
      </mesh>

      {/* Visor pointing forward */}
      <mesh position={[0, 0.65, 0.22]}>
        <boxGeometry args={[0.5, 0.16, 0.2]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Goalkeeper Glow Aura */}
      {isGK && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.89, 0]}>
          <ringGeometry args={[0.7, 0.8, 32]} />
          <meshBasicMaterial color="#60a5fa" />
        </mesh>
      )}
    </RigidBody>
  )
}
