import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Creates canvas-based textures for Jersey, Tattoo, Shorts, and Face.
 */
function createJerseyCanvas(teamColorHex, secColorHex, preset, number) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')

  // Base Jersey Fill
  ctx.fillStyle = teamColorHex
  ctx.fillRect(0, 0, 256, 256)

  // Stylish Athletic Accents / Sleeveless Hoodie Trims (matching Rematch screenshots)
  ctx.fillStyle = secColorHex
  ctx.fillRect(0, 0, 40, 256)
  ctx.fillRect(216, 0, 40, 256)

  // White Zipper & Hood Collar Trim
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(122, 0, 12, 90)
  ctx.fillRect(90, 70, 76, 12)

  // Front & Back Player Number
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '900 64px "Orbitron", sans-serif'
  ctx.fillText(number.toString(), 128, 160)

  return new THREE.CanvasTexture(canvas)
}

function createLegTattooCanvas() {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#ffdbac'
  ctx.fillRect(0, 0, 128, 128)

  // Draw Heart / Star Tattoo (matching Rematch Screenshot 3 & 4)
  ctx.fillStyle = '#1e1b4b'
  ctx.beginPath()
  ctx.arc(64, 50, 18, 0, Math.PI * 2)
  ctx.fill()
  
  // Star accent lines
  ctx.strokeStyle = '#312e81'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(64, 15)
  ctx.lineTo(64, 85)
  ctx.moveTo(29, 50)
  ctx.lineTo(99, 50)
  ctx.stroke()

  return new THREE.CanvasTexture(canvas)
}

