import React, { useRef, useEffect, useMemo } from 'react'
import { useRaycastVehicle, useBox } from '@react-three/cannon'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useControls } from '../hooks/useControls.js'
import { useEngineAudio } from '../hooks/useEngineAudio.js'
import {
  createCarbonFiberTexture,
  createCarbonFiberBumpTexture,
  createTyreDecalTexture
} from '../utils/textureGenerator.js'

// Wheel geometry component — F1 spec tire + Pirelli decal + forged alloy rim
function Wheel({ radius = 0.35, width = 0.3, isRear = false, brakeDiscMatRef, tyreDecal }) {
  return (
    <group>
      {/* Tire — slick rubber */}
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, width, 32]} />
        <meshPhysicalMaterial
          color="#0b0b0d"
          roughness={0.92}
          metalness={0.05}
          clearcoat={0.1}
          clearcoatRoughness={0.8}
        />
      </mesh>
      
      {/* Outer Sidewall Pirelli Decal */}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[width / 2 + 0.002, 0, 0]}>
        <ringGeometry args={[radius * 0.52, radius * 0.95, 32]} />
        <meshStandardMaterial
          map={tyreDecal}
          transparent
          roughness={0.7}
          metalness={0.1}
          depthWrite={false}
        />
      </mesh>
      
      {/* Inner Sidewall Pirelli Decal */}
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[-width / 2 - 0.002, 0, 0]}>
        <ringGeometry args={[radius * 0.52, radius * 0.95, 32]} />
        <meshStandardMaterial
          map={tyreDecal}
          transparent
          roughness={0.7}
          metalness={0.1}
          depthWrite={false}
        />
      </mesh>
      
      {/* Forged alloy rim */}
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[radius * 0.62, radius * 0.62, width + 0.015, 5]} />
        <meshPhysicalMaterial
          color={isRear ? '#121212' : '#1b1b1b'}
          roughness={0.22}
          metalness={0.95}
          clearcoat={0.6}
          clearcoatRoughness={0.15}
          envMapIntensity={1.5}
        />
      </mesh>
      {/* Center lock nut */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[radius * 0.18, radius * 0.18, width + 0.04, 6]} />
        <meshStandardMaterial color={isRear ? '#ffe000' : '#0088ff'} roughness={0.3} metalness={0.95} />
      </mesh>
      {/* Carbon brake disc */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[radius * 0.45, radius * 0.45, width * 0.5, 24]} />
        <meshStandardMaterial
          ref={brakeDiscMatRef}
          color="#1c1c1e"
          emissive="#000000"
          emissiveIntensity={0}
          metalness={0.7}
          roughness={0.6}
        />
      </mesh>
      {/* Caliper */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0, radius * 0.3, radius * 0.3]}>
        <boxGeometry args={[width * 0.6, radius * 0.35, radius * 0.2]} />
        <meshStandardMaterial color="#cc0000" roughness={0.3} metalness={0.7} />
      </mesh>
    </group>
  )
}

// ── LIVERY MATERIALS ──────────────────────────────────────────
const liveryMain = {
  color: '#a30015',
  roughness: 0.28,
  metalness: 0.15,
  clearcoat: 1,
  clearcoatRoughness: 0.08,
  envMapIntensity: 2.2,
}
const liveryAccent = {
  color: '#0a0a0c',
  roughness: 0.35,
  metalness: 0.3,
  clearcoat: 1,
  clearcoatRoughness: 0.1,
  envMapIntensity: 2,
}
const carbonFiber = {
  color: '#141416',
  roughness: 0.42,
  metalness: 0.55,
  clearcoat: 0.8,
  clearcoatRoughness: 0.2,
  envMapIntensity: 1.6,
}
const titaniumTrim = {
  color: '#cfd2d6',
  roughness: 0.18,
  metalness: 1,
  clearcoat: 0.4,
  envMapIntensity: 2,
}
const goldAccent = {
  color: '#e0b030',
  roughness: 0.25,
  metalness: 1,
  envMapIntensity: 1.8,
}

