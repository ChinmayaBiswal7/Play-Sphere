import React, { useMemo } from 'react'
import { usePlane, useBox } from '@react-three/cannon'
import { useFootballStore } from './footballStore'
import * as THREE from 'three'

/**
 * Creates procedural grass turf texture with alternating horizontal stripes (matching Sloclap Rematch Screenshot 2)
 */
function createStripedTurfTexture(isDesert = false) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 1024
  const ctx = canvas.getContext('2d')

  if (isDesert) {
    // Sand tones
    const stripeCount = 20
    const stripeHeight = 1024 / stripeCount
    for (let i = 0; i < stripeCount; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#eab308' : '#d97706'
      ctx.fillRect(0, i * stripeHeight, 512, stripeHeight)
    }
  } else {
    // Vibrant Green Soccer Turf
    const stripeCount = 24
    const stripeHeight = 1024 / stripeCount
    for (let i = 0; i < stripeCount; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#15803d' : '#166534'
      ctx.fillRect(0, i * stripeHeight, 512, stripeHeight)
    }
  }

  // Pitch Field Lines
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 10
  ctx.strokeRect(20, 20, 472, 984)

  // Halfway line
  ctx.beginPath()
  ctx.moveTo(20, 512)
  ctx.lineTo(492, 512)
  ctx.stroke()

  // Center Circle
  ctx.beginPath()
  ctx.arc(256, 512, 100, 0, Math.PI * 2)
  ctx.stroke()

  // Goal Box Lines
  ctx.strokeRect(130, 20, 252, 160)
  ctx.strokeRect(130, 844, 252, 160)

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  return texture
}

function StaticWall({ position, args, color }) {
  const [ref] = useBox(() => ({
    type: 'Static',
    position,
    args,
    restitution: 0.72,
    friction: 0.1
  }))

  return (
    <mesh ref={ref}>
      <boxGeometry args={args} />
      <meshPhysicalMaterial 
        color={color} 
        transparent 
        opacity={0.25} 
        roughness={0.1} 
        transmission={0.65} 
        thickness={1}
      />
    </mesh>
  )
}

/**
 * Palm Trees for Neon Palms Stadium
 */