export function HumanModel({
  preset = 'female_striker',
  teamColor = '#ef4444',
  secColor = '#1e293b',
  number = 10,
  isGoalkeeper = false,
  velocity = new THREE.Vector3(),
  isTackling = false
}) {
  const torsoRef = useRef()
  const leftLegRef = useRef()
  const rightLegRef = useRef()
  const leftArmRef = useRef()
  const rightArmRef = useRef()
  const headRef = useRef()
  const animTime = useRef(0)

  // Colors & Textures
  const jerseyTex = useMemo(
    () => createJerseyCanvas(teamColor, secColor, preset, number),
    [teamColor, secColor, preset, number]
  )
  const tattooTex = useMemo(() => createLegTattooCanvas(), [])

  // Materials
  const skinMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xf5d0a9, roughness: 0.5 }), [])
  const hairMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.8 }), [])
  const hoodieMat = useMemo(() => new THREE.MeshStandardMaterial({ map: jerseyTex, roughness: 0.35 }), [jerseyTex])
  const shortsMat = useMemo(() => new THREE.MeshStandardMaterial({ color: teamColor, roughness: 0.4 }), [teamColor])
  const trimMat = useMemo(() => new THREE.MeshStandardMaterial({ color: secColor, roughness: 0.3 }), [secColor])
  const sockMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 }), [])
  const bootMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.2, metalness: 0.3 }), [])
  const gloveMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ec4899', roughness: 0.4 }), [])
  const tattooLegMat = useMemo(() => new THREE.MeshStandardMaterial({ map: tattooTex, roughness: 0.5 }), [tattooTex])

  // Limb swinging animation update loop
  useFrame((state, dt) => {
    const speed = Math.hypot(velocity.x, velocity.z)

    if (speed > 0.2) {
      animTime.current += speed * dt * 1.15

      // Leg strides with natural knee flex
      if (leftLegRef.current) leftLegRef.current.rotation.x = Math.sin(animTime.current) * 0.72
      if (rightLegRef.current) rightLegRef.current.rotation.x = -Math.sin(animTime.current) * 0.72

      // Arm swings with elbow bend
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = -Math.sin(animTime.current) * 0.55
        leftArmRef.current.rotation.z = 0.12
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = Math.sin(animTime.current) * 0.55
        rightArmRef.current.rotation.z = -0.12
      }

      // Athletic forward torso tilt
      if (torsoRef.current) {
        torsoRef.current.rotation.x = 0.18
        torsoRef.current.position.y = 1.35 + Math.abs(Math.sin(animTime.current * 2)) * 0.06
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

    // Tackle dash animation
    if (isTackling) {
      if (torsoRef.current) torsoRef.current.rotation.x = 0.6
      if (leftLegRef.current) leftLegRef.current.rotation.x = -1.1
      if (rightLegRef.current) rightLegRef.current.rotation.x = -0.3
    }
  })

  return (
    <group scale={[0.95, 0.95, 0.95]}>
      {/* ── 1. TORSO & HOODED ATHLETIC JERSEY ── */}
      <group ref={torsoRef} position={[0, 1.35, 0]}>
        {/* Main Athletic Torso */}
        <mesh castShadow receiveShadow position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.34, 0.28, 0.75, 16]} />
          <primitive object={hoodieMat} attach="material" />
        </mesh>

        {/* Hood Collar Detail (Rematch Hoodie aesthetic) */}
        <mesh castShadow position={[0, 0.62, -0.05]} rotation={[0.3, 0, 0]}>
          <torusGeometry args={[0.22, 0.08, 12, 24]} />
          <primitive object={hoodieMat} attach="material" />
        </mesh>

        {/* Shoulder Caps / Sleeve Trims */}
        <mesh position={[-0.36, 0.52, 0]}>
          <sphereGeometry args={[0.13, 12, 12]} />
          <primitive object={trimMat} attach="material" />
        </mesh>
        <mesh position={[0.36, 0.52, 0]}>
          <sphereGeometry args={[0.13, 12, 12]} />
          <primitive object={trimMat} attach="material" />
        </mesh>

        {/* ── 2. HEAD, FACE & PONYTAIL ── */}
        <group ref={headRef} position={[0, 0.88, 0]}>
          {/* Head sphere */}
          <mesh castShadow position={[0, 0, 0]}>
            <sphereGeometry args={[0.22, 20, 20]} />
            <primitive object={skinMat} attach="material" />
          </mesh>

          {/* Eyes & Eyebrows */}
          <mesh position={[-0.07, 0.02, 0.2]}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshBasicMaterial color="#0f172a" />
          </mesh>
          <mesh position={[0.07, 0.02, 0.2]}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshBasicMaterial color="#0f172a" />
          </mesh>

          {/* Ponytail Hairstyle (Rematch Striker Signature) */}
          <mesh castShadow position={[0, 0.12, -0.08]}>
            <sphereGeometry args={[0.23, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
            <primitive object={hairMat} attach="material" />
          </mesh>
          {/* Ponytail extension */}
          <mesh castShadow position={[0, 0.18, -0.26]} rotation={[-0.4, 0, 0]}>
            <cylinderGeometry args={[0.07, 0.02, 0.35, 12]} />
            <primitive object={hairMat} attach="material" />
          </mesh>
          {/* Hair Tie Band */}
          <mesh position={[0, 0.22, -0.19]}>
            <torusGeometry args={[0.08, 0.025, 8, 16]} />
            <meshBasicMaterial color="#ec4899" />
          </mesh>
        </group>

        {/* ── 3. ARMS & GLOVES ── */}
        {/* Left Arm */}
        <group ref={leftArmRef} position={[-0.42, 0.45, 0]}>
          {/* Upper Arm / Shoulder */}
          <mesh castShadow position={[0, -0.18, 0]}>
            <cylinderGeometry args={[0.08, 0.07, 0.35, 12]} />
            <primitive object={skinMat} attach="material" />
          </mesh>
          {/* Forearm & Wrist Wrap */}
          <mesh castShadow position={[0, -0.45, 0]}>
            <cylinderGeometry args={[0.068, 0.06, 0.32, 12]} />
            <primitive object={skinMat} attach="material" />
          </mesh>
          {/* Pink Glove Hand */}
          <mesh castShadow position={[0, -0.64, 0]}>
            <sphereGeometry args={[0.085, 10, 10]} />
            <primitive object={gloveMat} attach="material" />
          </mesh>
        </group>

        {/* Right Arm */}
        <group ref={rightArmRef} position={[0.42, 0.45, 0]}>
          {/* Upper Arm */}
          <mesh castShadow position={[0, -0.18, 0]}>
            <cylinderGeometry args={[0.08, 0.07, 0.35, 12]} />
            <primitive object={skinMat} attach="material" />
          </mesh>
          {/* Forearm */}
          <mesh castShadow position={[0, -0.45, 0]}>
            <cylinderGeometry args={[0.068, 0.06, 0.32, 12]} />
            <primitive object={skinMat} attach="material" />
          </mesh>
          {/* Glove Hand */}
          <mesh castShadow position={[0, -0.64, 0]}>
            <sphereGeometry args={[0.085, 10, 10]} />
            <primitive object={gloveMat} attach="material" />
          </mesh>
        </group>
      </group>

      {/* ── 4. ATHLETIC SHORTS ── */}
      <mesh castShadow position={[0, 0.88, 0]}>
        <cylinderGeometry args={[0.31, 0.33, 0.32, 16]} />
        <primitive object={shortsMat} attach="material" />
      </mesh>
      {/* Side Accent Trim */}
      <mesh position={[0, 0.88, 0]}>
        <cylinderGeometry args={[0.315, 0.335, 0.1, 16]} />
        <primitive object={trimMat} attach="material" />
      </mesh>

      {/* ── 5. ATHLETIC LEGS & CLEATS ── */}
      {/* Left Leg (With Thigh Tattoo) */}
      <group ref={leftLegRef} position={[-0.17, 0.72, 0]}>
        {/* Thigh */}
        <mesh castShadow position={[0, -0.22, 0]}>
          <cylinderGeometry args={[0.115, 0.095, 0.42, 14]} />
          <primitive object={tattooLegMat} attach="material" />
        </mesh>
        {/* Knee & Calf with Sock */}
        <mesh castShadow position={[0, -0.52, 0]}>
          <cylinderGeometry args={[0.095, 0.085, 0.38, 14]} />
          <primitive object={sockMat} attach="material" />
        </mesh>
        {/* Soccer Cleat / Boot */}
        <group position={[0, -0.74, 0.06]}>
          <mesh castShadow>
            <boxGeometry args={[0.13, 0.11, 0.28]} />
            <primitive object={bootMat} attach="material" />
          </mesh>
          {/* Cleats Studs */}
          <mesh position={[0, -0.06, 0]}>
            <boxGeometry args={[0.13, 0.02, 0.28]} />
            <meshBasicMaterial color="#1e293b" />
          </mesh>
        </group>
      </group>

      {/* Right Leg */}
      <group ref={rightLegRef} position={[0.17, 0.72, 0]}>
        {/* Thigh */}
        <mesh castShadow position={[0, -0.22, 0]}>
          <cylinderGeometry args={[0.115, 0.095, 0.42, 14]} />
          <primitive object={skinMat} attach="material" />
        </mesh>
        {/* Calf with Sock */}
        <mesh castShadow position={[0, -0.52, 0]}>
          <cylinderGeometry args={[0.095, 0.085, 0.38, 14]} />
          <primitive object={sockMat} attach="material" />
        </mesh>
        {/* Soccer Cleat */}
        <group position={[0, -0.74, 0.06]}>
          <mesh castShadow>
            <boxGeometry args={[0.13, 0.11, 0.28]} />
            <primitive object={bootMat} attach="material" />
          </mesh>
          <mesh position={[0, -0.06, 0]}>
            <boxGeometry args={[0.13, 0.02, 0.28]} />
            <meshBasicMaterial color="#1e293b" />
          </mesh>
        </group>
      </group>

      {/* Goalkeeper cyan visor indicator */}
      {isGoalkeeper && (
        <mesh position={[0, 2.32, 0.18]}>
          <boxGeometry args={[0.3, 0.06, 0.12]} />
          <meshBasicMaterial color="#00ffff" />
        </mesh>
      )}
    </group>
  )
}
