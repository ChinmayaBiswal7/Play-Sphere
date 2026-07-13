import React, { useMemo } from 'react'
import { useBox, usePlane } from '@react-three/cannon'
import * as THREE from 'three'

// Track waypoints for an oval-style F1 circuit
const TRACK_WIDTH = 14
const TRACK_HALF = TRACK_WIDTH / 2

// Procedural asphalt normal texture — generated at runtime, no asset fetch needed
function useAsphaltTexture() {
  return useMemo(() => {
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#1c1c1e'
    ctx.fillRect(0, 0, size, size)
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * size
      const y = Math.random() * size
      const g = 20 + Math.random() * 30
      ctx.fillStyle = `rgb(${g},${g},${g})`
      ctx.fillRect(x, y, 1, 1)
    }
    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(8, 8)
    return tex
  }, [])
}

// Ground plane
function Ground() {
  const [ref] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, -0.05, 0],
    material: { friction: 0.8, restitution: 0.1 }
  }))

  return (
    <mesh ref={ref} receiveShadow>
      <planeGeometry args={[500, 500]} />
      <meshStandardMaterial color="#15240f" roughness={0.97} metalness={0.0} />
    </mesh>
  )
}

// Asphalt track surface segments — glossy wet-look with clearcoat for reflections
function TrackSegment({ position, rotation, width, length, isKerb = false, wetness = 0 }) {
  const asphaltMap = useAsphaltTexture()
  const [ref] = useBox(() => ({
    args: [width, 0.1, length],
    position,
    rotation,
    type: 'Static',
    material: { friction: 0.85, restitution: 0.05 }
  }))

  return (
    <mesh ref={ref} receiveShadow>
      <boxGeometry args={[width, 0.1, length]} />
      {isKerb ? (
        <meshPhysicalMaterial
          color="#c81e0a"
          roughness={0.35}
          metalness={0.05}
          clearcoat={0.6}
          clearcoatRoughness={0.3}
          envMapIntensity={0.6}
        />
      ) : (
        <meshPhysicalMaterial
          map={asphaltMap}
          color={wetness > 0.5 ? '#181b20' : '#2a2a2e'}
          roughness={0.62 - wetness * 0.34}
          metalness={0.08}
          clearcoat={0.35 + wetness * 0.55}
          clearcoatRoughness={0.5 - wetness * 0.22}
          envMapIntensity={0.5 + wetness * 0.85}
        />
      )}
    </mesh>
  )
}

// Barrier wall — brushed metal / carbon composite, high reflectivity
function Barrier({ position, rotation = [0, 0, 0], length, color = '#cccccc' }) {
  const [ref] = useBox(() => ({
    args: [0.5, 1.2, length],
    position,
    rotation,
    type: 'Static',
    material: { friction: 0.3, restitution: 0.2 }
  }))

  return (
    <mesh ref={ref} castShadow receiveShadow>
      <boxGeometry args={[0.5, 1.2, length]} />
      <meshPhysicalMaterial
        color={color}
        roughness={0.22}
        metalness={0.75}
        clearcoat={0.5}
        clearcoatRoughness={0.2}
        envMapIntensity={1.4}
      />
    </mesh>
  )
}

// White kerb stripe overlay
function KerbStripe({ position, rotation, width, length }) {
  return (
    <mesh position={[position[0], position[1] + 0.06, position[2]]} rotation={rotation} receiveShadow>
      <boxGeometry args={[width, 0.01, length / 6]} />
      <meshStandardMaterial color="#ffffff" roughness={0.4} />
    </mesh>
  )
}

