import React, { useRef, useState, useEffect } from 'react'
import { useSphere } from '@react-three/cannon'
import { useFrame } from '@react-three/fiber'
import { useFootballStore } from './footballStore'
import { HumanModel } from './HumanModel'
import * as THREE from 'three'

function useKeyboard() {
  const [keys, setKeys] = useState({
    w: false, a: false, s: false, d: false,
    Shift: false, Space: false, KeyE: false, KeyQ: false
  })

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'Space', 'KeyE', 'KeyQ'].includes(e.code)) {
        setKeys(prev => ({
          ...prev,
          w: e.code === 'KeyW' || prev.w,
          a: e.code === 'KeyA' || prev.a,
          s: e.code === 'KeyS' || prev.s,
          d: e.code === 'KeyD' || prev.d,
          Shift: e.code === 'ShiftLeft' || prev.Shift,
          Space: e.code === 'Space' || prev.Space,
          KeyE: e.code === 'KeyE' || prev.KeyE,
          KeyQ: e.code === 'KeyQ' || prev.KeyQ
        }))
      }
    }
    const handleKeyUp = (e) => {
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'Space', 'KeyE', 'KeyQ'].includes(e.code)) {
        setKeys(prev => ({
          ...prev,
          w: e.code === 'KeyW' ? false : prev.w,
          a: e.code === 'KeyA' ? false : prev.a,
          s: e.code === 'KeyS' ? false : prev.s,
          d: e.code === 'KeyD' ? false : prev.d,
          Shift: e.code === 'ShiftLeft' ? false : prev.Shift,
          Space: e.code === 'Space' ? false : prev.Space,
          KeyE: e.code === 'KeyE' ? false : prev.KeyE,
          KeyQ: e.code === 'KeyQ' ? false : prev.KeyQ
        }))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  return keys
}

// 100% Null-Safe Physics Ref Readers
function safePos(ref) {
  if (ref && ref.position && Array.isArray(ref.position.current)) {
    return ref.position.current
  }
  return [0, 1.2, 12]
}

function safeVel(ref) {
  if (ref && ref.velocity && Array.isArray(ref.velocity.current)) {
    return ref.velocity.current
  }
  return [0, 0, 0]
}

