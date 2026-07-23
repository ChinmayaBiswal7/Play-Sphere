import React, { useRef, useState, useEffect } from 'react'
import { useSphere } from '@react-three/cannon'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useFootballStore } from './footballStore'
import { useAbility } from './useAbility'
import { HumanModel } from './HumanModel'
import * as THREE from 'three'

function useKeyboard() {
  const [keys, setKeys] = useState({
    w: false, a: false, s: false, d: false,
    ArrowLeft: false, ArrowRight: false,
    Shift: false, Space: false, KeyE: false, KeyQ: false
  })

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'Space', 'KeyE', 'KeyQ'].includes(e.code)) {
        setKeys(prev => ({
          ...prev,
          w: e.code === 'KeyW' || prev.w,
          a: e.code === 'KeyA' || prev.a,
          s: e.code === 'KeyS' || prev.s,
          d: e.code === 'KeyD' || prev.d,
          ArrowLeft: e.code === 'ArrowLeft' || prev.ArrowLeft,
          ArrowRight: e.code === 'ArrowRight' || prev.ArrowRight,
          Shift: e.code === 'ShiftLeft' || prev.Shift,
          Space: e.code === 'Space' || prev.Space,
          KeyE: e.code === 'KeyE' || prev.KeyE,
          KeyQ: e.code === 'KeyQ' || prev.KeyQ
        }))
      }
    }
    const handleKeyUp = (e) => {
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'Space', 'KeyE', 'KeyQ'].includes(e.code)) {
        setKeys(prev => ({
          ...prev,
          w: e.code === 'KeyW' ? false : prev.w,
          a: e.code === 'KeyA' ? false : prev.a,
          s: e.code === 'KeyS' ? false : prev.s,
          d: e.code === 'KeyD' ? false : prev.d,
          ArrowLeft: e.code === 'ArrowLeft' ? false : prev.ArrowLeft,
          ArrowRight: e.code === 'ArrowRight' ? false : prev.ArrowRight,
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

function safePos(ref) {
  if (ref && ref.position && Array.isArray(ref.position.current)) {
    return ref.position.current
  }
  return [0, 1.2, 20]
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
    position: [0, 1.2, 20],
    args: [0.62],
    fixedRotation: true,
    linearDamping: 0.1
  }))

  const keys = useKeyboard()
  const { triggerAbility } = useAbility(id)
  
  const stamina = useFootballStore((state) => state.stamina)
  const setStamina = useFootballStore((state) => state.setStamina)
  const gameState = useFootballStore((state) => state.gameState)
  const kickoffTeam = useFootballStore((state) => state.kickoffTeam)
  const setPossession = useFootballStore((state) => state.setPossession)
  const redGK = useFootballStore((state) => state.redGK)
  const characterPreset = useFootballStore((state) => state.characterPreset)

  const [shotCharge, setShotCharge] = useState(0)
  const isCharging = useRef(false)
  const isTackling = useRef(false)
  
  const cameraYaw = useRef(Math.PI)
  const cameraPitch = useRef(0.38) // Downward pitch angle

  const currentDir = useRef(new THREE.Vector3(0, 0, -1))
  const playerPos = useRef([0, 1.2, 20])
  const playerVel = useRef([0, 0, 0])

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (document.pointerLockElement || e.buttons === 1 || e.buttons === 2) {
        cameraYaw.current -= e.movementX * 0.003
        cameraPitch.current = THREE.MathUtils.clamp(cameraPitch.current + e.movementY * 0.002, 0.1, 0.62)
      }
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  useEffect(() => {
    const unsubPos = api.position.subscribe(v => (playerPos.current = v || [0, 1.2, 20]))
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
    if (gameState === 'MENU') {
      api.position.set(0, 1.2, 0)
      api.velocity.set(0, 0, 0)
    } else if (gameState === 'KICKOFF') {
      const spawnZ = kickoffTeam === 'red' ? 2.5 : 18.0
      api.position.set(0, 1.2, spawnZ)
      api.velocity.set(0, 0, 0)
      cameraYaw.current = Math.PI
      cameraPitch.current = 0.38
    }
  }, [gameState, kickoffTeam, api])

  useFrame((state, dt) => {
    if (gameState === 'GOAL_CELEBRATION' || gameState === 'GOAL_REPLAY' || gameState === 'FULL_TIME' || gameState === 'MENU' || gameState === 'BOOT' || gameState === 'LOADING_MATCH') return

    const pos = safePos(window.footballPlayer)
    const vel = safeVel(window.footballPlayer)

    if (keys.ArrowLeft) cameraYaw.current += 1.8 * dt
    if (keys.ArrowRight) cameraYaw.current -= 1.8 * dt

    // ── 1. GIANT FIELD BROADCAST CAMERA RIG ──
    const isSprinting = keys.Shift && stamina > 5
    const targetFov = isSprinting ? 62 : 54 // Lower FOV = Pitch reads as massive!
    state.camera.fov = THREE.MathUtils.lerp(state.camera.fov, targetFov, 0.1)
    state.camera.updateProjectionMatrix()

    const camDistance = 12.5
    const camX = pos[0] + Math.sin(cameraYaw.current) * Math.cos(cameraPitch.current) * camDistance
    const camY = pos[1] + Math.sin(cameraPitch.current) * camDistance + 6.8
    const camZ = pos[2] + Math.cos(cameraYaw.current) * Math.cos(cameraPitch.current) * camDistance

    state.camera.position.lerp(new THREE.Vector3(camX, camY, camZ), 0.18)

    // Look-ahead offset: target is player + (aimDirection * 10)
    const lookTargetX = pos[0] - Math.sin(cameraYaw.current) * 10.0
    const lookTargetY = pos[1] + 1.2
    const lookTargetZ = pos[2] - Math.cos(cameraYaw.current) * 10.0
    state.camera.lookAt(lookTargetX, lookTargetY, lookTargetZ)

    // ── 2. MOVEMENT CONTROLS ──
    let inputForward = 0
    let inputSide = 0
    if (keys.w) inputForward = 1
    if (keys.s) inputForward = -1
    if (keys.a) inputSide = -1
    if (keys.d) inputSide = 1

    const forwardX = -Math.sin(cameraYaw.current)
    const forwardZ = -Math.cos(cameraYaw.current)
    const rightX = Math.cos(cameraYaw.current)
    const rightZ = -Math.sin(cameraYaw.current)

    let moveX = forwardX * inputForward + rightX * inputSide
    let moveZ = forwardZ * inputForward + rightZ * inputSide

    let direction = new THREE.Vector3(moveX, 0, moveZ).normalize()
    if (direction.lengthSq() > 0.01) {
      currentDir.current.copy(direction)
    }

    if (isSprinting && direction.lengthSq() > 0.01) {
      triggerAbility('sprint_burst', { playerApi: api, aimDir: currentDir.current })
      setStamina(Math.max(0, stamina - 35 * dt))
    } else {
      setStamina(Math.min(100, stamina + 25 * dt))
      if (direction.lengthSq() > 0.01) {
        api.velocity.set(direction.x * 10.5, vel[1], direction.z * 10.5)
      }
    }

    if (keys.KeyQ) {
      triggerAbility('slide_tackle', {
        playerApi: api,
        playerPos: pos,
        aimDir: currentDir.current,
        ball: window.footballBall,
        setPossession
      })
    }

    // ── 3. DRIBBLING LOGIC ──
    const ball = window.footballBall
    if (ball) {
      const bPos = safePos(ball)
      const dist = Math.hypot(bPos[0] - pos[0], bPos[2] - pos[2])

      if (dist < 1.65 && Math.abs(bPos[1] - pos[1]) < 1.8) {
        setPossession(id)

        const targetX = pos[0] + currentDir.current.x * 0.9
        const targetZ = pos[2] + currentDir.current.z * 0.9
        
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
        triggerAbility('power_shot', {
          ball,
          playerPos: pos,
          aimDir: currentDir.current,
          powerPercent: shotCharge
        })
        isCharging.current = false
        setShotCharge(0)
      }
    }
  })

  const isGK = redGK === id
  const vel = safeVel(window.footballPlayer)
  const playerVelocityVec = new THREE.Vector3(vel[0], vel[1], vel[2])
  
  const modelRotationY = gameState === 'MENU' ? Math.PI : Math.atan2(-currentDir.current.x, -currentDir.current.z)

  return (
    <group ref={ref}>
      <group rotation={[0, modelRotationY, 0]}>
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

      {/* OVERHEAD PLAYER NAME TAG & NUMBER BADGE */}
      {gameState !== 'MENU' && gameState !== 'GOAL_CELEBRATION' && gameState !== 'GOAL_REPLAY' && (
        <Html position={[0, 2.7, 0]} center distanceFactor={14}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(239, 68, 68, 0.6)',
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
            <span style={{ background: '#ef4444', color: '#fff', padding: '1px 5px', borderRadius: '3px', fontSize: '10px' }}>7</span>
            <span>YOU (STRIKER)</span>
          </div>
        </Html>
      )}

      {/* Charge Ring Indicator */}
      {shotCharge > 0 && gameState !== 'MENU' && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]}>
          <ringGeometry args={[0.5, 0.5 + (shotCharge / 100) * 0.4, 32]} />
          <meshBasicMaterial color="#00d2ff" />
        </mesh>
      )}
    </group>
  )
}
