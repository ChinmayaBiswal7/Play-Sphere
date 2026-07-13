import React, { Suspense, useMemo, useRef, useState, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/cannon'
import { Environment, Stars, Sky } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, ChromaticAberration, BrightnessContrast, HueSaturation } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import { F1Car } from './F1Car.jsx'
import { Track } from './Track.jsx'
import { DashboardHUD } from './DashboardHUD.jsx'

function AIGrid({ wetness = 0 }) {
  const groupRef = useRef()
  const cars = useMemo(() => (
    Array.from({ length: 7 }).map((_, i) => ({
      offset: i * 0.13,
      speed: 0.055 + i * 0.0025,
      lane: (i % 3 - 1) * 3.2,
      color: ['#2dd4bf', '#f97316', '#60a5fa', '#facc15', '#a78bfa', '#ef4444', '#f8fafc'][i],
    }))
  ), [])

  const sampleTrack = (t, lane) => {
    const p = ((t % 1) + 1) % 1
    if (p < 0.25) return { x: lane, z: 45 - p / 0.25 * 155, rot: Math.PI }
    if (p < 0.5) return { x: (p - 0.25) / 0.25 * 120 - 60, z: -110 + lane, rot: Math.PI / 2 }
    if (p < 0.75) return { x: lane + 60, z: -110 + (p - 0.5) / 0.25 * 155, rot: 0 }
    return { x: 60 - (p - 0.75) / 0.25 * 120, z: 45 - lane, rot: -Math.PI / 2 }
  }

  React.useEffect(() => {
    let frame
    const animate = () => {
      const time = performance.now() * 0.001
      groupRef.current?.children.forEach((mesh, i) => {
        const car = cars[i]
        const p = sampleTrack(time * car.speed * (1 - wetness * 0.22) + car.offset, car.lane)
        mesh.position.set(p.x, 0.35, p.z)
        mesh.rotation.set(0, p.rot, 0)
      })
      frame = requestAnimationFrame(animate)
    }
    animate()
    return () => cancelAnimationFrame(frame)
  }, [cars, wetness])

  return (
    <group ref={groupRef}>
      {cars.map((car, i) => (
        <group key={i}>
          <mesh castShadow>
            <boxGeometry args={[1.35, 0.26, 3.1]} />
            <meshPhysicalMaterial color={car.color} roughness={0.28} metalness={0.2} clearcoat={0.9} />
          </mesh>
          <mesh position={[0, 0.25, 0.2]} castShadow>
            <boxGeometry args={[0.5, 0.34, 1.2]} />
            <meshStandardMaterial color="#050607" roughness={0.34} />
          </mesh>
          {[-0.82, 0.82].flatMap((x) => [-1.05, 1.15].map((z) => (
            <mesh key={`${x}-${z}`} position={[x, -0.12, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.31, 0.31, 0.28, 18]} />
              <meshStandardMaterial color="#050505" roughness={0.85} />
            </mesh>
          )))}
        </group>
      ))}
    </group>
  )
}

function RainFX({ active }) {
  const pointsRef = useRef()
  const positions = useMemo(() => {
    const arr = new Float32Array(900 * 3)
    for (let i = 0; i < 900; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 190
      arr[i * 3 + 1] = Math.random() * 44 + 8
      arr[i * 3 + 2] = (Math.random() - 0.5) * 210 - 35
    }
    return arr
  }, [])

  React.useEffect(() => {
    if (!active || !pointsRef.current) return
    let frame
    const tick = () => {
      const attr = pointsRef.current.geometry.attributes.position
      for (let i = 0; i < attr.count; i++) {
        attr.array[i * 3 + 1] -= 1.35
        attr.array[i * 3] -= 0.08
        if (attr.array[i * 3 + 1] < 0.2) attr.array[i * 3 + 1] = 48
      }
      attr.needsUpdate = true
      frame = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(frame)
  }, [active])

  if (!active) return null

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#b9d8ff" size={0.08} transparent opacity={0.6} depthWrite={false} />
    </points>
  )
}

