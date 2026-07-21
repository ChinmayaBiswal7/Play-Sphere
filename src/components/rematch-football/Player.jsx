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

export function Player({ id = 'player1' }) {
  // Use Cannon sphere instead of Rapier capsule
  const [ref, api] = useSphere(() => ({
    mass: 72,
    position: [0, 1.2, 12],
    args: [0.62],
    fixedRotation: true,
    linearDamping: 0.1
  }))

  const keys = useKeyboard()
  
  // Zustand State bindings
  const stamina = useFootballStore((state) => state.stamina)
  const setStamina = useFootballStore((state) => state.setStamina)
  const gameState = useFootballStore((state) => state.gameState)
  const setPossession = useFootballStore((state) => state.setPossession)
  const redGK = useFootballStore((state) => state.redGK)

  // Local controller state variables
  const [shotCharge, setShotCharge] = useState(0)
  const isCharging = useRef(false)
  
  const isTackling = useRef(false)
  const tackleTime = useRef(0)
  const tackleCooldown = useRef(0)
  
  const isDiving = useRef(false)
  const diveTime = useRef(0)
  const diveCooldown = useRef(0)
  
  const currentDir = useRef(new THREE.Vector3(0, 0, -1))

  const playerPos = useRef([0, 1.2, 12])
  const playerVel = useRef([0, 0, 0])

  useEffect(() => {
    // Subscribe to physics states
    const unsubPos = api.position.subscribe(v => (playerPos.current = v))
    const unsubVel = api.velocity.subscribe(v => (playerVel.current = v))

    // Set globally on window
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

  // Reset positions at kickoff
  useEffect(() => {
    if (gameState === 'KICKOFF' || gameState === 'LOBBY') {
      api.position.set(0, 1.2, 12)
      api.velocity.set(0, 0, 0)
      isCharging.current = false
      setShotCharge(0)
    }
  }, [gameState, api])

  useFrame((state, dt) => {
    if (gameState === 'GOAL_SCRIBED' || gameState === 'GAMEOVER') return

    const pos = playerPos.current
    const vel = playerVel.current

    // ── 1. THIRD PERSON CAMERA FOLLOW ──
    const targetCam = new THREE.Vector3(pos[0], pos[1] + 5, pos[2] + 9)
    state.camera.position.lerp(targetCam, 0.12)
    state.camera.lookAt(pos[0], pos[1] + 0.8, pos[2] - 3)

    // ── 2. KEYBOARD CONTROLS MOVEMENT ──
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
    let currentSpeed = 7.5
    if (keys.Shift && stamina > 5 && direction.lengthSq() > 0.01) {
      currentSpeed = 11.5
      setStamina(Math.max(0, stamina - 45 * dt))
    } else {
      setStamina(Math.min(100, stamina + 22 * dt))
    }

    // Tackle dash triggers
    if (keys.KeyQ && tackleCooldown.current <= 0 && !isTackling.current) {
      isTackling.current = true
      tackleTime.current = 0.28
      tackleCooldown.current = 2.0
      api.velocity.set(currentDir.current.x * 20, vel[1], currentDir.current.z * 20)
    }

    if (isTackling.current) {
      tackleTime.current -= dt
      if (tackleTime.current <= 0) {
        isTackling.current = false
      }
    }
    if (tackleCooldown.current > 0) {
      tackleCooldown.current -= dt
    }

    // Goalkeeper saving dive lunge
    const isGK = redGK === id
    if (isGK && keys.Space && diveCooldown.current <= 0 && !isDiving.current) {
      isDiving.current = true
      diveTime.current = 0.4
      diveCooldown.current = 2.5
      const diveSide = keys.a ? -1 : keys.d ? 1 : 0
      api.velocity.set(diveSide * 15, 5.5, -5.0)
    }

    if (isDiving.current) {
      diveTime.current -= dt
      if (diveTime.current <= 0) {
        isDiving.current = false
      }
    }
    if (diveCooldown.current > 0) {
      diveCooldown.current -= dt
    }

    // Apply movement velocity
    if (!isTackling.current && !isDiving.current) {
      api.velocity.set(direction.x * currentSpeed, vel[1], direction.z * currentSpeed)
    }

    // ── 3. DRIBBLING LOGIC ──
    const ball = window.footballBall
    if (ball) {
      const bPos = ball.position.current
      const dist = Math.hypot(bPos[0] - pos[0], bPos[2] - pos[2])

      if (dist < 1.45 && Math.abs(bPos[1] - pos[1]) < 1.8) {
        setPossession(id)

        // Pull the ball smoothly in front of the player
        const targetX = pos[0] + currentDir.current.x * 0.8
        const targetZ = pos[2] + currentDir.current.z * 0.8
        
        const dx = targetX - bPos[0]
        const dz = targetZ - bPos[2]

        ball.api.velocity.set(
          playerVel.current[0] + dx * 8,
          ball.velocity.current[1],
          playerVel.current[2] + dz * 8
        )
      } else {
        useFootballStore.getState().ballPossession === id && setPossession(null)
      }
    }

    // ── 4. SHOOTING & PASSING CHARGES ──
    if (keys.Space && !isGK) {
      isCharging.current = true
      setShotCharge(prev => Math.min(100, prev + 150 * dt))
    } else {
      if (isCharging.current) {
        strikeBall(shotCharge)
        isCharging.current = false
        setShotCharge(0)
      }
    }

    if (keys.KeyE) {
      strikeBall(30, true)
    }
  })

  const strikeBall = (powerPercent, isPass = false) => {
    const ball = window.footballBall
    if (!ball) return

    const pos = playerPos.current
    const bPos = ball.position.current
    const dist = Math.hypot(bPos[0] - pos[0], bPos[2] - pos[2])

    if (dist < 1.65) {
      // Direct shot vector targeting opponent goal line (Z = -30)
      const targetGoalX = 0
      const targetGoalZ = -30.0
      
      const dirX = targetGoalX - bPos[0]
      const dirZ = targetGoalZ - bPos[2]
      const len = Math.hypot(dirX, dirZ)

      const speedVal = isPass ? 11.5 : 17 + (powerPercent / 100) * 20
      const targetVelY = isPass ? 0.8 : 3.5

      ball.api.velocity.set((dirX / len) * speedVal, targetVelY, (dirZ / len) * speedVal)
      setPossession(null)
    }
  }

  const isGK = redGK === id
  const playerVelocityVec = new THREE.Vector3(playerVel.current[0], playerVel.current[1], playerVel.current[2])

  return (
    <group ref={ref}>
      {/* Visual Human Model */}
      <HumanModel 
        teamColor="#ff0055" 
        secColor="#00d2ff" 
        number={7} 
        isGoalkeeper={isGK}
        velocity={playerVelocityVec}
        isTackling={isTackling.current}
      />

      {/* Visor chevron selector indicators */}
      <mesh position={[0, 2.5, 0]}>
        <coneGeometry args={[0.2, 0.4, 4]} />
        <meshBasicMaterial color="#facc15" />
      </mesh>

      {/* Charge indicator rings */}
      {shotCharge > 0 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]}>
          <ringGeometry args={[0.5, 0.5 + (shotCharge / 100) * 0.35, 32]} />
          <meshBasicMaterial color="#eab308" />
        </mesh>
      )}

      {/* GK Aura Ring */}
      {isGK && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.61, 0]}>
          <ringGeometry args={[0.6, 0.7, 32]} />
          <meshBasicMaterial color="#00ffff" />
        </mesh>
      )}
    </group>
  )
}
