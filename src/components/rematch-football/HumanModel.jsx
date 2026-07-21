import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function HumanModel({ 
  teamColor = '#ff0055', 
  secColor = '#3b82f6', 
  number = 10, 
  isGoalkeeper = false,
  velocity = new THREE.Vector3(),
  isTackling = false,
  isGKActive = false
}) {
  const torsoRef = useRef()
  const leftLegRef = useRef()
  const rightLegRef = useRef()
  const leftArmRef = useRef()
  const rightArmRef = useRef()

  const animTime = useRef(0)

  // Procedural Jersey Texture with Player Number
  const jerseyTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const ctx = canvas.getContext('2d')
    
    // Jersey Base Color
    ctx.fillStyle = teamColor
    ctx.fillRect(0, 0, 128, 128)
    
    if (isGoalkeeper) {
      // GK Cyan stripes
      ctx.fillStyle = '#06b6d4'
      ctx.fillRect(0, 0, 128, 26)
      ctx.fillRect(0, 70, 128, 14)
    } else {
      // Main stripes
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'
      ctx.fillRect(48, 0, 32, 128)
    }
    
    // Number text
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '900 56px Courier New, sans-serif'
    ctx.fillText(number.toString(), 64, 64)
    
    return new THREE.CanvasTexture(canvas)
  }, [teamColor, number, isGoalkeeper])

  // Arm/Leg swinging animation frame loops
  useFrame((state, dt) => {
    const speed = Math.hypot(velocity.x, velocity.z)
    
    if (speed > 0.15) {
      animTime.current += speed * dt * 0.95
      
      // Swing limbs back/forth
      if (leftLegRef.current) leftLegRef.current.rotation.x = Math.sin(animTime.current) * 0.65
      if (rightLegRef.current) rightLegRef.current.rotation.x = -Math.sin(animTime.current) * 0.65
      if (leftArmRef.current) leftArmRef.current.rotation.x = -Math.sin(animTime.current) * 0.5
      if (rightArmRef.current) rightArmRef.current.rotation.x = Math.sin(animTime.current) * 0.5
      if (torsoRef.current) torsoRef.current.rotation.x = 0.15
    } else {
      animTime.current = 0
      // Idle pose
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = 0.08
        leftArmRef.current.rotation.z = 0.08
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = 0.08
        rightArmRef.current.rotation.z = -0.08
      }
      if (torsoRef.current) torsoRef.current.rotation.x = 0
    }

    // Tackle lunge animation
    if (isTackling && torsoRef.current) {
      torsoRef.current.rotation.x = 0.45
      if (leftLegRef.current) leftLegRef.current.rotation.x = -0.8
      if (rightLegRef.current) rightLegRef.current.rotation.x = -0.8
    }
  })

  // Materials definitions
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.6 })
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x271708, roughness: 0.9 })
  const shortsPantsMat = new THREE.MeshStandardMaterial({ color: secColor, roughness: 0.5 })
  const socksMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 })
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.3 })
  const jerseyMat = new THREE.MeshStandardMaterial({ map: jerseyTexture, roughness: 0.4 })

  return (
    <group scale={[0.82, 0.82, 0.82]} position={[0, -0.22, 0]}>
      
      {/* 1. Torso (Capsule) */}
      <mesh ref={torsoRef} castShadow receiveShadow position={[0, 1.4, 0]}>
        <capsuleGeometry args={[0.38, 0.65, 8, 16]} />
        <primitive object={jerseyMat} attach="material" />
      </mesh>

      {/* 2. Shorts Pants */}
      <mesh castShadow position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.39, 0.39, 0.35, 16]} />
        <primitive object={shortsPantsMat} attach="material" />
      </mesh>

      {/* 3. Head & Hair */}
      <mesh castShadow position={[0, 2.05, 0]}>
        <sphereGeometry args={[0.26, 16, 16]} />
        <primitive object={skinMat} attach="material" />
      </mesh>
      
      {/* Hair */}
      <mesh castShadow position={[0, 2.08, 0]} rotation={[-0.1, 0, 0]}>
        <sphereGeometry args={[0.27, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <primitive object={hairMat} attach="material" />
      </mesh>

      {/* 4. Left Arm */}
      <group ref={leftArmRef} position={[-0.48, 1.6, 0]}>
        <mesh castShadow position={[0, -0.25, 0]}>
          <capsuleGeometry args={[0.09, 0.4, 6, 12]} />
          <primitive object={jerseyMat} attach="material" />
        </mesh>
        <mesh position={[0, -0.5, 0]}>
          <sphereGeometry args={[0.095, 8, 8]} />
          <primitive object={skinMat} attach="material" />
        </mesh>
      </group>

      {/* 5. Right Arm */}
      <group ref={rightArmRef} position={[0.48, 1.6, 0]}>
        <mesh castShadow position={[0, -0.25, 0]}>
          <capsuleGeometry args={[0.09, 0.4, 6, 12]} />
          <primitive object={jerseyMat} attach="material" />
        </mesh>
        <mesh position={[0, -0.5, 0]}>
          <sphereGeometry args={[0.095, 8, 8]} />
          <primitive object={skinMat} attach="material" />
        </mesh>
      </group>

      {/* 6. Left Leg */}
      <group ref={leftLegRef} position={[-0.18, 0.75, 0]}>
        {/* Thigh */}
        <mesh castShadow position={[0, -0.15, 0]}>
          <capsuleGeometry args={[0.12, 0.3, 6, 12]} />
          <primitive object={shortsPantsMat} attach="material" />
        </mesh>
        {/* Calf */}
        <mesh castShadow position={[0, -0.42, 0]}>
          <capsuleGeometry args={[0.105, 0.3, 6, 12]} />
          <primitive object={socksMat} attach="material" />
        </mesh>
        {/* Shoe */}
        <mesh castShadow position={[0, -0.62, 0.05]}>
          <boxGeometry args={[0.13, 0.12, 0.26]} />
          <primitive object={shoeMat} attach="material" />
        </mesh>
      </group>

      {/* 7. Right Leg */}
      <group ref={rightLegRef} position={[0.18, 0.75, 0]}>
        {/* Thigh */}
        <mesh castShadow position={[0, -0.15, 0]}>
          <capsuleGeometry args={[0.12, 0.3, 6, 12]} />
          <primitive object={shortsPantsMat} attach="material" />
        </mesh>
        {/* Calf */}
        <mesh castShadow position={[0, -0.42, 0]}>
          <capsuleGeometry args={[0.105, 0.3, 6, 12]} />
          <primitive object={socksMat} attach="material" />
        </mesh>
        {/* Shoe */}
        <mesh castShadow position={[0, -0.62, 0.05]}>
          <boxGeometry args={[0.13, 0.12, 0.26]} />
          <primitive object={shoeMat} attach="material" />
        </mesh>
      </group>

      {/* Goalkeeper indicator visor */}
      {isGoalkeeper && (
        <mesh position={[0, 2.12, 0.18]}>
          <boxGeometry args={[0.3, 0.06, 0.12]} />
          <meshBasicMaterial color="#00ffff" />
        </mesh>
      )}
    </group>
  )
}
