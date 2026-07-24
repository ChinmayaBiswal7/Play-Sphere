import React, { useMemo } from 'react'
import { Html } from '@react-three/drei'
import { useGullyCricketStore, DRAFT_PLAYERS_POOL } from './gullyCricketStore'
import * as THREE from 'three'

/**
 * High-Detail Procedural Texture Generator for Brick Gully Wall
 */
function createBrickTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 1024
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#991b1b'
  ctx.fillRect(0, 0, 1024, 1024)

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
      const shade = Math.floor(Math.random() * 20)
      ctx.fillStyle = `rgb(${127 + shade}, ${29 + shade}, ${29 + shade})`
      ctx.fillRect(x + 2, y + 2, brickW - 4, brickH - 4)
      ctx.strokeRect(x + 2, y + 2, brickW - 4, brickH - 4)
    }
  }

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

function createAsphaltTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#1e293b'
  ctx.fillRect(0, 0, 512, 512)

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

  const gameState = useGullyCricketStore((state) => state.gameState)
  const draftPool = useGullyCricketStore((state) => state.draftPool)
  const hoveredPlayerId = useGullyCricketStore((state) => state.hoveredPlayerId)
  const setHoveredPlayerId = useGullyCricketStore((state) => state.setHoveredPlayerId)
  const pickDraftPlayer = useGullyCricketStore((state) => state.pickDraftPlayer)
  const draftTurn = useGullyCricketStore((state) => state.draftTurn)

  return (
    <group>
      {/* ── 1. ASPHALT ROAD & TURF PITCH ── */}
      <mesh receiveShadow position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[26, 110]} />
        <meshStandardMaterial map={asphaltTex} roughness={0.95} metalness={0.1} />
      </mesh>

      <mesh receiveShadow position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.4, 28]} />
        <meshStandardMaterial color="#166534" roughness={0.4} />
      </mesh>

      <mesh position={[0, 0.02, 12]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.8, 0.14]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 0.02, -12]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.8, 0.14]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* ── 2. STANDING 3D DRAFTABLE PLAYERS (DURING MEGA DRAFT MODE) ── */}
      {gameState === 'MEGA_DRAFT' && draftPool.map((p) => {
        const isHovered = hoveredPlayerId === p.id
        return (
          <group
            key={p.id}
            position={p.pos}
            onClick={() => {
              setHoveredPlayerId(p.id)
              if (draftTurn === 'USER') pickDraftPlayer(p.id)
            }}
            onPointerOver={() => setHoveredPlayerId(p.id)}
          >
            {/* Golden Spotlight for hovered player */}
            {isHovered && (
              <spotLight
                position={[0, 5, 0]}
                target-position={[0, 0, 0]}
                intensity={4.0}
                color="#facc15"
                distance={10}
                angle={0.6}
              />
            )}

            {/* Player Character Model */}
            <mesh castShadow position={[0, 0.45, 0]}>
              <cylinderGeometry args={[0.09, 0.08, 0.9, 16]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            <mesh castShadow position={[0, 1.25, 0]}>
              <cylinderGeometry args={[0.24, 0.22, 0.65, 16]} />
              <meshStandardMaterial color={p.color} roughness={0.4} />
            </mesh>
            <mesh castShadow position={[0, 1.82, 0]}>
              <sphereGeometry args={[0.16, 20, 20]} />
              <meshStandardMaterial color="#f5d0a9" roughness={0.6} />
            </mesh>

            {/* Cap */}
            <group position={[0, 1.92, 0]}>
              <mesh castShadow>
                <sphereGeometry args={[0.17, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial color={p.color} />
              </mesh>
            </group>

            {/* Floating Clash Royale Card Overlay */}
            <Html position={[0, 2.5, 0]} center distanceFactor={12}>
              <div style={{
                background: isHovered ? 'rgba(15, 23, 42, 0.96)' : 'rgba(15, 23, 42, 0.85)',
                border: '2px solid', borderColor: isHovered ? '#facc15' : p.color,
                borderRadius: '10px', padding: '6px 12px', color: '#fff',
                fontFamily: "'Orbitron', sans-serif", textAlign: 'center', minWidth: '120px',
                boxShadow: isHovered ? '0 0 20px #facc15' : '0 4px 12px rgba(0,0,0,0.5)',
                transform: isHovered ? 'scale(1.15)' : 'scale(1)',
                transition: 'transform 0.15s, border-color 0.15s',
                pointerEvents: 'none'
              }}>
                <div style={{ color: p.color, fontSize: '0.6rem', fontWeight: '900' }}>{p.trait}</div>
                <div style={{ color: '#fff', fontSize: '0.75rem', fontWeight: '900', margin: '2px 0' }}>{p.name}</div>
                <div style={{ color: '#38bdf8', fontSize: '0.58rem', fontWeight: '800' }}>
                  BAT: {p.bat} | BOWL: {p.bowl}
                </div>
              </div>
            </Html>
          </group>
        )
      })}

      {/* ── 3. BUILDINGS & WALLS ── */}
      <group position={[-11.5, 7, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2, 14, 110]} />
          <meshStandardMaterial map={brickTex} roughness={0.7} />
        </mesh>
      </group>

      <group position={[11.5, 7, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2, 14, 110]} />
          <meshStandardMaterial map={brickTex} roughness={0.7} />
        </mesh>
      </group>
    </group>
  )
}
