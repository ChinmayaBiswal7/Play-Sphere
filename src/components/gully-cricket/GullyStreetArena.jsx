import React, { useMemo, useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useGullyCricketStore, DRAFT_PLAYERS_POOL } from './gullyCricketStore'
import * as THREE from 'three'

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
  ctx.fillText('GULLY KINGS', 120, 480)
  ctx.fillStyle = '#facc15'
  ctx.fillText('ONE TIPPI OUT!', 180, 600)
  
  // Cricket bat stencil
  ctx.fillStyle = '#ffaa00'
  ctx.fillRect(700, 300, 40, 200)
  ctx.fillRect(710, 200, 20, 100)
  
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
  // Yellow crease line
  ctx.fillStyle = '#facc15'
  ctx.fillRect(100, 0, 10, 512)
  
  // Dirt patches
  for (let i = 0; i < 20; i++) {
    ctx.beginPath()
    ctx.arc(Math.random() * 512, Math.random() * 512, Math.random() * 40 + 10, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(80, 60, 40, 0.4)'
    ctx.fill()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(4, 16)
  return texture
}

function createConcreteTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#64748b'
  ctx.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 10000; i++) {
    const x = Math.random() * 512
    const y = Math.random() * 512
    const lum = Math.floor(Math.random() * 40) + 80
    ctx.fillStyle = `rgb(${lum},${lum},${lum})`
    ctx.fillRect(x, y, 2, 2)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(4, 4)
  return texture
}

function createWindowTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#1e1e1e'
  ctx.fillRect(0, 0, 256, 256)
  ctx.strokeStyle = '#444'
  ctx.lineWidth = 10
  ctx.strokeRect(10, 10, 236, 236)
  ctx.beginPath()
  ctx.moveTo(128, 10)
  ctx.lineTo(128, 246)
  ctx.moveTo(10, 128)
  ctx.lineTo(246, 128)
  ctx.stroke()
  
  if (Math.random() > 0.5) {
    ctx.fillStyle = 'rgba(250, 204, 21, 0.8)' // Lit yellow
    ctx.fillRect(15, 15, 108, 108)
    ctx.fillRect(133, 15, 108, 108)
    ctx.fillRect(15, 133, 108, 108)
    ctx.fillRect(133, 133, 108, 108)
  }
  const texture = new THREE.CanvasTexture(canvas)
  return texture
}

function createSkyTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  const grad = ctx.createLinearGradient(0, 0, 0, 512)
  grad.addColorStop(0, '#f97316') // Orange
  grad.addColorStop(0.5, '#facc15') // Yellow
  grad.addColorStop(1, '#fde047') // Light yellow
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 1024, 512)
  const texture = new THREE.CanvasTexture(canvas)
  return texture
}

