import React, { useMemo } from 'react'
import { useBox } from '@react-three/cannon'
import { useFootballStore } from './footballStore'
import * as THREE from 'three'

/**
 * Creates procedural grass turf texture for optimized 75x120 pitch
 */
function createStripedTurfTexture(isDesert = false) {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 2048
  const ctx = canvas.getContext('2d')

  if (isDesert) {
    const stripeCount = 36
    const stripeHeight = 2048 / stripeCount
    for (let i = 0; i < stripeCount; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#eab308' : '#d97706'
      ctx.fillRect(0, i * stripeHeight, 1024, stripeHeight)
    }
  } else {
    const stripeCount = 40
    const stripeHeight = 2048 / stripeCount
    for (let i = 0; i < stripeCount; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#16a34a' : '#15803d'
      ctx.fillRect(0, i * stripeHeight, 1024, stripeHeight)
    }
  }

  // Pitch Field Boundary Lines
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 16
  ctx.strokeRect(35, 35, 954, 1978)

  // Halfway line
  ctx.beginPath()
  ctx.moveTo(35, 1024)
  ctx.lineTo(989, 1024)
  ctx.stroke()

  // Center Circle
  ctx.beginPath()
  ctx.arc(512, 1024, 220, 0, Math.PI * 2)
  ctx.stroke()

  // Goal Penalty Boxes
  ctx.strokeRect(200, 35, 624, 420)
  ctx.strokeRect(200, 1593, 624, 420)

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
        opacity={0.16} 
        roughness={0.2} 
        transmission={0.8} 
        thickness={1.5}
      />
    </mesh>
  )
}

function StadiumLightTower({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 22, 0]}>
        <cylinderGeometry args={[0.6, 1.2, 44, 12]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 44.5, 0]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[10, 4.5, 1.0]} />
        <meshStandardMaterial color="#0f172a" metalness={0.9} />
      </mesh>
      <mesh position={[0, 44.5, 0.55]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[9.5, 4.0, 0.1]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <spotLight 
        position={[0, 45, 1.5]} 
        target-position={[0, 0, 0]} 
        intensity={4.5} 
        angle={0.8} 
        penumbra={0.4} 
        color="#f8fafc" 
      />
    </group>
  )
}

