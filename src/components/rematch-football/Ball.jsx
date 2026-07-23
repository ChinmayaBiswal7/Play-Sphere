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
  // Realistic soccer ball radius (0.45 units)
  const [ref, api] = useSphere(() => ({
    mass: 1.2,
    position: [0, -500, 0],
    args: [0.45],
    linearDamping: 0.18,
    angularDamping: 0.25,
    restitution: 0.78
  }))

  const ballPos = useRef([0, -500, 0])
  const ballVel = useRef([0, 0, 0])
  const gameState = useFootballStore((state) => state.gameState)

  const texture = useMemo(() => createSoccerBallTexture(), [])

  useEffect(() => {
    const unsubPos = api.position.subscribe(v => (ballPos.current = v || [0, -500, 0]))
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

  useEffect(() => {
    if (gameState === 'MENU' || gameState === 'BOOT' || gameState === 'LOADING_MATCH') {
      api.position.set(0, -500, 0)
      api.velocity.set(0, 0, 0)
      api.angularVelocity.set(0, 0, 0)
    } else if (gameState === 'KICKOFF') {
      api.position.set(0, 0.9, 0)
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
        meshRef.current.rotation.x += vz * 0.06
        meshRef.current.rotation.z -= vx * 0.06
      }

      if (ballPos.current[1] < -5) {
        api.position.set(0, 0.9, 0)
        api.velocity.set(0, 0, 0)
      }
    }
  })

  const isVisible = gameState === 'PLAYING' || gameState === 'KICKOFF' || gameState === 'GOAL_CELEBRATION' || gameState === 'GOAL_REPLAY'

  return (
    <group ref={ref} visible={isVisible}>
      <group ref={meshRef}>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.45, 20, 20]} />
          <meshStandardMaterial map={texture} roughness={0.25} metalness={0.1} />
        </mesh>

        <mesh>
          <torusGeometry args={[0.46, 0.02, 8, 24]} />
          <meshBasicMaterial color="#00f2fe" />
        </mesh>
      </group>
    </group>
  )
}
