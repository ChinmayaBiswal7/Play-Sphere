import React, { useRef, useEffect } from 'react'
import { useSphere } from '@react-three/cannon'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useFootballStore } from './footballStore'
import { HumanModel } from './HumanModel'
import * as THREE from 'three'

function safePos(ref) {
  if (ref && ref.position && Array.isArray(ref.position.current)) {
    return ref.position.current
  }
  return [0, 0.65, -18]
}

function safeVel(ref) {
  if (ref && ref.velocity && Array.isArray(ref.velocity.current)) {
    return ref.velocity.current
  }
  return [0, 0, 0]
}

export function Bot({ id = 'bot1' }) {
  const [ref, api] = useSphere(() => ({
    mass: 72,
    position: [0, 0.65, -18],
    args: [0.62],
    fixedRotation: true,
    linearDamping: 0.1
  }))

  const gameState = useFootballStore((state) => state.gameState)
  const kickoffTeam = useFootballStore((state) => state.kickoffTeam)
  const setPossession = useFootballStore((state) => state.setPossession)
  const ballPossession = useFootballStore((state) => state.ballPossession)
  const blueGK = useFootballStore((state) => state.blueGK)

  const diveCooldown = useRef(0)
  const isDiving = useRef(false)
  const diveTime = useRef(0)

  const botPos = useRef([0, 0.65, -18])
  const botVel = useRef([0, 0, 0])
  const currentDir = useRef(new THREE.Vector3(0, 0, 1))

  useEffect(() => {
    const unsubPos = api.position.subscribe(v => (botPos.current = v || [0, 0.65, -18]))
    const unsubVel = api.velocity.subscribe(v => (botVel.current = v || [0, 0, 0]))

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

  useEffect(() => {
    if (gameState === 'MENU' || gameState === 'BOOT' || gameState === 'LOADING_MATCH') {
      api.position.set(0, 0.65, -50)
      api.velocity.set(0, 0, 0)
    } else if (gameState === 'KICKOFF') {
      const spawnZ = kickoffTeam === 'blue' ? -3.5 : -22.0
      api.position.set(0, 0.65, spawnZ)
      api.velocity.set(0, 0, 0)
    }
  }, [gameState, kickoffTeam, api])

  useFrame((state, dt) => {
    if (gameState !== 'PLAYING') return

    const pos = safePos(window.footballBot)
    const vel = safeVel(window.footballBot)
    const isGK = blueGK === id

    const ball = window.footballBall
    const player = window.footballPlayer
    if (!ball) return

    const bPos = safePos(ball)
    const distToBall = Math.hypot(bPos[0] - pos[0], bPos[2] - pos[2])

    if (diveCooldown.current > 0) diveCooldown.current -= dt
    if (isDiving.current) {
      diveTime.current -= dt
      if (diveTime.current <= 0) isDiving.current = false
      return
    }

    // ── GOALKEEPER AI ──
    if (isGK) {
      const targetGKX = THREE.MathUtils.clamp(bPos[0], -7.5, 7.5)
      const targetGKZ = -58.0
      
      const dx = targetGKX - pos[0]
      const dz = targetGKZ - pos[2]
      const distToGKPos = Math.hypot(dx, dz)

      if (distToGKPos > 0.3) {
        api.velocity.set(Math.sign(dx) * 10.5, vel[1], Math.sign(dz) * 10.5)
        currentDir.current.set(Math.sign(dx), 0, Math.sign(dz)).normalize()
      } else {
        api.velocity.set(0, vel[1], 0)
      }

      if (bPos[2] < -50 && Math.abs(bPos[0]) < 9.5 && diveCooldown.current <= 0) {
        isDiving.current = true
        diveTime.current = 0.4
        diveCooldown.current = 2.5
        const diveDirection = Math.sign(bPos[0] - pos[0]) || (Math.random() > 0.5 ? 1 : -1)
        api.velocity.set(diveDirection * 18, 5.5, 5.0)
      }
      return
    }

    // ── SMART STRIKER AI ──
    let targetX = 0
    let targetZ = 0
    let speed = 11.5

    const hasPossession = ballPossession === id

    if (hasPossession) {
      targetX = 0
      targetZ = 58.0
      speed = 12.5

      // Strike ball when in shooting range
      if (pos[2] > 22.0) {
        strikeBall(90)
      }
    } else {
      const pPos = player ? safePos(player) : [0, 0.65, 18]
      const playerDistToBall = Math.hypot(bPos[0] - pPos[0], bPos[2] - pPos[2])

      if (bPos[2] < 12 || distToBall < playerDistToBall + 2.0) {
        targetX = bPos[0]
        targetZ = bPos[2]
      } else {
        targetX = pPos[0] * 0.75
        targetZ = pPos[2] - 6.0
      }

      // Slide tackle when close to ball carrier
      if (ballPossession === 'player1' && distToBall < 1.9 && Math.random() < 0.35) {
        isDiving.current = true
        diveTime.current = 0.3
        const dashDirX = Math.sign(bPos[0] - pos[0])
        const dashDirZ = Math.sign(bPos[2] - pos[2])
        api.velocity.set(dashDirX * 20, vel[1], dashDirZ * 20)
        return
      }
    }

    const dx = targetX - pos[0]
    const dz = targetZ - pos[2]
    const distToTarget = Math.hypot(dx, dz)

    if (distToTarget > 0.4) {
      const dirX = dx / distToTarget
      const dirZ = dz / distToTarget
      api.velocity.set(dirX * speed, vel[1], dirZ * speed)
      currentDir.current.set(dirX, 0, dirZ)
    } else {
      api.velocity.set(0, vel[1], 0)
    }

    // Possession pickup
    if (distToBall < 1.6 && !hasPossession && ballPossession !== 'player1') {
      setPossession(id)
    }

    // Carry ball when holding possession
    if (hasPossession) {
      const tX = pos[0] + currentDir.current.x * 1.0
      const tZ = pos[2] + currentDir.current.z * 1.0
      
      const bdx = tX - bPos[0]
      const bdz = tZ - bPos[2]

      ball.api.velocity.set(
        vel[0] + bdx * 9,
        safeVel(ball)[1],
        vel[2] + bdz * 9
      )

      if (distToBall > 1.8) {
        setPossession(null)
      }
    }
  })

  const strikeBall = (powerPercent) => {
    const ball = window.footballBall
    if (!ball) return

    const pos = safePos(window.footballBot)
    const bPos = safePos(ball)
    const dist = Math.hypot(bPos[0] - pos[0], bPos[2] - pos[2])

    if (dist < 1.95) {
      const targetGoalX = (Math.random() - 0.5) * 6.0
      const targetGoalZ = 60.0
      
      const dirX = targetGoalX - bPos[0]
      const dirZ = targetGoalZ - bPos[2]
      const len = Math.hypot(dirX, dirZ)

      const speedVal = 22 + (powerPercent / 100) * 20
      ball.api.velocity.set((dirX / len) * speedVal, 4.0, (dirZ / len) * speedVal)
      setPossession(null)
    }
  }

  const isGK = blueGK === id
  const vel = safeVel(window.footballBot)
  const botVelocityVec = new THREE.Vector3(vel[0], vel[1], vel[2])
  // FIX: Added + Math.PI so the AI faces forward towards its movement vector instead of backwards at player
  const modelRotationY = Math.atan2(-currentDir.current.x, -currentDir.current.z) + Math.PI

  const showNameTag = gameState === 'PLAYING' || gameState === 'KICKOFF'

  return (
    <group ref={ref}>
      <group rotation={[0, modelRotationY, 0]}>
        <HumanModel 
          preset="male_hoodie"
          teamColor="#0284c7" 
          secColor="#f43f5e" 
          number={9} 
          isGoalkeeper={isGK}
          velocity={botVelocityVec}
          isTackling={isDiving.current && !isGK}
        />
      </group>

      {/* OVERHEAD BOT NAME TAG */}
      {showNameTag && (
        <Html position={[0, 2.7, 0]} center distanceFactor={14}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(15, 23, 42, 0.88)',
            border: '1px solid rgba(2, 132, 199, 0.7)',
            borderRadius: '6px',
            padding: '3px 8px',
            color: '#fff',
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '11px',
            fontWeight: '900',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            pointerEvents: 'none'
          }}>
            <span style={{ background: '#0284c7', color: '#fff', padding: '1px 5px', borderRadius: '3px', fontSize: '10px' }}>9</span>
            <span>AI BOT 1</span>
          </div>
        </Html>
      )}
    </group>
  )
}
