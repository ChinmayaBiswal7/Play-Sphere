import React, { useRef, useEffect, useMemo } from 'react'
import { useSphere } from '@react-three/cannon'
import { useFrame } from '@react-three/fiber'
import { useFootballStore } from './footballStore'
import * as THREE from 'three'

function createSoccerBallTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 256, 256)

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
    position: [0, -50, 0], // Spawn hidden underground for MENU
    args: [0.55],
    linearDamping: 0.15,
    angularDamping: 0.22,
    restitution: 0.75
  }))

  const ballPos = useRef([0, -50, 0])
  const ballVel = useRef([0, 0, 0])
  const gameState = useFootballStore((state) => state.gameState)

  const texture = useMemo(() => createSoccerBallTexture(), [])

  useEffect(() => {
    const unsubPos = api.position.subscribe(v => (ballPos.current = v || [0, -50, 0]))
    const unsubVel = api.velocity.subscribe(v => (ballVel.current = v || [0, 0, 0]))

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

  // Move ball underground in MENU mode, and reset to center pitch in KICKOFF
  useEffect(() => {
    if (gameState === 'MENU' || gameState === 'BOOT') {
      api.position.set(0, -50, 0)
      api.velocity.set(0, 0, 0)
      api.angularVelocity.set(0, 0, 0)
    } else if (gameState === 'KICKOFF') {
      api.position.set(0, 2.5, 0)
      api.velocity.set(0, 0, 0)
      api.angularVelocity.set(0, 0, 0)
    }
  }, [gameState, api])

  const meshRef = useRef()
  useFrame(() => {
    if (meshRef.current && gameState === 'PLAYING') {
      const vx = ballVel.current[0]
      const vz = ballVel.current[2]
      const speed = Math.hypot(vx, vz)
      if (speed > 0.15) {
        meshRef.current.rotation.x += vz * 0.05
        meshRef.current.rotation.z -= vx * 0.05
      }
    }
  })

  // Hide ball visually during MENU state
  if (gameState === 'MENU' || gameState === 'BOOT') return null

  return (
    <group ref={ref}>
      <group ref={meshRef}>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.55, 24, 24]} />
          <meshStandardMaterial map={texture} roughness={0.25} metalness={0.1} />
        </mesh>

        <mesh>
          <torusGeometry args={[0.56, 0.025, 8, 32]} />
          <meshBasicMaterial color="#00f2fe" />
        </mesh>
      </group>
    </group>
  )
}