// F1 Car body visual — sculpted chassis
function CarBody({
  drsFlapRef,
  drsFlapMatRef,
  brakeLightMatRef,
  brakeLightRef,
  ersGlowMatRef,
  ersGlowLightRef,
  textures
}) {
  return (
    <group>
      {/* ── MONOCOQUE / MAIN TUB ── */}
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[1.55, 0.32, 3.0]} />
        <meshPhysicalMaterial {...liveryMain} />
      </mesh>
      {/* Tub taper toward nose */}
      <mesh castShadow position={[0, -0.02, 1.55]}>
        <coneGeometry args={[0.78, 1.0, 4, 1, false]} />
        <meshPhysicalMaterial {...liveryMain} />
      </mesh>

      {/* ── NOSE CONE (sculpted, tapered with racing number) ── */}
      <mesh position={[0, -0.08, 2.55]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <coneGeometry args={[0.22, 1.3, 12]} />
        <meshPhysicalMaterial
          map={textures.noseMap}
          roughness={0.28}
          metalness={0.15}
          clearcoat={1}
          clearcoatRoughness={0.08}
          envMapIntensity={2.2}
        />
      </mesh>
      {/* Nose tip cap */}
      <mesh position={[0, -0.08, 3.2]} castShadow>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshPhysicalMaterial {...goldAccent} />
      </mesh>

      {/* ── COCKPIT HALO ── */}
      <mesh position={[0, 0.42, 0.15]} rotation={[0, 0, 0]} castShadow>
        <torusGeometry args={[0.42, 0.045, 12, 24, Math.PI * 1.15]} />
        <meshPhysicalMaterial {...titaniumTrim} />
      </mesh>
      {/* Halo center pillar */}
      <mesh position={[0, 0.25, 0.85]} rotation={[0.5, 0, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.045, 0.55, 8]} />
        <meshPhysicalMaterial {...titaniumTrim} />
      </mesh>

      {/* ── COCKPIT / VISOR (tinted canopy) ── */}
      <mesh position={[0, 0.28, 0.25]} castShadow>
        <sphereGeometry args={[0.34, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial
          color="#040810" roughness={0.05} metalness={0.2}
          clearcoat={1} clearcoatRoughness={0.02}
          transmission={0.3} transparent opacity={0.95}
          envMapIntensity={2.5}
        />
      </mesh>
      {/* Driver helmet hint */}
      <mesh position={[0, 0.36, 0.15]}>
        <sphereGeometry args={[0.16, 12, 12]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.3} metalness={0.4} />
      </mesh>

      {/* ── FRONT WING (PBR Carbon) ── */}
      <group position={[0, 0, 0]}>
        {/* Main plane */}
        <mesh position={[0, -0.24, 3.35]} castShadow>
          <boxGeometry args={[1.9, 0.025, 0.55]} />
          <meshPhysicalMaterial
            map={textures.carbonMap}
            normalMap={textures.carbonBumpMap}
            normalScale={new THREE.Vector2(0.2, 0.2)}
            color="#18181a"
            roughness={0.5}
            metalness={0.8}
            envMapIntensity={1.4}
          />
        </mesh>
        {/* Secondary flap (red accent) */}
        <mesh position={[0, -0.18, 3.55]} rotation={[0.15, 0, 0]} castShadow>
          <boxGeometry args={[1.75, 0.02, 0.32]} />
          <meshPhysicalMaterial {...liveryMain} />
        </mesh>
        {/* Endplates */}
        {[-0.95, 0.95].map((x, i) => (
          <mesh key={i} position={[x, -0.1, 3.3]} castShadow>
            <boxGeometry args={[0.04, 0.35, 0.7]} />
            <meshPhysicalMaterial
              map={textures.carbonMap}
              normalMap={textures.carbonBumpMap}
              normalScale={new THREE.Vector2(0.2, 0.2)}
              color="#18181a"
              roughness={0.5}
              metalness={0.8}
            />
          </mesh>
        ))}
      </group>

      {/* ── REAR WING ASSEMBLY (PBR Carbon) ── */}
      <group position={[0, 0, -2.15]}>
        {/* Lower beam wing */}
        <mesh position={[0, 0.35, -0.1]} castShadow>
          <boxGeometry args={[1.3, 0.025, 0.25]} />
          <meshPhysicalMaterial
            map={textures.carbonMap}
            normalMap={textures.carbonBumpMap}
            normalScale={new THREE.Vector2(0.2, 0.2)}
            color="#18181a"
            roughness={0.5}
            metalness={0.8}
          />
        </mesh>
        {/* Main flap (DRS) */}
        <mesh ref={drsFlapRef} position={[0, 0.58, -0.05]} castShadow>
          <boxGeometry args={[1.45, 0.03, 0.42]} />
          <meshPhysicalMaterial ref={drsFlapMatRef} {...liveryMain} />
        </mesh>
        {/* Top flap */}
        <mesh position={[0, 0.66, -0.18]} rotation={[-0.1, 0, 0]} castShadow>
          <boxGeometry args={[1.4, 0.02, 0.28]} />
          <meshPhysicalMaterial
            map={textures.carbonMap}
            normalMap={textures.carbonBumpMap}
            normalScale={new THREE.Vector2(0.2, 0.2)}
            color="#18181a"
            roughness={0.5}
            metalness={0.8}
          />
        </mesh>
        {/* Endplates */}
        {[-0.68, 0.68].map((x, i) => (
          <mesh key={i} position={[x, 0.48, -0.1]} castShadow>
            <boxGeometry args={[0.03, 0.55, 0.5]} />
            <meshPhysicalMaterial {...liveryAccent} />
          </mesh>
        ))}
      </group>

      {/* ── SIDEPODS (sculpted, undercut with sponsor map) ── */}
      {[-0.78, 0.78].map((x, i) => (
        <group key={i}>
          <mesh position={[x, -0.02, 0.1]} castShadow receiveShadow>
            <boxGeometry args={[0.32, 0.34, 2.2]} />
            <meshPhysicalMaterial
              map={textures.sponsorMap}
              roughness={0.28}
              metalness={0.15}
              clearcoat={1}
              clearcoatRoughness={0.08}
              envMapIntensity={2.2}
            />
          </mesh>
          {/* Inlet detail (carbon) */}
          <mesh position={[x, 0.05, 1.1]} castShadow>
            <boxGeometry args={[0.28, 0.2, 0.3]} />
            <meshPhysicalMaterial
              map={textures.carbonMap}
              normalMap={textures.carbonBumpMap}
              normalScale={new THREE.Vector2(0.15, 0.15)}
              color="#18181a"
              roughness={0.5}
              metalness={0.8}
            />
          </mesh>
          {/* Sidepod undercut/taper */}
          <mesh position={[x * 1.05, -0.15, -0.6]} rotation={[0, 0, x > 0 ? -0.15 : 0.15]} castShadow>
            <boxGeometry args={[0.22, 0.2, 1.2]} />
            <meshPhysicalMaterial {...liveryAccent} />
          </mesh>
        </group>
      ))}

      {/* ── ENGINE COVER / AIRBOX ── */}
      <mesh position={[0, 0.38, -0.65]} castShadow>
        <boxGeometry args={[0.4, 0.42, 1.6]} />
        <meshPhysicalMaterial {...liveryMain} />
      </mesh>
      {/* Airbox intake */}
      <mesh position={[0, 0.62, 0.05]} castShadow>
        <boxGeometry args={[0.3, 0.15, 0.35]} />
        <meshPhysicalMaterial {...carbonFiber} />
      </mesh>
      {/* Shark fin */}
      <mesh position={[0, 0.45, -1.3]} castShadow>
        <boxGeometry args={[0.04, 0.35, 1.0]} />
        <meshPhysicalMaterial
          map={textures.carbonMap}
          normalMap={textures.carbonBumpMap}
          normalScale={new THREE.Vector2(0.2, 0.2)}
          color="#18181a"
          roughness={0.5}
          metalness={0.8}
        />
      </mesh>

      {/* ── ERS GLOW STRIP ── */}
      <mesh position={[0, 0.1, -0.3]}>
        <boxGeometry args={[1.58, 0.04, 3.2]} />
        <meshStandardMaterial
          ref={ersGlowMatRef}
          color="#0a1a14"
          emissive="#000000"
          emissiveIntensity={0}
          transparent opacity={0.85}
        />
      </mesh>
      <pointLight ref={ersGlowLightRef} position={[0, 0.1, -0.3]} color="#00ff88" intensity={0} distance={3.5} />

      {/* ── BRAKE LIGHTS ── */}
      <mesh position={[0, 0.05, -2.3]}>
        <boxGeometry args={[0.35, 0.12, 0.04]} />
        <meshStandardMaterial
          ref={brakeLightMatRef}
          color="#2a0505"
          emissive="#000000"
          emissiveIntensity={0}
        />
      </mesh>
      <pointLight ref={brakeLightRef} position={[0, 0.05, -2.3]} color="#ff2200" intensity={0} distance={2.5} />

      {/* ── FLOOR / DIFFUSER (PBR Carbon) ── */}
      <mesh position={[0, -0.2, -0.7]} castShadow>
        <boxGeometry args={[1.5, 0.04, 3.0]} />
        <meshPhysicalMaterial
          map={textures.carbonMap}
          normalMap={textures.carbonBumpMap}
          normalScale={new THREE.Vector2(0.2, 0.2)}
          color="#0d0d0f"
          roughness={0.62}
          metalness={0.55}
          envMapIntensity={1.2}
        />
      </mesh>
      {/* Diffuser fins */}
      {[-0.5, -0.2, 0.1, 0.4].map((x, i) => (
        <mesh key={i} position={[x, -0.22, -2.0]} castShadow>
          <boxGeometry args={[0.04, 0.12, 0.7]} />
          <meshPhysicalMaterial
            map={textures.carbonMap}
            normalMap={textures.carbonBumpMap}
            normalScale={new THREE.Vector2(0.2, 0.2)}
            color="#18181a"
            roughness={0.5}
            metalness={0.8}
          />
        </mesh>
      ))}

      {/* Number plate */}
      <mesh position={[0, 0.34, -0.05]} rotation={[0.3, 0, 0]}>
        <circleGeometry args={[0.16, 16]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </mesh>
    </group>
  )
}

// Tire smoke particle system
function TireFX({ activeRef, position }) {
  const count = 24
  const meshRef = useRef()
  const particles = useRef(
    Array.from({ length: count }).map(() => ({
      life: 0,
      x: (Math.random() - 0.5) * 1.6,
      y: 0,
      z: (Math.random() - 0.5) * 0.4,
      vy: 0.4 + Math.random() * 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      scale: 0,
    }))
  )
  const dummy = useRef(new THREE.Object3D())

  useFrame((_, delta) => {
    if (!meshRef.current) return
    const active = activeRef.current
    particles.current.forEach((p, i) => {
      if (active && p.life <= 0 && Math.random() > 0.7) {
        p.life = 1
        p.x = (Math.random() - 0.5) * 1.6
        p.y = 0
        p.z = (Math.random() - 0.5) * 0.4
        p.scale = 0.1
      }
      if (p.life > 0) {
        p.life -= delta * 0.6
        p.y += p.vy * delta
        p.x += p.vx * delta
        p.scale = Math.min(0.5, p.scale + delta * 0.6)
      }
      dummy.current.position.set(p.x, p.y, p.z)
      dummy.current.scale.setScalar(p.life > 0 ? p.scale : 0)
      dummy.current.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.current.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <group position={position}>
      <instancedMesh ref={meshRef} args={[null, null, count]}>
        <sphereGeometry args={[0.3, 6, 6]} />
        <meshBasicMaterial color="#888888" transparent opacity={0.25} depthWrite={false} />
      </instancedMesh>
    </group>
  )
}

const GEAR_RATIOS = [0, 3.5, 2.5, 1.85, 1.45, 1.18, 1.0, 0.86, 0.75]
const MAX_TORQUE = 2800 // High torque for fast acceleration
const ERS_BOOST = 1200
const DOWNFORCE_COEFF = 0.005

export function F1Car({ onTelemetry, setup = {}, mode = 'Grand Prix', wetness = 0 }) {
  const controls = useControls()
  const { start: startAudio, setRPM } = useEngineAudio()

  const visualRef = useRef()
  const visualWheelRefs = [useRef(), useRef(), useRef(), useRef()]
  const simPos = useRef(new THREE.Vector3(-150, 0.55, -155))
  const simVel = useRef(new THREE.Vector3(0, 0, 0))
  const simYaw = useRef(Math.PI * 0.45)
  const wheelSpin = useRef(0)

  const drsFlapRef = useRef()
  const drsFlapMatRef = useRef()
  const brakeLightMatRef = useRef()
  const brakeLightRef = useRef()
  const ersGlowMatRef = useRef()
  const ersGlowLightRef = useRef()
  const brakeDiscMatsRef = useRef([])

  // State refs (non-reactive for physics update loop performance)
  const ersBattery = useRef(100)
  const gear = useRef(1)
  const rpm = useRef(1000)
  const speed = useRef(0)
  const drsActive = useRef(false)
  const tireFXActive = useRef(false)
  const tireWear = useRef(0)
  const tireTemp = useRef(78)
  const damage = useRef(0)
  const trackRubber = useRef(mode === 'Time Trial' ? 18 : 6)
  const lap = useRef(1)
  const lastLineSide = useRef(null)
  const lapStart = useRef(performance.now())
  const lapTime = useRef(0)
  const bestLap = useRef(null)

  // Physics input interpolation refs
  const smoothSteer = useRef(0)
  const smoothEngine = useRef(0)

  const setupModel = useMemo(() => {
    const frontWing = setup.frontWing ?? 32
    const rearWing = setup.rearWing ?? 36
    const suspension = setup.suspension ?? 54
    const tyrePressure = setup.tyrePressure ?? 24
    const brakeBias = setup.brakeBias ?? 56
    const rideHeight = setup.rideHeight ?? 31
    const aero = 0.78 + (frontWing + rearWing) / 100
    const drag = 0.88 + (frontWing + rearWing) / 130
    const pressurePenalty = Math.abs(tyrePressure - 23) * 0.012
    const grip = Math.max(0.62, 1.05 - pressurePenalty - wetness * 0.34)
    const suspensionSharpness = 0.75 + suspension / 120
    const plankLoss = rideHeight < 24 ? (24 - rideHeight) * 0.018 : 0
    const ersDrain = setup.ersMode === 'Qualifying' ? 16 : setup.ersMode === 'Harvest' ? 7 : 10
    const ersRegen = setup.ersMode === 'Harvest' ? 9 : 4
    return { aero, drag, grip: grip - plankLoss, suspensionSharpness, brakeBias, ersDrain, ersRegen }
  }, [setup, wetness])

  // Generate procedural textures once on mount
  const textures = useMemo(() => {
    const carbonMap = createCarbonFiberTexture()
    const carbonBumpMap = createCarbonFiberBumpTexture()

    // Soft red tires and Medium yellow tires decals
    const frontTyreDecal = createTyreDecalTexture('#ef233c', 'P-ZERO')
    const rearTyreDecal = createTyreDecalTexture('#ffe000', 'P-ZERO')

    // Livery sidepod sponsor texture
    const sCanvas = document.createElement('canvas')
    sCanvas.width = 512
    sCanvas.height = 128
    const sCtx = sCanvas.getContext('2d')
    sCtx.fillStyle = '#a30015'
    sCtx.fillRect(0, 0, 512, 128)
    sCtx.fillStyle = '#ffffff'
    sCtx.fillRect(0, 10, 512, 8)
    sCtx.fillRect(0, 110, 512, 8)
    sCtx.fillStyle = '#ffffff'
    sCtx.font = "bold 44px 'Courier New', monospace"
    sCtx.textAlign = 'center'
    sCtx.textBaseline = 'middle'
    sCtx.fillText('SCUDERIA F1', 256, 64)
    const sponsorMap = new THREE.CanvasTexture(sCanvas)

    // Nose cone racing numbers
    const nCanvas = document.createElement('canvas')
    nCanvas.width = 256
    nCanvas.height = 512
    const nCtx = nCanvas.getContext('2d')
    nCtx.fillStyle = '#a30015'
    nCtx.fillRect(0, 0, 256, 512)
    nCtx.fillStyle = '#ffffff'
    nCtx.fillRect(116, 0, 24, 512)
    nCtx.fillStyle = '#ffffff'
    nCtx.beginPath()
    nCtx.arc(128, 380, 50, 0, Math.PI * 2)
    nCtx.fill()
    nCtx.fillStyle = '#0a0a0c'
    nCtx.font = "bold 64px 'Courier New', monospace"
    nCtx.textAlign = 'center'
    nCtx.textBaseline = 'middle'
    nCtx.fillText('5', 128, 380)
    const noseMap = new THREE.CanvasTexture(nCanvas)

    return { carbonMap, carbonBumpMap, frontTyreDecal, rearTyreDecal, sponsorMap, noseMap }
  }, [])

  // Chassis rigid body
  const [chassisRef, chassisApi] = useBox(() => ({
    mass: 740,
    position: [-150, 0.5, -155], // Start down the straight
    rotation: [0, Math.PI * 0.45, 0],
    args: [1.6, 0.6, 4.4],
    angularDamping: 0.4,
    linearDamping: 0.05,
  }))

  // Wheel setup
  const wheelInfo = {
    radius: 0.35,
    directionLocal: [0, -1, 0],
    axleLocal: [-1, 0, 0],
    suspensionStiffness: 40 + (setup.suspension ?? 54) * 0.42,
    suspensionRestLength: 0.4,
    frictionSlip: 2.4 * setupModel.grip,
    dampingRelaxation: 2.3,
    dampingCompression: 4.5,
    maxSuspensionForce: 100000,
    rollInfluence: 0.05,
    maxSuspensionTravel: 0.25,
    customSlidingRotationalSpeed: -30,
    useCustomSlidingRotationalSpeed: true,
  }

  const wheels = [
    { ...wheelInfo, chassisConnectionPointLocal: [-0.85, -0.15, 1.6],  isFrontWheel: true },
    { ...wheelInfo, chassisConnectionPointLocal: [0.85,  -0.15, 1.6],  isFrontWheel: true },
    { ...wheelInfo, chassisConnectionPointLocal: [-0.82, -0.15, -1.55], isFrontWheel: false },
    { ...wheelInfo, chassisConnectionPointLocal: [0.82,  -0.15, -1.55], isFrontWheel: false },
  ]

  const wheelRefs = [useRef(), useRef(), useRef(), useRef()]

  const [vehicle, vehicleApi] = useRaycastVehicle(() => ({
    chassisBody: chassisRef,
    wheels: wheelRefs,
    wheelInfos: wheels,
    indexForwardAxis: 2,
    indexRightAxis: 0,
    indexUpAxis: 1,
  }))

  const { camera } = useThree()
  const camPos = useRef(new THREE.Vector3(-150, 4, -145))

  // Camera mode ref: 0: Chase, 1: Cockpit, 2: T-Cam, 3: Trackside
  const cameraMode = useRef(0)

  // Camera change key listener
  useEffect(() => {
    const handleCameraChange = (e) => {
      if (e.code === 'KeyC') {
        cameraMode.current = (cameraMode.current + 1) % 4
      }
    }
    window.addEventListener('keydown', handleCameraChange)
    return () => window.removeEventListener('keydown', handleCameraChange)
  }, [])

  // Physics subscriptions
  const velocityRef = useRef([0, 0, 0])
  const positionRef = useRef([0, 0, 0])
  const quaternionRef = useRef([0, 0, 0, 1])

  useEffect(() => {
    const unsubVel = chassisApi.velocity.subscribe((v) => (velocityRef.current = v))
    const unsubPos = chassisApi.position.subscribe((p) => (positionRef.current = p))
    const unsubRot = chassisApi.quaternion.subscribe((q) => (quaternionRef.current = q))
    return () => {
      unsubVel()
      unsubPos()
      unsubRot()
    }
  }, [chassisApi])

  // Start audio on gesture
  useEffect(() => {
    const handleInteract = () => { startAudio(); window.removeEventListener('keydown', handleInteract) }
    window.addEventListener('keydown', handleInteract)
    return () => window.removeEventListener('keydown', handleInteract)
  }, [startAudio])

  // Reset controls
  useEffect(() => {
    const handleReset = (e) => {
      if (e.code === 'KeyR') {
        simPos.current.set(-150, 0.55, -155)
        simVel.current.set(0, 0, 0)
        simYaw.current = Math.PI * 0.45
        if (visualRef.current) {
          visualRef.current.position.copy(simPos.current)
          visualRef.current.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), simYaw.current)
        }
        chassisApi.position.set(-150, 0.5, -155)
        chassisApi.velocity.set(0, 0, 0)
        chassisApi.angularVelocity.set(0, 0, 0)
        chassisApi.quaternion.set(0, Math.sin(Math.PI * 0.225), 0, Math.cos(Math.PI * 0.225))
        ersBattery.current = 100
      }
    }
    window.addEventListener('keydown', handleReset)
    return () => window.removeEventListener('keydown', handleReset)
  }, [chassisApi])

  useFrame((_, delta) => {
    const k = controls.current
    const dt = Math.min(delta, 0.1)

    // Calculate heading vector from the deterministic player simulation.
    const simQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), simYaw.current)
    quaternionRef.current = [simQuat.x, simQuat.y, simQuat.z, simQuat.w]
    positionRef.current = [simPos.current.x, simPos.current.y, simPos.current.z]
    velocityRef.current = [simVel.current.x, simVel.current.y, simVel.current.z]
    const carQuat = simQuat
    const forwardVec = new THREE.Vector3(0, 0, 1).applyQuaternion(carQuat)
    const upVec = new THREE.Vector3(0, 1, 0).applyQuaternion(carQuat)

    // Calculate current speed
    const speedMs = Math.sqrt(velocityRef.current[0] ** 2 + velocityRef.current[2] ** 2)
    const spd = speedMs * 3.6
    speed.current = spd
    const isHighSpeed = spd > 180
    const lateralLoad = Math.abs(smoothSteer.current) * Math.min(1.8, speedMs / 45)
    const brakeLoad = k.brake ? 1 : 0
    const wetGripLoss = wetness * (0.22 + Math.min(0.3, spd / 900))

    tireTemp.current += ((72 + speedMs * 0.34 + lateralLoad * 18 + brakeLoad * 12 - wetness * 18) - tireTemp.current) * 0.7 * dt
    tireWear.current = Math.min(100, tireWear.current + (0.006 * speedMs + lateralLoad * 0.06 + brakeLoad * 0.035) * dt * (1 + wetness * 0.45))
    trackRubber.current = Math.min(100, trackRubber.current + speedMs * dt * 0.003)

    const tyreWindow = 1 - Math.min(0.36, Math.abs(tireTemp.current - 94) / 130)
    const wearGrip = 1 - tireWear.current * 0.0042
    const rubberGrip = 1 + trackRubber.current * 0.0015
    const effectiveGrip = Math.max(0.42, setupModel.grip * tyreWindow * wearGrip * rubberGrip - wetGripLoss - damage.current * 0.002)

    // DRS Flap triggering
    if (isHighSpeed && !k.brake && k.forward) {
      drsActive.current = true
    }
    if (k.brake || spd < 100) {
      drsActive.current = false
    }

    // ERS Management
    let ersBoosting = false
    if (k.ers && k.forward && ersBattery.current > 0) {
      ersBoosting = true
      ersBattery.current = Math.max(0, ersBattery.current - setupModel.ersDrain * dt)
    } else if (!k.ers || !k.forward) {
      if (k.brake) {
        ersBattery.current = Math.min(100, ersBattery.current + 18 * dt)
      } else {
        ersBattery.current = Math.min(100, ersBattery.current + setupModel.ersRegen * dt)
      }
    }

    // Downforce and Aerodynamics
    const downforce = speedMs * speedMs * DOWNFORCE_COEFF * setupModel.aero * (drsActive.current ? 0.65 : 1.0)
    const downforceForce = upVec.clone().multiplyScalar(-downforce * 320)
    chassisApi.applyForce([downforceForce.x, downforceForce.y, downforceForce.z], [0, 0, 0])

    const dragForce = forwardVec.clone().multiplyScalar(-speedMs * speedMs * setupModel.drag * (drsActive.current ? 0.08 : 0.13))
    chassisApi.applyForce([dragForce.x, 0, dragForce.z], [0, 0, 0])

    // Gear Ratio Simulation
    const gearThresholds = [0, 32, 68, 110, 150, 192, 230, 265, 310]
    let g = 1
    for (let i = 1; i < gearThresholds.length; i++) {
      if (spd > gearThresholds[i]) g = i
    }
    gear.current = Math.min(8, g)

    // RPM Rev bar Simulation
    const gearPos = (spd - (gearThresholds[gear.current - 1] || 0)) /
      ((gearThresholds[gear.current] || 310) - (gearThresholds[gear.current - 1] || 0))
    const targetRPM = 3000 + Math.max(0, Math.min(1, gearPos)) * 15000
    rpm.current += (targetRPM - rpm.current) * 8 * dt
    setRPM(rpm.current)

    // Steering input smoothing
    const targetSteer = (k.left ? 0.42 : k.right ? -0.42 : 0) * setupModel.suspensionSharpness * effectiveGrip
    smoothSteer.current += (targetSteer - smoothSteer.current) * 12 * dt

    // Engine Force calculation with ERS + DRS influence
    const baseTorque = MAX_TORQUE * (1 / GEAR_RATIOS[gear.current])
    let targetEngine = 0
    if (k.forward) {
      targetEngine = baseTorque * effectiveGrip
      if (drsActive.current) targetEngine *= 1.15
      if (ersBoosting) targetEngine += ERS_BOOST
    } else if (k.backward) {
      targetEngine = -baseTorque * 0.6
    }
    smoothEngine.current += (targetEngine - smoothEngine.current) * 8 * dt

    // Apply vehicle physics driving forces
    vehicleApi.applyEngineForce(smoothEngine.current, 2)
    vehicleApi.applyEngineForce(smoothEngine.current, 3)

    vehicleApi.setSteeringValue(smoothSteer.current, 0)
    vehicleApi.setSteeringValue(smoothSteer.current, 1)

    // Braking
    const brakeForce = k.brake ? 380 * effectiveGrip : 0
    const frontBrake = brakeForce * (setupModel.brakeBias / 56)
    const rearBrake = brakeForce * ((100 - setupModel.brakeBias) / 44)
    vehicleApi.setBrake(frontBrake, 0)
    vehicleApi.setBrake(frontBrake, 1)
    vehicleApi.setBrake(k.brake ? rearBrake : 8, 2)
    vehicleApi.setBrake(k.brake ? rearBrake : 8, 3)

    // Deterministic drive assist: Cannon's raycast vehicle can lose traction on thin
    // procedural track meshes in the browser, so the chassis receives the final motion.
    const currentForwardSpeed = velocityRef.current[0] * forwardVec.x + velocityRef.current[2] * forwardVec.z
    const throttleInput = k.forward ? 1 : k.backward ? -0.55 : 0
    const topSpeedMs = (mode === 'Storm Race' ? 72 : 88) * (drsActive.current ? 1.06 : 1)
    const ersKick = ersBoosting ? 7.5 : 0
    const accel = throttleInput > 0
      ? (24 + ersKick) * effectiveGrip * Math.max(0.18, 1 - Math.max(0, currentForwardSpeed) / topSpeedMs)
      : throttleInput < 0
        ? -15 * effectiveGrip
        : 0
    const brakeAccel = k.brake ? Math.min(38, Math.abs(currentForwardSpeed) * 2.7 + 12) * Math.sign(currentForwardSpeed || 1) : 0
    const rollingDrag = currentForwardSpeed * (k.forward ? 0.018 : 0.045)
    const nextForwardSpeed = THREE.MathUtils.clamp(
      currentForwardSpeed + (accel - brakeAccel - rollingDrag) * dt,
      -18,
      topSpeedMs
    )
    const lateralDamping = 0.86 - Math.min(0.22, effectiveGrip * 0.08)
    const rightVec = new THREE.Vector3(1, 0, 0).applyQuaternion(carQuat)
    const lateralSpeed = velocityRef.current[0] * rightVec.x + velocityRef.current[2] * rightVec.z
    const correctedLateral = lateralSpeed * lateralDamping
    const assistedVelocity = forwardVec.clone().multiplyScalar(nextForwardSpeed)
      .add(rightVec.clone().multiplyScalar(correctedLateral))
    simVel.current.copy(assistedVelocity)

    const steerAuthority = Math.min(1, Math.abs(nextForwardSpeed) / 18) * Math.sign(nextForwardSpeed || 1)
    const yawRate = -smoothSteer.current * steerAuthority * 2.15
    simYaw.current += yawRate * dt
    simPos.current.addScaledVector(assistedVelocity, dt)
    simPos.current.y = 0.55
    positionRef.current = [simPos.current.x, simPos.current.y, simPos.current.z]
    quaternionRef.current = [
      0,
      Math.sin(simYaw.current / 2),
      0,
      Math.cos(simYaw.current / 2),
    ]
    velocityRef.current = [simVel.current.x, simVel.current.y, simVel.current.z]

    // Sync physical chassis body to deterministic simulation
    chassisApi.position.set(simPos.current.x, simPos.current.y, simPos.current.z)
    chassisApi.velocity.set(simVel.current.x, simVel.current.y, simVel.current.z)
    chassisApi.quaternion.set(
      0,
      Math.sin(simYaw.current / 2),
      0,
      Math.cos(simYaw.current / 2)
    )

    if (visualRef.current) {
      visualRef.current.position.copy(simPos.current)
      visualRef.current.quaternion.set(...quaternionRef.current)
    }
    wheelSpin.current -= nextForwardSpeed * dt * 2.8
    visualWheelRefs.forEach((ref, i) => {
      if (!ref.current) return
      const x = i % 2 === 0 ? -0.85 : 0.85
      const z = i < 2 ? 1.6 : -1.55
      ref.current.position.set(x, -0.15, z)
      ref.current.rotation.set(wheelSpin.current, i < 2 ? smoothSteer.current : 0, Math.PI / 2)
    })

    const carPos = new THREE.Vector3(...positionRef.current)
    const offCircuit = Math.abs(carPos.x) > 72 || carPos.z > 58 || carPos.z < -188
    if (offCircuit && spd > 45) damage.current = Math.min(100, damage.current + dt * spd * 0.018)

    const lineSide = carPos.z > 35 && Math.abs(carPos.x) < 10
    if (lastLineSide.current === false && lineSide && spd > 35) {
      const now = performance.now()
      const completed = (now - lapStart.current) / 1000
      if (completed > 12) {
        bestLap.current = bestLap.current ? Math.min(bestLap.current, completed) : completed
        lap.current += 1
        tireWear.current = mode === 'Time Trial' ? tireWear.current * 0.92 : tireWear.current
      }
      lapStart.current = now
    }
    lastLineSide.current = lineSide
    lapTime.current = (performance.now() - lapStart.current) / 1000

    // Camera follow modes
    const speedFactor = Math.min(1, spd / 280)

    if (cameraMode.current === 0) {
      // 1. CHASE CAMERA (Default)
      const followDist = 9.5 - speedFactor * 2.2
      const followHeight = 3.3 - speedFactor * 0.5
      const cameraOffset = forwardVec.clone().multiplyScalar(-followDist).add(upVec.clone().multiplyScalar(followHeight))
      const targetCameraPos = carPos.clone().add(cameraOffset)

      camPos.current.lerp(targetCameraPos, 7 * dt)
      camera.position.copy(camPos.current)

      const lookTarget = carPos.clone().add(forwardVec.clone().multiplyScalar(4.0))
      camera.lookAt(lookTarget)
    } else if (cameraMode.current === 1) {
      // 2. COCKPIT CAMERA (Driver's eye view)
      const cameraOffset = forwardVec.clone().multiplyScalar(0.15).add(upVec.clone().multiplyScalar(0.42))
      const targetCameraPos = carPos.clone().add(cameraOffset)

      camera.position.copy(targetCameraPos)

      const lookTarget = carPos.clone().add(forwardVec.clone().multiplyScalar(10.0)).add(upVec.clone().multiplyScalar(0.3))
      camera.lookAt(lookTarget)
    } else if (cameraMode.current === 2) {
      // 3. T-CAM (Airbox camera)
      const cameraOffset = forwardVec.clone().multiplyScalar(-0.65).add(upVec.clone().multiplyScalar(0.72))
      const targetCameraPos = carPos.clone().add(cameraOffset)

      camera.position.copy(targetCameraPos)

      const lookTarget = carPos.clone().add(forwardVec.clone().multiplyScalar(10.0)).add(upVec.clone().multiplyScalar(0.2))
      camera.lookAt(lookTarget)
    } else if (cameraMode.current === 3) {
      // 4. TV TRACKSIDE CAMERA
      const tvTowers = [
        new THREE.Vector3(-120, 8, -100),
        new THREE.Vector3(0, 10, -50),
        new THREE.Vector3(120, 8, -130),
        new THREE.Vector3(0, 12, 50)
      ]
      let closestTower = tvTowers[0]
      let minDist = Infinity
      tvTowers.forEach(tower => {
        const d = tower.distanceTo(carPos)
        if (d < minDist) {
          minDist = d
          closestTower = tower
        }
      })

      camPos.current.lerp(closestTower, 4 * dt)
      camera.position.copy(camPos.current)
      camera.lookAt(carPos)
    }

    // High speed camera shaking
    if (speedFactor > 0.4 && cameraMode.current !== 3) {
      const shakeAmount = (speedFactor - 0.4) * 0.05 * (ersBoosting ? 1.4 : 1.0)
      camera.position.x += (Math.random() - 0.5) * shakeAmount
      camera.position.y += (Math.random() - 0.5) * shakeAmount
      camera.position.z += (Math.random() - 0.5) * shakeAmount
    }

    const targetFov = 65 + speedFactor * 16 + (ersBoosting ? 6 : 0)
    camera.fov += (targetFov - camera.fov) * 6 * dt
    camera.updateProjectionMatrix()

    // Trigger UI telemetry dashboard callback
    if (onTelemetry) {
      onTelemetry({
        speed: Math.round(spd),
        gear: gear.current,
        rpm: Math.round(rpm.current),
        ersBattery: Math.round(ersBattery.current),
        ersBoosting,
        drs: drsActive.current,
        braking: k.brake,
        cameraMode: cameraMode.current,
        tireWear: Math.round(tireWear.current),
        tireTemp: Math.round(tireTemp.current),
        trackGrip: Math.round(effectiveGrip * 100),
        trackRubber: Math.round(trackRubber.current),
        damage: Math.round(damage.current),
        lap: lap.current,
        lapTime: lapTime.current,
        bestLap: bestLap.current,
        wetness: Math.round(wetness * 100),
      })
    }

    // ── DIRECT REF-BASED VISUAL ANIMATIONS (ZERO RE-RENDERS) ──
    if (drsFlapRef.current) {
      const targetRot = drsActive.current ? -0.42 : 0
      drsFlapRef.current.rotation.x += (targetRot - drsFlapRef.current.rotation.x) * 12 * dt
    }
    if (drsFlapMatRef.current) {
      if (drsActive.current) {
        drsFlapMatRef.current.color.set(liveryAccent.color)
        drsFlapMatRef.current.emissive.set('#00ff99')
        drsFlapMatRef.current.emissiveIntensity = 0.7
      } else {
        drsFlapMatRef.current.color.set(liveryMain.color)
        drsFlapMatRef.current.emissive.set('#000000')
        drsFlapMatRef.current.emissiveIntensity = 0
      }
    }

    if (brakeLightMatRef.current) {
      brakeLightMatRef.current.color.set(k.brake ? '#ff2200' : '#2a0505')
      brakeLightMatRef.current.emissive.set(k.brake ? '#ff2200' : '#000000')
      brakeLightMatRef.current.emissiveIntensity = k.brake ? 3.0 : 0
    }
    if (brakeLightRef.current) {
      brakeLightRef.current.intensity += ((k.brake ? 4.0 : 0.0) - brakeLightRef.current.intensity) * 15 * dt
    }

    if (ersGlowMatRef.current) {
      ersGlowMatRef.current.color.set(ersBoosting ? '#00ff88' : '#0a1a14')
      ersGlowMatRef.current.emissive.set(ersBoosting ? '#00ff88' : '#000000')
      ersGlowMatRef.current.emissiveIntensity = ersBoosting ? 2.0 : 0
    }
    if (ersGlowLightRef.current) {
      ersGlowLightRef.current.intensity += ((ersBoosting ? 3.5 : 0.0) - ersGlowLightRef.current.intensity) * 15 * dt
    }

    // Glowing Wheel Brake Discs
    brakeDiscMatsRef.current.forEach(mat => {
      if (mat) {
        mat.color.set(k.brake ? '#ff5500' : '#1a1a1a')
        mat.emissive.set(k.brake ? '#ff3300' : '#000000')
        mat.emissiveIntensity = k.brake ? 2.2 : 0
      }
    })

    // Particle active state
    tireFXActive.current = k.brake && spd > 60
  })

  return (
    <group ref={visualRef}>
      {/* Chassis Body Visuals */}
      <group>
        <CarBody
          drsFlapRef={drsFlapRef}
          drsFlapMatRef={drsFlapMatRef}
          brakeLightMatRef={brakeLightMatRef}
          brakeLightRef={brakeLightRef}
          ersGlowMatRef={ersGlowMatRef}
          ersGlowLightRef={ersGlowLightRef}
          textures={textures}
        />
      </group>

      {/* Wheels Visuals */}
      {visualWheelRefs.map((ref, i) => (
        <group key={i} ref={ref} position={[i % 2 === 0 ? -0.85 : 0.85, -0.15, i < 2 ? 1.6 : -1.55]}>
          <Wheel
            radius={0.35}
            width={i < 2 ? 0.28 : 0.38}
            isRear={i >= 2}
            brakeDiscMatRef={el => { brakeDiscMatsRef.current[i] = el }}
            tyreDecal={i < 2 ? textures.frontTyreDecal : textures.rearTyreDecal}
          />
        </group>
      ))}

      {/* Tire Smoke FX under braking */}
      <TireFX activeRef={tireFXActive} position={[0, -0.2, -1.8]} />
    </group>
  )
}
