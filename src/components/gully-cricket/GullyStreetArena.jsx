import React, { useMemo } from 'react'
import * as THREE from 'three'

/**
 * Procedural Texture Generator for Brick Gully Wall
 */
function createBrickTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')

  // Base plaster background
  ctx.fillStyle = '#b91c1c'
  ctx.fillRect(0, 0, 512, 512)

  // Draw bricks grid
  ctx.fillStyle = '#991b1b'
  ctx.strokeStyle = '#fca5a5'
  ctx.lineWidth = 3

  const rows = 16
  const cols = 8
  const brickH = 512 / rows
  const brickW = 512 / cols

  for (let r = 0; r < rows; r++) {
    const offsetX = (r % 2 === 0) ? 0 : brickW / 2
    for (let c = -1; c < cols + 1; c++) {
      const x = c * brickW + offsetX
      const y = r * brickH
      ctx.fillRect(x + 2, y + 2, brickW - 4, brickH - 4)
      ctx.strokeRect(x + 2, y + 2, brickW - 4, brickH - 4)
    }
  }

  // Add Street Graffiti
  ctx.fillStyle = '#00f2fe'
  ctx.font = '900 48px "Orbitron", sans-serif'
  ctx.fillText('GULLY BOYS 2026', 80, 240)
  ctx.fillStyle = '#facc15'
  ctx.fillText('ONE-TAPPE OUT!', 100, 320)

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(4, 2)
  return texture
}

