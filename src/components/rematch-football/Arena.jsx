import React, { useMemo } from 'react'
import { useBox } from '@react-three/cannon'
import { useFootballStore } from './footballStore'
import * as THREE from 'three'

/**
 * Creates procedural grass turf texture for colossal 100x160 pitch
 */
function createStripedTurfTexture(isDesert = false) {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 2048
  const ctx = canvas.getContext('2d')

  if (isDesert) {
    const stripeCount = 32
    const stripeHeight = 2048 / stripeCount
    for (let i = 0; i < stripeCount; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#eab308' : '#d97706'
      ctx.fillRect(0, i * stripeHeight, 1024, stripeHeight)
    }
  } else {
    // Vibrant Pro Soccer Turf
    const stripeCount = 40
    const stripeHeight = 2048 / stripeCount
    for (let i = 0; i < stripeCount; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#16a34a' : '#15803d'
      ctx.fillRect(0, i * stripeHeight, 1024, stripeHeight)
    }
  }

  // Pitch Field Boundary Lines
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 14
  ctx.strokeRect(30, 30, 964, 1988)

  // Halfway line
  ctx.beginPath()
  ctx.moveTo(30, 1024)
  ctx.lineTo(994, 1024)
  ctx.stroke()

  // Center Circle
  ctx.beginPath()
  ctx.arc(512, 1024, 220, 0, Math.PI * 2)
  ctx.stroke()

  // Goal Penalty Boxes
  ctx.strokeRect(212, 30, 600, 400)
  ctx.strokeRect(212, 1618, 600, 400)

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
    restitution: 0.75,
    friction: 0.1
  }))

  return (
    <mesh ref={ref}>
      <boxGeometry args={args} />
      <meshPhysicalMaterial 
        color={color} 
        transparent 
        opacity={0.18} 
        roughness={0.1} 
        transmission={0.85} 
        thickness={1.5}
      />
    </mesh>
  )
}

/**
 * Colossal $50\text{m}$ High Stadium Light Tower
 */
function GiantFloodlightTower({ position }) {
  return (
    <group position={position}>
      {/* Tower Support Shaft */}
      <mesh position={[0, 24, 0]}>
        <cylinderGeometry args={[0.6, 1.4, 48, 16]} />
        <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.2} />
      </mesh>
      {/* Light Head Frame */}
      <mesh position={[0, 49.5, 0]} rotation={[0.45, 0, 0]}>
        <boxGeometry args={[12, 5.5, 1.2]} />
        <meshStandardMaterial color="#0f172a" metalness={0.9} />
      </mesh>
      {/* Glowing Light Panel */}
      <mesh position={[0, 49.5, 0.65]} rotation={[0.45, 0, 0]}>
        <boxGeometry args={[11.5, 5.0, 0.2]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <spotLight 
        position={[0, 50, 2]} 
        target-position={[0, 0, 0]} 
        intensity={6.0} 
        angle={0.85} 
        penumbra={0.4} 
        color="#f8fafc" 
      />
    </group>
  )
}

/**
 * Colossal 3-Tiered Stadium Grandstand Structure
 */
function ColossalGrandstand({ position, rotation = [0, 0, 0], width = 140 }) {
  return (
    <group position={position} rotation={rotation}>
      {/* Lower Tier Seating */}
      <mesh position={[0, 8, 0]} rotation={[-0.35, 0, 0]}>
        <boxGeometry args={[width, 24, 2]} />
        <meshStandardMaterial color="#0284c7" roughness={0.6} />
      </mesh>
      <mesh position={[0, 8, 0.9]} rotation={[-0.35, 0, 0]}>
        <boxGeometry args={[width - 2, 22, 0.2]} />
        <meshStandardMaterial color="#ef4444" roughness={0.7} />
      </mesh>

      {/* Middle Tier Promenade & Executive Boxes */}
      <mesh position={[0, 18, -6]}>
        <boxGeometry args={[width, 6, 8]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} />
      </mesh>

      {/* Upper Tier Seating */}
      <mesh position={[0, 32, -16]} rotation={[-0.45, 0, 0]}>
        <boxGeometry args={[width, 32, 2]} />
        <meshStandardMaterial color="#0369a1" roughness={0.6} />
      </mesh>
      <mesh position={[0, 32, -15.1]} rotation={[-0.45, 0, 0]}>
        <boxGeometry args={[width - 2, 30, 0.2]} />
        <meshStandardMaterial color="#dc2626" roughness={0.7} />
      </mesh>

      {/* Massive Arched Stadium Roof Canopy */}
      <mesh position={[0, 52, -18]} rotation={[0.15, 0, 0]}>
        <cylinderGeometry args={[width / 2 + 10, width / 2 + 15, 20, 24, 1, true, 0, Math.PI]} />
        <meshStandardMaterial color="#0284c7" metalness={0.75} roughness={0.25} side={THREE.DoubleSide} />
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
      <boxGeometry args={[24, 3.0, 0.4]} />
      <meshStandardMaterial map={texture} roughness={0.2} />
    </mesh>
  )
}

