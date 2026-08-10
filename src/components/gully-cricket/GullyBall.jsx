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
function safeVel(ref) {
  if (ref && ref.velocity && Array.isArray(ref.velocity.current)) {
    return ref.velocity.current
  }
  return [0, 0, 0]
}

export function GullyBall({ aimTarget = [0, -4] }) {
  const [ref, api] = useSphere(() => ({
    mass: 0.16,
    position: [0, 1.8, -13],
    args: [0.12],
    restitution: 0.85,
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

      const targetX = aimTarget[0] || 0
      const targetZ = aimTarget[1] || -2.0
      
      const dx = targetX - 0
      const dz = targetZ - (-13)
      
      const speedZ = 22.0
      const timeToPitch = dz / speedZ
      const speedX = dx / timeToPitch
      const speedY = -2.5

      api.velocity.set(speedX, speedY, speedZ)
      setPhase('BALL_IN_AIR')
    }
  }, [phase, aimTarget, api, setPhase])

  useFrame((state, dt) => {
    if (phase !== 'BALL_IN_AIR' && phase !== 'SHOT_HIT') return

    const pos = ballPos.current
    const vel = ballVel.current

    if (!hasPitched.current && pos[1] <= 0.25 && pos[2] < 10) {
      hasPitched.current = true
      bounceCount.current += 1
      const bounceVelY = Math.abs(vel[1]) * 0.75 + 2.5
      const bounceVelZ = vel[2] * 0.95
      api.velocity.set(vel[0], bounceVelY, bounceVelZ)
    }

    if (hasPitched.current && pos[1] <= 0.25 && vel[1] < 0) {
      bounceCount.current += 1
    }

    if (!isHitByBatter.current && pos[2] >= 12.8 && pos[2] <= 13.5 && Math.abs(pos[0]) < 0.45 && pos[1] < 1.6) {
      recordBallOutcome('WICKET', 0, 'BOWLED OUT!')
      return
    }

    if (!isHitByBatter.current && pos[2] > 13.0) {
      recordBallOutcome('RUNS', 0, 'DOT BALL (MISSED)')
      return
    }

    if (isHitByBatter.current) {
      // Boundaries
      if (Math.abs(pos[0]) >= 15 && pos[2] > -55 && pos[2] < 50) { // X hits wall
        if (pos[1] > 4.5) {
          recordBallOutcome('RUNS', 6, '6 RUNS! (HIGH ROOF HIT!)')
        } else {
          recordBallOutcome('RUNS', 4, '4 RUNS! (WALL HIT!)')
        }
        return
      }

      if (pos[2] <= -55) {
        if (pos[1] > 4.0) {
          recordBallOutcome('RUNS', 6, '6 RUNS! (MONSTER HIT OVER THE STREET!)')
        } else {
          recordBallOutcome('RUNS', 4, '4 RUNS! (STRAIGHT BOUNDARY!)')
        }
        return
      }

      if (Math.abs(pos[0]) > 17 || pos[1] > 16.0) {
        recordBallOutcome('WINDOW_BREAK_OUT', 0, 'OUT! (WINDOW BREAK / BALL LOST OVER ROOF!)')
        return
      }

      if (bounceCount.current === 1 && pos[1] > 0.4 && pos[1] < 2.2) {
        const fielders = [[5, -5], [-5, -5], [7, 10], [-7, 10]]
        for (const [fx, fz] of fielders) {
          const distToFielder = Math.hypot(pos[0] - fx, pos[2] - fz)
          if (distToFielder < 2.8) {
            recordBallOutcome('ONE_TIPPI_OUT', 0, 'OUT! (ONE-TIPPI CATCH BY FIELDER!)')
            return
          }
        }
      }

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
      <meshStandardMaterial color="#ef4444" roughness={0.3} metalness={0.1} />
      {/* Seam line */}
      <mesh rotation={[0, 0, Math.PI/2]}>
        <torusGeometry args={[0.12, 0.005, 16, 32]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </mesh>
  )
}
