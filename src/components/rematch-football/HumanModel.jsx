import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Creates procedural Canvas Texture for Jersey with Number 7
 */
function createJerseyCanvas(teamColorHex, secColorHex, number) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')

  // Base Jersey Fill
  ctx.fillStyle = teamColorHex
  ctx.fillRect(0, 0, 256, 256)

  // Side Trim Stripes
  ctx.fillStyle = secColorHex
  ctx.fillRect(0, 0, 36, 256)
  ctx.fillRect(220, 0, 36, 256)

  // White Zipper & Hood Trim
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(122, 0, 12, 100)
  ctx.fillRect(70, 75, 116, 14)

  // Back Number
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '900 76px "Orbitron", sans-serif'
  ctx.fillText(number.toString(), 128, 160)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

export function HumanModel({
  preset = 'female_striker',
  teamColor = '#ef4444',
  secColor = '#1e293b',
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
  const animTime = useRef(0)

  // Jersey Texture
  const jerseyTex = useMemo(() => createJerseyCanvas(teamColor, secColor, number), [teamColor, secColor, number])

  // PBR Materials (Clean, smooth, high-quality)
  const skinMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xf5d0a9, roughness: 0.4, metalness: 0.05 }), [])
  const hairMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 }), [])
  const jerseyMat = useMemo(() => new THREE.MeshStandardMaterial({ map: jerseyTex, roughness: 0.35 }), [jerseyTex])
  const shortsMat = useMemo(() => new THREE.MeshStandardMaterial({ color: teamColor, roughness: 0.4 }), [teamColor])
  const trimMat = useMemo(() => new THREE.MeshStandardMaterial({ color: secColor, roughness: 0.3 }), [secColor])
  const sockMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 }), [])
  const bootMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.25, metalness: 0.3 }), [])
  const gloveMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ec4899', roughness: 0.3 }), [])
  const eyeMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#0f172a' }), [])
  const visorMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#00f2fe', roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.85 }), [])

  // Smooth running limb animation loop
  useFrame((state, dt) => {
    const speed = Math.hypot(velocity.x, velocity.z)

    if (speed > 0.15) {
      animTime.current += speed * dt * 1.25

      // Leg strides with natural knee flex
      if (leftLegRef.current) leftLegRef.current.rotation.x = Math.sin(animTime.current) * 0.75
      if (rightLegRef.current) rightLegRef.current.rotation.x = -Math.sin(animTime.current) * 0.75

      // Arm swings with elbow flex
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = -Math.sin(animTime.current) * 0.6
        leftArmRef.current.rotation.z = 0.12
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = Math.sin(animTime.current) * 0.6
        rightArmRef.current.rotation.z = -0.12
      }

      // Athletic forward torso lean & bounce
      if (torsoRef.current) {
        torsoRef.current.rotation.x = 0.2
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

    // Slide tackle lunge pose
    if (isTackling) {
      if (torsoRef.current) torsoRef.current.rotation.x = 0.6
      if (leftLegRef.current) leftLegRef.current.rotation.x = -1.1
      if (rightLegRef.current) rightLegRef.current.rotation.x = -0.3
    }
  })

  return (
    <group scale={[0.95, 0.95, 0.95]}>
      
      {/* ── 1. ATHLETIC TORSO & HOODED JERSEY ── */}
      <group ref={torsoRef} position={[0, 1.35, 0]}>
        {/* Tapered Chest & Waist */}
        <mesh castShadow receiveShadow position={[0, 0.28, 0]}>
          <cylinderGeometry args={[0.34, 0.28, 0.76, 20]} />
          <primitive object={jerseyMat} attach="material" />
        </mesh>

        {/* Hood Collar Ring (Sloclap Rematch Sleeveless Hoodie) */}
        <mesh castShadow position={[0, 0.66, -0.06]} rotation={[0.3, 0, 0]}>
          <torusGeometry args={[0.23, 0.075, 12, 24]} />
          <primitive object={jerseyMat} attach="material" />
        </mesh>

        {/* Shoulder Caps */}
        <mesh position={[-0.37, 0.56, 0]}>
          <sphereGeometry args={[0.125, 14, 14]} />
          <primitive object={trimMat} attach="material" />
        </mesh>
        <mesh position={[0.37, 0.56, 0]}>
          <sphereGeometry args={[0.125, 14, 14]} />
          <primitive object={trimMat} attach="material" />
        </mesh>

        {/* ── 2. SLEEK CHARACTER HEAD, FACE & PONYTAIL ── */}
        <group position={[0, 0.92, 0]}>
          {/* Head Oval Mesh */}
          <mesh castShadow position={[0, 0, 0]}>
            <sphereGeometry args={[0.22, 24, 24]} />
            <primitive object={skinMat} attach="material" />
          </mesh>

          {/* Stylized Eyebrows & Eyes */}
          <mesh position={[-0.07, 0.03, 0.19]}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <primitive object={eyeMat} attach="material" />
          </mesh>
          <mesh position={[0.07, 0.03, 0.19]}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <primitive object={eyeMat} attach="material" />
          </mesh>

          {/* Sleek Athletic Visor/Sunglasses Option (Sloclap Pro Aesthetic) */}
          <mesh position={[0, 0.04, 0.15]}>
            <boxGeometry args={[0.26, 0.06, 0.12]} />
            <primitive object={visorMat} attach="material" />
          </mesh>

          {/* Ponytail Hair Cut (Signature Sloclap Rematch Female Striker) */}
          <mesh castShadow position={[0, 0.12, -0.08]}>
            <sphereGeometry args={[0.23, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
            <primitive object={hairMat} attach="material" />
          </mesh>

          {/* Ponytail Extension */}
          <mesh castShadow position={[0, 0.18, -0.26]} rotation={[-0.45, 0, 0]}>
            <cylinderGeometry args={[0.07, 0.02, 0.36, 12]} />
            <primitive object={hairMat} attach="material" />
          </mesh>

          {/* Pink Hair Tie Band */}
          <mesh position={[0, 0.22, -0.19]}>
            <torusGeometry args={[0.075, 0.025, 8, 16]} />
            <meshBasicMaterial color="#ec4899" />
          </mesh>
        </group>

        {/* ── 3. TONED ARMS & PINK ATHLETIC GLOVES ── */}
        {/* Left Arm */}
        <group ref={leftArmRef} position={[-0.43, 0.48, 0]}>
          <mesh castShadow position={[0, -0.18, 0]}>
            <cylinderGeometry args={[0.078, 0.068, 0.35, 14]} />
            <primitive object={skinMat} attach="material" />
          </mesh>
          <mesh castShadow position={[0, -0.45, 0]}>
            <cylinderGeometry args={[0.068, 0.058, 0.32, 14]} />
            <primitive object={skinMat} attach="material" />
          </mesh>
          <mesh castShadow position={[0, -0.65, 0]}>
            <sphereGeometry args={[0.082, 12, 12]} />
            <primitive object={gloveMat} attach="material" />
          </mesh>
        </group>

        {/* Right Arm */}
        <group ref={rightArmRef} position={[0.43, 0.48, 0]}>
          <mesh castShadow position={[0, -0.18, 0]}>
            <cylinderGeometry args={[0.078, 0.068, 0.35, 14]} />
            <primitive object={skinMat} attach="material" />
          </mesh>
          <mesh castShadow position={[0, -0.45, 0]}>
            <cylinderGeometry args={[0.068, 0.058, 0.32, 14]} />
            <primitive object={skinMat} attach="material" />
          </mesh>
          <mesh castShadow position={[0, -0.65, 0]}>
            <sphereGeometry args={[0.082, 12, 12]} />
            <primitive object={gloveMat} attach="material" />
          </mesh>
        </group>
      </group>

      {/* ── 4. ATHLETIC SHORTS & WAIST ── */}
      <mesh castShadow position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.31, 0.33, 0.34, 18]} />
        <primitive object={shortsMat} attach="material" />
      </mesh>
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.315, 0.335, 0.12, 18]} />
        <primitive object={trimMat} attach="material" />
      </mesh>

      {/* ── 5. ATHLETIC LEGS, SOCKS & SOCCER CLEATS ── */}
      {/* Left Leg */}
      <group ref={leftLegRef} position={[-0.17, 0.73, 0]}>
        <mesh castShadow position={[0, -0.22, 0]}>
          <cylinderGeometry args={[0.115, 0.095, 0.44, 16]} />
          <primitive object={skinMat} attach="material" />
        </mesh>
        <mesh castShadow position={[0, -0.54, 0]}>
          <cylinderGeometry args={[0.095, 0.084, 0.4, 16]} />
          <primitive object={sockMat} attach="material" />
        </mesh>
        <group position={[0, -0.78, 0.07]}>
          <mesh castShadow>
            <boxGeometry args={[0.135, 0.115, 0.29]} />
            <primitive object={bootMat} attach="material" />
          </mesh>
          <mesh position={[0, -0.062, 0]}>
            <boxGeometry args={[0.135, 0.02, 0.29]} />
            <meshBasicMaterial color="#0f172a" />
          </mesh>
        </group>
      </group>

      {/* Right Leg */}
      <group ref={rightLegRef} position={[0.17, 0.73, 0]}>
        <mesh castShadow position={[0, -0.22, 0]}>
          <cylinderGeometry args={[0.115, 0.095, 0.44, 16]} />
          <primitive object={skinMat} attach="material" />
        </mesh>
        <mesh castShadow position={[0, -0.54, 0]}>
          <cylinderGeometry args={[0.095, 0.084, 0.4, 16]} />
          <primitive object={sockMat} attach="material" />
        </mesh>
        <group position={[0, -0.78, 0.07]}>
          <mesh castShadow>
            <boxGeometry args={[0.135, 0.115, 0.29]} />
            <primitive object={bootMat} attach="material" />
          </mesh>
          <mesh position={[0, -0.062, 0]}>
            <boxGeometry args={[0.135, 0.02, 0.29]} />
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