function PalmTree({ position }) {
  return (
    <group position={position}>
      {/* Trunk */}
      <mesh position={[0, 4, 0]} rotation={[0.1, 0, 0.05]}>
        <cylinderGeometry args={[0.25, 0.45, 8, 12]} />
        <meshStandardMaterial color="#78350f" roughness={0.9} />
      </mesh>
      {/* Palm Fronds */}
      <group position={[0, 7.8, 0]}>
        {[0, 60, 120, 180, 240, 300].map((angle, i) => (
          <mesh key={i} rotation={[0.4, (angle * Math.PI) / 180, 0]} position={[0, 0, 0]}>
            <coneGeometry args={[1.2, 4.5, 4]} />
            <meshStandardMaterial color="#15803d" roughness={0.5} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/**
 * LED Sponsor Board
 */
function SponsorBoard({ position, rotation = [0, 0, 0], text = 'REMATCH' }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 64
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, 256, 64)
    ctx.strokeStyle = '#00d2ff'
    ctx.lineWidth = 4
    ctx.strokeRect(4, 4, 248, 56)

    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '900 24px "Orbitron", sans-serif'
    ctx.fillText(text, 128, 32)

    return new THREE.CanvasTexture(canvas)
  }, [text])

  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={[10, 1.2, 0.2]} />
      <meshStandardMaterial map={texture} roughness={0.3} />
    </mesh>
  )
}

export function Arena() {
  const arenaStyle = useFootballStore((state) => state.arenaStyle)
  const isDesert = arenaStyle === 'desert'

  // Pitch Ground Plane
  const [floorRef] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, 0, 0],
    type: 'Static',
    restitution: 0.45,
    friction: 0.6
  }))

  const turfTexture = useMemo(() => createStripedTurfTexture(isDesert), [isDesert])

  // Goal Post Colliders
  const [redGoalBackRef] = useBox(() => ({ type: 'Static', position: [0, 2, -31.5], args: [10, 4, 0.2] }))
  const [redGoalLeftRef] = useBox(() => ({ type: 'Static', position: [-5, 2, -30.5], args: [0.2, 4, 2] }))
  const [redGoalRightRef] = useBox(() => ({ type: 'Static', position: [5, 2, -30.5], args: [0.2, 4, 2] }))

  const [blueGoalBackRef] = useBox(() => ({ type: 'Static', position: [0, 2, 31.5], args: [10, 4, 0.2] }))
  const [blueGoalLeftRef] = useBox(() => ({ type: 'Static', position: [-5, 2, 30.5], args: [0.2, 4, 2] }))
  const [blueGoalRightRef] = useBox(() => ({ type: 'Static', position: [5, 2, 30.5], args: [0.2, 4, 2] }))

  return (
    <group>
      {/* 1. Ground Pitch Plane */}
      <mesh ref={floorRef} receiveShadow>
        <planeGeometry args={[38, 62]} />
        <meshStandardMaterial map={turfTexture} roughness={0.7} />
      </mesh>

      {/* 2. Side Walls & Glass Rink Barriers (Rink Style Arcade Football) */}
      <StaticWall position={[-18, 2, 0]} args={[0.25, 4, 60]} color="#00d2ff" />
      <StaticWall position={[18, 2, 0]} args={[0.25, 4, 60]} color="#00d2ff" />

      {/* Back Walls */}
      <StaticWall position={[-11.5, 2, -30]} args={[13, 4, 0.2]} color="#ff007f" />
      <StaticWall position={[11.5, 2, -30]} args={[13, 4, 0.2]} color="#ff007f" />
      <StaticWall position={[-11.5, 2, 30]} args={[13, 4, 0.2]} color="#39ff14" />
      <StaticWall position={[11.5, 2, 30]} args={[13, 4, 0.2]} color="#39ff14" />

      {/* 3. Glowing Rematch Goal Nets */}
      {/* Goal 1 (Opponent Goal Z = -30) */}
      <group position={[0, 0, -30]}>
        <mesh ref={redGoalBackRef}>
          <boxGeometry args={[10, 4, 0.1]} />
          <meshStandardMaterial color="#00f2fe" wireframe />
        </mesh>
        <mesh ref={redGoalLeftRef}>
          <boxGeometry args={[0.1, 4, 2]} />
          <meshStandardMaterial color="#00f2fe" wireframe />
        </mesh>
        <mesh ref={redGoalRightRef}>
          <boxGeometry args={[0.1, 4, 2]} />
          <meshStandardMaterial color="#00f2fe" wireframe />
        </mesh>
        {/* Goal Frame Pillars */}
        <mesh position={[-5, 2, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 4, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.8} />
        </mesh>
        <mesh position={[5, 2, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 4, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.8} />
        </mesh>
        <mesh position={[0, 4, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.12, 0.12, 10.2, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.8} />
        </mesh>
      </group>

      {/* Goal 2 (User Goal Z = 30) */}
      <group position={[0, 0, 30]}>
        <mesh ref={blueGoalBackRef}>
          <boxGeometry args={[10, 4, 0.1]} />
          <meshStandardMaterial color="#00f2fe" wireframe />
        </mesh>
        <mesh ref={blueGoalLeftRef}>
          <boxGeometry args={[0.1, 4, 2]} />
          <meshStandardMaterial color="#00f2fe" wireframe />
        </mesh>
        <mesh ref={blueGoalRightRef}>
          <boxGeometry args={[0.1, 4, 2]} />
          <meshStandardMaterial color="#00f2fe" wireframe />
        </mesh>
        <mesh position={[-5, 2, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 4, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.8} />
        </mesh>
        <mesh position={[5, 2, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 4, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.8} />
        </mesh>
        <mesh position={[0, 4, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.12, 0.12, 10.2, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.8} />
        </mesh>
      </group>

      {/* 4. LED Sponsor Boards & Stadium Props */}
      {!isDesert ? (
        <>
          <SponsorBoard position={[-11.5, 0.6, -30]} text="SLOCLAP" />
          <SponsorBoard position={[11.5, 0.6, -30]} text="REMATCH" />
          <SponsorBoard position={[-11.5, 0.6, 30]} rotation={[0, Math.PI, 0]} text="PLAYSPHERE" />
          <SponsorBoard position={[11.5, 0.6, 30]} rotation={[0, Math.PI, 0]} text="REMATCH 2026" />

          {/* Palm Trees along perimeter */}
          <PalmTree position={[-22, 0, -20]} />
          <PalmTree position={[-22, 0, 0]} />
          <PalmTree position={[-22, 0, 20]} />
          <PalmTree position={[22, 0, -20]} />
          <PalmTree position={[22, 0, 0]} />
          <PalmTree position={[22, 0, 20]} />

          {/* Stadium Arches along perimeter background */}
          {[-25, -15, -5, 5, 15, 25].map((z, i) => (
            <mesh key={i} position={[-24, 6, z]}>
              <boxGeometry args={[1, 12, 8]} />
              <meshStandardMaterial color="#1e1b4b" roughness={0.4} />
            </mesh>
          ))}
          {[-25, -15, -5, 5, 15, 25].map((z, i) => (
            <mesh key={i} position={[24, 6, z]}>
              <boxGeometry args={[1, 12, 8]} />
              <meshStandardMaterial color="#1e1b4b" roughness={0.4} />
            </mesh>
          ))}
        </>
      ) : (
        <>
          {/* Desert Pink Tree (Screenshot 3 Signature) */}
          <group position={[22, 0, -10]}>
            <mesh position={[0, 6, 0]}>
              <cylinderGeometry args={[1.5, 2.5, 12, 12]} />
              <meshStandardMaterial color="#701a75" roughness={0.8} />
            </mesh>
            <mesh position={[0, 13, 0]}>
              <sphereGeometry args={[7, 16, 16]} />
              <meshStandardMaterial color="#f472b6" roughness={0.5} emissive="#ec4899" emissiveIntensity={0.2} />
            </mesh>
          </group>
        </>
      )}
    </group>
  )
}