function GrandstandStructure({ position, rotation = [0, 0, 0], width = 160 }) {
  return (
    <group position={position} rotation={rotation}>
      {/* Lower Tier Seating */}
      <mesh position={[0, 10, 0]} rotation={[-0.35, 0, 0]}>
        <boxGeometry args={[width, 24, 2]} />
        <meshStandardMaterial color="#0284c7" roughness={0.6} />
      </mesh>
      <mesh position={[0, 10, 0.9]} rotation={[-0.35, 0, 0]}>
        <boxGeometry args={[width - 2, 22, 0.2]} />
        <meshStandardMaterial color="#ef4444" roughness={0.7} />
      </mesh>

      {/* Upper Tier Promenade */}
      <mesh position={[0, 22, -8]}>
        <boxGeometry args={[width, 8, 8]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} />
      </mesh>

      {/* Arched Roof Canopy */}
      <mesh position={[0, 42, -18]} rotation={[0.15, 0, 0]}>
        <cylinderGeometry args={[width / 2 + 10, width / 2 + 15, 20, 20, 1, true, 0, Math.PI]} />
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

  // THICK GROUND BOX COLLIDER (75 x 120 Pitch Surface)
  const [floorRef] = useBox(() => ({
    type: 'Static',
    position: [0, -2, 0],
    args: [120, 4, 180],
    restitution: 0.5,
    friction: 0.6
  }))

  const turfTexture = useMemo(() => createStripedTurfTexture(isDesert), [isDesert])

  // Goal Post Colliders (Width 16, Height 5.5, Depth 4 at Z = ±60)
  const [redGoalBackRef] = useBox(() => ({ type: 'Static', position: [0, 2.75, -61.8], args: [16, 5.5, 0.3] }))
  const [redGoalLeftRef] = useBox(() => ({ type: 'Static', position: [-8, 2.75, -60.2], args: [0.3, 5.5, 4] }))
  const [redGoalRightRef] = useBox(() => ({ type: 'Static', position: [8, 2.75, -60.2], args: [0.3, 5.5, 4] }))

  const [blueGoalBackRef] = useBox(() => ({ type: 'Static', position: [0, 2.75, 61.8], args: [16, 5.5, 0.3] }))
  const [blueGoalLeftRef] = useBox(() => ({ type: 'Static', position: [-8, 2.75, 60.2], args: [0.3, 5.5, 4] }))
  const [blueGoalRightRef] = useBox(() => ({ type: 'Static', position: [8, 2.75, 60.2], args: [0.3, 5.5, 4] }))

  return (
    <group>
      {/* 1. Ground Pitch Physics Box */}
      <mesh ref={floorRef} receiveShadow position={[0, -2, 0]}>
        <boxGeometry args={[120, 4, 180]} />
        <meshStandardMaterial map={turfTexture} roughness={0.65} />
      </mesh>

      {/* 2. Glass Rink Side Barriers (Width 75, Length 120) */}
      <StaticWall position={[-37.5, 3.5, 0]} args={[0.4, 7, 120]} color="#00d2ff" />
      <StaticWall position={[37.5, 3.5, 0]} args={[0.4, 7, 120]} color="#00d2ff" />

      {/* End Glass Barriers */}
      <StaticWall position={[-23, 3.5, -60]} args={[29, 7, 0.4]} color="#0284c7" />
      <StaticWall position={[23, 3.5, -60]} args={[29, 7, 0.4]} color="#0284c7" />
      <StaticWall position={[-23, 3.5, 60]} args={[29, 7, 0.4]} color="#0284c7" />
      <StaticWall position={[23, 3.5, 60]} args={[29, 7, 0.4]} color="#0284c7" />

      {/* 3. Glowing Goal Nets (Z = ±60) */}
      <group position={[0, 0, -60]}>
        <mesh ref={redGoalBackRef}>
          <boxGeometry args={[16, 5.5, 0.1]} />
          <meshStandardMaterial color="#00f2fe" wireframe />
        </mesh>
        <mesh ref={redGoalLeftRef}>
          <boxGeometry args={[0.1, 5.5, 4]} />
          <meshStandardMaterial color="#00f2fe" wireframe />
        </mesh>
        <mesh ref={redGoalRightRef}>
          <boxGeometry args={[0.1, 5.5, 4]} />
          <meshStandardMaterial color="#00f2fe" wireframe />
        </mesh>
        <mesh position={[-8, 2.75, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 5.5, 14]} />
          <meshStandardMaterial color="#ffffff" metalness={0.85} />
        </mesh>
        <mesh position={[8, 2.75, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 5.5, 14]} />
          <meshStandardMaterial color="#ffffff" metalness={0.85} />
        </mesh>
        <mesh position={[0, 5.5, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.18, 0.18, 16.2, 14]} />
          <meshStandardMaterial color="#ffffff" metalness={0.85} />
        </mesh>
      </group>

      <group position={[0, 0, 60]}>
        <mesh ref={blueGoalBackRef}>
          <boxGeometry args={[16, 5.5, 0.1]} />
          <meshStandardMaterial color="#00f2fe" wireframe />
        </mesh>
        <mesh ref={blueGoalLeftRef}>
          <boxGeometry args={[0.1, 5.5, 4]} />
          <meshStandardMaterial color="#00f2fe" wireframe />
        </mesh>
        <mesh ref={blueGoalRightRef}>
          <boxGeometry args={[0.1, 5.5, 4]} />
          <meshStandardMaterial color="#00f2fe" wireframe />
        </mesh>
        <mesh position={[-8, 2.75, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 5.5, 14]} />
          <meshStandardMaterial color="#ffffff" metalness={0.85} />
        </mesh>
        <mesh position={[8, 2.75, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 5.5, 14]} />
          <meshStandardMaterial color="#ffffff" metalness={0.85} />
        </mesh>
        <mesh position={[0, 5.5, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.18, 0.18, 16.2, 14]} />
          <meshStandardMaterial color="#ffffff" metalness={0.85} />
        </mesh>
      </group>

      {/* 4. Optimized Grandstands & Floodlights */}
      <GrandstandStructure position={[-48, 0, 0]} rotation={[0, Math.PI / 2, 0]} width={140} />
      <GrandstandStructure position={[48, 0, 0]} rotation={[0, -Math.PI / 2, 0]} width={140} />
      <GrandstandStructure position={[0, 0, -72]} rotation={[0, 0, 0]} width={90} />
      <GrandstandStructure position={[0, 0, 72]} rotation={[0, Math.PI, 0]} width={90} />

      <StadiumLightTower position={[-44, 0, -66]} />
      <StadiumLightTower position={[44, 0, -66]} />
      <StadiumLightTower position={[-44, 0, 66]} />
      <StadiumLightTower position={[44, 0, 66]} />

      <SponsorBoard position={[-25, 1.5, -60]} text="NOVA" />
      <SponsorBoard position={[25, 1.5, -60]} text="REMATCH" />
      <SponsorBoard position={[-25, 1.5, 60]} rotation={[0, Math.PI, 0]} text="PLAYSPHERE" />
      <SponsorBoard position={[25, 1.5, 60]} rotation={[0, Math.PI, 0]} text="SLOCLAP" />
    </group>
  )
}
