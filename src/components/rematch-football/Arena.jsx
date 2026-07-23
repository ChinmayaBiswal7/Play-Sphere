import React, { useMemo } from 'react'
import { useBox } from '@react-three/cannon'
import { useFootballStore } from './footballStore'
import * as THREE from 'three'

/**
 * Creates procedural high-detail soccer turf texture with accurate field line markings
 */
function createStripedTurfTexture(isDesert = false) {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 2048
  const ctx = canvas.getContext('2d')

  // Base Grass / Sand Stripes
  const stripeCount = 40
  const stripeHeight = 2048 / stripeCount
  for (let i = 0; i < stripeCount; i++) {
    if (isDesert) {
      ctx.fillStyle = i % 2 === 0 ? '#eab308' : '#d97706'
    } else {
      ctx.fillStyle = i % 2 === 0 ? '#16a34a' : '#15803d'
    }
    ctx.fillRect(0, i * stripeHeight, 1024, stripeHeight)
  }

  // White Chalk Line Formatting
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 14
  ctx.fillStyle = '#ffffff'

  // Outer Pitch Boundary Line
  ctx.strokeRect(40, 40, 944, 1968)

  // Halfway Line
  ctx.beginPath()
  ctx.moveTo(40, 1024)
  ctx.lineTo(984, 1024)
  ctx.stroke()

  // Center Circle & Center Spot
  ctx.beginPath()
  ctx.arc(512, 1024, 180, 0, Math.PI * 2)
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(512, 1024, 14, 0, Math.PI * 2)
  ctx.fill()

  // NORTH PENALTY AREA (Top)
  // 18-Yard Box
  ctx.strokeRect(212, 40, 600, 360)
  // 6-Yard Box
  ctx.strokeRect(362, 40, 300, 140)
  // Penalty Spot
  ctx.beginPath()
  ctx.arc(512, 260, 12, 0, Math.PI * 2)
  ctx.fill()
  // Penalty Arc
  ctx.beginPath()
  ctx.arc(512, 260, 140, 0.6, Math.PI - 0.6)
  ctx.stroke()

  // SOUTH PENALTY AREA (Bottom)
  // 18-Yard Box
  ctx.strokeRect(212, 1648, 600, 360)
  // 6-Yard Box
  ctx.strokeRect(362, 1868, 300, 140)
  // Penalty Spot
  ctx.beginPath()
  ctx.arc(512, 1788, 12, 0, Math.PI * 2)
  ctx.fill()
  // Penalty Arc
  ctx.beginPath()
  ctx.arc(512, 1788, 140, Math.PI + 0.6, Math.PI * 2 - 0.6)
  ctx.stroke()

  // Corner Arcs (4 Corners)
  // Top Left
  ctx.beginPath()
  ctx.arc(40, 40, 50, 0, Math.PI / 2)
  ctx.stroke()
  // Top Right
  ctx.beginPath()
  ctx.arc(984, 40, 50, Math.PI / 2, Math.PI)
  ctx.stroke()
  // Bottom Left
  ctx.beginPath()
  ctx.arc(40, 2008, 50, -Math.PI / 2, 0)
  ctx.stroke()
  // Bottom Right
  ctx.beginPath()
  ctx.arc(984, 2008, 50, Math.PI, Math.PI * 1.5)
  ctx.stroke()

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  return texture
}

/**
 * Creates procedural net mesh grid texture for 3D goal nets
 */
function createGoalNetTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = 'rgba(0, 0, 0, 0)'
  ctx.fillRect(0, 0, 128, 128)

  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 4

  for (let i = 0; i <= 128; i += 16) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i, 128)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(0, i)
    ctx.lineTo(128, i)
    ctx.stroke()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(8, 4)
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

