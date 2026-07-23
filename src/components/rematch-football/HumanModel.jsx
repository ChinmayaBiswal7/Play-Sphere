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
  isTackling = false,
  isCelebrating = false // false | 'slide' | 'jump' | 'run'
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

  // PBR Materials
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

  useFrame((state, dt) => {
    const horizontalSpeed = Math.hypot(velocity.x, velocity.z)

    // ── GOAL CELEBRATION POSES ──
    if (isCelebrating) {
      if (isCelebrating === 'slide') {
        // KNEE SLIDE CELEBRATION (Arms wide open, leaning back!)
        if (torsoRef.current) {
          torsoRef.current.rotation.x = -0.45
          torsoRef.current.position.y = 0.55
        }
        if (leftHipRef.current) leftHipRef.current.rotation.x = 0.75
        if (rightHipRef.current) rightHipRef.current.rotation.x = 0.75
        if (leftKneeRef.current) leftKneeRef.current.rotation.x = 1.3
        if (rightKneeRef.current) rightKneeRef.current.rotation.x = 1.3

        if (leftShoulderRef.current) {
          leftShoulderRef.current.rotation.x = 0
          leftShoulderRef.current.rotation.z = 1.2
        }
        if (rightShoulderRef.current) {
          rightShoulderRef.current.rotation.x = 0
          rightShoulderRef.current.rotation.z = -1.2
        }
        return
      } else if (isCelebrating === 'jump') {
        // VICTORY JUMP (Arms raised high in air!)
        animTime.current += dt * 6.0
        const jumpY = Math.abs(Math.sin(animTime.current)) * 0.4
        if (torsoRef.current) {
          torsoRef.current.rotation.x = 0
          torsoRef.current.position.y = 0.95 + jumpY
        }
        if (leftHipRef.current) leftHipRef.current.rotation.x = 0.2
        if (rightHipRef.current) rightHipRef.current.rotation.x = -0.2
        if (leftKneeRef.current) leftKneeRef.current.rotation.x = 0.3
        if (rightKneeRef.current) rightKneeRef.current.rotation.x = 0.3

        if (leftShoulderRef.current) {
          leftShoulderRef.current.rotation.x = 0
          leftShoulderRef.current.rotation.z = 2.4
        }
        if (rightShoulderRef.current) {
          rightShoulderRef.current.rotation.x = 0
          rightShoulderRef.current.rotation.z = -2.4
        }
        return
      } else {
        // CORNER FLAG RUN CELEBRATION (Sprinting with right fist in air)
        animTime.current += dt * 10.0
        const stride = Math.sin(animTime.current)
        if (leftHipRef.current) leftHipRef.current.rotation.x = stride * 0.8
        if (rightHipRef.current) rightHipRef.current.rotation.x = -stride * 0.8
        if (leftKneeRef.current) leftKneeRef.current.rotation.x = Math.abs(stride) * 0.8
        if (rightKneeRef.current) rightKneeRef.current.rotation.x = Math.abs(stride) * 0.8

        if (leftShoulderRef.current) {
          leftShoulderRef.current.rotation.x = 0.2
          leftShoulderRef.current.rotation.z = 0.3
        }
        if (rightShoulderRef.current) {
          rightShoulderRef.current.rotation.x = 0
          rightShoulderRef.current.rotation.z = -2.2
        }
        return
      }
    }

    if (horizontalSpeed > 0.8) {
      animTime.current += horizontalSpeed * dt * 1.35

      const stride = Math.sin(animTime.current)
      const oppositeStride = -stride

      if (leftHipRef.current) leftHipRef.current.rotation.x = stride * 0.75
      if (rightHipRef.current) rightHipRef.current.rotation.x = oppositeStride * 0.75

      if (leftKneeRef.current) {
        leftKneeRef.current.rotation.x = stride < 0 ? Math.abs(stride) * 0.85 : 0.05
      }
      if (rightKneeRef.current) {
        rightKneeRef.current.rotation.x = oppositeStride < 0 ? Math.abs(oppositeStride) * 0.85 : 0.05
      }

      if (leftShoulderRef.current) {
        leftShoulderRef.current.rotation.x = oppositeStride * 0.6
        leftShoulderRef.current.rotation.z = 0.12
      }
      if (rightShoulderRef.current) {
        rightShoulderRef.current.rotation.x = stride * 0.6
        rightShoulderRef.current.rotation.z = -0.12
      }

      if (leftElbowRef.current) {
        leftElbowRef.current.rotation.x = -0.3 - Math.abs(oppositeStride) * 0.4
      }
      if (rightElbowRef.current) {
        rightElbowRef.current.rotation.x = -0.3 - Math.abs(stride) * 0.4
      }

      if (torsoRef.current) {
        torsoRef.current.rotation.x = 0.18
        torsoRef.current.position.y = 0.95 + Math.abs(Math.sin(animTime.current * 2)) * 0.04
      }
    } else {
      animTime.current = 0
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
        torsoRef.current.position.y = 0.95
      }
    }

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
      <group ref={torsoRef} position={[0, 0.95, 0]}>
        <mesh castShadow receiveShadow position={[0, 0.28, 0]}>
          <cylinderGeometry args={[0.34, 0.28, 0.76, 20]} />
          <primitive object={jerseyMat} attach="material" />
        </mesh>

        <mesh castShadow position={[0, 0.66, -0.06]} rotation={[0.3, 0, 0]}>
          <torusGeometry args={[0.23, 0.075, 12, 24]} />
          <primitive object={jerseyMat} attach="material" />
        </mesh>

        <mesh position={[-0.37, 0.56, 0]}>
          <sphereGeometry args={[0.125, 14, 14]} />
          <primitive object={trimMat} attach="material" />
        </mesh>
        <mesh position={[0.37, 0.56, 0]}>
          <sphereGeometry args={[0.125, 14, 14]} />
          <primitive object={trimMat} attach="material" />
        </mesh>

        {/* ── 2. HEAD & ATHLETIC FACIAL MODEL ── */}
        <group position={[0, 0.82, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.22, 20, 20]} />
            <primitive object={skinMat} attach="material" />
          </mesh>

          <mesh position={[-0.075, 0.04, -0.19]}>
            <sphereGeometry args={[0.038, 12, 12]} />
            <primitive object={eyeMat} attach="material" />
          </mesh>
          <mesh position={[0.075, 0.04, -0.19]}>
            <sphereGeometry args={[0.038, 12, 12]} />
            <primitive object={eyeMat} attach="material" />
          </mesh>

          <mesh position={[0, 0.12, -0.22]} rotation={[-0.2, 0, 0]}>
            <boxGeometry args={[0.32, 0.08, 0.06]} />
            <primitive object={visorMat} attach="material" />
          </mesh>

          {preset === 'female_striker' && (
            <mesh position={[0, 0.08, 0.22]} rotation={[0.4, 0, 0]}>
              <sphereGeometry args={[0.12, 14, 14]} />
              <primitive object={hairMat} attach="material" />
            </mesh>
          )}

          {preset === 'captain_pro' && (
            <mesh position={[0, 0.22, 0]}>
              <boxGeometry args={[0.38, 0.12, 0.38]} />
              <meshStandardMaterial color="#facc15" roughness={0.3} />
            </mesh>
          )}
        </group>

        {/* ── 3. ARTICULATED ARMS ── */}
        <group ref={leftShoulderRef} position={[-0.4, 0.52, 0]}>
          <mesh castShadow position={[0, -0.22, 0]}>
            <cylinderGeometry args={[0.10, 0.085, 0.44, 14]} />
            <primitive object={jerseyMat} attach="material" />
          </mesh>
          <group ref={leftElbowRef} position={[0, -0.44, 0]}>
            <mesh castShadow position={[0, -0.22, 0]}>
              <cylinderGeometry args={[0.085, 0.07, 0.44, 14]} />
              <primitive object={isGoalkeeper ? gloveMat : skinMat} attach="material" />
            </mesh>
          </group>
        </group>

        <group ref={rightShoulderRef} position={[0.4, 0.52, 0]}>
          <mesh castShadow position={[0, -0.22, 0]}>
            <cylinderGeometry args={[0.10, 0.085, 0.44, 14]} />
            <primitive object={jerseyMat} attach="material" />
          </mesh>
          <group ref={rightElbowRef} position={[0, -0.44, 0]}>
            <mesh castShadow position={[0, -0.22, 0]}>
              <cylinderGeometry args={[0.085, 0.07, 0.44, 14]} />
              <primitive object={isGoalkeeper ? gloveMat : skinMat} attach="material" />
            </mesh>
          </group>
        </group>
      </group>

      {/* ── 4. SHORTS ── */}
      <mesh castShadow position={[0, 0.72, 0]}>
        <cylinderGeometry args={[0.31, 0.34, 0.36, 20]} />
        <primitive object={shortsMat} attach="material" />
      </mesh>

      {/* ── 5. ARTICULATED LEGS ── */}
      <group ref={leftHipRef} position={[-0.17, 0.62, 0]}>
        <mesh castShadow position={[0, -0.25, 0]}>
          <cylinderGeometry args={[0.13, 0.10, 0.50, 16]} />
          <primitive object={skinMat} attach="material" />
        </mesh>

        <group ref={leftKneeRef} position={[0, -0.50, 0]}>
          <mesh castShadow position={[0, -0.25, 0]}>
            <cylinderGeometry args={[0.10, 0.085, 0.50, 16]} />
            <primitive object={sockMat} attach="material" />
          </mesh>
          <mesh castShadow position={[0, -0.52, -0.06]}>
            <boxGeometry args={[0.17, 0.12, 0.32]} />
            <primitive object={bootMat} attach="material" />
          </mesh>
        </group>
      </group>

      <group ref={rightHipRef} position={[0.17, 0.62, 0]}>
        <mesh castShadow position={[0, -0.25, 0]}>
          <cylinderGeometry args={[0.13, 0.10, 0.50, 16]} />
          <primitive object={skinMat} attach="material" />
        </mesh>

        <group ref={rightKneeRef} position={[0, -0.50, 0]}>
          <mesh castShadow position={[0, -0.25, 0]}>
            <cylinderGeometry args={[0.10, 0.085, 0.50, 16]} />
            <primitive object={sockMat} attach="material" />
          </mesh>
          <mesh castShadow position={[0, -0.52, -0.06]}>
            <boxGeometry args={[0.17, 0.12, 0.32]} />
            <primitive object={bootMat} attach="material" />
          </mesh>
        </group>
      </group>

    </group>
  )
}
