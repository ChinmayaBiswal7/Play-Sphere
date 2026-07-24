import React, { useMemo } from 'react'
import * as THREE from 'three'

/**
 * High-Detail Procedural Texture Generator for Brick Gully Wall
 */
function createBrickTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 1024
  const ctx = canvas.getContext('2d')

  // Weathered plaster background
  ctx.fillStyle = '#991b1b'
  ctx.fillRect(0, 0, 1024, 1024)

  // Brick grid
  ctx.fillStyle = '#7f1d1d'
  ctx.strokeStyle = '#fca5a5'
  ctx.lineWidth = 4

  const rows = 32
  const cols = 16
  const brickH = 1024 / rows
  const brickW = 1024 / cols

  for (let r = 0; r < rows; r++) {
    const offsetX = (r % 2 === 0) ? 0 : brickW / 2
    for (let c = -1; c < cols + 1; c++) {
      const x = c * brickW + offsetX
      const y = r * brickH
      // Vary brick color slightly
      const shade = Math.floor(Math.random() * 20)
      ctx.fillStyle = `rgb(${127 + shade}, ${29 + shade}, ${29 + shade})`
      ctx.fillRect(x + 2, y + 2, brickW - 4, brickH - 4)
      ctx.strokeRect(x + 2, y + 2, brickW - 4, brickH - 4)
    }
  }

  // Add Street Graffiti Art
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.8)'
  ctx.shadowBlur = 10
  ctx.fillStyle = '#00f2fe'
  ctx.font = '900 64px "Orbitron", sans-serif'
  ctx.fillText('GULLY KINGS 2026', 120, 480)
  ctx.fillStyle = '#facc15'
  ctx.fillText('ONE-TIPPI OUT!', 180, 600)
  ctx.restore()

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(4, 2)
  return texture
}

/**
 * Asphalt Street Road Texture Generator
 */
function createAsphaltTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#1e293b'
  ctx.fillRect(0, 0, 512, 512)

  // Add noise dots for asphalt grit
  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * 512
    const y = Math.random() * 512
    const lum = Math.floor(Math.random() * 50) + 30
    ctx.fillStyle = `rgb(${lum},${lum + 10},${lum + 20})`
    ctx.fillRect(x, y, 2, 2)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(4, 16)
  return texture
}

