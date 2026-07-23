import React, { useRef, useEffect, useState, useMemo } from 'react'
import { useCylinder } from '@react-three/cannon'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useLagoriStore } from './lagoriStore'
import * as THREE from 'three'

/**
 * Creates procedural stone texture with engraved number (1 to 7)
 */
function createStoneTexture(number) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')

  // Natural Granite Stone Texture
  ctx.fillStyle = '#475569'
  ctx.fillRect(0, 0, 256, 256)

  // Texture speckles
  for (let i = 0; i < 300; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? '#334155' : '#64748b'
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 4, 4)
  }

  // Gold Engraved Number
  ctx.fillStyle = '#facc15'
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 4
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '900 110px "Orbitron", sans-serif'
  ctx.strokeText(number.toString(), 128, 128)
  ctx.fillText(number.toString(), 128, 128)

  const texture = new THREE.CanvasTexture(canvas)
  return texture
}

const STONE_CONFIGS = [
  { id: 1, radius: 0.55, height: 0.16, yOffset: 0.08, mass: 4.5 },
  { id: 2, radius: 0.50, height: 0.16, yOffset: 0.24, mass: 4.0 },
  { id: 3, radius: 0.45, height: 0.16, yOffset: 0.40, mass: 3.5 },
  { id: 4, radius: 0.40, height: 0.16, yOffset: 0.56, mass: 3.0 },
  { id: 5, radius: 0.35, height: 0.16, yOffset: 0.72, mass: 2.5 },
  { id: 6, radius: 0.30, height: 0.16, yOffset: 0.88, mass: 2.0 },
  { id: 7, radius: 0.25, height: 0.16, yOffset: 1.04, mass: 1.5 }
]

function SingleStone({ config, index }) {
  const gameState = useLagoriStore((state) => state.gameState)
  const isStackKnockedDown = useLagoriStore((state) => state.isStackKnockedDown)
  const knockDownStack = useLagoriStore((state) => state.knockDownStack)
  const stonesRebuilt = useLagoriStore((state) => state.stonesRebuilt)

  const [ref, api] = useCylinder(() => ({
    mass: isStackKnockedDown ? config.mass : 0, // Static before hit, dynamic after hit!
    position: [0, config.yOffset, 0],
    args: [config.radius, config.radius, config.height, 16],
    restitution: 0.3,
    friction: 0.8,
    onCollide: (e) => {
      if (!useLagoriStore.getState().isStackKnockedDown && (gameState === 'AIM_THROW' || gameState === 'PLAYING')) {
        knockDownStack()
      }
    }
  }))

  const stonePos = useRef([0, config.yOffset, 0])
  const [pickedUp, setPickedUp] = useState(false)

  const texture = useMemo(() => createStoneTexture(config.id), [config.id])

  useEffect(() => {
    const unsub = api.position.subscribe(v => (stonePos.current = v || [0, config.yOffset, 0]))
    return () => unsub()
  }, [api])

  // Reset stone position on round restart
  useEffect(() => {
    if (!isStackKnockedDown) {
      setPickedUp(false)
      api.position.set(0, config.yOffset, 0)
      api.rotation.set(0, 0, 0)
      api.velocity.set(0, 0, 0)
      api.angularVelocity.set(0, 0, 0)
    } else {
      // Scatter impulse when knocked down!
      const impulseX = (Math.random() - 0.5) * 8.0
      const impulseZ = (Math.random() - 0.5) * 8.0
      api.velocity.set(impulseX, 2.5, impulseZ)
    }
  }, [isStackKnockedDown, config, api])

  const isRebuilt = index < stonesRebuilt

  useFrame(() => {
    if (isStackKnockedDown && !pickedUp && !isRebuilt) {
      const p = window.lagoriPlayer
      if (p && p.position && Array.isArray(p.position.current)) {
        const pPos = p.position.current
        const dist = Math.hypot(pPos[0] - stonePos.current[0], pPos[2] - stonePos.current[2])

        if (dist < 1.8 && Math.abs(pPos[1] - stonePos.current[1]) < 1.8) {
          window[`lagoriStone_${config.id}_near`] = true
        } else {
          window[`lagoriStone_${config.id}_near`] = false
        }
      }
    }
  })

  if (pickedUp && !isRebuilt) return null

  return (
    <group ref={ref}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[config.radius, config.radius, config.height, 20]} />
        <meshStandardMaterial map={texture} roughness={0.5} metalness={0.1} />
      </mesh>

      {/* Pickup Indicator Prompt */}
      {isStackKnockedDown && !pickedUp && !isRebuilt && window[`lagoriStone_${config.id}_near`] && (
        <Html position={[0, 0.5, 0]} center distanceFactor={10}>
          <div style={{
            background: 'rgba(234, 179, 8, 0.95)',
            color: '#000',
            fontWeight: '900',
            fontSize: '11px',
            padding: '3px 8px',
            borderRadius: '6px',
            fontFamily: "'Orbitron', sans-serif",
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            pointerEvents: 'none'
          }}>
            [E] PICK UP STONE #{config.id}
          </div>
        </Html>
      )}
    </group>
  )
}

export function StoneStack() {
  const stonesRebuilt = useLagoriStore((state) => state.stonesRebuilt)
  const isStackKnockedDown = useLagoriStore((state) => state.isStackKnockedDown)
  const knockDownStack = useLagoriStore((state) => state.knockDownStack)

  useFrame(() => {
    // Proactive collision check: Knock down stack when ball gets near center stack!
    if (!isStackKnockedDown) {
      const ball = window.lagoriBall
      if (ball && ball.position && Array.isArray(ball.position.current)) {
        const bPos = ball.position.current
        const distToCenter = Math.hypot(bPos[0], bPos[2])
        if (distToCenter < 1.2 && bPos[1] < 1.8) {
          knockDownStack()
        }
      }
    }
  })

  return (
    <group>
      {/* 7 Physics-Enabled Flat Cylinder Stones */}
      {STONE_CONFIGS.map((cfg, idx) => (
        <SingleStone key={cfg.id} config={cfg} index={idx} />
      ))}

      {/* Rebuilt Stack Visual Indicator at Center Pedestal */}
      {isStackKnockedDown && stonesRebuilt > 0 && (
        <group position={[0, 0, 0]}>
          {STONE_CONFIGS.slice(0, stonesRebuilt).map((cfg) => (
            <mesh key={`rebuilt_${cfg.id}`} position={[0, cfg.yOffset, 0]}>
              <cylinderGeometry args={[cfg.radius, cfg.radius, cfg.height, 20]} />
              <meshStandardMaterial color="#facc15" roughness={0.3} metalness={0.2} />
            </mesh>
          ))}
        </group>
      )}

      {/* Rebuild Prompt at Center Base */}
      {isStackKnockedDown && (
        <Html position={[0, 1.8, 0]} center distanceFactor={14}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.88)',
            border: '1px solid #facc15',
            color: '#fff',
            fontWeight: '900',
            fontSize: '12px',
            padding: '6px 14px',
            borderRadius: '8px',
            fontFamily: "'Orbitron', sans-serif",
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
            pointerEvents: 'none'
          }}>
            <span style={{ color: '#facc15' }}>STACK BASE ({stonesRebuilt}/7 STONES)</span>
          </div>
        </Html>
      )}
    </group>
  )
}