function DraftPlayer({ p, isHovered, draftTurn, setHoveredPlayerId, pickDraftPlayer }) {
  const groupRef = useRef()
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = p.pos[1] + Math.sin(state.clock.elapsedTime * 3) * 0.05
    }
  })

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
      {isHovered && (
        <spotLight position={[0, 5, 0]} target-position={[0, 0, 0]} intensity={4.0} color="#facc15" distance={10} angle={0.6} />
      )}
      
      {draftTurn === 'USER' && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.6, 32]} />
          <meshBasicMaterial color="#facc15" side={THREE.DoubleSide} transparent opacity={0.5 + Math.sin(Date.now() / 200) * 0.5} />
        </mesh>
      )}

      <group ref={groupRef}>
        <mesh castShadow position={[-0.15, 0.45, 0]}>
          <cylinderGeometry args={[0.07, 0.06, 0.9, 16]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        <mesh castShadow position={[0.15, 0.45, 0]}>
          <cylinderGeometry args={[0.07, 0.06, 0.9, 16]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        
        <mesh castShadow position={[0, 1.25, 0]}>
          <cylinderGeometry args={[0.24, 0.22, 0.65, 16]} />
          <meshStandardMaterial color={p.color} roughness={0.4} />
        </mesh>

        <mesh castShadow position={[-0.3, 1.25, 0]}>
          <cylinderGeometry args={[0.06, 0.05, 0.5, 16]} />
          <meshStandardMaterial color="#f5d0a9" />
        </mesh>
        <mesh castShadow position={[0.3, 1.25, 0]}>
          <cylinderGeometry args={[0.06, 0.05, 0.5, 16]} />
          <meshStandardMaterial color="#f5d0a9" />
        </mesh>

        <mesh castShadow position={[0, 1.82, 0]}>
          <sphereGeometry args={[0.16, 20, 20]} />
          <meshStandardMaterial color="#f5d0a9" roughness={0.6} />
        </mesh>

        <group position={[0, 1.92, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.17, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={p.color} />
          </mesh>
        </group>
      </group>

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
}

function Fan() {
  const ref = useRef()
  useFrame((state) => {
    if (ref.current) ref.current.rotation.y += 0.05
  })
  return (
    <group ref={ref} position={[0, 15, 0]}>
      <mesh><cylinderGeometry args={[0.1, 0.1, 2, 16]} /><meshStandardMaterial color="#444" /></mesh>
      <mesh position={[1.5, -0.9, 0]}><boxGeometry args={[3, 0.1, 0.5]} /><meshStandardMaterial color="#444" /></mesh>
      <mesh position={[-1.5, -0.9, 0]}><boxGeometry args={[3, 0.1, 0.5]} /><meshStandardMaterial color="#444" /></mesh>
      <mesh position={[0, -0.9, 1.5]} rotation={[0, Math.PI/2, 0]}><boxGeometry args={[3, 0.1, 0.5]} /><meshStandardMaterial color="#444" /></mesh>
      <mesh position={[0, -0.9, -1.5]} rotation={[0, Math.PI/2, 0]}><boxGeometry args={[3, 0.1, 0.5]} /><meshStandardMaterial color="#444" /></mesh>
    </group>
  )
}

function Particles() {
  const particles = Array.from({ length: 40 }).map((_, i) => ({
    x: 13 + Math.random() * 2,
    y: Math.random() * 5,
    z: 20 + Math.random() * 2,
    speed: Math.random() * 0.02 + 0.01
  }))
  const ref = useRef()
  useFrame(() => {
    if (ref.current) {
      ref.current.children.forEach((c, i) => {
        c.position.y += particles[i].speed
        if (c.position.y > 10) c.position.y = 0
        c.material.opacity = 1 - (c.position.y / 10)
      })
    }
  })
  return (
    <group ref={ref}>
      {particles.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial color="#aaaaaa" transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  )
}

function BallIcon() {
  const ref = useRef()
  useFrame((state) => {
    if (ref.current) {
      ref.current.position.y = 8 + Math.sin(state.clock.elapsedTime * 2) * 0.5
      ref.current.rotation.y += 0.02
      ref.current.rotation.x += 0.01
    }
  })
  return (
    <mesh ref={ref} position={[0, 8, -54]}>
      <sphereGeometry args={[1.5, 32, 32]} />
      <meshStandardMaterial color="#ef4444" />
    </mesh>
  )
}

function Stumps({ position }) {
  const [showOut, setShowOut] = useState(false)
  
  useEffect(() => {
    const unsub = useGullyCricketStore.subscribe((state) => {
      if (state.phase === 'WICKET_FALL') {
        setShowOut(true)
        setTimeout(() => setShowOut(false), 3000)
      }
    })
    return () => unsub()
  }, [])

  return (
    <group position={position}>
      {[-0.2, 0, 0.2].map(x => (
        <mesh key={x} position={[x, 0.4, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.8]} />
          <meshStandardMaterial color="#a0522d" />
        </mesh>
      ))}
      <mesh position={[-0.1, 0.82, 0]} castShadow rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.2]} />
        <meshStandardMaterial color="#8b4513" />
      </mesh>
      <mesh position={[0.1, 0.82, 0]} castShadow rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.2]} />
        <meshStandardMaterial color="#8b4513" />
      </mesh>
      {showOut && (
        <Html position={[0, 1.5, 0]} center>
          <div style={{ color: '#ef4444', fontSize: '2rem', fontWeight: 'bold', textShadow: '2px 2px #000' }}>OUT!</div>
        </Html>
      )}
    </group>
  )
}