export function Track({ wetness = 0 }) {
  // Build a rectangular circuit: long straights + banked corners
  const straightLen = 120
  const cornerLen = 60
  const trackW = TRACK_WIDTH
  const outerOffset = trackW / 2 + 0.5

  return (
    <group>
      <Ground />

      {/* MAIN STRAIGHT */}
      <TrackSegment position={[0, 0, 0]} rotation={[0, 0, 0]} width={trackW} length={straightLen} wetness={wetness} />

      {/* BACK STRAIGHT */}
      <TrackSegment position={[0, 0, -cornerLen - straightLen]} rotation={[0, 0, 0]} width={trackW} length={straightLen} wetness={wetness} />

      {/* LEFT CONNECTING STRAIGHT */}
      <TrackSegment position={[-straightLen / 2, 0, -cornerLen / 2 - straightLen / 2]} rotation={[0, Math.PI / 2, 0]} width={trackW} length={cornerLen} wetness={wetness} />

      {/* RIGHT CONNECTING STRAIGHT */}
      <TrackSegment position={[straightLen / 2, 0, -cornerLen / 2 - straightLen / 2]} rotation={[0, Math.PI / 2, 0]} width={trackW} length={cornerLen} wetness={wetness} />

      {/* CORNER CHICANES (filled boxes) */}
      <TrackSegment position={[-straightLen / 2, 0, -straightLen - cornerLen + cornerLen / 2]} rotation={[0, 0, 0]} width={cornerLen} length={cornerLen} wetness={wetness} />
      <TrackSegment position={[straightLen / 2, 0, -cornerLen / 2]} rotation={[0, 0, 0]} width={cornerLen} length={cornerLen} wetness={wetness} />
      <TrackSegment position={[-straightLen / 2, 0, -cornerLen / 2]} rotation={[0, 0, 0]} width={cornerLen} length={cornerLen} wetness={wetness} />
      <TrackSegment position={[straightLen / 2, 0, -straightLen - cornerLen + cornerLen / 2]} rotation={[0, 0, 0]} width={cornerLen} length={cornerLen} wetness={wetness} />

      {/* KERBS - main straight entries */}
      <TrackSegment position={[-outerOffset + 2.5, 0.02, 20]} isKerb rotation={[0, 0, 0]} width={5} length={15} />
      <TrackSegment position={[outerOffset - 2.5, 0.02, 20]} isKerb rotation={[0, 0, 0]} width={5} length={15} />
      <TrackSegment position={[-outerOffset + 2.5, 0.02, -20]} isKerb rotation={[0, 0, 0]} width={5} length={15} />
      <TrackSegment position={[outerOffset - 2.5, 0.02, -20]} isKerb rotation={[0, 0, 0]} width={5} length={15} />

      {/* BARRIERS - Main Straight outer walls */}
      <Barrier position={[outerOffset, 0.5, 0]} length={straightLen} color="#e8e8e8" />
      <Barrier position={[-outerOffset, 0.5, 0]} length={straightLen} color="#e8e8e8" />

      {/* BARRIERS - Back straight */}
      <Barrier position={[outerOffset, 0.5, -cornerLen - straightLen]} length={straightLen} color="#e8e8e8" />
      <Barrier position={[-outerOffset, 0.5, -cornerLen - straightLen]} length={straightLen} color="#e8e8e8" />

      {/* BARRIERS - Left connecting */}
      <Barrier
        position={[-straightLen / 2, 0.5, -cornerLen / 2 - straightLen / 2]}
        rotation={[0, Math.PI / 2, 0]}
        length={cornerLen}
        color="#dd3311"
      />
      <Barrier
        position={[-straightLen / 2 - trackW / 2 - 0.5, 0.5, -cornerLen / 2 - straightLen / 2]}
        rotation={[0, Math.PI / 2, 0]}
        length={cornerLen + 20}
        color="#1133dd"
      />

      {/* BARRIERS - Right connecting */}
      <Barrier
        position={[straightLen / 2, 0.5, -cornerLen / 2 - straightLen / 2]}
        rotation={[0, Math.PI / 2, 0]}
        length={cornerLen}
        color="#dd3311"
      />
      <Barrier
        position={[straightLen / 2 + trackW / 2 + 0.5, 0.5, -cornerLen / 2 - straightLen / 2]}
        rotation={[0, Math.PI / 2, 0]}
        length={cornerLen + 20}
        color="#1133dd"
      />

      {/* Grass / run-off areas */}
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color="#173a0e" roughness={0.99} />
      </mesh>

      {/* Start/Finish line */}
      <mesh position={[0, 0.06, 35]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[trackW, 1.5]} />
        <meshPhysicalMaterial color="#ffffff" roughness={0.3} clearcoat={0.5} />
      </mesh>
      <mesh position={[0, 0.06, 32.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[trackW, 1.5]} />
        <meshStandardMaterial color="#161616" roughness={0.6} />
      </mesh>

      {/* Pit lane line */}
      <mesh position={[0, 0.07, 30]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[trackW, 0.3]} />
        <meshStandardMaterial color="#ff2200" emissive="#ff2200" emissiveIntensity={0.2} />
      </mesh>

      {/* Rubbered racing line and wet puddle patches */}
      <mesh position={[0, 0.075, -40]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.5, 170]} />
        <meshStandardMaterial color="#050505" transparent opacity={0.24 + wetness * 0.18} roughness={0.8} />
      </mesh>
      {wetness > 0.35 && [-38, -82, 18].map((z, i) => (
        <mesh key={z} position={[i % 2 ? -3 : 4, 0.082, z]} rotation={[-Math.PI / 2, 0, i * 0.25]}>
          <circleGeometry args={[5 + i * 1.2, 32]} />
          <meshPhysicalMaterial color="#1f2937" transparent opacity={0.42} roughness={0.12} clearcoat={1} />
        </mesh>
      ))}

      {/* Ambient spectator stands (non-collidable, purely visual) */}
      {[-1, 1].map((side, i) => (
        <mesh key={i} position={[side * (outerOffset + 8), 3, 0]} castShadow>
          <boxGeometry args={[4, 6, straightLen * 0.8]} />
          <meshPhysicalMaterial
            color={side > 0 ? '#141428' : '#101830'}
            roughness={0.45}
            metalness={0.4}
            clearcoat={0.3}
            envMapIntensity={1}
          />
        </mesh>
      ))}

      {/* Track-side floodlight pylons (visual only) */}
      {[-50, 0, 50].flatMap((z) => [-28, 28]).map((x, i) => (
        <mesh key={`pylon-${i}`} position={[x, 11, [-50, -50, 0, 0, 50, 50][i]]} castShadow>
          <cylinderGeometry args={[0.25, 0.35, 22, 8]} />
          <meshPhysicalMaterial color="#3a3a3a" roughness={0.4} metalness={0.8} envMapIntensity={1.2} />
        </mesh>
      ))}
    </group>
  )
}
