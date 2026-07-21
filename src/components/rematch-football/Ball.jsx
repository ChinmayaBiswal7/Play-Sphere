import React, { useRef, useEffect } from 'react'
import { useSphere } from '@react-three/cannon'
import { useFrame } from '@react-three/fiber'
import { useFootballStore } from './footballStore'

export function Ball() {
  // Cannon Sphere body
  const [ref, api] = useSphere(() => ({
    mass: 1.3,
    position: [0, 3, 0],
    args: [0.55],
    linearDamping: 0.15,
    angularDamping: 0.22,
    restitution: 0.72 // High bounce
  }))

  const ballPos = useRef([0, 3, 0])
  const ballVel = useRef([0, 0, 0])

  useEffect(() => {
    // Subscribe to physics values
    const unsubPos = api.position.subscribe(v => (ballPos.current = v))
    const unsubVel = api.velocity.subscribe(v => (ballVel.current = v))
    
    // Save on window for Player & Bot AI
    window.footballBall = {
      position: ballPos,
      velocity: ballVel,
      api: api
    }

    return () => {
      unsubPos()
      unsubVel()
      window.footballBall = null
    }
  }, [api])

  const gameState = useFootballStore((state) => state.gameState)

  // Kickoff position resets
  useEffect(() => {
    if (gameState === 'KICKOFF' || gameState === 'LOBBY') {
      api.position.set(0, 3.5, 0)
      api.velocity.set(0, 0, 0)
      api.angularVelocity.set(0, 0, 0)
    }
  }, [gameState, api])

  // Rolling visual rotation based on speed
  const meshRef = useRef()
  useFrame(() => {
    if (meshRef.current) {
      const vx = ballVel.current[0]
      const vz = ballVel.current[2]
      const speed = Math.hypot(vx, vz)
      if (speed > 0.15) {
        meshRef.current.rotation.x += vz * 0.05
        meshRef.current.rotation.z -= vx * 0.05
      }
    }
  })

  return (
    <group ref={ref}>
      <group ref={meshRef}>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.55, 16, 16]} />
          <meshStandardMaterial 
            color="#ffffff" 
            roughness={0.3} 
            metalness={0.1}
          />
        </mesh>
        
        {/* Glow rings */}
        <mesh>
          <torusGeometry args={[0.56, 0.03, 8, 24]} />
          <meshBasicMaterial color="#00d2ff" />
        </mesh>
      </group>
    </group>
  )
}
