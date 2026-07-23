import React, { useRef, useState, useEffect } from 'react'
import { useSphere } from '@react-three/cannon'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useLagoriStore } from './lagoriStore'
import { HumanModel } from '../rematch-football/HumanModel'
import * as THREE from 'three'

function useKeyboard() {
  const [keys, setKeys] = useState({
    w: false, a: false, s: false, d: false,
    ArrowLeft: false, ArrowRight: false,
    Shift: false, Space: false, KeyE: false
  })

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'Space', 'KeyE'].includes(e.code)) {
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
          KeyE: e.code === 'KeyE' || prev.KeyE
        }))
      }
    }
    const handleKeyUp = (e) => {
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'Space', 'KeyE'].includes(e.code)) {
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
          KeyE: e.code === 'KeyE' ? false : prev.KeyE
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
  return [0, 0.65, 14]
}

function safeVel(ref) {
  if (ref && ref.velocity && Array.isArray(ref.velocity.current)) {
    return ref.velocity.current
  }
  return [0, 0, 0]
}

export function LagoriPlayer({ id = 'player1' }) {
  const [ref, api] = useSphere(() => ({
    mass: 72,
    position: [0, 0.65, 14],
    args: [0.62],
    fixedRotation: true,
    linearDamping: 0.1
  }))

  const keys = useKeyboard()
  const gameState = useLagoriStore((state) => state.gameState)
  const isStackKnockedDown = useLagoriStore((state) => state.isStackKnockedDown)
  const stonesRebuilt = useLagoriStore((state) => state.stonesRebuilt)
  const heldStonesCount = useLagoriStore((state) => state.heldStonesCount)
  const setStonesRebuilt = useLagoriStore((state) => state.setStonesRebuilt)
  const setHeldStonesCount = useLagoriStore((state) => state.setHeldStonesCount)
  const stamina = useLagoriStore((state) => state.stamina)
  const setStamina = useLagoriStore((state) => state.setStamina)

  const cameraYaw = useRef(Math.PI)
  const cameraPitch = useRef(0.24)

  const currentDir = useRef(new THREE.Vector3(0, 0, -1))
  const playerPos = useRef([0, 0.65, 14])
  const playerVel = useRef([0, 0, 0])
  const eKeyCooldown = useRef(false)

  // Mouse camera orbit & throw aim
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (document.pointerLockElement || e.buttons === 1 || e.buttons === 2) {
        cameraYaw.current -= e.movementX * 0.003
        cameraPitch.current = THREE.MathUtils.clamp(cameraPitch.current + e.movementY * 0.002, 0.08, 0.45)
      }
    }

    const handleCanvasClick = () => {
      if (useLagoriStore.getState().gameState === 'AIM_THROW' || useLagoriStore.getState().gameState === 'REBUILD_DEFEND') {
        if (!document.pointerLockElement) {
          document.body.requestPointerLock?.()
        }

        // Throw Ball during AIM_THROW phase
        if (useLagoriStore.getState().gameState === 'AIM_THROW') {
          const ball = window.lagoriBall
          if (ball && ball.api) {
            const throwSpeed = 24.0
            const dirX = -Math.sin(cameraYaw.current)
            const dirZ = -Math.cos(cameraYaw.current)
            ball.api.velocity.set(dirX * throwSpeed, 2.2, dirZ * throwSpeed)
          }
        }
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('click', handleCanvasClick)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('click', handleCanvasClick)
    }
  }, [])

  useEffect(() => {
    const unsubPos = api.position.subscribe(v => (playerPos.current = v || [0, 0.65, 14]))
    const unsubVel = api.velocity.subscribe(v => (playerVel.current = v || [0, 0, 0]))

    window.lagoriPlayer = {
      position: playerPos,
      velocity: playerVel,
      api: api
    }

    return () => {
      unsubPos()
      unsubVel()
      window.lagoriPlayer = null
    }
  }, [api])

  // Reset player position on round start
  useEffect(() => {
    if (gameState === 'AIM_THROW' || gameState === 'MENU') {
      api.position.set(0, 0.65, 14)
      api.velocity.set(0, 0, 0)
      cameraYaw.current = Math.PI
      cameraPitch.current = 0.24
    }
  }, [gameState, api])

  // Action Key [E]: Pick up scattered stones OR Rebuild stack at center
  useEffect(() => {
    if (keys.KeyE && !eKeyCooldown.current) {
      eKeyCooldown.current = true
      setTimeout(() => { eKeyCooldown.current = false }, 350)

      const pos = safePos(window.lagoriPlayer)
      const distToCenter = Math.hypot(pos[0], pos[2])

      // 1. Rebuild Stack at Center Pedestal
      if (distToCenter < 2.0 && heldStonesCount > 0) {
        setStonesRebuilt(stonesRebuilt + heldStonesCount)
        setHeldStonesCount(0)
      } else {
        // 2. Pick Up Scattered Stones near player
        for (let i = 1; i <= 7; i++) {
          if (window[`lagoriStone_${i}_near`]) {
            setHeldStonesCount(heldStonesCount + 1)
            window[`lagoriStone_${i}_near`] = false
            break
          }
        }
      }
    }
  }, [keys.KeyE, heldStonesCount, stonesRebuilt, setStonesRebuilt, setHeldStonesCount])

  useFrame((state, dt) => {
    if (gameState === 'MENU' || gameState === 'BOOT' || gameState === 'ROUND_OVER') return

    const pos = safePos(window.lagoriPlayer)
    const vel = safeVel(window.lagoriPlayer)

    if (keys.ArrowLeft) cameraYaw.current += 1.8 * dt
    if (keys.ArrowRight) cameraYaw.current -= 1.8 * dt

    // ── 3RD PERSON CAMERA RIG ──
    const isSprinting = keys.Shift && stamina > 5
    const targetFov = isSprinting ? 72 : 62
    state.camera.fov = THREE.MathUtils.lerp(state.camera.fov, targetFov, 0.1)
    state.camera.updateProjectionMatrix()

    const camDistance = 5.6
    const camX = pos[0] + Math.sin(cameraYaw.current) * Math.cos(cameraPitch.current) * camDistance
    const camY = pos[1] + Math.sin(cameraPitch.current) * camDistance + 2.4
    const camZ = pos[2] + Math.cos(cameraYaw.current) * Math.cos(cameraPitch.current) * camDistance

    state.camera.position.lerp(new THREE.Vector3(camX, camY, camZ), 0.22)

    const lookTargetX = pos[0] - Math.sin(cameraYaw.current) * 8.0
    const lookTargetY = pos[1] + 1.2
    const lookTargetZ = pos[2] - Math.cos(cameraYaw.current) * 8.0
    state.camera.lookAt(lookTargetX, lookTargetY, lookTargetZ)

    // ── MOVEMENT CONTROLS ──
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

    let moveSpeed = 11.5
    if (isSprinting && direction.lengthSq() > 0.01) {
      moveSpeed = 17.0
      setStamina(Math.max(0, stamina - 35 * dt))
    } else {
      setStamina(Math.min(100, stamina + 25 * dt))
    }

    if (direction.lengthSq() > 0.01) {
      api.velocity.set(direction.x * moveSpeed, vel[1], direction.z * moveSpeed)
    }
  })

  const vel = safeVel(window.lagoriPlayer)
  const playerVelocityVec = new THREE.Vector3(vel[0], vel[1], vel[2])
  const modelRotationY = gameState === 'MENU' ? Math.PI : Math.atan2(-currentDir.current.x, -currentDir.current.z) + Math.PI

  const showNameTag = gameState === 'AIM_THROW' || gameState === 'REBUILD_DEFEND'

  return (
    <group ref={ref}>
      <group rotation={[0, modelRotationY, 0]}>
        <HumanModel 
          preset="female_striker"
          teamColor="#ef4444" 
          secColor="#facc15" 
          number={7} 
          velocity={playerVelocityVec}
        />
      </group>

      {/* OVERHEAD PLAYER NAME & STONES CARRIED BADGE */}
      {showNameTag && (
        <Html position={[0, 2.7, 0]} center distanceFactor={14}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(15, 23, 42, 0.88)',
            border: '1px solid rgba(239, 68, 68, 0.7)',
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
            <span>YOU (SEEKER)</span>
            {heldStonesCount > 0 && (
              <span style={{ background: '#facc15', color: '#000', padding: '1px 6px', borderRadius: '4px', fontSize: '10px' }}>
                🪨 x{heldStonesCount}
              </span>
            )}
          </div>
        </Html>
      )}
    </group>
  )
}
