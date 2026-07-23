import React, { useMemo } from 'react'
import { useBox } from '@react-three/cannon'
import { useFootballStore } from './footballStore'
import * as THREE from 'three'

/**
 * Creates procedural grass turf texture for colossal 200x320 pitch
 */
function createStripedTurfTexture(isDesert = false) {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 2048
  const ctx = canvas.getContext('2d')

  if (isDesert) {
    const stripeCount = 48
    const stripeHeight = 2048 / stripeCount
    for (let i = 0; i < stripeCount; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#eab308' : '#d97706'
      ctx.fillRect(0, i * stripeHeight, 1024, stripeHeight)
    }
  } else {
    // Vibrant Pro Soccer Turf
    const stripeCount = 56
    const stripeHeight = 2048 / stripeCount
    for (let i = 0; i < stripeCount; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#16a34a' : '#15803d'
      ctx.fillRect(0, i * stripeHeight, 1024, stripeHeight)
    }
  }

  // Pitch Field Boundary Lines
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 16
  ctx.strokeRect(30, 30, 964, 1988)

  // Halfway line
  ctx.beginPath()
  ctx.moveTo(30, 1024)
  ctx.lineTo(994, 1024)
  ctx.stroke()

  // Center Circle
  ctx.beginPath()
  ctx.arc(512, 1024, 260, 0, Math.PI * 2)
  ctx.stroke()

  // Goal Penalty Boxes
  ctx.strokeRect(180, 30, 664, 480)
  ctx.strokeRect(180, 1538, 664, 480)

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
        thickness={2.0}
      />
    </mesh>
  )
}

/**
 * Colossal $75\text{m}$ High Stadium Light Tower
 */
function GiantFloodlightTower({ position }) {
  return (
    <group position={position}>
      {/* Tower Support Shaft */}
      <mesh position={[0, 36, 0]}>
        <cylinderGeometry args={[0.9, 2.2, 72, 16]} />
        <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.2} />
      </mesh>
      {/* Light Head Frame */}
      <mesh position={[0, 73.5, 0]} rotation={[0.45, 0, 0]}>
        <boxGeometry args={[18, 8, 1.8]} />
        <meshStandardMaterial color="#0f172a" metalness={0.9} />
      </mesh>
      {/* Glowing Light Panel */}
      <mesh position={[0, 73.5, 0.95]} rotation={[0.45, 0, 0]}>
        <boxGeometry args={[17, 7.2, 0.3]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <spotLight 
        position={[0, 74, 3]} 
        target-position={[0, 0, 0]} 
        intensity={9.0} 
        angle={0.95} 
        penumbra={0.4} 
        color="#f8fafc" 
      />
    </group>
  )
}

/**
 * Colossal 3-Tiered Stadium Grandstand Structure ($2\times$ Scale)
 */
function ColossalGrandstand({ position, rotation = [0, 0, 0], width = 280 }) {
  return (
    <group position={position} rotation={rotation}>
      {/* Lower Tier Seating */}
      <mesh position={[0, 14, 0]} rotation={[-0.35, 0, 0]}>
        <boxGeometry args={[width, 36, 3]} />
        <meshStandardMaterial color="#0284c7" roughness={0.6} />
      </mesh>
      <mesh position={[0, 14, 1.2]} rotation={[-0.35, 0, 0]}>
        <boxGeometry args={[width - 4, 33, 0.3]} />
        <meshStandardMaterial color="#ef4444" roughness={0.7} />
      </mesh>

      {/* Middle Tier Promenade & Executive Boxes */}
      <mesh position={[0, 30, -10]}>
        <boxGeometry args={[width, 10, 12]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} />
      </mesh>

      {/* Upper Tier Seating */}
      <mesh position={[0, 52, -26]} rotation={[-0.45, 0, 0]}>
        <boxGeometry args={[width, 48, 3]} />
        <meshStandardMaterial color="#0369a1" roughness={0.6} />
      </mesh>
      <mesh position={[0, 52, -24.8]} rotation={[-0.45, 0, 0]}>
        <boxGeometry args={[width - 4, 45, 0.3]} />
        <meshStandardMaterial color="#dc2626" roughness={0.7} />
      </mesh>

      {/* Massive Arched Stadium Roof Canopy */}
      <mesh position={[0, 84, -30]} rotation={[0.15, 0, 0]}>
        <cylinderGeometry args={[width / 2 + 15, width / 2 + 25, 32, 32, 1, true, 0, Math.PI]} />
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
      <boxGeometry args={[36, 4.0, 0.5]} />
      <meshStandardMaterial map={texture} roughness={0.2} />
    </mesh>
  )
}

