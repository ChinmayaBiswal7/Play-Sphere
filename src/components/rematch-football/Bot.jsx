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
  const lastScorer = useFootballStore((state) => state.lastScorer)
  const celebrationType = useFootballStore((state) => state.celebrationType)
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
    if (gameState === 'MENU') {
      api.position.set(0, 0.65, 0)
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
    const ball = window.footballBall
    const player = window.footballPlayer

    if (!ball) return

    const bPos = safePos(ball)
    const bVel = safeVel(ball)
    const pPos = player ? safePos(player) : [0, 0.65, 18]
    const distToBall = Math.hypot(bPos[0] - pos[0], bPos[2] - pos[2])

    const isPlayerHasBall = ballPossession === 'player1'

    // AI GK Defensive Mode
    const isGK = blueGK === id
    if (isGK) {
      const targetX = THREE.MathUtils.clamp(bPos[0] * 0.6, -6.5, 6.5)
      const targetZ = -58.0
      const dx = targetX - pos[0]
      const dz = targetZ - pos[2]
      const dist = Math.hypot(dx, dz)

      if (dist > 0.4) {
        currentDir.current.set(dx, 0, dz).normalize()
        api.velocity.set(currentDir.current.x * 12, vel[1], currentDir.current.z * 12)
      } else {
        api.velocity.set(0, vel[1], 0)
      }

      if (distToBall < 3.2) {
        ball.api.velocity.set((Math.random() - 0.5) * 16, 8, 32)
      }
      return
    }

    // Advanced Attack / Defend AI Logic
    let targetX = bPos[0]
    let targetZ = bPos[2]

    if (ballPossession === id) {
      // AI HAS BALL -> Sprint towards Opponent Goal (Z = 60) & Shoot!
      targetX = 0.0
      targetZ = 58.0

      const goalDist = Math.hypot(targetX - pos[0], targetZ - pos[2])
      if (goalDist < 30.0) {
        const aimX = (Math.random() - 0.5) * 10.0
        ball.api.velocity.set(aimX, 4.5 + Math.random() * 4, 34 + Math.random() * 10)
        setPossession(null)
      }
    } else {
      if (isPlayerHasBall && distToBall < 4.0 && diveCooldown.current <= 0) {
        // AI SLIDE TACKLE DASH!
        isDiving.current = true
        diveTime.current = 0.5
        diveCooldown.current = 3.5

        const dashX = (bPos[0] - pos[0]) * 4.0
        const dashZ = (bPos[2] - pos[2]) * 4.0
        api.velocity.set(dashX, 3.0, dashZ)
        
        if (distToBall < 2.0) {
          ball.api.velocity.set((Math.random() - 0.5) * 20, 5, -28)
          setPossession(null)
        }
      } else {
        targetX = bPos[0] + bVel[0] * 0.3
        targetZ = bPos[2] + bVel[2] * 0.3
      }
    }

    if (diveCooldown.current > 0) diveCooldown.current -= dt
    if (diveTime.current > 0) {
      diveTime.current -= dt
      if (diveTime.current <= 0) isDiving.current = false
    }

    const dx = targetX - pos[0]
    const dz = targetZ - pos[2]
    const dist = Math.hypot(dx, dz)

    if (dist > 0.4 && !isDiving.current) {
      currentDir.current.set(dx, 0, dz).normalize()
      const speed = isPlayerHasBall ? 16.5 : 13.0
      api.velocity.set(currentDir.current.x * speed, vel[1], currentDir.current.z * speed)
    }

    // AI Ball Dribbling touch
    if (distToBall < 1.45 && Math.abs(bPos[1] - pos[1]) < 1.8) {
      setPossession(id)
      const forwardX = pos[0] + currentDir.current.x * 0.55
      const forwardZ = pos[2] + currentDir.current.z * 0.55

      ball.api.velocity.set(
        vel[0] + (forwardX - bPos[0]) * 10,
        safeVel(ball)[1],
        vel[2] + (forwardZ - bPos[2]) * 10
      )
    }
  })

  const isGK = blueGK === id
  const vel = safeVel(window.footballBot)
  const botVelocityVec = new THREE.Vector3(vel[0], vel[1], vel[2])
  
  // Model faces forward along movement vector (HumanModel front is at -Z)
  const modelRotationY = Math.atan2(-currentDir.current.x, -currentDir.current.z)
  const showNameTag = gameState === 'PLAYING' || gameState === 'KICKOFF'

  const isCelebrating = gameState === 'GOAL_CELEBRATION' && lastScorer === 'blue' ? (celebrationType || 'jump') : false

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
          isCelebrating={isCelebrating}
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
