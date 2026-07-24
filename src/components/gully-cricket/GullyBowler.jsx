import React, { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useGullyCricketStore } from './gullyCricketStore'
import * as THREE from 'three'

export function GullyBowler({ onDeliverBall }) {
  const groupRef = useRef()
  const bowlingArmRef = useRef()

  const phase = useGullyCricketStore((state) => state.phase)
  const setPhase = useGullyCricketStore((state) => state.setPhase)
  const bowlerName = useGullyCricketStore((state) => state.bowlerName)
  const gameState = useGullyCricketStore((state) => state.gameState)

  // Pitch target marker coordinates [x, z]
  const [pitchTarget, setPitchTarget] = useState([0, -2.0])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (useGullyCricketStore.getState().phase !== 'BOWLING_AIM') return

      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        setPitchTarget(prev => [Math.max(-1.2, prev[0] - 0.2), prev[1]])
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        setPitchTarget(prev => [Math.min(1.2, prev[0] + 0.2), prev[1]])
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        setPitchTarget(prev => [prev[0], Math.min(4.0, prev[1] + 0.4)])
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        setPitchTarget(prev => [prev[0], Math.max(-8.0, prev[1] - 0.4)])
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Bowling action animation
  const isBowling = useRef(false)
  const bowlProgress = useRef(0)

  useEffect(() => {
    if (phase === 'BOWLING_AIM') {
      const timer = setTimeout(() => {
        isBowling.current = true
        bowlProgress.current = 0
        setPhase('BALL_IN_AIR')
      }, 1400)
      return () => clearTimeout(timer)
    }
  }, [phase, setPhase])

  useFrame((state, delta) => {
    if (!groupRef.current) return

    // Position bowler at crease (Z = -13.0) facing batter at Z = +12
    groupRef.current.position.set(0, 0, -13.0)

    if (isBowling.current) {
      bowlProgress.current += delta * 5.0

      if (bowlingArmRef.current) {
        // High 360-degree bowling arm windmill action
        bowlingArmRef.current.rotation.x = -bowlProgress.current * Math.PI * 2
      }

      // Ball release at top of arm swing
      if (bowlProgress.current >= 0.5 && bowlProgress.current <= 0.6) {
        if (typeof onDeliverBall === 'function') {
          onDeliverBall(pitchTarget)
        }

        const ball = window.gullyBall
        if (ball && ball.api) {
          ball.api.position.set(0, 2.2, -12.0)
          const targetZ = pitchTarget[1]
          const distZ = Math.abs(targetZ - (-12.0))
          const vz = (distZ / 0.45) * 1.05
          const vy = (pitchTarget[1] > 0 ? -6.0 : -10.0)

          ball.api.velocity.set(pitchTarget[0] * 1.5, vy, vz)
        }
      }

      if (bowlProgress.current >= 1.0) {
        isBowling.current = false
        bowlProgress.current = 0
      }
    }
  })

  return (
    <group ref={groupRef}>
      {/* ── 1. BOWLER CHARACTER MODEL (ANATOMICAL HUMANOID) ── */}
      <group position={[0, 0, 0]}>
        {/* Legs */}
        <mesh castShadow position={[-0.2, 0.45, 0]}>
          <cylinderGeometry args={[0.09, 0.08, 0.9, 16]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        <mesh castShadow position={[0.2, 0.45, 0]}>
          <cylinderGeometry args={[0.09, 0.08, 0.9, 16]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>

        {/* Torso Jersey (Red/Black) */}
        <mesh castShadow position={[0, 1.25, 0]}>
          <cylinderGeometry args={[0.24, 0.22, 0.65, 16]} />
          <meshStandardMaterial color="#dc2626" roughness={0.4} />
        </mesh>

        {/* Neck & Head */}
        <mesh position={[0, 1.65, 0]}>
          <cylinderGeometry args={[0.08, 0.09, 0.12, 16]} />
          <meshStandardMaterial color="#f5d0a9" />
        </mesh>
        <mesh castShadow position={[0, 1.82, 0]}>
          <sphereGeometry args={[0.16, 20, 20]} />
          <meshStandardMaterial color="#f5d0a9" roughness={0.6} />
        </mesh>

        {/* Red Cap */}
        <group position={[0, 1.92, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.17, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#991b1b" />
          </mesh>
          <mesh castShadow position={[0, -0.02, 0.16]} rotation={[0.2, 0, 0]}>
            <boxGeometry args={[0.24, 0.02, 0.14]} />
            <meshStandardMaterial color="#991b1b" />
          </mesh>
        </group>

        {/* Non-Bowling Left Arm */}
        <mesh castShadow position={[-0.3, 1.25, 0]}>
          <cylinderGeometry args={[0.06, 0.05, 0.45, 16]} />
          <meshStandardMaterial color="#f5d0a9" />
        </mesh>

        {/* Windmill Bowling Right Arm */}
        <group ref={bowlingArmRef} position={[0.3, 1.35, 0]}>
          <mesh castShadow position={[0, -0.22, 0]}>
            <cylinderGeometry args={[0.06, 0.05, 0.45, 16]} />
            <meshStandardMaterial color="#f5d0a9" />
          </mesh>
          {/* Taped Tennis Ball in hand */}
          <mesh position={[0, -0.45, 0]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial color="#ef4444" roughness={0.3} />
          </mesh>
        </group>

        {/* Overhead Bowler Tag (Only rendered during active innings) */}
        {(gameState === 'INNINGS_1' || gameState === 'INNINGS_2') && (
          <Html position={[0, 2.3, 0]} center distanceFactor={14}>
            <div style={{
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1.5px solid #0284c7',
              borderRadius: '6px',
              padding: '4px 10px',
              color: '#fff',
              fontFamily: "'Orbitron', sans-serif",
              fontSize: '11px',
              fontWeight: '900',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 14px rgba(0,0,0,0.6)',
              pointerEvents: 'none'
            }}>
              ⚾ {bowlerName}
            </div>
          </Html>
        )}
      </group>

      {/* ── 2. BOWLING PITCH TARGET MARKER ON ROAD ── */}
      {phase === 'BOWLING_AIM' && (
        <mesh position={[pitchTarget[0], 0.03, pitchTarget[1]]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.25, 0.35, 32]} />
          <meshBasicMaterial color="#ef4444" side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  )
}
