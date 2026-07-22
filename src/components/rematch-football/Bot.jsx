import React, { useRef, useEffect } from 'react'
import { useSphere } from '@react-three/cannon'
import { useFrame } from '@react-three/fiber'
import { useFootballStore } from './footballStore'
import { HumanModel } from './HumanModel'
import * as THREE from 'three'

function safePos(ref) {
  if (ref && ref.position && Array.isArray(ref.position.current)) {
    return ref.position.current
  }
  return [0, 1.2, -12]
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
    position: [0, 1.2, -12],
    args: [0.62],
    fixedRotation: true,
    linearDamping: 0.1
  }))

  const gameState = useFootballStore((state) => state.gameState)
  const setPossession = useFootballStore((state) => state.setPossession)
  const ballPossession = useFootballStore((state) => state.ballPossession)
  const blueGK = useFootballStore((state) => state.blueGK)

  const diveCooldown = useRef(0)
  const isDiving = useRef(false)
  const diveTime = useRef(0)

  const botPos = useRef([0, 1.2, -12])
  const botVel = useRef([0, 0, 0])

  useEffect(() => {
    const unsubPos = api.position.subscribe(v => (botPos.current = v || [0, 1.2, -12]))
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
    if (gameState === 'KICKOFF' || gameState === 'MENU') {
      api.position.set(0, 1.2, -12)
      api.velocity.set(0, 0, 0)
    }
  }, [gameState, api])

  useFrame((state, dt) => {
    if (gameState === 'GOAL_SCRIBED' || gameState === 'GAMEOVER' || gameState === 'MENU') return

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

    // Goalkeeper AI Behavior
    if (isGK) {
      const targetGKX = THREE.MathUtils.clamp(bPos[0], -4.5, 4.5)
      const targetGKZ = -29.0
      
      const dx = targetGKX - pos[0]
      const dz = targetGKZ - pos[2]
      const distToGKPos = Math.hypot(dx, dz)

      if (distToGKPos > 0.3) {
        api.velocity.set(Math.sign(dx) * 7.5, vel[1], Math.sign(dz) * 7.5)
      } else {
        api.velocity.set(0, vel[1], 0)
      }

      if (bPos[2] < -25 && Math.abs(bPos[0]) < 5.5 && diveCooldown.current <= 0) {
        isDiving.current = true
        diveTime.current = 0.4
        diveCooldown.current = 2.5
        const diveDirection = Math.sign(bPos[0] - pos[0]) || (Math.random() > 0.5 ? 1 : -1)
        api.velocity.set(diveDirection * 15, 5.5, 5.0)
      }
      return
    }

    // Striker AI Behavior
    let targetX = 0
    let targetZ = 0
    let speed = 7.5

    const hasPossession = ballPossession === id

    if (hasPossession) {
      targetX = 0
      targetZ = 30
      speed = 8.5

      if (pos[2] > 12) {
        strikeBall(85)
      }
    } else {
      const pPos = player ? safePos(player) : [0, 1.2, 12]
      const playerDistToBall = Math.hypot(bPos[0] - pPos[0], bPos[2] - pPos[2])

      if (bPos[2] < 6 || distToBall < playerDistToBall) {
        targetX = bPos[0]
        targetZ = bPos[2]
      } else {
        targetX = pPos[0] * 0.7
        targetZ = pPos[2] - 5.0
      }

      if (ballPossession === 'player1' && distToBall < 1.6 && Math.random() < 0.25) {
        isDiving.current = true
        diveTime.current = 0.28
        const dashDirX = Math.sign(bPos[0] - pos[0])
        const dashDirZ = Math.sign(bPos[2] - pos[2])
        api.velocity.set(dashDirX * 18, vel[1], dashDirZ * 18)
        return
      }
    }

    const dx = targetX - pos[0]
    const dz = targetZ - pos[2]
    const distToTarget = Math.hypot(dx, dz)

    if (distToTarget > 0.4) {
      api.velocity.set((dx / distToTarget) * speed, vel[1], (dz / distToTarget) * speed)
    } else {
      api.velocity.set(0, vel[1], 0)
    }

    if (distToBall < 1.4 && !hasPossession && ballPossession !== 'player1') {
      setPossession(id)
    }

    if (hasPossession) {
      const targetX = pos[0]
      const targetZ = pos[2] + 0.8
      
      const dx = targetX - bPos[0]
      const dz = targetZ - bPos[2]

      ball.api.velocity.set(
        vel[0] + dx * 9,
        safeVel(ball)[1],
        vel[2] + dz * 9
      )

      if (distToBall > 1.5) {
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

    if (dist < 1.65) {
      const targetGoalX = 0
      const targetGoalZ = 30.0
      
      const dirX = targetGoalX - bPos[0]
      const dirZ = targetGoalZ - bPos[2]
      const len = Math.hypot(dirX, dirZ)

      const speedVal = 15 + (powerPercent / 100) * 18
      ball.api.velocity.set((dirX / len) * speedVal, 3.4, (dirZ / len) * speedVal)
      setPossession(null)
    }
  }

  const isGK = blueGK === id
  const vel = safeVel(window.footballBot)
  const botVelocityVec = new THREE.Vector3(vel[0], vel[1], vel[2])

  return (
    <group ref={ref}>
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
  )
}
