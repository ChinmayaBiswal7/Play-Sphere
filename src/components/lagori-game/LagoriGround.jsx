import React, { useMemo } from 'react'
import { usePlane, useBox } from '@react-three/cannon'
import * as THREE from 'three'

/**
 * Creates procedural dusty ground texture with chalk boundary lines & center stack pedestal
 */
function createLagoriGroundTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 1024
  const ctx = canvas.getContext('2d')

  // Reddish Indian Clay / Soil Turf
  ctx.fillStyle = '#9a3412'
  ctx.fillRect(0, 0, 1024, 1024)

  // Soil texture variation noise & patches
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * 1024
    const y = Math.random() * 1024
    const r = 20 + Math.random() * 40
    ctx.fillStyle = Math.random() > 0.5 ? '#7c2d12' : '#c2410c'
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  // White Chalk Boundary Lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'
  ctx.lineWidth = 14
  ctx.strokeRect(60, 60, 904, 904)

  // Center Circle Base Pedestal (Where stones are stacked)
  ctx.strokeStyle = '#facc15'
  ctx.lineWidth = 16
  ctx.beginPath()
  ctx.arc(512, 512, 120, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = 'rgba(250, 204, 21, 0.2)'
  ctx.fill()

  // Throwing Line Mark (12m back from center)
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 12
  ctx.beginPath()
  ctx.moveTo(256, 768)
  ctx.lineTo(768, 768)
  ctx.stroke()

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  return texture
}

function BoundaryWall({ position, args }) {
  const [ref] = useBox(() => ({
    type: 'Static',
    position,
    args
  }))

  return (
    <mesh ref={ref}>
      <boxGeometry args={args} />
      <meshStandardMaterial color="#78350f" roughness={0.8} />
    </mesh>
  )
}

function StylizedTree({ position }) {
  return (
    <group position={position}>
      {/* Trunk */}
      <mesh position={[0, 3, 0]}>
        <cylinderGeometry args={[0.5, 0.8, 6, 12]} />
        <meshStandardMaterial color="#451a03" roughness={0.9} />
      </mesh>
      {/* Foliage */}
      <mesh position={[0, 7, 0]}>
        <coneGeometry args={[3.5, 6, 12]} />
        <meshStandardMaterial color="#15803d" roughness={0.7} />
      </mesh>
      <mesh position={[0, 9.5, 0]}>
        <coneGeometry args={[2.5, 4.5, 12]} />
        <meshStandardMaterial color="#16a34a" roughness={0.6} />
      </mesh>
    </group>
  )
}

export function LagoriGround() {
  const [floorRef] = useBox(() => ({
    type: 'Static',
    position: [0, -2, 0],
    args: [80, 4, 80],
    restitution: 0.5,
    friction: 0.7
  }))

  const groundTexture = useMemo(() => createLagoriGroundTexture(), [])

  return (
    <group>
      {/* 1. Ground Physics Box (40m x 40m Playground) */}
      <mesh ref={floorRef} receiveShadow position={[0, -2, 0]}>
        <boxGeometry args={[80, 4, 80]} />
        <meshStandardMaterial map={groundTexture} roughness={0.8} />
      </mesh>

      {/* 2. Village Wooden Boundary Fence */}
      <BoundaryWall position={[-38, 2, 0]} args={[0.6, 4, 76]} />
      <BoundaryWall position={[38, 2, 0]} args={[0.6, 4, 76]} />
      <BoundaryWall position={[0, 2, -38]} args={[76, 4, 0.6]} />
      <BoundaryWall position={[0, 2, 38]} args={[76, 4, 0.6]} />

      {/* 3. Surrounding Trees & Scenery */}
      <StylizedTree position={[-32, 0, -32]} />
      <StylizedTree position={[32, 0, -32]} />
      <StylizedTree position={[-32, 0, 32]} />
      <StylizedTree position={[32, 0, 32]} />

      {/* Throwing Mark Text Overlay */}
      <mesh position={[0, 0.05, 13]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 2]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  )
}
