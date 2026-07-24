import React, { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useGullyCricketStore } from './gullyCricketStore'
import * as THREE from 'three'

export function GullyBowler({ onDeliverBall }) {
  const groupRef = useRef()
  const rightArmRef = useRef()
  
  const phase = useGullyCricketStore((state) => state.phase)
  const setPhase = useGullyCricketStore((state) => state.setPhase)
  const bowlerName = useGullyCricketStore((state) => state.bowlerName)

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

      if (e.code === 'Space' || e.code === 'Enter') {
        triggerDelivery()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [pitchTarget])

  const triggerDelivery = () => {
    if (useGullyCricketStore.getState().phase !== 'BOWLING_AIM') return
    onDeliverBall(pitchTarget)
    setPhase('BOWLING_RELEASE')
  }

  useFrame((state, dt) => {
    if (phase === 'BOWLING_RELEASE') {
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x -= dt * 14.0
      }
    } else {
      if (rightArmRef.current) rightArmRef.current.rotation.x = 0
    }
  })

  return (
    <group>
      {/* ── PITCH TARGET MARKER (FOR BOWLING AIM) ── */}
      {phase === 'BOWLING_AIM' && (
        <group position={[pitchTarget[0], 0.04, pitchTarget[1]]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.3, 0.42, 24]} />
            <meshBasicMaterial color="#00d2ff" side={THREE.DoubleSide} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.08, 16]} />
            <meshBasicMaterial color="#ef4444" side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}

      {/* ── 3D BOWLER MODEL AT Z = -13 ── */}
      <group position={[0, 0, -13.2]} ref={groupRef}>
        {/* Torso */}
        <mesh castShadow position={[0, 1.1, 0]}>
          <cylinderGeometry args={[0.32, 0.28, 0.75, 16]} />
          <meshStandardMaterial color="#0284c7" roughness={0.4} />
        </mesh>

        {/* Head */}
        <mesh castShadow position={[0, 1.7, 0]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color="#f5d0a9" roughness={0.4} />
        </mesh>

        {/* Legs */}
        <mesh castShadow position={[-0.14, 0.4, 0]}>
          <cylinderGeometry args={[0.11, 0.09, 0.8, 14]} />
          <meshStandardMaterial color="#334155" roughness={0.6} />
        </mesh>
        <mesh castShadow position={[0.14, 0.4, 0]}>
          <cylinderGeometry args={[0.11, 0.09, 0.8, 14]} />
          <meshStandardMaterial color="#334155" roughness={0.6} />
        </mesh>

        {/* Bowling Arm */}
        <group ref={rightArmRef} position={[0.4, 1.4, 0]}>
          <mesh castShadow position={[0, -0.3, 0]}>
            <cylinderGeometry args={[0.08, 0.07, 0.6, 12]} />
            <meshStandardMaterial color="#f5d0a9" />
          </mesh>
        </group>

        {/* Overhead Bowler Tag */}
        <Html position={[0, 2.3, 0]} center distanceFactor={14}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid #0284c7',
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
            ⚾ {bowlerName}
          </div>
        </Html>
      </group>
    </group>
  )
}
