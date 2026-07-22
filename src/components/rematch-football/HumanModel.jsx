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

  // Base Jersey
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
  
  // Articulated Joint Refs
  const leftHipRef = useRef()
  const rightHipRef = useRef()
  const leftKneeRef = useRef()
  const rightKneeRef = useRef()
  
  const leftShoulderRef = useRef()
  const rightShoulderRef = useRef()
  const leftElbowRef = useRef()
  const rightElbowRef = useRef()

  const animTime = useRef(0)

  // Jersey Texture
  const jerseyTex = useMemo(() => createJerseyCanvas(teamColor, secColor, number), [teamColor, secColor, number])

  // PBR Materials (Clean, smooth, realistic)
  const skinMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xf5d0a9, roughness: 0.45, metalness: 0.05 }), [])
  const hairMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.8 }), [])
  const jerseyMat = useMemo(() => new THREE.MeshStandardMaterial({ map: jerseyTex, roughness: 0.35 }), [jerseyTex])
  const shortsMat = useMemo(() => new THREE.MeshStandardMaterial({ color: teamColor, roughness: 0.4 }), [teamColor])
  const trimMat = useMemo(() => new THREE.MeshStandardMaterial({ color: secColor, roughness: 0.3 }), [secColor])
  const sockMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 }), [])
  const bootMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.25, metalness: 0.3 }), [])
  const gloveMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ec4899', roughness: 0.3 }), [])
  const eyeMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#0f172a' }), [])
  const visorMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#00f2fe', roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.85 }), [])

  // Articulated joint movement animation frame loop
  useFrame((state, dt) => {
    const speed = Math.hypot(velocity.x, velocity.z)

    if (speed > 0.15) {
      animTime.current += speed * dt * 1.35

      const stride = Math.sin(animTime.current)
      const oppositeStride = -stride

      // 1. HIP ROTATION (Thighs)
      if (leftHipRef.current) leftHipRef.current.rotation.x = stride * 0.75
      if (rightHipRef.current) rightHipRef.current.rotation.x = oppositeStride * 0.75

      // 2. KNEE FLEXION (Calves bend backwards on backstride!)
      if (leftKneeRef.current) {
        leftKneeRef.current.rotation.x = stride < 0 ? Math.abs(stride) * 0.85 : 0.05
      }
      if (rightKneeRef.current) {
        rightKneeRef.current.rotation.x = oppositeStride < 0 ? Math.abs(oppositeStride) * 0.85 : 0.05
      }

      // 3. SHOULDER ROTATION (Upper Arms)
      if (leftShoulderRef.current) {
        leftShoulderRef.current.rotation.x = oppositeStride * 0.6
        leftShoulderRef.current.rotation.z = 0.12
      }
      if (rightShoulderRef.current) {
        rightShoulderRef.current.rotation.x = stride * 0.6
        rightShoulderRef.current.rotation.z = -0.12
      }

      // 4. ELBOW FLEXION (Forearms flex at elbow joint)
      if (leftElbowRef.current) {
        leftElbowRef.current.rotation.x = -0.3 - Math.abs(oppositeStride) * 0.4
      }
      if (rightElbowRef.current) {
        rightElbowRef.current.rotation.x = -0.3 - Math.abs(stride) * 0.4
      }

      // 5. TORSO BOUNCE & FORWARD LEAN
      if (torsoRef.current) {
        torsoRef.current.rotation.x = 0.18
        torsoRef.current.position.y = 1.35 + Math.abs(Math.sin(animTime.current * 2)) * 0.06
      }
    } else {
      animTime.current = 0
      // Rest / Idle Pose
      if (leftHipRef.current) leftHipRef.current.rotation.x = 0
      if (rightHipRef.current) rightHipRef.current.rotation.x = 0
      if (leftKneeRef.current) leftKneeRef.current.rotation.x = 0
      if (rightKneeRef.current) rightKneeRef.current.rotation.x = 0

      if (leftShoulderRef.current) {
        leftShoulderRef.current.rotation.x = 0.05
        leftShoulderRef.current.rotation.z = 0.15
      }
      if (rightShoulderRef.current) {
        rightShoulderRef.current.rotation.x = 0.05
        rightShoulderRef.current.rotation.z = -0.15
      }
      if (leftElbowRef.current) leftElbowRef.current.rotation.x = -0.2
      if (rightElbowRef.current) rightElbowRef.current.rotation.x = -0.2

      if (torsoRef.current) {
        torsoRef.current.rotation.x = 0
        torsoRef.current.position.y = 1.35
      }
    }

    // Tackle dash pose
    if (isTackling) {
      if (torsoRef.current) torsoRef.current.rotation.x = 0.6
      if (leftHipRef.current) leftHipRef.current.rotation.x = -1.1
      if (rightHipRef.current) rightHipRef.current.rotation.x = -0.3
      if (leftKneeRef.current) leftKneeRef.current.rotation.x = 0.4
      if (rightKneeRef.current) rightKneeRef.current.rotation.x = 0.8
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

        {/* Hood Collar Ring */}
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

        {/* ── 2. HEAD, NECK, FACE & PONYTAIL ── */}
        <group position={[0, 0.92, 0]}>
          {/* Neck */}
          <mesh position={[0, -0.18, 0]}>
            <cylinderGeometry args={[0.1, 0.11, 0.16, 12]} />
            <primitive object={skinMat} attach="material" />
          </mesh>

          {/* Head Sphere */}
          <mesh castShadow position={[0, 0, 0]}>
            <sphereGeometry args={[0.22, 24, 24]} />
            <primitive object={skinMat} attach="material" />
          </mesh>

          {/* Eyes */}
          <mesh position={[-0.07, 0.03, 0.19]}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <primitive object={eyeMat} attach="material" />
          </mesh>
          <mesh position={[0.07, 0.03, 0.19]}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <primitive object={eyeMat} attach="material" />
          </mesh>

          {/* Athletic Visor / Sunglasses */}
          <mesh position={[0, 0.04, 0.15]}>
            <boxGeometry args={[0.26, 0.06, 0.12]} />
            <primitive object={visorMat} attach="material" />
          </mesh>

          {/* Ponytail Hairstyle */}
          <mesh castShadow position={[0, 0.12, -0.08]}>
            <sphereGeometry args={[0.23, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
            <primitive object={hairMat} attach="material" />
          </mesh>
          <mesh castShadow position={[0, 0.18, -0.26]} rotation={[-0.45, 0, 0]}>
            <cylinderGeometry args={[0.07, 0.02, 0.36, 12]} />
            <primitive object={hairMat} attach="material" />
          </mesh>
          <mesh position={[0, 0.22, -0.19]}>
            <torusGeometry args={[0.075, 0.025, 8, 16]} />
            <meshBasicMaterial color="#ec4899" />
          </mesh>
        </group>

        {/* ── 3. ARTICULATED ARMS (Shoulder -> UpperArm -> Elbow -> Forearm -> Wrist -> Glove) ── */}
        {/* Left Arm */}
        <group ref={leftShoulderRef} position={[-0.42, 0.52, 0]}>
          {/* Upper Arm */}
          <mesh castShadow position={[0, -0.16, 0]}>
            <cylinderGeometry args={[0.075, 0.065, 0.32, 14]} />
            <primitive object={skinMat} attach="material" />
          </mesh>

          {/* Elbow Joint Pivot */}
          <group ref={leftElbowRef} position={[0, -0.32, 0]}>
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[0.065, 10, 10]} />
              <primitive object={skinMat} attach="material" />
            </mesh>
            {/* Forearm */}
            <mesh castShadow position={[0, -0.16, 0]}>
              <cylinderGeometry args={[0.065, 0.055, 0.30, 14]} />
              <primitive object={skinMat} attach="material" />
            </mesh>
            {/* Hand / Pink Glove */}
            <mesh castShadow position={[0, -0.34, 0]}>
              <sphereGeometry args={[0.08, 12, 12]} />
              <primitive object={gloveMat} attach="material" />
            </mesh>
          </group>
        </group>

        {/* Right Arm */}
        <group ref={rightShoulderRef} position={[0.42, 0.52, 0]}>
          {/* Upper Arm */}
          <mesh castShadow position={[0, -0.16, 0]}>
            <cylinderGeometry args={[0.075, 0.065, 0.32, 14]} />
            <primitive object={skinMat} attach="material" />
          </mesh>

          {/* Elbow Joint Pivot */}
          <group ref={rightElbowRef} position={[0, -0.32, 0]}>
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[0.065, 10, 10]} />
              <primitive object={skinMat} attach="material" />
            </mesh>
            {/* Forearm */}
            <mesh castShadow position={[0, -0.16, 0]}>
              <cylinderGeometry args={[0.065, 0.055, 0.30, 14]} />
              <primitive object={skinMat} attach="material" />
            </mesh>
            {/* Hand / Pink Glove */}
            <mesh castShadow position={[0, -0.34, 0]}>
              <sphereGeometry args={[0.08, 12, 12]} />
              <primitive object={gloveMat} attach="material" />
            </mesh>
          </group>
        </group>
      </group>

      {/* ── 4. ATHLETIC SHORTS ── */}
      <mesh castShadow position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.31, 0.33, 0.34, 18]} />
        <primitive object={shortsMat} attach="material" />
      </mesh>
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.315, 0.335, 0.12, 18]} />
        <primitive object={trimMat} attach="material" />
      </mesh>

      {/* ── 5. ARTICULATED LEGS (Hip -> Thigh -> Knee -> Calf -> Ankle -> Soccer Cleats) ── */}
      {/* Left Leg */}
      <group ref={leftHipRef} position={[-0.17, 0.82, 0]}>
        {/* Thigh */}
        <mesh castShadow position={[0, -0.2, 0]}>
          <cylinderGeometry args={[0.115, 0.095, 0.4, 16]} />
          <primitive object={skinMat} attach="material" />
        </mesh>

        {/* Knee Joint Pivot */}
        <group ref={leftKneeRef} position={[0, -0.4, 0]}>
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.092, 12, 12]} />
            <primitive object={skinMat} attach="material" />
          </mesh>
          {/* Calf & High Sock */}
          <mesh castShadow position={[0, -0.2, 0]}>
            <cylinderGeometry args={[0.092, 0.08, 0.38, 16]} />
            <primitive object={sockMat} attach="material" />
          </mesh>

          {/* Ankle & Soccer Cleat Boot */}
          <group position={[0, -0.42, 0.06]}>
            <mesh castShadow>
              <boxGeometry args={[0.13, 0.11, 0.28]} />
              <primitive object={bootMat} attach="material" />
            </mesh>
            {/* Studs Sole */}
            <mesh position={[0, -0.06, 0]}>
              <boxGeometry args={[0.13, 0.02, 0.28]} />
              <meshBasicMaterial color="#0f172a" />
            </mesh>
          </group>
        </group>
      </group>

      {/* Right Leg */}
      <group ref={rightHipRef} position={[0.17, 0.82, 0]}>
        {/* Thigh */}
        <mesh castShadow position={[0, -0.2, 0]}>
          <cylinderGeometry args={[0.115, 0.095, 0.4, 16]} />
          <primitive object={skinMat} attach="material" />
        </mesh>

        {/* Knee Joint Pivot */}
        <group ref={rightKneeRef} position={[0, -0.4, 0]}>
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.092, 12, 12]} />
            <primitive object={skinMat} attach="material" />
          </mesh>
          {/* Calf & High Sock */}
          <mesh castShadow position={[0, -0.2, 0]}>
            <cylinderGeometry args={[0.092, 0.08, 0.38, 16]} />
            <primitive object={sockMat} attach="material" />
          </mesh>

          {/* Ankle & Soccer Cleat Boot */}
          <group position={[0, -0.42, 0.06]}>
            <mesh castShadow>
              <boxGeometry args={[0.13, 0.11, 0.28]} />
              <primitive object={bootMat} attach="material" />
            </mesh>
            <mesh position={[0, -0.06, 0]}>
              <boxGeometry args={[0.13, 0.02, 0.28]} />
              <meshBasicMaterial color="#0f172a" />
            </mesh>
          </group>
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
