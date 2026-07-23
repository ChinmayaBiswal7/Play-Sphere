import React, { useRef, useEffect } from 'react'
import { useSphere } from '@react-three/cannon'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useLagoriStore } from './lagoriStore'
import { HumanModel } from '../rematch-football/HumanModel'
import * as THREE from 'three'

function safePos(ref) {
  if (ref && ref.position && Array.isArray(ref.position.current)) {
    return ref.position.current
  }
  return [0, 0.65, -14]
}

function safeVel(ref) {
  if (ref && ref.velocity && Array.isArray(ref.velocity.current)) {
    return ref.velocity.current
  }
  return [0, 0, 0]
}

export function LagoriBot({ id = 'bot1', team = 'defenders' }) {
  const [ref, api] = useSphere(() => ({
    mass: 72,
    position: [0, 0.65, -14],
    args: [0.62],
    fixedRotation: true,
    linearDamping: 0.15
  }))

  const gameState = useLagoriStore((state) => state.gameState)
  const isStackKnockedDown = useLagoriStore((state) => state.isStackKnockedDown)

  const botPos = useRef([0, 0.65, -14])
  const botVel = useRef([0, 0, 0])
  const currentDir = useRef(new THREE.Vector3(0, 0, 1))
  const throwCooldown = useRef(0)
  const dodgeDir = useRef(1)

  useEffect(() => {
    const unsubPos = api.position.subscribe(v => (botPos.current = v || [0, 0.65, -14]))
    const unsubVel = api.velocity.subscribe(v => (botVel.current = v || [0, 0, 0]))

    window.lagoriBot = {
      position: botPos,
      velocity: botVel,
      api: api
    }

    return () => {
      unsubPos()
      unsubVel()
      window.lagoriBot = null
    }
  }, [api])

  useEffect(() => {
    if (gameState === 'AIM_THROW' || gameState === 'MENU') {
      api.position.set(0, 0.65, -14)
      api.velocity.set(0, 0, 0)
    }
  }, [gameState, api])

  useFrame((state, dt) => {
    if (gameState === 'MENU' || gameState === 'BOOT' || gameState === 'ROUND_OVER') return

    const pos = safePos(window.lagoriBot)
    const vel = safeVel(window.lagoriBot)
    const ball = window.lagoriBall
    const player = window.lagoriPlayer

    if (!ball || !player) return
    const bPos = safePos(ball)
    const pPos = safePos(player)

    if (throwCooldown.current > 0) throwCooldown.current -= dt

    // ── 1. THROW PHASE: AI DEFENDER DODGES THROWN BALL ──
    if (gameState === 'AIM_THROW') {
      const distBallToBot = Math.hypot(bPos[0] - pos[0], bPos[2] - pos[2])

      // If ball is flying towards Defender, side-step dodge!
      if (distBallToBot < 8.0 && bPos[2] < 5.0) {
        api.velocity.set(dodgeDir.current * 14.0, vel[1], 0)
        currentDir.current.set(dodgeDir.current, 0, 0)
      } else {
        api.velocity.set(0, vel[1], 0)
      }
      return
    }

    // ── 2. REBUILD & DEFEND PHASE: CHASE BALL & THROW AT PLAYER ──
    if (gameState === 'REBUILD_DEFEND') {
      const distToBall = Math.hypot(bPos[0] - pos[0], bPos[2] - pos[2])
      const distToPlayer = Math.hypot(pPos[0] - pos[0], pPos[2] - pos[2])

      if (distToBall > 1.2) {
        // Sprint to pick up ball
        const dx = bPos[0] - pos[0]
        const dz = bPos[2] - pos[2]
        const len = Math.hypot(dx, dz) || 1
        api.velocity.set((dx / len) * 13.5, vel[1], (dz / len) * 13.5)
        currentDir.current.set(dx / len, 0, dz / len)
      } else {
        // Pick up ball and aim at player!
        api.velocity.set(0, vel[1], 0)

        if (throwCooldown.current <= 0) {
          throwCooldown.current = 2.4 // Throw interval

          // Aim vector at Seeker Player
          const pdx = pPos[0] - pos[0]
          const pdz = pPos[2] - pos[2]
          const plen = Math.hypot(pdx, pdz) || 1

          const throwSpeed = 24.0
          ball.api.position.set(pos[0] + (pdx / plen) * 1.0, 1.2, pos[2] + (pdz / plen) * 1.0)
          ball.api.velocity.set((pdx / plen) * throwSpeed, 2.0, (pdz / plen) * throwSpeed)
        }
      }
    }
  })

  const vel = safeVel(window.lagoriBot)
  const botVelocityVec = new THREE.Vector3(vel[0], vel[1], vel[2])
  const modelRotationY = Math.atan2(-currentDir.current.x, -currentDir.current.z)

  const showNameTag = gameState === 'AIM_THROW' || gameState === 'REBUILD_DEFEND'

  return (
    <group ref={ref}>
      <group rotation={[0, modelRotationY, 0]}>
        <HumanModel 
          preset="male_hoodie"
          teamColor="#0284c7" 
          secColor="#f43f5e" 
          number={9} 
          velocity={botVelocityVec}
        />
      </group>

      {/* OVERHEAD DEFENDER BOT NAME TAG */}
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
            <span>DEFENDER AI</span>
          </div>
        </Html>
      )}
    </group>
  )
}
