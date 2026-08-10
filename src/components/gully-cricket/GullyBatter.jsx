import React, { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useGullyCricketStore } from './gullyCricketStore'
import * as THREE from 'three'

export function GullyBatter() {
  const groupRef = useRef()
  const batGroupRef = useRef()
  const upperBodyRef = useRef()

  const phase = useGullyCricketStore((state) => state.phase)
  const setPhase = useGullyCricketStore((state) => state.setPhase)
  const strikerName = useGullyCricketStore((state) => state.strikerName)
  const gameState = useGullyCricketStore((state) => state.gameState)

  const [shotAim, setShotAim] = useState({ x: 0, z: -1 })
  const [isSwinging, setIsSwinging] = useState(false)
  const swingProgress = useRef(0)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (useGullyCricketStore.getState().gameState !== 'INNINGS_1' && useGullyCricketStore.getState().gameState !== 'INNINGS_2') return

      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        setShotAim({ x: -1.2, z: -1.0 })
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        setShotAim({ x: 1.2, z: -1.0 })
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        setShotAim({ x: 0, z: -1.5 })
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        setShotAim({ x: 0, z: 0.5 })
      } else if (e.code === 'Space' || e.code === 'Enter') {
        if (!isSwinging) {
          setIsSwinging(true)
          swingProgress.current = 0
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSwinging])

  useFrame((state, delta) => {
    if (!groupRef.current) return

    groupRef.current.position.set(0.2, -0.05, 12.0) // slightly lower crouch

    if (isSwinging) {
      swingProgress.current += delta * 7.5

      if (batGroupRef.current) {
        const arc = Math.sin(Math.min(swingProgress.current, Math.PI))
        batGroupRef.current.rotation.x = -0.5 - arc * 2.2
        batGroupRef.current.rotation.y = shotAim.x * 0.8 * arc
        batGroupRef.current.rotation.z = -arc * 0.9
      }

      if (upperBodyRef.current) {
        upperBodyRef.current.rotation.y = shotAim.x * 0.5 * Math.sin(Math.min(swingProgress.current, Math.PI))
      }

      if (swingProgress.current >= 0.4 && swingProgress.current <= 0.9 && phase === 'BALL_IN_AIR') {
        setPhase('SHOT_HIT')

        const ball = window.gullyBall
        if (ball && ball.api) {
          const vx = shotAim.x * 16.0 + (Math.random() - 0.5) * 4.0
          const vy = (shotAim.z < 0 ? 12.0 : 18.0) + (Math.random() - 0.5) * 3.0
          const vz = shotAim.z < 0 ? -28.0 : 18.0

          ball.api.velocity.set(vx, vy, vz)
          ball.api.angularVelocity.set(10, 0, 0)
        }
      }

      if (swingProgress.current >= Math.PI) {
        setIsSwinging(false)
        swingProgress.current = 0
      }
    } else {
      const t = state.clock.getElapsedTime()
      if (batGroupRef.current) {
        batGroupRef.current.rotation.x = -0.4 + Math.sin(t * 3) * 0.05
        batGroupRef.current.rotation.y = -0.2
        batGroupRef.current.rotation.z = 0.1
      }
      if (upperBodyRef.current) {
        upperBodyRef.current.rotation.y = Math.sin(t * 2) * 0.03
      }
    }
  })

  return (
    <group ref={groupRef}>
      {/* Ground Shadow */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.06, 0]}>
        <circleGeometry args={[0.5, 16]} />
        <meshBasicMaterial color="#000" transparent opacity={0.3} />
      </mesh>

      <group position={[-0.22, 0.45, 0]}>
        <mesh castShadow position={[0, 0.2, 0]}><cylinderGeometry args={[0.11, 0.09, 0.45, 16]} /><meshStandardMaterial color="#1e3a8a" /></mesh>
        <mesh castShadow position={[0, -0.15, 0.05]}><boxGeometry args={[0.22, 0.55, 0.22]} /><meshStandardMaterial color="#f8fafc" roughness={0.3} /></mesh>
        {/* Knee Guard */}
        <mesh castShadow position={[0, 0.15, 0.12]}><boxGeometry args={[0.15, 0.15, 0.15]} /><meshStandardMaterial color="#e2e8f0" /></mesh>
        <mesh castShadow position={[0, -0.42, 0.08]}><boxGeometry args={[0.2, 0.12, 0.35]} /><meshStandardMaterial color="#0284c7" /></mesh>
      </group>

      <group position={[0.22, 0.45, 0]}>
        <mesh castShadow position={[0, 0.2, 0]}><cylinderGeometry args={[0.11, 0.09, 0.45, 16]} /><meshStandardMaterial color="#1e3a8a" /></mesh>
        <mesh castShadow position={[0, -0.15, 0.05]}><boxGeometry args={[0.22, 0.55, 0.22]} /><meshStandardMaterial color="#f8fafc" roughness={0.3} /></mesh>
        <mesh castShadow position={[0, 0.15, 0.12]}><boxGeometry args={[0.15, 0.15, 0.15]} /><meshStandardMaterial color="#e2e8f0" /></mesh>
        <mesh castShadow position={[0, -0.42, 0.08]}><boxGeometry args={[0.2, 0.12, 0.35]} /><meshStandardMaterial color="#0284c7" /></mesh>
      </group>

      <group ref={upperBodyRef} position={[0, 1.25, 0]}>
        <mesh castShadow position={[0, 0.1, 0]}><cylinderGeometry args={[0.25, 0.22, 0.65, 16]} /><meshStandardMaterial color="#1d4ed8" roughness={0.4} /></mesh>
        {/* Chest Guard */}
        <mesh castShadow position={[0, 0.1, 0.12]}><boxGeometry args={[0.4, 0.5, 0.2]} /><meshStandardMaterial color="#fff" roughness={0.5} /></mesh>

        <mesh position={[0, 0.15, 0.26]} rotation={[0, Math.PI, 0]}><planeGeometry args={[0.22, 0.22]} /><meshBasicMaterial color="#ffffff" /></mesh>

        <mesh position={[0, 0.45, 0]}><cylinderGeometry args={[0.08, 0.09, 0.12, 16]} /><meshStandardMaterial color="#f5d0a9" /></mesh>
        <mesh castShadow position={[0, 0.62, 0]}><sphereGeometry args={[0.16, 20, 20]} /><meshStandardMaterial color="#f5d0a9" roughness={0.6} /></mesh>

        {/* Helmet */}
        <group position={[0, 0.72, 0]}>
          <mesh castShadow><sphereGeometry args={[0.17, 16, 16, 0, Math.PI * 2, 0, Math.PI / 1.5]} /><meshStandardMaterial color="#1e3a8a" /></mesh>
          <mesh castShadow position={[0, -0.02, -0.16]} rotation={[0.2, 0, 0]}><boxGeometry args={[0.24, 0.02, 0.14]} /><meshStandardMaterial color="#1e3a8a" /></mesh>
          {/* Face guard */}
          <mesh position={[0, -0.1, -0.17]} rotation={[0.2, 0, 0]}><cylinderGeometry args={[0.01, 0.01, 0.3]} rotation={[0, 0, Math.PI/2]} /><meshStandardMaterial color="#111" /></mesh>
          <mesh position={[0, -0.15, -0.15]} rotation={[0.2, 0, 0]}><cylinderGeometry args={[0.01, 0.01, 0.3]} rotation={[0, 0, Math.PI/2]} /><meshStandardMaterial color="#111" /></mesh>
          <mesh position={[0, -0.2, -0.12]} rotation={[0.2, 0, 0]}><cylinderGeometry args={[0.01, 0.01, 0.3]} rotation={[0, 0, Math.PI/2]} /><meshStandardMaterial color="#111" /></mesh>
        </group>

        <group position={[-0.3, 0.25, 0]}>
          <mesh castShadow position={[0, -0.18, 0]}><cylinderGeometry args={[0.07, 0.06, 0.45, 16]} /><meshStandardMaterial color="#f5d0a9" /></mesh>
          {/* Elbow Guard */}
          <mesh castShadow position={[0, -0.3, -0.05]}><sphereGeometry args={[0.06, 8, 8]} /><meshStandardMaterial color="#fff" /></mesh>
          {/* Glove */}
          <mesh castShadow position={[0, -0.45, 0]}><boxGeometry args={[0.12, 0.15, 0.12]} /><meshStandardMaterial color="#f8fafc" /></mesh>
        </group>

        <group position={[0.3, 0.25, 0]}>
          <mesh castShadow position={[0, -0.18, 0]}><cylinderGeometry args={[0.07, 0.06, 0.45, 16]} /><meshStandardMaterial color="#f5d0a9" /></mesh>
          <mesh castShadow position={[0, -0.45, 0]}><boxGeometry args={[0.12, 0.15, 0.12]} /><meshStandardMaterial color="#f8fafc" /></mesh>
        </group>

        <group ref={batGroupRef} position={[0, 0.1, -0.2]}>
          <mesh castShadow position={[0, 0.45, 0]}><cylinderGeometry args={[0.035, 0.035, 0.35, 16]} /><meshStandardMaterial color="#ef4444" roughness={0.8} /></mesh>
          <mesh castShadow position={[0, -0.05, 0]}><boxGeometry args={[0.13, 0.65, 0.05]} /><meshStandardMaterial color="#fef08a" roughness={0.3} metalness={0.1} /></mesh>
          <mesh position={[0, 0.05, -0.028]}><planeGeometry args={[0.11, 0.25]} /><meshBasicMaterial color="#0284c7" /></mesh>
          <mesh position={[0, 0.05, 0.028]} rotation={[0, Math.PI, 0]}><planeGeometry args={[0.11, 0.25]} /><meshBasicMaterial color="#0284c7" /></mesh>
        </group>
      </group>

      {(gameState === 'INNINGS_1' || gameState === 'INNINGS_2') && (
        <Html position={[0, 2.3, 0]} center distanceFactor={14}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.95)', border: '1.5px solid #ef4444', borderRadius: '6px',
            padding: '4px 10px', color: '#fff', fontFamily: "'Orbitron', sans-serif", fontSize: '11px',
            fontWeight: '900', whiteSpace: 'nowrap', boxShadow: '0 4px 14px rgba(0,0,0,0.6)', pointerEvents: 'none'
          }}>
            🏏 {strikerName}
          </div>
        </Html>
      )}
    </group>
  )
}
