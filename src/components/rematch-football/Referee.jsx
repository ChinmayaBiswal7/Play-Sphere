import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useFootballStore } from './footballStore'
import * as THREE from 'three'

export function Referee() {
  const ref = useRef(null)
  const refPos = useRef([12, 0.65, 0])
  const refereeCard = useFootballStore((state) => state.goalAlert)
  const gameState = useFootballStore((state) => state.gameState)

  useFrame((state, dt) => {
    if (gameState !== 'PLAYING') return

    const ball = window.footballBall
    if (!ball || !ball.position || !Array.isArray(ball.position.current)) return

    const bPos = ball.position.current
    
    // Referee positions 12m off to the side of the ball to track play like a real match official
    const targetX = THREE.MathUtils.clamp(bPos[0] + 12.0, -30, 30)
    const targetZ = THREE.MathUtils.clamp(bPos[2], -50, 50)

    const dx = targetX - refPos.current[0]
    const dz = targetZ - refPos.current[2]
    const dist = Math.hypot(dx, dz)

    if (dist > 0.5) {
      refPos.current[0] += (dx / dist) * 8.5 * dt
      refPos.current[2] += (dz / dist) * 8.5 * dt
    }

    if (ref.current) {
      ref.current.position.set(refPos.current[0], 0.65, refPos.current[2])
      const angle = Math.atan2(bPos[0] - refPos.current[0], bPos[2] - refPos.current[2])
      ref.current.rotation.y = angle
    }
  })

  return (
    <group ref={ref} position={[12, 0.65, 0]}>
      {/* REFEREE BODY MODEL (Black & Yellow Kit) */}
      <mesh position={[0, 0.95, 0]}>
        <boxGeometry args={[0.55, 0.75, 0.35]} />
        <meshStandardMaterial color="#facc15" roughness={0.4} />
      </mesh>
      {/* Referee Shorts */}
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[0.52, 0.4, 0.34]} />
        <meshStandardMaterial color="#0f172a" roughness={0.5} />
      </mesh>
      {/* Referee Head */}
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color="#f87171" roughness={0.6} />
      </mesh>

      {/* OVERHEAD REFEREE TAG */}
      {(gameState === 'PLAYING' || gameState === 'KICKOFF') && (
        <Html position={[0, 2.3, 0]} center distanceFactor={14}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid #facc15',
            borderRadius: '4px',
            padding: '2px 8px',
            color: '#facc15',
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '10px',
            fontWeight: '900',
            pointerEvents: 'none'
          }}>
            👨‍⚖️ MATCH REFEREE
          </div>
        </Html>
      )}
    </group>
  )
}