export function GullyStreetArena() {
  const brickTex = useMemo(() => createBrickTexture(), [])
  const asphaltTex = useMemo(() => createAsphaltTexture(), [])
  const concreteTex = useMemo(() => createConcreteTexture(), [])
  const windowTex = useMemo(() => createWindowTexture(), [])
  const skyTex = useMemo(() => createSkyTexture(), [])

  const gameState = useGullyCricketStore((state) => state.gameState)
  const draftPool = useGullyCricketStore((state) => state.draftPool)
  const hoveredPlayerId = useGullyCricketStore((state) => state.hoveredPlayerId)
  const setHoveredPlayerId = useGullyCricketStore((state) => state.setHoveredPlayerId)
  const pickDraftPlayer = useGullyCricketStore((state) => state.pickDraftPlayer)
  const draftTurn = useGullyCricketStore((state) => state.draftTurn)

  return (
    <group>
      <mesh position={[0, 50, -100]}>
        <planeGeometry args={[500, 200]} />
        <meshBasicMaterial map={skyTex} />
      </mesh>

      <mesh receiveShadow position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[30, 120]} />
        <meshStandardMaterial map={asphaltTex} roughness={0.95} metalness={0.1} />
      </mesh>

      <mesh receiveShadow position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.5, 28]} />
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

      {gameState === 'MEGA_DRAFT' && draftPool.map((p) => (
        <DraftPlayer key={p.id} p={p} isHovered={hoveredPlayerId === p.id} draftTurn={draftTurn} setHoveredPlayerId={setHoveredPlayerId} pickDraftPlayer={pickDraftPlayer} />
      ))}

      {(gameState === 'INNINGS_1' || gameState === 'INNINGS_2') && (
        <>
          <Stumps position={[0, 0, 12]} />
          <Stumps position={[0, 0, -12]} />
        </>
      )}

      {/* LEFT WALL (X=-16.5) */}
      <group position={[-16.5, 8, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[3, 16, 120]} />
          <meshStandardMaterial map={brickTex} roughness={0.7} />
        </mesh>
        {/* Windows */}
        {[-40, -20, 0, 20, 40].map(z => 
          [2, 6, 10].map(y => (
            <mesh key={`wl-${z}-${y}`} position={[1.51, y - 8, z]} rotation={[0, Math.PI/2, 0]}>
              <planeGeometry args={[3, 3]} />
              <meshStandardMaterial map={windowTex} roughness={0.2} />
            </mesh>
          ))
        )}
        {/* AC Units */}
        {[-30, 10, 30].map(z => (
          <mesh key={`ac-${z}`} position={[1.8, -2, z]} castShadow>
            <boxGeometry args={[1, 1.5, 2]} />
            <meshStandardMaterial color="#e2e8f0" />
          </mesh>
        ))}
        {/* Water Tank */}
        <mesh position={[0, 9, 0]} castShadow>
          <cylinderGeometry args={[2, 2, 3]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        {/* Drainpipe */}
        <mesh position={[1.5, 0, -10]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 16]} />
          <meshStandardMaterial color="#64748b" />
        </mesh>
        {/* Clothesline */}
        <mesh position={[1.5, -2, 15]}>
          <boxGeometry args={[0.05, 0.05, 10]} />
          <meshStandardMaterial color="#000" />
        </mesh>
        <mesh position={[1.5, -2.5, 12]} castShadow><planeGeometry args={[1, 1]} /><meshStandardMaterial color="#ef4444" side={THREE.DoubleSide} /></mesh>
        <mesh position={[1.5, -2.5, 15]} castShadow><planeGeometry args={[1, 1]} /><meshStandardMaterial color="#3b82f6" side={THREE.DoubleSide} /></mesh>
        <mesh position={[1.5, -2.5, 18]} castShadow><planeGeometry args={[1, 1]} /><meshStandardMaterial color="#22c55e" side={THREE.DoubleSide} /></mesh>
      </group>

      {/* RIGHT WALL (X=16.5) */}
      <group position={[16.5, 8, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[3, 16, 120]} />
          <meshStandardMaterial map={brickTex} roughness={0.7} />
        </mesh>
        {/* PAAN shop */}
        <group position={[-1.5, -6, -20]}>
          <mesh castShadow><boxGeometry args={[1, 4, 4]} /><meshStandardMaterial color="#ef4444" /></mesh>
          <mesh position={[-0.51, 1, 0]} rotation={[0, -Math.PI/2, 0]}><planeGeometry args={[3, 1]} /><meshBasicMaterial color="#facc15" /></mesh>
          <Html position={[-0.6, 1, 0]} transform rotation={[0, -Math.PI/2, 0]}>
            <div style={{ color: '#000', fontWeight: 'bold', fontSize: '12px' }}>PAAN SHOP</div>
          </Html>
        </group>
        {/* Chai Stall */}
        <group position={[-1.5, -7, 20]}>
          <mesh castShadow><boxGeometry args={[2, 2, 3]} /><meshStandardMaterial color="#8b4513" /></mesh>
          <mesh position={[-1, 1, 0]} rotation={[0, 0, Math.PI/4]}><boxGeometry args={[0.1, 3, 3]} /><meshStandardMaterial color="#3b82f6" /></mesh>
        </group>
      </group>

      {/* END WALL (Z=-55) */}
      <group position={[0, 8, -55]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[30, 16, 2]} />
          <meshStandardMaterial map={brickTex} roughness={0.7} />
        </mesh>
        <mesh position={[0, 2, 1.01]}>
          <planeGeometry args={[20, 8]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <Html position={[0, 2, 1.1]} transform>
          <div style={{ color: '#fff', fontSize: '3rem', fontWeight: '900', fontFamily: 'sans-serif' }}>GULLY KINGS</div>
        </Html>
        {/* Basketball Hoop */}
        <mesh position={[10, 4, 1.1]}><boxGeometry args={[3, 2, 0.1]} /><meshStandardMaterial color="#fff" /></mesh>
        <mesh position={[10, 3, 1.5]} rotation={[Math.PI/2, 0, 0]}><torusGeometry args={[0.5, 0.05]} /><meshStandardMaterial color="#ef4444" /></mesh>
      </group>

      {/* Parked Scooter */}
      <group position={[-14, 0.5, -30]}>
        <mesh castShadow><boxGeometry args={[1, 1, 3]} /><meshStandardMaterial color="#3b82f6" /></mesh>
        <mesh position={[0, -0.2, 1.5]} castShadow><cylinderGeometry args={[0.3, 0.3, 0.2]} rotation={[0, 0, Math.PI/2]} /><meshStandardMaterial color="#111" /></mesh>
        <mesh position={[0, -0.2, -1.5]} castShadow><cylinderGeometry args={[0.3, 0.3, 0.2]} rotation={[0, 0, Math.PI/2]} /><meshStandardMaterial color="#111" /></mesh>
        <mesh position={[0, 1, -0.5]} castShadow><boxGeometry args={[0.8, 0.2, 1]} /><meshStandardMaterial color="#111" /></mesh>
      </group>

      {/* Dustbins */}
      <mesh position={[14, 0.75, 10]} castShadow>
        <cylinderGeometry args={[0.5, 0.4, 1.5]} />
        <meshStandardMaterial color="#22c55e" />
      </mesh>

      {/* Street Lights & Wires */}
      {[-40, -20, 0, 20, 40].map((z, i) => {
        const x = i % 2 === 0 ? -14.5 : 14.5
        return (
          <group key={`sl-${z}`} position={[x, 0, z]}>
            <mesh castShadow position={[0, 5, 0]}><cylinderGeometry args={[0.1, 0.2, 10]} /><meshStandardMaterial color="#475569" /></mesh>
            <mesh position={[i%2===0?1:-1, 10, 0]} rotation={[0, 0, i%2===0?Math.PI/2:-Math.PI/2]}><cylinderGeometry args={[0.1, 0.1, 2]} /><meshStandardMaterial color="#475569" /></mesh>
            <mesh position={[i%2===0?2:-2, 9.8, 0]}><coneGeometry args={[0.5, 0.5]} /><meshStandardMaterial color="#333" /></mesh>
            <pointLight position={[i%2===0?2:-2, 9.5, 0]} color="#fb923c" intensity={1.5} distance={25} />
          </group>
        )
      })}
      
      {[-30, -10, 10, 30].map(z => (
        <mesh key={`wire-${z}`} position={[0, 14, z]}>
          <boxGeometry args={[30, 0.05, 0.05]} />
          <meshBasicMaterial color="#111" />
        </mesh>
      ))}

      {/* Atmosphere */}
      {[-30, 0, 30].map(z => <group key={`fan-${z}`} position={[0, 0, z]}><Fan /></group>)}
      <Particles />
      <BallIcon />

    </group>
  )
}