export function GullyStreetArena() {
  const brickTex = useMemo(() => createBrickTexture(), [])

  return (
    <group>
      {/* ── 1. ASPHALT STREET GROUND & CENTRAL GREEN TURF PITCH ── */}
      {/* Main Street Road Ground */}
      <mesh receiveShadow position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[24, 110]} />
        <meshStandardMaterial color="#1e293b" roughness={0.8} />
      </mesh>

      {/* Center Green Turf Pitch Strip */}
      <mesh receiveShadow position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.2, 28]} />
        <meshStandardMaterial color="#15803d" roughness={0.5} />
      </mesh>

      {/* Chalk Crease Markings (Batting & Bowling ends) */}
      {/* Batting Crease (Z = 12) */}
      <mesh position={[0, 0.02, 12]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.6, 0.12]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* Bowling Crease (Z = -12) */}
      <mesh position={[0, 0.02, -12]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.6, 0.12]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* ── 2. FLANKING GULLY BUILDINGS & BOUNDARY WALLS ── */}
      {/* Left Wall / Buildings */}
      <group position={[-11, 6, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.5, 12, 110]} />
          <meshStandardMaterial map={brickTex} roughness={0.7} />
        </mesh>
        
        {/* Balconies */}
        {[-30, -10, 10, 30].map((z, idx) => (
          <group key={`l-balcony-${idx}`} position={[1.0, 3.5, z]}>
            <mesh castShadow>
              <boxGeometry args={[1.2, 0.2, 4.0]} />
              <meshStandardMaterial color="#475569" />
            </mesh>
            {/* Balcony Railings */}
            <mesh position={[0.5, 0.6, 0]}>
              <boxGeometry args={[0.08, 1.0, 4.0]} />
              <meshStandardMaterial color="#facc15" />
            </mesh>
          </group>
        ))}
      </group>

      {/* Right Wall / Buildings */}
      <group position={[11, 6, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.5, 12, 110]} />
          <meshStandardMaterial map={brickTex} roughness={0.7} />
        </mesh>

        {/* Balconies */}
        {[-35, -15, 5, 25].map((z, idx) => (
          <group key={`r-balcony-${idx}`} position={[-1.0, 3.5, z]}>
            <mesh castShadow>
              <boxGeometry args={[1.2, 0.2, 4.0]} />
              <meshStandardMaterial color="#475569" />
            </mesh>
            <mesh position={[-0.5, 0.6, 0]}>
              <boxGeometry args={[0.08, 1.0, 4.0]} />
              <meshStandardMaterial color="#facc15" />
            </mesh>
          </group>
        ))}
      </group>

      {/* Rear Boundary Wall (Straight Hit Goal at Z = -52) */}
      <group position={[0, 4.5, -52]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[22, 9, 1.5]} />
          <meshStandardMaterial color="#0f172a" roughness={0.5} />
        </mesh>
        
        {/* Target Score Banners on Boundary Wall */}
        <mesh position={[0, 1.5, 0.8]}>
          <planeGeometry args={[14, 2.5]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
      </group>

      {/* Back Wall behind Batter (Z = 52) */}
      <mesh position={[0, 4.5, 52]}>
        <boxGeometry args={[22, 9, 1.5]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>

      {/* ── 3. GULLY STUMPS (KEROSENE TIN & WOODEN STICKS) ── */}
      {/* Batting End Stumps (Z = 13) */}
      <group position={[0, 0, 13.2]}>
        {/* Kerosene Milk Crate / Tin Base */}
        <mesh castShadow position={[0, 0.35, 0]}>
          <boxGeometry args={[0.7, 0.7, 0.4]} />
          <meshStandardMaterial color="#0284c7" metalness={0.6} roughness={0.3} />
        </mesh>
        {/* 3 Wooden Stumps */}
        {[-0.18, 0, 0.18].map((x, i) => (
          <mesh key={`b-stump-${i}`} castShadow position={[x, 1.0, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.9, 12]} />
            <meshStandardMaterial color="#d97706" roughness={0.4} />
          </mesh>
        ))}
        {/* Bails */}
        <mesh position={[0, 1.47, 0]}>
          <boxGeometry args={[0.48, 0.03, 0.04]} />
          <meshStandardMaterial color="#fef08a" />
        </mesh>
      </group>

      {/* Bowling End Stumps (Z = -13) */}
      <group position={[0, 0, -13.2]}>
        <mesh castShadow position={[0, 0.35, 0]}>
          <boxGeometry args={[0.7, 0.7, 0.4]} />
          <meshStandardMaterial color="#dc2626" metalness={0.6} roughness={0.3} />
        </mesh>
        {[-0.18, 0, 0.18].map((x, i) => (
          <mesh key={`bw-stump-${i}`} castShadow position={[x, 1.0, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.9, 12]} />
            <meshStandardMaterial color="#d97706" roughness={0.4} />
          </mesh>
        ))}
        <mesh position={[0, 1.47, 0]}>
          <boxGeometry args={[0.48, 0.03, 0.04]} />
          <meshStandardMaterial color="#fef08a" />
        </mesh>
      </group>

      {/* ── 4. PARKED AUTO-RICKSHAW (TUK-TUK) PROP ── */}
      <group position={[8.5, 0, -8]} rotation={[0, -0.4, 0]}>
        {/* Yellow Roof */}
        <mesh castShadow position={[0, 1.7, 0]}>
          <boxGeometry args={[1.8, 0.6, 2.6]} />
          <meshStandardMaterial color="#facc15" roughness={0.3} />
        </mesh>
        {/* Black Lower Body */}
        <mesh castShadow position={[0, 0.8, 0]}>
          <boxGeometry args={[1.7, 1.0, 2.5]} />
          <meshStandardMaterial color="#0f172a" roughness={0.5} />
        </mesh>
        {/* Wheels */}
        <mesh position={[-0.9, 0.35, 0.7]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.35, 0.35, 0.2, 16]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <mesh position={[0.9, 0.35, 0.7]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.35, 0.35, 0.2, 16]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <mesh position={[0, 0.35, -1.0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.35, 0.35, 0.2, 16]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
      </group>

      {/* ── 5. STREET LAMPS ── */}
      <group position={[-9.5, 0, -25]}>
        <mesh castShadow position={[0, 4.0, 0]}>
          <cylinderGeometry args={[0.08, 0.12, 8.0]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
        <pointLight position={[0, 7.8, 0.5]} intensity={2.5} color="#fbbf24" distance={25} />
        <mesh position={[0, 7.8, 0.5]}>
          <sphereGeometry args={[0.3, 12, 12]} />
          <meshBasicMaterial color="#fef08a" />
        </mesh>
      </group>
      <group position={[9.5, 0, 20]}>
        <mesh castShadow position={[0, 4.0, 0]}>
          <cylinderGeometry args={[0.08, 0.12, 8.0]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
        <pointLight position={[0, 7.8, -0.5]} intensity={2.5} color="#fbbf24" distance={25} />
        <mesh position={[0, 7.8, -0.5]}>
          <sphereGeometry args={[0.3, 12, 12]} />
          <meshBasicMaterial color="#fef08a" />
        </mesh>
      </group>
    </group>
  )
}
