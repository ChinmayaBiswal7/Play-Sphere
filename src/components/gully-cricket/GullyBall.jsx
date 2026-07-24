import React, { useRef, useEffect } from 'react'
import { useSphere } from '@react-three/cannon'
import { useFrame } from '@react-three/fiber'
import { useGullyCricketStore } from './gullyCricketStore'
import * as THREE from 'three'

function safePos(ref) {
  if (ref && ref.position && Array.isArray(ref.position.current)) {
    return ref.position.current
  }
  return [0, 0.2, 0]
}

export function GullyBall({ aimTarget = [0, -4] }) {
  const [ref, api] = useSphere(() => ({
    mass: 0.16, // Tennis ball mass
    position: [0, 1.8, -13],
    args: [0.12],
    restitution: 0.85, // High tennis ball bounce
    linearDamping: 0.02
  }))

  const phase = useGullyCricketStore((state) => state.phase)
  const setPhase = useGullyCricketStore((state) => state.setPhase)
  const recordBallOutcome = useGullyCricketStore((state) => state.recordBallOutcome)

  const ballPos = useRef([0, 1.8, -13])
  const ballVel = useRef([0, 0, 0])
  const hasPitched = useRef(false)
  const bounceCount = useRef(0)
  const isHitByBatter = useRef(false)
  const shotDetail = useRef('')

  useEffect(() => {
    const unsubPos = api.position.subscribe(v => (ballPos.current = v || [0, 0.2, 0]))
    const unsubVel = api.velocity.subscribe(v => (ballVel.current = v || [0, 0, 0]))

    window.gullyBall = {
      position: ballPos,
      velocity: ballVel,
      api: api,
      hitBall: (dirX, dirY, dirZ, feedback) => {
        isHitByBatter.current = true
        useGullyCricketStore.getState().setShotFeedback(feedback)
        api.velocity.set(dirX, dirY, dirZ)
      }
    }

    return () => {
      unsubPos()
      unsubVel()
      window.gullyBall = null
    }
  }, [api])

  // Reset ball on new delivery phase
  useEffect(() => {
    if (phase === 'BOWLING_AIM') {
      hasPitched.current = false
      bounceCount.current = 0
      isHitByBatter.current = false
      shotDetail.current = ''
      api.position.set(0, 1.8, -13)
      api.velocity.set(0, 0, 0)
    } else if (phase === 'BOWLING_RELEASE') {
      hasPitched.current = false
      bounceCount.current = 0
      isHitByBatter.current = false
      shotDetail.current = ''
      api.position.set(0, 1.8, -13)

      // Calculate trajectory vector to landing spot `aimTarget` [x, z]
      const targetX = aimTarget[0] || 0
      const targetZ = aimTarget[1] || -2.0
      
      const dx = targetX - 0
      const dz = targetZ - (-13)
      
      const speedZ = 22.0 // Bowling pace
      const timeToPitch = dz / speedZ
      const speedX = dx / timeToPitch
      const speedY = -2.5

      api.velocity.set(speedX, speedY, speedZ)
      setPhase('BALL_IN_AIR')
    }
  }, [phase, aimTarget, api, setPhase])

  useFrame((state, dt) => {
    if (phase !== 'BALL_IN_AIR' && phase !== 'SHOT_HIT') return

    const pos = safePos(window.gullyBall)
    const vel = safeVel(window.gullyBall)

    // ── 1. PITCH BOUNCE CHECK ──
    if (!hasPitched.current && pos[1] <= 0.25 && pos[2] < 10) {
      hasPitched.current = true
      bounceCount.current += 1

      // Bounce trajectory towards batter crease Z = 12.5
      const bounceVelY = Math.abs(vel[1]) * 0.75 + 2.5
      const bounceVelZ = vel[2] * 0.95
      api.velocity.set(vel[0], bounceVelY, bounceVelZ)
    }

    // Ground bounce count tracker
    if (hasPitched.current && pos[1] <= 0.25 && vel[1] < 0) {
      bounceCount.current += 1
    }

    // ── 2. STUMPS CHECK (BOWLED OUT) ──
    if (!isHitByBatter.current && pos[2] >= 12.8 && pos[2] <= 13.5 && Math.abs(pos[0]) < 0.45 && pos[1] < 1.6) {
      recordBallOutcome('WICKET', 0, 'BOWLED OUT!')
      return
    }

    // ── 3. MISSED BALL PAST BATTER ──
    if (!isHitByBatter.current && pos[2] > 16.0) {
      recordBallOutcome('RUNS', 0, 'DOT BALL (MISSED)')
      return
    }

    // ── 4. GULLY BOUNDARY & WALL HIT COLLISION CHECKS ──
    if (isHitByBatter.current) {
      // Side Brick Wall Hit (Z between -50 and 50, X >= 10.2 or X <= -10.2)
      if (Math.abs(pos[0]) >= 10.2 && pos[2] > -50 && pos[2] < 50) {
        if (pos[1] > 4.5) {
          // High Roof Wall = 6 RUNS!
          recordBallOutcome('RUNS', 6, '6 RUNS! (HIGH ROOF HIT!)')
        } else {
          // Side Wall = 4 RUNS!
          recordBallOutcome('RUNS', 4, '4 RUNS! (WALL HIT!)')
        }
        return
      }

      // Rear Wall Hit (Z <= -50)
      if (pos[2] <= -50) {
        if (pos[1] > 4.0) {
          recordBallOutcome('RUNS', 6, '6 RUNS! (MONSTER HIT OVER THE STREET!)')
        } else {
          recordBallOutcome('RUNS', 4, '4 RUNS! (STRAIGHT BOUNDARY!)')
        }
        return
      }

      // Over the Roof Out of Bounds (Window Break / Ball Lost = OUT!)
      if (Math.abs(pos[0]) > 12.5 || pos[1] > 12.0) {
        recordBallOutcome('WINDOW_BREAK_OUT', 0, 'OUT! (WINDOW BREAK / BALL LOST OVER ROOF!)')
        return
      }

      // Fielder One-Tippi Catch check ("One Bounce Catch = OUT")
      if (bounceCount.current === 1 && pos[1] > 0.4 && pos[1] < 2.2) {
        // Fielders at Z = -10, 0, 10
        const fielders = [
          [5, -5], [-5, -5], [7, 10], [-7, 10]
        ]
        for (const [fx, fz] of fielders) {
          const distToFielder = Math.hypot(pos[0] - fx, pos[2] - fz)
          if (distToFielder < 2.8) {
            recordBallOutcome('ONE_TIPPI_OUT', 0, 'OUT! (ONE-TIPPI CATCH BY FIELDER!)')
            return
          }
        }
      }

      // Ball stopped / rolling dead
      if (pos[1] <= 0.25 && Math.hypot(vel[0], vel[2]) < 0.5) {
        const runsScored = bounceCount.current > 2 ? 1 : 2
        recordBallOutcome('RUNS', runsScored, `${runsScored} RUNS!`)
        return
      }
    }
  })

  return (
    <mesh ref={ref} castShadow>
      <sphereGeometry args={[0.12, 20, 20]} />
      {/* Heavy Green Taped Tennis Ball texture styling */}
      <meshStandardMaterial color="#22c55e" roughness={0.3} metalness={0.1} />
    </mesh>
  )
}