function Scene({ onTelemetry, setup, mode }) {
  const wetness = mode === 'Storm Race' ? 0.82 : mode === 'Grand Prix' ? 0.22 : 0
  return (
    <>
      {/* Atmosphere — golden hour race-day sky */}
      <color attach="background" args={['#0c0a14']} />
      <fog attach="fog" args={['#1a1622', 60, 320]} />

      <Sky
        distance={450000}
        sunPosition={[80, 18, -60]}
        inclination={0.49}
        azimuth={0.25}
        turbidity={6}
        rayleigh={1.2}
        mieCoefficient={0.012}
        mieDirectionalG={0.85}
      />
      <Stars radius={250} depth={80} count={2500} factor={3.5} fade speed={0.3} />

      {/* HDR environment for realistic metal/carbon/clearcoat reflections */}
      <Environment preset="sunset" environmentIntensity={1.1} />

      {/* Lighting rig */}
      <ambientLight intensity={0.28} color="#b8a8ff" />

      {/* Main key light — low warm sun, dramatic long shadows */}
      <directionalLight
        position={[80, 22, -60]}
        intensity={3.2}
        color="#ffb870"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={300}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
        shadow-bias={-0.0008}
      />

      {/* Cool fill / rim light from opposite side */}
      <directionalLight position={[-60, 35, 70]} intensity={0.7} color="#5588ff" />

      {/* Ground bounce */}
      <hemisphereLight args={['#7799ff', '#1a3010', 0.35]} />

      {/* Track floodlights — pylon-mounted, alternating sides */}
      {[-50, 0, 50].map((z, i) => (
        <spotLight
          key={i}
          position={[28, 22, z]}
          target-position={[0, 0, z]}
          intensity={120}
          angle={0.35}
          penumbra={0.6}
          color="#fff4e0"
          decay={2}
        />
      ))}
      {[-50, 0, 50].map((z, i) => (
        <spotLight
          key={`l${i}`}
          position={[-28, 22, z]}
          target-position={[0, 0, z]}
          intensity={120}
          angle={0.35}
          penumbra={0.6}
          color="#fff4e0"
          decay={2}
        />
      ))}

      <Physics
        gravity={[0, -20, 0]}
        broadphase="SAP"
        defaultContactMaterial={{
          friction: 0.8,
          restitution: 0.05,
          contactEquationStiffness: 1e8,
          contactEquationRelaxation: 3,
        }}
      >
        <Track wetness={wetness} />
        <F1Car onTelemetry={onTelemetry} setup={setup} mode={mode} wetness={wetness} />
      </Physics>

      <AIGrid wetness={wetness} />
      <RainFX active={wetness > 0.55} />

      {/* Post-processing — cinematic grade */}
      <EffectComposer multisampling={4}>
        <Bloom
          intensity={1.1}
          luminanceThreshold={0.55}
          luminanceSmoothing={0.25}
          mipmapBlur
          radius={0.85}
        />
        <BrightnessContrast brightness={0.02} contrast={0.12} />
        <HueSaturation saturation={0.15} />
        <Vignette
          offset={0.25}
          darkness={0.65}
          blendFunction={BlendFunction.NORMAL}
        />
        <ChromaticAberration
          offset={[0.0008, 0.0008]}
          blendFunction={BlendFunction.NORMAL}
        />
      </EffectComposer>
    </>
  )
}

export function GameCanvas({ mode = 'Grand Prix', setup = {}, onExit }) {
  const [telemetry, setTelemetry] = useState({
    speed: 0, gear: 1, rpm: 800,
    ersBattery: 100, ersBoosting: false,
    drs: false, braking: false,
  })

  const handleTelemetry = useCallback((data) => {
    setTelemetry(prev => {
      // Only update if something meaningful changed (perf opt)
      if (
        prev.speed === data.speed &&
        prev.gear === data.gear &&
        prev.ersBoosting === data.ersBoosting &&
        prev.drs === data.drs &&
        prev.braking === data.braking &&
        Math.abs(prev.rpm - data.rpm) < 100 &&
        Math.abs(prev.ersBattery - data.ersBattery) < 1
      ) return prev
      return data
    })
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      <Canvas
        shadows
        dpr={[1, Math.min(window.devicePixelRatio, 2)]}
        camera={{ fov: 65, near: 0.1, far: 500, position: [0, 4, 12] }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        performance={{ min: 0.7 }}
      >
        <Suspense fallback={null}>
          <Scene onTelemetry={handleTelemetry} setup={setup} mode={mode} />
        </Suspense>
      </Canvas>

      <DashboardHUD telemetry={telemetry} mode={mode} setup={setup} onExit={onExit} />
    </div>
  )
}
