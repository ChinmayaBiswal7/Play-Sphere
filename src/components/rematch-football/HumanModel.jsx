import React, { useRef, useMemo } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Procedural Fallback Canvas Texture for Jersey
 */
function createJerseyCanvas(teamColorHex, secColorHex, number) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')

  // Base Jersey
  ctx.fillStyle = teamColorHex
  ctx.fillRect(0, 0, 256, 256)

  // Side accents
  ctx.fillStyle = secColorHex
  ctx.fillRect(0, 0, 36, 256)
  ctx.fillRect(220, 0, 36, 256)

  // Zipper & Hood Collar Trim
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(122, 0, 12, 100)
  ctx.fillRect(80, 80, 96, 14)

  // Number 7 on Back
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '900 72px "Orbitron", sans-serif'
  ctx.fillText(number.toString(), 128, 165)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

/**
 * Procedural Leg Tattoo Canvas Texture
 */
function createTattooCanvas() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#f5d0a9'
  ctx.fillRect(0, 0, 256, 256)

  // Star Burst & Heart Tattoo (matching Rematch Screenshot 3 & 4)
  ctx.fillStyle = '#1e1b4b'
  ctx.beginPath()
  ctx.arc(128, 90, 32, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = '#312e81'
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.moveTo(128, 20)
  ctx.lineTo(128, 160)
  ctx.moveTo(58, 90)
  ctx.lineTo(198, 90)
  ctx.stroke()

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

export function HumanModel({
  preset = 'female_striker',
  teamColor = '#ef4444',
  secColor = '#0284c7',
  number = 7,
  isGoalkeeper = false,
  velocity = new THREE.Vector3(),
  isTackling = false
}) {
  const torsoRef = useRef()
  const leftLegRef = useRef()
  const rightLegRef = useRef()
  const leftArmRef = useRef()
  const rightArmRef = useRef()
  const headGroupRef = useRef()
  const animTime = useRef(0)

  // Textures
  const jerseyTex = useMemo(() => {
    try {
      const loader = new THREE.TextureLoader()
      return loader.load('/rematch_jersey_red.png', undefined, undefined, () => {
        return createJerseyCanvas(teamColor, secColor, number)
      })
    } catch (e) {
      return createJerseyCanvas(teamColor, secColor, number)
    }
  }, [teamColor, secColor, number])

  const faceTex = useMemo(() => {
    try {
      const loader = new THREE.TextureLoader()
      return loader.load('/rematch_face_female.png')
    } catch (e) {
      return null
    }
  }, [])

  const tattooTex = useMemo(() => createTattooCanvas(), [])

  // Materials
  const skinMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xf5d0a9, roughness: 0.45 }), [])
  const faceMat = useMemo(() => {
    if (faceTex) {
      return new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.4 })
    }
    return skinMat
  }, [faceTex, skinMat])

  const hairMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 }), [])
  const jerseyMat = useMemo(() => new THREE.MeshStandardMaterial({ map: jerseyTex, roughness: 0.35 }), [jerseyTex])
  const shortsMat = useMemo(() => new THREE.MeshStandardMaterial({ color: teamColor, roughness: 0.4 }), [teamColor])
  const trimMat = useMemo(() => new THREE.MeshStandardMaterial({ color: secColor, roughness: 0.3 }), [secColor])
  const sockMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 }), [])
  const bootMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.2, metalness: 0.4 }), [])
  const gloveMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ec4899', roughness: 0.3 }), [])
  const tattooMat = useMemo(() => new THREE.MeshStandardMaterial({ map: tattooTex, roughness: 0.5 }), [tattooTex])

  // Motion animation loop
  useFrame((state, dt) => {
    const speed = Math.hypot(velocity.x, velocity.z)

    if (speed > 0.15) {
      animTime.current += speed * dt * 1.2

      // Leg strides with natural knee flex
      if (leftLegRef.current) leftLegRef.current.rotation.x = Math.sin(animTime.current) * 0.75
      if (rightLegRef.current) rightLegRef.current.rotation.x = -Math.sin(animTime.current) * 0.75

      // Arm swings with elbow bend
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = -Math.sin(animTime.current) * 0.58
        leftArmRef.current.rotation.z = 0.14
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = Math.sin(animTime.current) * 0.58
        rightArmRef.current.rotation.z = -0.14
      }

      // Athletic forward torso tilt & bob
      if (torsoRef.current) {
        torsoRef.current.rotation.x = 0.22
        torsoRef.current.position.y = 1.35 + Math.abs(Math.sin(animTime.current * 2)) * 0.07
      }
    } else {
      animTime.current = 0
      // Idle pose
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = 0.05
        leftArmRef.current.rotation.z = 0.15
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = 0.05
        rightArmRef.current.rotation.z = -0.15
      }
      if (torsoRef.current) {
        torsoRef.current.rotation.x = 0
        torsoRef.current.position.y = 1.35
      }
    }

    // Tackle dash pose
    if (isTackling) {
      if (torsoRef.current) torsoRef.current.rotation.x = 0.65
      if (leftLegRef.current) leftLegRef.current.rotation.x = -1.15
      if (rightLegRef.current) rightLegRef.current.rotation.x = -0.35
    }
  })

  return (
    <group scale={[0.95, 0.95, 0.95]}>
      
      {/* ── 1. TORSO & HOODED ATHLETIC JERSEY ── */}
      <group ref={torsoRef} position={[0, 1.35, 0]}>
        {/* Main Athletic Torso */}
        <mesh castShadow receiveShadow position={[0, 0.28, 0]}>
          <cylinderGeometry args={[0.35, 0.29, 0.78, 20]} />
          <primitive object={jerseyMat} attach="material" />
        </mesh>

        {/* Hood Collar Ring (Rematch Hooded Sleeveless Top) */}
        <mesh castShadow position={[0, 0.68, -0.06]} rotation={[0.3, 0, 0]}>
          <torusGeometry args={[0.24, 0.08, 12, 24]} />
          <primitive object={jerseyMat} attach="material" />
        </mesh>

        {/* Shoulder Caps */}
        <mesh position={[-0.38, 0.58, 0]}>
          <sphereGeometry args={[0.13, 14, 14]} />
          <primitive object={trimMat} attach="material" />
        </mesh>
        <mesh position={[0.38, 0.58, 0]}>
          <sphereGeometry args={[0.13, 14, 14]} />
          <primitive object={trimMat} attach="material" />
        </mesh>

        {/* ── 2. HEAD, FACE & PONYTAIL ── */}
        <group ref={headGroupRef} position={[0, 0.92, 0]}>
          {/* Head Sphere */}
          <mesh castShadow position={[0, 0, 0]} rotation={[0, Math.PI, 0]}>
            <sphereGeometry args={[0.23, 24, 24]} />
            <primitive object={faceMat} attach="material" />
          </mesh>

          {/* Ponytail Hair Cut (Signature Sloclap Rematch Female Character) */}
          <mesh castShadow position={[0, 0.12, -0.09]}>
            <sphereGeometry args={[0.24, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
            <primitive object={hairMat} attach="material" />
          </mesh>
          {/* Ponytail Extension */}
          <mesh castShadow position={[0, 0.2, -0.28]} rotation={[-0.45, 0, 0]}>
            <cylinderGeometry args={[0.07, 0.02, 0.38, 12]} />
            <primitive object={hairMat} attach="material" />
          </mesh>
          {/* Pink Hair Tie Band */}
          <mesh position={[0, 0.23, -0.2]}>
            <torusGeometry args={[0.08, 0.025, 8, 16]} />
            <meshBasicMaterial color="#ec4899" />
          </mesh>
        </group>

        {/* ── 3. ARMS & PINK ATHLETIC GLOVES ── */}
        {/* Left Arm */}
        <group ref={leftArmRef} position={[-0.44, 0.5, 0]}>
          {/* Upper Arm */}
          <mesh castShadow position={[0, -0.18, 0]}>
            <cylinderGeometry args={[0.08, 0.07, 0.35, 14]} />
            <primitive object={skinMat} attach="material" />
          </mesh>
          {/* Forearm */}
          <mesh castShadow position={[0, -0.46, 0]}>
            <cylinderGeometry args={[0.07, 0.06, 0.32, 14]} />
            <primitive object={skinMat} attach="material" />
          </mesh>
          {/* Pink Glove Hand */}
          <mesh castShadow position={[0, -0.66, 0]}>
            <sphereGeometry args={[0.085, 12, 12]} />
            <primitive object={gloveMat} attach="material" />
          </mesh>
        </group>

        {/* Right Arm */}
        <group ref={rightArmRef} position={[0.44, 0.5, 0]}>
          {/* Upper Arm */}
          <mesh castShadow position={[0, -0.18, 0]}>
            <cylinderGeometry args={[0.08, 0.07, 0.35, 14]} />
            <primitive object={skinMat} attach="material" />
          </mesh>
          {/* Forearm */}
          <mesh castShadow position={[0, -0.46, 0]}>
            <cylinderGeometry args={[0.07, 0.06, 0.32, 14]} />
            <primitive object={skinMat} attach="material" />
          </mesh>
          {/* Pink Glove Hand */}
          <mesh castShadow position={[0, -0.66, 0]}>
            <sphereGeometry args={[0.085, 12, 12]} />
            <primitive object={gloveMat} attach="material" />
          </mesh>
        </group>
      </group>

      {/* ── 4. ATHLETIC SHORTS & WAIST ── */}
      <mesh castShadow position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.32, 0.34, 0.34, 18]} />
        <primitive object={shortsMat} attach="material" />
      </mesh>
      {/* Side Accent Stripe */}
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.325, 0.345, 0.12, 18]} />
        <primitive object={trimMat} attach="material" />
      </mesh>

      {/* ── 5. LEGS, TATTOO, SOCKS & SOCCER CLEATS ── */}
      {/* Left Leg (With Thigh Tattoo) */}
      <group ref={leftLegRef} position={[-0.18, 0.74, 0]}>
        {/* Thigh */}
        <mesh castShadow position={[0, -0.22, 0]}>
          <cylinderGeometry args={[0.12, 0.098, 0.44, 16]} />
          <primitive object={tattooMat} attach="material" />
        </mesh>
        {/* Calf & Sock */}
        <mesh castShadow position={[0, -0.54, 0]}>
          <cylinderGeometry args={[0.098, 0.086, 0.4, 16]} />
          <primitive object={sockMat} attach="material" />
        </mesh>
        {/* Soccer Cleat Boot */}
        <group position={[0, -0.78, 0.07]}>
          <mesh castShadow>
            <boxGeometry args={[0.14, 0.12, 0.3]} />
            <primitive object={bootMat} attach="material" />
          </mesh>
          {/* Cleats Studs Sole */}
          <mesh position={[0, -0.065, 0]}>
            <boxGeometry args={[0.14, 0.02, 0.3]} />
            <meshBasicMaterial color="#0f172a" />
          </mesh>
        </group>
      </group>

      {/* Right Leg */}
      <group ref={rightLegRef} position={[0.18, 0.74, 0]}>
        {/* Thigh */}
        <mesh castShadow position={[0, -0.22, 0]}>
          <cylinderGeometry args={[0.12, 0.098, 0.44, 16]} />
          <primitive object={skinMat} attach="material" />
        </mesh>
        {/* Calf & Sock */}
        <mesh castShadow position={[0, -0.54, 0]}>
          <cylinderGeometry args={[0.098, 0.086, 0.4, 16]} />
          <primitive object={sockMat} attach="material" />
        </mesh>
        {/* Soccer Cleat Boot */}
        <group position={[0, -0.78, 0.07]}>
          <mesh castShadow>
            <boxGeometry args={[0.14, 0.12, 0.3]} />
            <primitive object={bootMat} attach="material" />
          </mesh>
          <mesh position={[0, -0.065, 0]}>
            <boxGeometry args={[0.14, 0.02, 0.3]} />
            <meshBasicMaterial color="#0f172a" />
          </mesh>
        </group>
      </group>

      {/* Goalkeeper Cyan Visor */}
      {isGoalkeeper && (
        <mesh position={[0, 2.36, 0.18]}>
          <boxGeometry args={[0.3, 0.06, 0.12]} />
          <meshBasicMaterial color="#00ffff" />
        </mesh>
      )}
    </group>
  )
}
