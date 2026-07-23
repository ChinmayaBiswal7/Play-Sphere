import React, { useMemo } from 'react'
import { usePlane, useBox } from '@react-three/cannon'
import { useFootballStore } from './footballStore'
import * as THREE from 'three'

/**
 * Creates procedural grass turf texture for huge 60x100 pitch
 */
function createStripedTurfTexture(isDesert = false) {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 2048
  const ctx = canvas.getContext('2d')

  if (isDesert) {
    const stripeCount = 28
    const stripeHeight = 2048 / stripeCount
    for (let i = 0; i < stripeCount; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#eab308' : '#d97706'
      ctx.fillRect(0, i * stripeHeight, 1024, stripeHeight)
    }
  } else {
    // Vibrant Soccer Turf
    const stripeCount = 32
    const stripeHeight = 2048 / stripeCount
    for (let i = 0; i < stripeCount; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#16a34a' : '#15803d'
      ctx.fillRect(0, i * stripeHeight, 1024, stripeHeight)
    }
  }

  // Pitch Field Boundary Lines
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 14
  ctx.strokeRect(40, 40, 944, 1968)

  // Halfway line
  ctx.beginPath()
  ctx.moveTo(40, 1024)
  ctx.lineTo(984, 1024)
  ctx.stroke()

  // Center Circle
  ctx.beginPath()
  ctx.arc(512, 1024, 180, 0, Math.PI * 2)
  ctx.stroke()

  // Goal Penalty Boxes
  ctx.strokeRect(262, 40, 500, 320)
  ctx.strokeRect(262, 1688, 500, 320)

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
        opacity={0.16} 
        roughness={0.1} 
        transmission={0.85} 
        thickness={1}
      />
    </mesh>
  )
}

/**
 * Colossal Stadium Floodlight Tower
 */
function GiantFloodlightTower({ position }) {
  return (
    <group position={position}>
      {/* Tower Support Shaft */}
      <mesh position={[0, 15, 0]}>
        <cylinderGeometry args={[0.4, 0.9, 30, 14]} />
        <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.2} />
      </mesh>
      {/* Light Head Frame */}
      <mesh position={[0, 30.5, 0]} rotation={[0.45, 0, 0]}>
        <boxGeometry args={[6.5, 3.2, 0.6]} />
        <meshStandardMaterial color="#0f172a" metalness={0.9} />
      </mesh>
      {/* Glowing Light Panel */}
      <mesh position={[0, 30.5, 0.35]} rotation={[0.45, 0, 0]}>
        <boxGeometry args={[6.2, 2.9, 0.1]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <spotLight 
        position={[0, 31, 1]} 
        target-position={[0, 0, 0]} 
        intensity={3.5} 
        angle={0.7} 
        penumbra={0.4} 
        color="#f8fafc" 
      />
    </group>
  )
}

/**
 * Colossal Grandstand Crowd Seating Tier (Matching Screenshot 1 & 2)
 */
function GrandstandTier({ position, rotation = [0, 0, 0] }) {
  return (
    <group position={position} rotation={rotation}>
      {/* Multi-tiered seating slope */}
      <mesh position={[0, 10, 0]} rotation={[-0.4, 0, 0]}>
        <boxGeometry args={[80, 24, 2]} />
        <meshStandardMaterial color="#0284c7" roughness={0.6} />
      </mesh>

      {/* Red Crowd Seating Texture Strip */}
      <mesh position={[0, 10, 0.8]} rotation={[-0.4, 0, 0]}>
        <boxGeometry args={[78, 22, 0.2]} />
        <meshStandardMaterial color="#dc2626" roughness={0.7} />
      </mesh>

      {/* Overarching Blue Stadium Canopy Roof (Screenshot 2 Architecture) */}
      <mesh position={[0, 28, -6]} rotation={[0.2, 0, 0]}>
        <cylinderGeometry args={[42, 45, 12, 16, 1, true, 0, Math.PI]} />
        <meshStandardMaterial color="#0284c7" metalness={0.7} roughness={0.2} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function SponsorBoard({ position, rotation = [0, 0, 0], text = 'REMATCH' }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 128
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, 512, 128)
    ctx.strokeStyle = '#00f2fe'
    ctx.lineWidth = 8
    ctx.strokeRect(8, 8, 496, 112)

    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '900 48px "Orbitron", sans-serif'
    ctx.fillText(text, 256, 64)

    return new THREE.CanvasTexture(canvas)
  }, [text])

  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={[18, 2.2, 0.3]} />
      <meshStandardMaterial map={texture} roughness={0.2} />
    </mesh>
  )
}