export function Arena() {
  const arenaStyle = useFootballStore((state) => state.arenaStyle)
  const isDesert = arenaStyle === 'desert'

  // THICK GROUND BOX COLLIDER (200 x 320 Units)
  const [floorRef] = useBox(() => ({
    type: 'Static',
    position: [0, -3, 0],
    args: [320, 6, 520],
    restitution: 0.5,
    friction: 0.6
  }))

  const turfTexture = useMemo(() => createStripedTurfTexture(isDesert), [isDesert])

  // Goal Post Colliders (Width 26, Height 8, Depth 5 at Z = ±160)
  const [redGoalBackRef] = useBox(() => ({ type: 'Static', position: [0, 4, -162.5], args: [26, 8, 0.3] }))
  const [redGoalLeftRef] = useBox(() => ({ type: 'Static', position: [-13, 4, -160.2], args: [0.3, 8, 5] }))
  const [redGoalRightRef] = useBox(() => ({ type: 'Static', position: [13, 4, -160.2], args: [0.3, 8, 5] }))

  const [blueGoalBackRef] = useBox(() => ({ type: 'Static', position: [0, 4, 162.5], args: [26, 8, 0.3] }))
  const [blueGoalLeftRef] = useBox(() => ({ type: 'Static', position: [-13, 4, 160.2], args: [0.3, 8, 5] }))
  const [blueGoalRightRef] = useBox(() => ({ type: 'Static', position: [13, 4, 160.2], args: [0.3, 8, 5] }))

  return (
    <group>
      {/* 1. Thick Ground Box Physics (200 x 320 units top surface) */}
      <mesh ref={floorRef} receiveShadow position={[0, -3, 0]}>
        <boxGeometry args={[320, 6, 520]} />
        <meshStandardMaterial map={turfTexture} roughness={0.65} />
      </mesh>

      {/* 2. Glass Rink Side Barriers (Width 200, Length 320) */}
      <StaticWall position={[-100, 5, 0]} args={[0.5, 10, 320]} color="#00d2ff" />
      <StaticWall position={[100, 5, 0]} args={[0.5, 10, 320]} color="#00d2ff" />

      {/* End Glass Barriers */}
      <StaticWall position={[-62, 5, -160]} args={[74, 10, 0.5]} color="#0284c7" />
      <StaticWall position={[62, 5, -160]} args={[74, 10, 0.5]} color="#0284c7" />
      <StaticWall position={[-62, 5, 160]} args={[74, 10, 0.5]} color="#0284c7" />
      <StaticWall position={[62, 5, 160]} args={[74, 10, 0.5]} color="#0284c7" />

      {/* 3. Glowing Goal Nets (Z = ±160) */}
      <group position={[0, 0, -160]}>
        <mesh ref={redGoalBackRef}>
          <boxGeometry args={[26, 8, 0.1]} />
          <meshStandardMaterial color="#00f2fe" wireframe />
        </mesh>
        <mesh ref={redGoalLeftRef}>
          <boxGeometry args={[0.1, 8, 5]} />
          <meshStandardMaterial color="#00f2fe" wireframe />
        </mesh>
        <mesh ref={redGoalRightRef}>
          <boxGeometry args={[0.1, 8, 5]} />
          <meshStandardMaterial color="#00f2fe" wireframe />
        </mesh>
        <mesh position={[-13, 4, 0]}>
          <cylinderGeometry args={[0.25, 0.25, 8, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.85} />
        </mesh>
        <mesh position={[13, 4, 0]}>
          <cylinderGeometry args={[0.25, 0.25, 8, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.85} />
        </mesh>
        <mesh position={[0, 8, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.25, 0.25, 26.2, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.85} />
        </mesh>
      </group>

      <group position={[0, 0, 160]}>
        <mesh ref={blueGoalBackRef}>
          <boxGeometry args={[26, 8, 0.1]} />
          <meshStandardMaterial color="#00f2fe" wireframe />
        </mesh>
        <mesh ref={blueGoalLeftRef}>
          <boxGeometry args={[0.1, 8, 5]} />
          <meshStandardMaterial color="#00f2fe" wireframe />
        </mesh>
        <mesh ref={blueGoalRightRef}>
          <boxGeometry args={[0.1, 8, 5]} />
          <meshStandardMaterial color="#00f2fe" wireframe />
        </mesh>
        <mesh position={[-13, 4, 0]}>
          <cylinderGeometry args={[0.25, 0.25, 8, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.85} />
        </mesh>
        <mesh position={[13, 4, 0]}>
          <cylinderGeometry args={[0.25, 0.25, 8, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.85} />
        </mesh>
        <mesh position={[0, 8, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.25, 0.25, 26.2, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.85} />
        </mesh>
      </group>

      {/* 4. Colossal Multi-Tier Stadium Arena Structure ($2\times$ Scale) */}
      <ColossalGrandstand position={[-130, 0, 0]} rotation={[0, Math.PI / 2, 0]} width={360} />
      <ColossalGrandstand position={[130, 0, 0]} rotation={[0, -Math.PI / 2, 0]} width={360} />
      <ColossalGrandstand position={[0, 0, -190]} rotation={[0, 0, 0]} width={240} />
      <ColossalGrandstand position={[0, 0, 190]} rotation={[0, Math.PI, 0]} width={240} />

      {/* 75m High Floodlight Towers */}
      <GiantFloodlightTower position={[-115, 0, -175]} />
      <GiantFloodlightTower position={[115, 0, -175]} />
      <GiantFloodlightTower position={[-115, 0, 175]} />
      <GiantFloodlightTower position={[115, 0, 175]} />

      {/* Oversized LED Sponsor Boards */}
      <SponsorBoard position={[-50, 2.0, -160]} text="NOVA" />
      <SponsorBoard position={[50, 2.0, -160]} text="REMATCH" />
      <SponsorBoard position={[-50, 2.0, 160]} rotation={[0, Math.PI, 0]} text="PLAYSPHERE" />
      <SponsorBoard position={[50, 2.0, 160]} rotation={[0, Math.PI, 0]} text="SLOCLAP" />
    </group>
  )
}