export function Player({ id = 'player1' }) {
  const [ref, api] = useSphere(() => ({
    mass: 72,
    position: [0, 1.2, 12],
    args: [0.62],
    fixedRotation: true,
    linearDamping: 0.1
  }))

  const keys = useKeyboard()
  
  // Zustand State
  const stamina = useFootballStore((state) => state.stamina)
  const setStamina = useFootballStore((state) => state.setStamina)
  const gameState = useFootballStore((state) => state.gameState)
  const setPossession = useFootballStore((state) => state.setPossession)
  const redGK = useFootballStore((state) => state.redGK)
  const characterPreset = useFootballStore((state) => state.characterPreset)

  const [shotCharge, setShotCharge] = useState(0)
  const isCharging = useRef(false)
  
  const isTackling = useRef(false)
  const tackleTime = useRef(0)
  const tackleCooldown = useRef(0)
  
  const currentDir = useRef(new THREE.Vector3(0, 0, -1))
  const playerPos = useRef([0, 1.2, 12])
  const playerVel = useRef([0, 0, 0])

  useEffect(() => {
    const unsubPos = api.position.subscribe(v => (playerPos.current = v || [0, 1.2, 12]))
    const unsubVel = api.velocity.subscribe(v => (playerVel.current = v || [0, 0, 0]))

    window.footballPlayer = {
      position: playerPos,
      velocity: playerVel,
      api: api
    }

    return () => {
      unsubPos()
      unsubVel()
      window.footballPlayer = null
    }
  }, [api])

  useEffect(() => {
    if (gameState === 'KICKOFF' || gameState === 'MENU') {
      api.position.set(0, 1.2, 12)
      api.velocity.set(0, 0, 0)
      isCharging.current = false
      setShotCharge(0)
    }
  }, [gameState, api])

  useFrame((state, dt) => {
    if (gameState === 'GOAL_SCRIBED' || gameState === 'GAMEOVER' || gameState === 'MENU') return

    const pos = safePos(window.footballPlayer)
    const vel = safeVel(window.footballPlayer)

    // ── 1. 3RD PERSON OVER-THE-SHOULDER CAMERA ──
    const targetCamX = pos[0] * 0.8
    const targetCamY = pos[1] + 2.2
    const targetCamZ = pos[2] + 4.6

    state.camera.position.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), 0.14)
    state.camera.lookAt(pos[0] * 0.3, pos[1] + 1.2, pos[2] - 12)

    // ── 2. MOVEMENT CONTROLS ──
    let moveX = 0
    let moveZ = 0
    if (keys.w) moveZ = -1
    if (keys.s) moveZ = 1
    if (keys.a) moveX = -1
    if (keys.d) moveX = 1

    let direction = new THREE.Vector3(moveX, 0, moveZ).normalize()
    if (direction.lengthSq() > 0.01) {
      currentDir.current.copy(direction)
    }

    // Sprint checks
    let currentSpeed = 8.5
    if (keys.Shift && stamina > 5 && direction.lengthSq() > 0.01) {
      currentSpeed = 13.5
      setStamina(Math.max(0, stamina - 35 * dt))
    } else {
      setStamina(Math.min(100, stamina + 25 * dt))
    }

    // Slide Tackle Dash
    if (keys.KeyQ && tackleCooldown.current <= 0 && !isTackling.current) {
      isTackling.current = true
      tackleTime.current = 0.32
      tackleCooldown.current = 1.8
      api.velocity.set(currentDir.current.x * 22, vel[1], currentDir.current.z * 22)
    }

    if (isTackling.current) {
      tackleTime.current -= dt
      if (tackleTime.current <= 0) isTackling.current = false
    }
    if (tackleCooldown.current > 0) tackleCooldown.current -= dt

    // Velocity update
    if (!isTackling.current) {
      api.velocity.set(direction.x * currentSpeed, vel[1], direction.z * currentSpeed)
    }

    // ── 3. DRIBBLING LOGIC ──
    const ball = window.footballBall
    if (ball) {
      const bPos = safePos(ball)
      const dist = Math.hypot(bPos[0] - pos[0], bPos[2] - pos[2])

      if (dist < 1.55 && Math.abs(bPos[1] - pos[1]) < 1.8) {
        setPossession(id)

        const targetX = pos[0] + currentDir.current.x * 0.8
        const targetZ = pos[2] + currentDir.current.z * 0.8
        
        const dx = targetX - bPos[0]
        const dz = targetZ - bPos[2]

        ball.api.velocity.set(
          vel[0] + dx * 9,
          safeVel(ball)[1],
          vel[2] + dz * 9
        )
      } else {
        useFootballStore.getState().ballPossession === id && setPossession(null)
      }
    }

    // ── 4. SHOOTING CHARGE ──
    if (keys.Space) {
      isCharging.current = true
      setShotCharge(prev => Math.min(100, prev + 160 * dt))
    } else {
      if (isCharging.current) {
        strikeBall(shotCharge)
        isCharging.current = false
        setShotCharge(0)
      }
    }

    if (keys.KeyE) {
      strikeBall(35, true)
    }
  })

  const strikeBall = (powerPercent, isPass = false) => {
    const ball = window.footballBall
    if (!ball) return

    const pos = safePos(window.footballPlayer)
    const bPos = safePos(ball)
    const dist = Math.hypot(bPos[0] - pos[0], bPos[2] - pos[2])

    if (dist < 1.75) {
      const targetGoalX = 0
      const targetGoalZ = -30.0
      
      const dirX = targetGoalX - bPos[0]
      const dirZ = targetGoalZ - bPos[2]
      const len = Math.hypot(dirX, dirZ)

      const speedVal = isPass ? 12.5 : 18 + (powerPercent / 100) * 22
      const targetVelY = isPass ? 0.8 : 3.8

      ball.api.velocity.set((dirX / len) * speedVal, targetVelY, (dirZ / len) * speedVal)
      setPossession(null)
    }
  }

  const isGK = redGK === id
  const vel = safeVel(window.footballPlayer)
  const playerVelocityVec = new THREE.Vector3(vel[0], vel[1], vel[2])

  return (
    <group ref={ref}>
      {/* Player Model Facing Forward towards Opponent's Goal (-Z) */}
      <group rotation={[0, Math.PI, 0]}>
        <HumanModel 
          preset={characterPreset}
          teamColor="#ef4444" 
          secColor="#0284c7" 
          number={7} 
          isGoalkeeper={isGK}
          velocity={playerVelocityVec}
          isTackling={isTackling.current}
        />
      </group>

      {/* Visor chevron indicator */}
      <mesh position={[0, 2.7, 0]}>
        <coneGeometry args={[0.2, 0.4, 4]} />
        <meshBasicMaterial color="#facc15" />
      </mesh>

      {/* Charge Ring Indicator */}
      {shotCharge > 0 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]}>
          <ringGeometry args={[0.5, 0.5 + (shotCharge / 100) * 0.4, 32]} />
          <meshBasicMaterial color="#00d2ff" />
        </mesh>
      )}
    </group>
  )
}
