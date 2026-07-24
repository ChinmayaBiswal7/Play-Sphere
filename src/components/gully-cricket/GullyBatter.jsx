import React, { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useGullyCricketStore } from './gullyCricketStore'
import * as THREE from 'three'

function safePos(ref) {
  if (ref && ref.position && Array.isArray(ref.position.current)) {
    return ref.position.current
  }
  return [0, 0, 0]
}

export function GullyBatter() {
  const groupRef = useRef()
  const batRef = useRef()
  const leftArmRef = useRef()
  const rightArmRef = useRef()
  
  const phase = useGullyCricketStore((state) => state.phase)
  const setPhase = useGullyCricketStore((state) => state.setPhase)
  const strikerName = useGullyCricketStore((state) => state.strikerName)

  const [shotAim, setShotAim] = useState({ x: 0, z: -1 }) // Direction vector
  const [isSwinging, setIsSwinging] = useState(false)
  const swingProgress = useRef(0)

  // Keyboard controls for Aiming Shot & Swinging Bat
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (useGullyCricketStore.getState().phase !== 'BALL_IN_AIR') return

      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        setShotAim({ x: -0.85, z: -0.5 }) // Off side / Cover Drive
      } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        setShotAim({ x: 0.85, z: -0.5 }) // Leg side / Pull Shot
      } else if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        setShotAim({ x: 0, z: -1.0 }) // Straight Lofted Hit
      } else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        setShotAim({ x: 0.3, z: 0.8 }) // Ramp / Scoop Shot
      }

      if (e.code === 'Space' || e.code === 'KeyE') {
        triggerShotSwing()
      }
    }

    const handleMouseDown = (e) => {
      if (e.button === 0 && useGullyCricketStore.getState().phase === 'BALL_IN_AIR') {
        triggerShotSwing()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('mousedown', handleMouseDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('mousedown', handleMouseDown)
    }
  }, [])

  const triggerShotSwing = () => {
    if (isSwinging) return
    setIsSwinging(true)
    swingProgress.current = 0

    const ball = window.gullyBall
    if (ball) {
      const bPos = safePos(ball)
      const distToBatter = Math.hypot(bPos[0] - 0, bPos[2] - 12.0)

      let feedback = 'MISSED'
      let hitSpeed = 0

      if (distToBatter < 2.5 && distToBatter > 0.4) {
        if (distToBatter >= 1.0 && distToBatter <= 1.8) {
          feedback = 'PERFECT!'
          hitSpeed = 34.0
        } else {
          feedback = 'GOOD'
          hitSpeed = 26.0
        }

        // Calculate Hit Impulse Vector
        const hitX = shotAim.x * hitSpeed + (Math.random() - 0.5) * 4.0
        const hitY = 5.0 + Math.random() * 4.0
        const hitZ = shotAim.z * hitSpeed

        ball.hitBall(hitX, hitY, hitZ, feedback)
        setPhase('SHOT_HIT')
      } else {
        useGullyCricketStore.getState().setShotFeedback('MISSED!')
      }
    }
  }

  useFrame((state, dt) => {
    if (isSwinging) {
      swingProgress.current += dt * 8.0
      const swingAngle = Math.sin(swingProgress.current * Math.PI) * 1.8

      if (batRef.current) {
        batRef.current.rotation.x = -swingAngle
        batRef.current.rotation.y = shotAim.x * 0.8
      }

      if (swingProgress.current >= 1.0) {
        setIsSwinging(false)
        if (batRef.current) {
          batRef.current.rotation.x = 0
          batRef.current.rotation.y = 0
        }
      }
    }
  })

  return (
    <group position={[0.4, 0, 12.0]} ref={groupRef}>
      {/* ── BATTER CHARACTER MODEL ── */}
      {/* Torso & T-shirt */}
      <mesh castShadow position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.32, 0.28, 0.75, 16]} />
        <meshStandardMaterial color="#ef4444" roughness={0.4} />
      </mesh>

      {/* Head & Cap */}
      <group position={[0, 1.7, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color="#f5d0a9" roughness={0.4} />
        </mesh>

        {/* Backwards Cap */}
        <mesh position={[0, 0.12, 0.05]} rotation={[-0.3, 0, 0]}>
          <sphereGeometry args={[0.22, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#0284c7" />
        </mesh>
        <mesh position={[0, 0.06, 0.28]}>
          <boxGeometry args={[0.25, 0.04, 0.22]} />
          <meshStandardMaterial color="#0284c7" />
        </mesh>
      </group>

      {/* Jeans Legs */}
      <mesh castShadow position={[-0.14, 0.4, 0]}>
        <cylinderGeometry args={[0.11, 0.09, 0.8, 14]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.6} />
      </mesh>
      <mesh castShadow position={[0.14, 0.4, 0]}>
        <cylinderGeometry args={[0.11, 0.09, 0.8, 14]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.6} />
      </mesh>

      {/* Shoes */}
      <mesh position={[-0.14, 0.05, 0.06]}>
        <boxGeometry args={[0.16, 0.1, 0.28]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.14, 0.05, 0.06]}>
        <boxGeometry args={[0.16, 0.1, 0.28]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* ── 3D TAPED WOODEN GULLY BAT ── */}
      <group ref={batRef} position={[-0.3, 0.8, -0.2]} rotation={[0.4, 0.2, 0]}>
        {/* Rubber Grip */}
        <mesh position={[0, 0.4, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.35, 12]} />
          <meshStandardMaterial color="#22c55e" roughness={0.3} />
        </mesh>
        {/* Wooden Flat Blade */}
        <mesh castShadow position={[0, -0.2, 0]}>
          <boxGeometry args={[0.14, 0.85, 0.05]} />
          <meshStandardMaterial color="#d97706" roughness={0.4} />
        </mesh>
        {/* Red Electric Tape Band on Bat */}
        <mesh position={[0, 0.1, 0]}>
          <boxGeometry args={[0.15, 0.12, 0.06]} />
          <meshStandardMaterial color="#dc2626" />
        </mesh>
      </group>

      {/* Overhead Batter Tag */}
      <Html position={[0, 2.3, 0]} center distanceFactor={14}>
        <div style={{
          background: 'rgba(15, 23, 42, 0.9)',
          border: '1px solid #ef4444',
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
          🏏 {strikerName}
        </div>
      </Html>
    </group>
  )
}