function GoalNetStructure({ position, isNorth = true }) {
  const netTex = useMemo(() => createGoalNetTexture(), [])
  const netMat = useMemo(() => new THREE.MeshStandardMaterial({
    map: netTex,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    color: '#ffffff'
  }), [netTex])

  return (
    <group position={position} rotation={[0, isNorth ? 0 : Math.PI, 0]}>
      {/* White Tubular Goal Posts */}
      <mesh position={[-8, 2.75, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 5.5, 14]} />
        <meshStandardMaterial color="#ffffff" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[8, 2.75, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 5.5, 14]} />
        <meshStandardMaterial color="#ffffff" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Crossbar */}
      <mesh position={[0, 5.5, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.16, 0.16, 16.2, 14]} />
        <meshStandardMaterial color="#ffffff" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Rear Support Posts */}
      <mesh position={[-8, 2.75, -4]}>
        <cylinderGeometry args={[0.12, 0.12, 5.5, 12]} />
        <meshStandardMaterial color="#64748b" metalness={0.6} />
      </mesh>
      <mesh position={[8, 2.75, -4]}>
        <cylinderGeometry args={[0.12, 0.12, 5.5, 12]} />
        <meshStandardMaterial color="#64748b" metalness={0.6} />
      </mesh>

      {/* 3D Realistic Net Meshes */}
      {/* Back Net */}
      <mesh position={[0, 2.75, -4]}>
        <planeGeometry args={[16, 5.5]} />
        <primitive object={netMat} attach="material" />
      </mesh>

      {/* Left Net */}
      <mesh position={[-8, 2.75, -2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[4, 5.5]} />
        <primitive object={netMat} attach="material" />
      </mesh>

      {/* Right Net */}
      <mesh position={[8, 2.75, -2]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[4, 5.5]} />
        <primitive object={netMat} attach="material" />
      </mesh>

      {/* Top Roof Net */}
      <mesh position={[0, 5.5, -2]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[16, 4]} />
        <primitive object={netMat} attach="material" />
      </mesh>
    </group>
  )
}

function GrandstandStructure({ position, rotation = [0, 0, 0], width = 160 }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 10, 0]} rotation={[-0.35, 0, 0]}>
        <boxGeometry args={[width, 24, 2]} />
        <meshStandardMaterial color="#0284c7" roughness={0.6} />
      </mesh>
      <mesh position={[0, 10, 0.9]} rotation={[-0.35, 0, 0]}>
        <boxGeometry args={[width - 2, 22, 0.2]} />
        <meshStandardMaterial color="#ef4444" roughness={0.7} />
      </mesh>
      <mesh position={[0, 22, -8]}>
        <boxGeometry args={[width, 8, 8]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} />
      </mesh>
      <mesh position={[0, 42, -18]} rotation={[0.15, 0, 0]}>
        <cylinderGeometry args={[width / 2 + 10, width / 2 + 15, 20, 20, 1, true, 0, Math.PI]} />
        <meshStandardMaterial color="#0284c7" metalness={0.75} roughness={0.25} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

export function Arena() {
  const arenaStyle = useFootballStore((state) => state.arenaStyle)
  const isDesert = arenaStyle === 'desert'

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

      {/* 2. Glass Rink Side Barriers */}
      <StaticWall position={[-37.5, 3.5, 0]} args={[0.4, 7, 120]} color="#00d2ff" />
      <StaticWall position={[37.5, 3.5, 0]} args={[0.4, 7, 120]} color="#00d2ff" />

      <StaticWall position={[-23, 3.5, -60]} args={[29, 7, 0.4]} color="#0284c7" />
      <StaticWall position={[23, 3.5, -60]} args={[29, 7, 0.4]} color="#0284c7" />
      <StaticWall position={[-23, 3.5, 60]} args={[29, 7, 0.4]} color="#0284c7" />
      <StaticWall position={[23, 3.5, 60]} args={[29, 7, 0.4]} color="#0284c7" />

      {/* Invisible Colliders for Goal Physics */}
      <mesh ref={redGoalBackRef} visible={false} />
      <mesh ref={redGoalLeftRef} visible={false} />
      <mesh ref={redGoalRightRef} visible={false} />

      <mesh ref={blueGoalBackRef} visible={false} />
      <mesh ref={blueGoalLeftRef} visible={false} />
      <mesh ref={blueGoalRightRef} visible={false} />

      {/* 3. Realistic 3D Goal Net Structures */}
      <GoalNetStructure position={[0, 0, -60]} isNorth={true} />
      <GoalNetStructure position={[0, 0, 60]} isNorth={false} />

      {/* 4. Stadium Grandstands */}
      <GrandstandStructure position={[-48, 0, 0]} rotation={[0, Math.PI / 2, 0]} width={140} />
      <GrandstandStructure position={[48, 0, 0]} rotation={[0, -Math.PI / 2, 0]} width={140} />
      <GrandstandStructure position={[0, 0, -72]} rotation={[0, 0, 0]} width={90} />
      <GrandstandStructure position={[0, 0, 72]} rotation={[0, Math.PI, 0]} width={90} />
    </group>
  )
}