export function Arena() {
  const arenaStyle = useFootballStore((state) => state.arenaStyle)
  const isDesert = arenaStyle === 'desert'

  // Pitch Ground Plane (Expanded to 60x100 Units!)
  const [floorRef] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, 0, 0],
    type: 'Static',
    restitution: 0.45,
    friction: 0.6
  }))

  const turfTexture = useMemo(() => createStripedTurfTexture(isDesert), [isDesert])

  // Goal Post Colliders (Width 14, Height 5, Depth 3.5)
  const [redGoalBackRef] = useBox(() => ({ type: 'Static', position: [0, 2.5, -51.5], args: [14, 5, 0.2] }))
  const [redGoalLeftRef] = useBox(() => ({ type: 'Static', position: [-7, 2.5, -50.2], args: [0.2, 5, 3] }))
  const [redGoalRightRef] = useBox(() => ({ type: 'Static', position: [7, 2.5, -50.2], args: [0.2, 5, 3] }))

  const [blueGoalBackRef] = useBox(() => ({ type: 'Static', position: [0, 2.5, 51.5], args: [14, 5, 0.2] }))
  const [blueGoalLeftRef] = useBox(() => ({ type: 'Static', position: [-7, 2.5, 50.2], args: [0.2, 5, 3] }))
  const [blueGoalRightRef] = useBox(() => ({ type: 'Static', position: [7, 2.5, 50.2], args: [0.2, 5, 3] }))

  return (
    <group>
      {/* 1. Ground Pitch Plane (60 x 100 units) */}
      <mesh ref={floorRef} receiveShadow>
        <planeGeometry args={[60, 100]} />
        <meshStandardMaterial map={turfTexture} roughness={0.65} />
      </mesh>

      {/* 2. Sleek Cyan Rink Glass Barriers (Width 60, Length 100) */}
      <StaticWall position={[-30, 3, 0]} args={[0.3, 6, 100]} color="#00d2ff" />
      <StaticWall position={[30, 3, 0]} args={[0.3, 6, 100]} color="#00d2ff" />

      {/* End Glass Barriers */}
      <StaticWall position={[-21, 3, -50]} args={[18, 6, 0.3]} color="#0284c7" />
      <StaticWall position={[21, 3, -50]} args={[18, 6, 0.3]} color="#0284c7" />
      <StaticWall position={[-21, 3, 50]} args={[18, 6, 0.3]} color="#0284c7" />
      <StaticWall position={[21, 3, 50]} args={[18, 6, 0.3]} color="#0284c7" />

      {/* 3. Glowing Goal Nets */}
      {/* Goal 1 (Opponent Goal Z = -50) */}
      <group position={[0, 0, -50]}>
        <mesh ref={redGoalBackRef}>
          <boxGeometry args={[14, 5, 0.1]} />
          <meshStandardMaterial color="#00f2fe" wireframe />
        </mesh>
        <mesh ref={redGoalLeftRef}>
          <boxGeometry args={[0.1, 5, 3]} />
          <meshStandardMaterial color="#00f2fe" wireframe />
        </mesh>
        <mesh ref={redGoalRightRef}>
          <boxGeometry args={[0.1, 5, 3]} />
          <meshStandardMaterial color="#00f2fe" wireframe />
        </mesh>
        {/* White Goal Posts */}
        <mesh position={[-7, 2.5, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 5, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.8} />
        </mesh>
        <mesh position={[7, 2.5, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 5, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.8} />
        </mesh>
        <mesh position={[0, 5, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.16, 0.16, 14.2, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.8} />
        </mesh>
      </group>

      {/* Goal 2 (User Goal Z = 50) */}
      <group position={[0, 0, 50]}>
        <mesh ref={blueGoalBackRef}>
          <boxGeometry args={[14, 5, 0.1]} />
          <meshStandardMaterial color="#00f2fe" wireframe />
        </mesh>
        <mesh ref={blueGoalLeftRef}>
          <boxGeometry args={[0.1, 5, 3]} />
          <meshStandardMaterial color="#00f2fe" wireframe />
        </mesh>
        <mesh ref={blueGoalRightRef}>
          <boxGeometry args={[0.1, 5, 3]} />
          <meshStandardMaterial color="#00f2fe" wireframe />
        </mesh>
        <mesh position={[-7, 2.5, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 5, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.8} />
        </mesh>
        <mesh position={[7, 2.5, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 5, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.8} />
        </mesh>
        <mesh position={[0, 5, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.16, 0.16, 14.2, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.8} />
        </mesh>
      </group>

      {/* 4. Colossal Grandstands & Stadium Architecture (Matching Screenshots 1 & 2) */}
      <GrandstandTier position={[-38, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
      <GrandstandTier position={[38, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
      <GrandstandTier position={[0, 0, -58]} rotation={[0, 0, 0]} />
      <GrandstandTier position={[0, 0, 58]} rotation={[0, Math.PI, 0]} />

      {/* Giant Floodlight Towers */}
      <GiantFloodlightTower position={[-34, 0, -52]} />
      <GiantFloodlightTower position={[34, 0, -52]} />
      <GiantFloodlightTower position={[-34, 0, 52]} />
      <GiantFloodlightTower position={[34, 0, 52]} />

      {/* Oversized LED Sponsor Boards */}
      <SponsorBoard position={[-20, 1.2, -50]} text="NOVA" />
      <SponsorBoard position={[20, 1.2, -50]} text="REMATCH" />
      <SponsorBoard position={[-20, 1.2, 50]} rotation={[0, Math.PI, 0]} text="PLAYSPHERE" />
      <SponsorBoard position={[20, 1.2, 50]} rotation={[0, Math.PI, 0]} text="SLOCLAP" />
    </group>
  )
}
