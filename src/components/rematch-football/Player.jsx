import React, { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CapsuleCollider } from '@react-three/rapier'
import { useFootballStore } from './footballStore'
import * as THREE from 'three'

// Simple Keyboard controls hook
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
  const bodyRef = useRef()
  const keys = useKeyboard()
  
  // Zustand States
  const stamina = useFootballStore((state) => state.stamina)
  const setStamina = useFootballStore((state) => state.setStamina)
  const gameState = useFootballStore((state) => state.gameState)
  const setPossession = useFootballStore((state) => state.setPossession)
  const redGK = useFootballStore((state) => state.redGK)

  // Player state variables
  const [shotCharge, setShotCharge] = useState(0)
  const isCharging = useRef(false)
  const isTackling = useRef(false)
  const tackleTime = useRef(0)
  const tackleCooldown = useRef(0)
  const isDiving = useRef(false)
  const diveTime = useRef(0)
  const diveCooldown = useRef(0)
  const currentDir = useRef(new THREE.Vector3(0, 0, -1))

  // Expose player position globally
  useEffect(() => {
    window.footballPlayerBody = bodyRef.current
    return () => {
      window.footballPlayerBody = null
    }
  }, [])

  // Kickoff Position Reset
  useEffect(() => {
    if ((gameState === 'KICKOFF' || gameState === 'LOBBY') && bodyRef.current) {
      bodyRef.current.setTranslation({ x: 0, y: 1, z: 12 }, true)
      bodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
      isCharging.current = false
      setShotCharge(0)
    }
  }, [gameState])

  useFrame((state, dt) => {
    const body = bodyRef.current
    if (!body || gameState === 'GOAL_SCRIBED' || gameState === 'GAMEOVER') return

    const pos = body.translation()
    const vel = body.linvel()

    // ── 1. THIRD PERSON CAMERA FOLLOW ──
    const targetCam = new THREE.Vector3(pos.x, pos.y + 5, pos.z + 9)
    state.camera.position.lerp(targetCam, 0.12)
    state.camera.lookAt(pos.x, pos.y + 0.8, pos.z - 3)

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

    // Stamina sprint logic
    let currentSpeed = 7.5
    if (keys.Shift && stamina > 5 && direction.lengthSq() > 0.01) {
      currentSpeed = 12.0
      setStamina(Math.max(0, stamina - 45 * dt))
    } else {
      setStamina(Math.min(100, stamina + 22 * dt))
    }

    // Apply Slide Tackle velocity burst
    if (keys.KeyQ && tackleCooldown.current <= 0 && !isTackling.current) {
      isTackling.current = true
      tackleTime.current = 0.28 // dash duration
      tackleCooldown.current = 2.0 // cooldown
      // Snap dash direction
      body.setLinvel({
        x: currentDir.current.x * 22,
        y: vel.y,
        z: currentDir.current.z * 22
      }, true)
    }

    // Handle Slide Tackle timer
    if (isTackling.current) {
      tackleTime.current -= dt
      if (tackleTime.current <= 0) {
        isTackling.current = false
      }
    }
    if (tackleCooldown.current > 0) {
      tackleCooldown.current -= dt
    }

    // ── 3. DYNAMIC GOALKEEPER SAVING / DIVE ──
    const isGK = redGK === id
    if (isGK && keys.Space && diveCooldown.current <= 0 && !isDiving.current) {
      isDiving.current = true
      diveTime.current = 0.4
      diveCooldown.current = 2.5
      // Save/Dive lunge sideways
      const diveSide = keys.a ? -1 : keys.d ? 1 : 0
      body.setLinvel({
        x: diveSide * 16,
        y: 6,
        z: -6 // dive slightly forward
      }, true)
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

    // Apply movement velocities if not active in a special state
    if (!isTackling.current && !isDiving.current) {
      body.setLinvel({
        x: direction.x * currentSpeed,
        y: vel.y, // keep gravity
        z: direction.z * currentSpeed
      }, true)
    }

    // ── 4. DRIBBLE MECHANIC ──
    const ballBody = window.footballBallBody
    if (ballBody) {
      const ballPos = ballBody.translation()
      const dist = Math.hypot(ballPos.x - pos.x, ballPos.z - pos.z)
      
      // If near the ball, dribble it
      if (dist < 1.35 && Math.abs(ballPos.y - pos.y) < 1.5) {
        setPossession(id)
        
        // Push the ball loosely in front of the player's moving direction
        const dribbleTarget = new THREE.Vector3()
          .copy(pos)
          .addScaledVector(currentDir.current, 0.75)
          
        dribbleTarget.y = 0.5 // roll on turf

        // Calculate force vector
        const force = new THREE.Vector3()
          .subVectors(dribbleTarget, ballPos)
          .multiplyScalar(9 * dt)

        ballBody.applyImpulse({ x: force.x, y: 0.1 * dt, z: force.z }, true)
      } else {
        // Lose possession if too far
        useFootballStore.getState().ballPossession === id && setPossession(null)
      }
    }

    // ── 5. SHOOT & PASS CONTROLS ──
    // Space or Click to shoot (hold to charge)
    if (keys.Space && !isGK) {
      isCharging.current = true
      setShotCharge(prev => Math.min(100, prev + 150 * dt))
    } else {
      if (isCharging.current) {
        // Strike shot!
        strikeBall(shotCharge)
        isCharging.current = false
        setShotCharge(0)
      }
    }

    // KeyE for quick pass
    if (keys.KeyE) {
      strikeBall(35, true) // quick soft pass forward
    }
  })

  // Strike ball function
  const strikeBall = (powerPercent, isPass = false) => {
    const ballBody = window.footballBallBody
    const playerBody = bodyRef.current
    if (!ballBody || !playerBody) return

    const pos = playerBody.translation()
    const ballPos = ballBody.translation()
    const dist = Math.hypot(ballPos.x - pos.x, ballPos.z - pos.z)

    // Strike range
    if (dist < 1.6) {
      // Aim assists: shoot towards opponent goal (at Z = -30)
      const targetGoal = new THREE.Vector3(0, 0.5, -30)
      const shootDir = new THREE.Vector3()
        .subVectors(targetGoal, ballPos)
        .normalize()
      
      // Lift trajectory slightly
      shootDir.y = isPass ? 0.05 : 0.24

      const forceMagnitude = isPass ? 12 : 18 + (powerPercent / 100) * 22
      const impulse = shootDir.multiplyScalar(forceMagnitude)

      // Apply kick physics
      ballBody.setLinvel({ x: impulse.x, y: impulse.y, z: impulse.z }, true)
      setPossession(null)
    }
  }

  // Choose player skin/color based on active goalkeeper state
  const isGK = redGK === id
  const bodyColor = isGK ? '#fb7185' : '#ff0055' // rose-pink goalie vs crimson red host jersey

  return (
    <RigidBody
      ref={bodyRef}
      position={[0, 1, 12]}
      colliders={false}
      enabledRotations={[false, false, false]}
      angularDamping={0.5}
      linearDamping={0.1}
    >
      <CapsuleCollider args={[0.5, 0.4]} friction={0.5} mass={2.0} />
      
      {/* Player Model: Simple Capsule-Humanoid */}
      <mesh castShadow position={[0, 0, 0]}>
        <capsuleGeometry args={[0.4, 1.0, 4, 8]} />
        <meshStandardMaterial color={bodyColor} roughness={0.4} />
      </mesh>

      {/* Head Indicator / Eye visor pointing forward */}
      <mesh position={[0, 0.65, -0.22]}>
        <boxGeometry args={[0.5, 0.16, 0.2]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Shot Charging Ring Ring under player feet */}
      {shotCharge > 0 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.88, 0]}>
          <ringGeometry args={[0.6, 0.6 + (shotCharge / 100) * 0.4, 32]} />
          <meshBasicMaterial color="#eab308" />
        </mesh>
      )}

      {/* Goalkeeper Glow Aura */}
      {isGK && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.89, 0]}>
          <ringGeometry args={[0.7, 0.8, 32]} />
          <meshBasicMaterial color="#fb7185" />
        </mesh>
      )}
    </RigidBody>
  )
}