export function GullyStreetArena() {
  const brickTex = useMemo(() => createBrickTexture(), [])
  const asphaltTex = useMemo(() => createAsphaltTexture(), [])

  return (
    <group>
      {/* ── 1. REALISTIC ASPHALT ROAD & TURF PITCH ── */}
      <mesh receiveShadow position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[26, 110]} />
        <meshStandardMaterial map={asphaltTex} roughness={0.95} metalness={0.1} />
      </mesh>

      {/* Center Green Turf Mat Strip */}
      <mesh receiveShadow position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.4, 28]} />
        <meshStandardMaterial color="#166534" roughness={0.4} />
      </mesh>

      {/* Crease White Markings */}
      <mesh position={[0, 0.02, 12]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.8, 0.14]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 0.02, -12]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.8, 0.14]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* ── 2. FLANKING BUILDINGS & WALLS ── */}
      {/* Left Buildings */}
      <group position={[-11.5, 7, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2, 14, 110]} />
          <meshStandardMaterial map={brickTex} roughness={0.7} />
        </mesh>
        
        {/* Windows with Shutters */}
        {[-36, -20, -4, 12, 28].map((z, idx) => (
          <group key={`l-win-${idx}`} position={[1.02, 3.5, z]}>
            <mesh>
              <boxGeometry args={[0.1, 2.2, 1.8]} />
              <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.8} />
            </mesh>
            {/* Wooden Frame */}
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[0.2, 2.4, 2.0]} />
              <meshStandardMaterial color="#78350f" />
            </mesh>
          </group>
        ))}

        {/* Balconies & Railings */}
        {[-28, -8, 18].map((z, idx) => (
          <group key={`l-balcony-${idx}`} position={[1.4, 1.5, z]}>
            <mesh castShadow>
              <boxGeometry args={[1.5, 0.25, 4.5]} />
              <meshStandardMaterial color="#334155" />
            </mesh>
            {/* Railing */}
            <mesh position={[0.7, 0.7, 0]}>
              <boxGeometry args={[0.08, 1.2, 4.5]} />
              <meshStandardMaterial color="#facc15" />
            </mesh>
          </group>
        ))}
      </group>

      {/* Right Buildings */}
      <group position={[11.5, 7, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2, 14, 110]} />
          <meshStandardMaterial map={brickTex} roughness={0.7} />
        </mesh>

        {/* Windows */}
        {[-32, -14, 4, 22, 36].map((z, idx) => (
          <group key={`r-win-${idx}`} position={[-1.02, 3.5, z]}>
            <mesh>
              <boxGeometry args={[0.1, 2.2, 1.8]} />
              <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.8} />
            </mesh>
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[0.2, 2.4, 2.0]} />
              <meshStandardMaterial color="#78350f" />
            </mesh>
          </group>
        ))}

        {/* Balconies */}
        {[-22, 0, 24].map((z, idx) => (
          <group key={`r-balcony-${idx}`} position={[-1.4, 1.5, z]}>
            <mesh castShadow>
              <boxGeometry args={[1.5, 0.25, 4.5]} />
              <meshStandardMaterial color="#334155" />
            </mesh>
            <mesh position={[-0.7, 0.7, 0]}>
              <boxGeometry args={[0.08, 1.2, 4.5]} />
              <meshStandardMaterial color="#facc15" />
            </mesh>
          </group>
        ))}
      </group>

      {/* Back Boundary Wall (Z = -52) */}
      <group position={[0, 5, -52]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[24, 10, 2]} />
          <meshStandardMaterial color="#0f172a" roughness={0.6} />
        </mesh>
        <mesh position={[0, 2, 1.05]}>
          <planeGeometry args={[16, 3]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
      </group>

      {/* ── 3. DETAILED STUMPS (KEROSENE TIN + WOODEN STICKS) ── */}
      {/* Batting End Stumps */}
      <group position={[0, 0, 13.2]}>
        <mesh castShadow position={[0, 0.4, 0]}>
          <boxGeometry args={[0.75, 0.75, 0.45]} />
          <meshStandardMaterial color="#0284c7" metalness={0.7} roughness={0.2} />
        </mesh>
        {[-0.2, 0, 0.2].map((x, i) => (
          <mesh key={`bs-${i}`} castShadow position={[x, 1.05, 0]}>
            <cylinderGeometry args={[0.038, 0.038, 0.95, 16]} />
            <meshStandardMaterial color="#d97706" roughness={0.3} />
          </mesh>
        ))}
        <mesh position={[0, 1.54, 0]}>
          <boxGeometry args={[0.5, 0.04, 0.04]} />
          <meshStandardMaterial color="#fef08a" />
        </mesh>
      </group>

      {/* Bowling End Stumps */}
      <group position={[0, 0, -13.2]}>
        <mesh castShadow position={[0, 0.4, 0]}>
          <boxGeometry args={[0.75, 0.75, 0.45]} />
          <meshStandardMaterial color="#dc2626" metalness={0.7} roughness={0.2} />
        </mesh>
        {[-0.2, 0, 0.2].map((x, i) => (
          <mesh key={`bws-${i}`} castShadow position={[x, 1.05, 0]}>
            <cylinderGeometry args={[0.038, 0.038, 0.95, 16]} />
            <meshStandardMaterial color="#d97706" roughness={0.3} />
          </mesh>
        ))}
        <mesh position={[0, 1.54, 0]}>
          <boxGeometry args={[0.5, 0.04, 0.04]} />
          <meshStandardMaterial color="#fef08a" />
        </mesh>
      </group>

      {/* ── 4. DETAILED AUTO-RICKSHAW & SCOOTER PROPS ── */}
      {/* Parked Auto-Rickshaw */}
      <group position={[8.8, 0, -6]} rotation={[0, -0.3, 0]}>
        {/* Yellow Top Cabin */}
        <mesh castShadow position={[0, 1.8, 0]}>
          <boxGeometry args={[1.9, 0.7, 2.8]} />
          <meshStandardMaterial color="#facc15" roughness={0.2} />
        </mesh>
        {/* Black Body Frame */}
        <mesh castShadow position={[0, 0.9, 0]}>
          <boxGeometry args={[1.8, 1.1, 2.7]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} />
        </mesh>
        {/* Headlight */}
        <mesh position={[0, 0.9, -1.38]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        {/* Wheels */}
        <mesh position={[-0.95, 0.4, 0.8]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.38, 0.38, 0.22, 16]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <mesh position={[0.95, 0.4, 0.8]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.38, 0.38, 0.22, 16]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <mesh position={[0, 0.4, -1.1]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.38, 0.38, 0.22, 16]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
      </group>

      {/* Parked Scooter */}
      <group position={[-9.0, 0, 8]} rotation={[0, 0.5, 0]}>
        <mesh castShadow position={[0, 0.6, 0]}>
          <boxGeometry args={[0.5, 0.7, 1.8]} />
          <meshStandardMaterial color="#0284c7" roughness={0.3} />
        </mesh>
        <mesh position={[0, 1.1, -0.6]}>
          <cylinderGeometry args={[0.04, 0.04, 0.6]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
      </group>

      {/* ── 5. STREET LIGHTING ── */}
      <group position={[-10, 0, -20]}>
        <mesh castShadow position={[0, 4.5, 0]}>
          <cylinderGeometry args={[0.09, 0.14, 9.0]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
        <pointLight position={[0, 8.8, 0.6]} intensity={3.5} color="#fbbf24" distance={30} />
        <mesh position={[0, 8.8, 0.6]}>
          <sphereGeometry args={[0.35, 16, 16]} />
          <meshBasicMaterial color="#fef08a" />
        </mesh>
      </group>

      <group position={[10, 0, 18]}>
        <mesh castShadow position={[0, 4.5, 0]}>
          <cylinderGeometry args={[0.09, 0.14, 9.0]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
        <pointLight position={[0, 8.8, -0.6]} intensity={3.5} color="#fbbf24" distance={30} />
        <mesh position={[0, 8.8, -0.6]}>
          <sphereGeometry args={[0.35, 16, 16]} />
          <meshBasicMaterial color="#fef08a" />
        </mesh>
      </group>
    </group>
  )
}
