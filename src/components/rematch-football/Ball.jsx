import React, { useRef, useEffect, useMemo } from 'react'
import { useSphere } from '@react-three/cannon'
import { useFrame } from '@react-three/fiber'
import { useFootballStore } from './footballStore'
import * as THREE from 'three'

/**
 * Creates classic soccer ball texture
 */
function createSoccerBallTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 256, 256)

  // Black pentagon patterns
  ctx.fillStyle = '#09090b'
  const spots = [
    [64, 64], [192, 64], [128, 128], [64, 192], [192, 192]
  ]
  spots.forEach(([x, y]) => {
    ctx.beginPath()
    ctx.arc(x, y, 28, 0, Math.PI * 2)
    ctx.fill()
  })

  return new THREE.CanvasTexture(canvas)
}

export function Ball() {
  const [ref, api] = useSphere(() => ({
    mass: 1.3,
    position: [0, 3, 0],
    args: [0.55],
    linearDamping: 0.15,
    angularDamping: 0.22,
    restitution: 0.75
  }))

  const ballPos = useRef([0, 3, 0])
  const ballVel = useRef([0, 0, 0])

  const texture = useMemo(() => createSoccerBallTexture(), [])

  useEffect(() => {
    const unsubPos = api.position.subscribe(v => (ballPos.current = v))
    const unsubVel = api.velocity.subscribe(v => (ballVel.current = v))

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

  useEffect(() => {
    if (gameState === 'KICKOFF' || gameState === 'MENU') {
      api.position.set(0, 3.5, 0)
      api.velocity.set(0, 0, 0)
      api.angularVelocity.set(0, 0, 0)
    }
  }, [gameState, api])

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
          <sphereGeometry args={[0.55, 24, 24]} />
          <meshStandardMaterial map={texture} roughness={0.25} metalness={0.1} />
        </mesh>

        {/* Arcade Neon Ring */}
        <mesh>
          <torusGeometry args={[0.56, 0.025, 8, 32]} />
          <meshBasicMaterial color="#00f2fe" />
        </mesh>
      </group>
    </group>
  )
}
