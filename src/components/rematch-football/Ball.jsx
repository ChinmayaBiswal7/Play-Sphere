import React, { useRef, useEffect } from 'react'
import { RigidBody, BallCollider } from '@react-three/rapier'
import { useFrame } from '@react-three/fiber'
import { useFootballStore } from './footballStore'
import * as THREE from 'three'

export function Ball() {
  const bodyRef = useRef()
  const gameState = useFootballStore((state) => state.gameState)

  useEffect(() => {
    // Save ball body ref globally for bots & player scripts to query physics values in real-time
    window.footballBallBody = bodyRef.current
    return () => {
      window.footballBallBody = null
    }
  }, [])

  // Kickoff / Goal reset handler
  useEffect(() => {
    if ((gameState === 'KICKOFF' || gameState === 'LOBBY') && bodyRef.current) {
      bodyRef.current.setTranslation({ x: 0, y: 3, z: 0 }, true)
      bodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
      bodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true)
    }
  }, [gameState])

  // Exaggerated rotation based on linear velocity to feel arcade-y
  const meshRef = useRef()
  useFrame(() => {
    if (bodyRef.current && meshRef.current) {
      const vel = bodyRef.current.linvel()
      const speed = Math.hypot(vel.x, vel.z)
      if (speed > 0.1) {
        // Rotate around axes perpendicular to motion
        meshRef.current.rotation.x += vel.z * 0.05
        meshRef.current.rotation.z -= vel.x * 0.05
      }
    }
  })

  return (
    <RigidBody
      ref={bodyRef}
      position={[0, 3, 0]}
      colliders={false}
      angularDamping={0.4}
      linearDamping={0.2}
      canSleep={false}
    >
      {/* Exaggerated arcade bounce: restitution 0.65 */}
      <BallCollider args={[0.55]} restitution={0.65} friction={0.4} mass={1.2} />
      
      {/* Ball Visual Mesh */}
      <group ref={meshRef}>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.55, 16, 16]} />
          <meshStandardMaterial 
            color="#fff" 
            roughness={0.4} 
            metalness={0.1}
          />
        </mesh>
        
        {/* Glow rings around the arcade ball */}
        <mesh>
          <torusGeometry args={[0.56, 0.03, 8, 24]} />
          <meshBasicMaterial color="#00d2ff" />
        </mesh>
      </group>
    </RigidBody>
  )
}