export function Arena() {
  const arenaStyle = useFootballStore((state) => state.arenaStyle)
  const isDesert = arenaStyle === 'desert'

  // THICK GROUND BOX COLLIDER (Prevents Ball Falling Through Floor Forever!)
  const [floorRef] = useBox(() => ({
    type: 'Static',
    position: [0, -2, 0],
    args: [160, 4, 260],
    restitution: 0.5,
    friction: 0.6
  }))

  const turfTexture = useMemo(() => createStripedTurfTexture(isDesert), [isDesert])

  // Goal Post Colliders (Width 18, Height 6, Depth 4 at Z = ±80)
  const [redGoalBackRef] = useBox(() => ({ type: 'Static', position: [0, 3, -82.0], args: [18, 6, 0.2] }))
  const [redGoalLeftRef] = useBox(() => ({ type: 'Static', position: [-9, 3, -80.2], args: [0.2, 6, 4] }))
  const [redGoalRightRef] = useBox(() => ({ type: 'Static', position: [9, 3, -80.2], args: [0.2, 6, 4] }))

  const [blueGoalBackRef] = useBox(() => ({ type: 'Static', position: [0, 3, 82.0], args: [18, 6, 0.2] }))
  const [blueGoalLeftRef] = useBox(() => ({ type: 'Static', position: [-9, 3, 80.2], args: [0.2, 6, 4] }))
  const [blueGoalRightRef] = useBox(() => ({ type: 'Static', position: [9, 3, 80.2], args: [0.2, 6, 4] }))

  return (
    <group>
      {/* 1. Thick Ground Box Physics (100 x 160 units top surface) */}
      <mesh ref={floorRef} receiveShadow position={[0, -2, 0]}>
        <boxGeometry args={[160, 4, 260]} />
        <meshStandardMaterial map={turfTexture} roughness={0.65} />
      </mesh>

      {/* 2. Glass Rink Side Barriers (Width 100, Length 160) */}
      <StaticWall position={[-50, 4, 0]} args={[0.4, 8, 160]} color="#00d2ff" />
      <StaticWall position={[50, 4, 0]} args={[0.4, 8, 160]} color="#00d2ff" />

      {/* End Glass Barriers */}
      <StaticWall position={[-34, 4, -80]} args={[32, 8, 0.4]} color="#0284c7" />
      <StaticWall position={[34, 4, -80]} args={[32, 8, 0.4]} color="#0284c7" />
      <StaticWall position={[-34, 4, 80]} args={[32, 8, 0.4]} color="#0284c7" />
      <StaticWall position={[34, 4, 80]} args={[32, 8, 0.4]} color="#0284c7" />

      {/* 3. Glowing Goal Nets (Z = ±80) */}
      <group position={[0, 0, -80]}>
        <mesh ref={redGoalBackRef}>
          <boxGeometry args={[18, 6, 0.1]} />
          <meshStandardMaterial color="#00f2fe" wireframe />
        </mesh>
        <mesh ref={redGoalLeftRef}>
          <boxGeometry args={[0.1, 6, 4]} />
          <meshStandardMaterial color="#00f2fe" wireframe />
        </mesh>
        <mesh ref={redGoalRightRef}>
          <boxGeometry args={[0.1, 6, 4]} />
          <meshStandardMaterial color="#00f2fe" wireframe />
        </mesh>
        <mesh position={[-9, 3, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 6, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.85} />
        </mesh>
        <mesh position={[9, 3, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 6, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.85} />
        </mesh>
        <mesh position={[0, 6, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.2, 0.2, 18.2, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.85} />
        </mesh>
      </group>

      <group position={[0, 0, 80]}>
        <mesh ref={blueGoalBackRef}>
          <boxGeometry args={[18, 6, 0.1]} />
          <meshStandardMaterial color="#00f2fe" wireframe />
        </mesh>
        <mesh ref={blueGoalLeftRef}>
          <boxGeometry args={[0.1, 6, 4]} />
          <meshStandardMaterial color="#00f2fe" wireframe />
        </mesh>
        <mesh ref={blueGoalRightRef}>
          <boxGeometry args={[0.1, 6, 4]} />
          <meshStandardMaterial color="#00f2fe" wireframe />
        </mesh>
        <mesh position={[-9, 3, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 6, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.85} />
        </mesh>
        <mesh position={[9, 3, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 6, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.85} />
        </mesh>
        <mesh position={[0, 6, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.2, 0.2, 18.2, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.85} />
        </mesh>
      </group>

      {/* 4. Colossal Multi-Tier Stadium Arena Structure */}
      <ColossalGrandstand position={[-65, 0, 0]} rotation={[0, Math.PI / 2, 0]} width={180} />
      <ColossalGrandstand position={[65, 0, 0]} rotation={[0, -Math.PI / 2, 0]} width={180} />
      <ColossalGrandstand position={[0, 0, -95]} rotation={[0, 0, 0]} width={130} />
      <ColossalGrandstand position={[0, 0, 95]} rotation={[0, Math.PI, 0]} width={130} />

      {/* 50m High Floodlight Towers */}
      <GiantFloodlightTower position={[-58, 0, -88]} />
      <GiantFloodlightTower position={[58, 0, -88]} />
      <GiantFloodlightTower position={[-58, 0, 88]} />
      <GiantFloodlightTower position={[58, 0, 88]} />

      {/* Oversized LED Sponsor Boards */}
      <SponsorBoard position={[-32, 1.5, -80]} text="NOVA" />
      <SponsorBoard position={[32, 1.5, -80]} text="REMATCH" />
      <SponsorBoard position={[-32, 1.5, 80]} rotation={[0, Math.PI, 0]} text="PLAYSPHERE" />
      <SponsorBoard position={[32, 1.5, 80]} rotation={[0, Math.PI, 0]} text="SLOCLAP" />
    </group>
  )
}
