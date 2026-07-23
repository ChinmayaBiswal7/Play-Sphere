import React, { useRef, useEffect, useMemo } from 'react'
import { useSphere } from '@react-three/cannon'
import { useFrame } from '@react-three/fiber'
import { useLagoriStore } from './lagoriStore'
import * as THREE from 'three'

function createTennisBallTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')

  // Bright Yellow Tennis Ball Base
  ctx.fillStyle = '#eab308'
  ctx.fillRect(0, 0, 256, 256)

  // White Curved Tennis Seams
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 16
  ctx.beginPath()
  ctx.arc(64, 128, 90, -Math.PI / 2, Math.PI / 2)
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(192, 128, 90, Math.PI / 2, -Math.PI / 2)
  ctx.stroke()

  const texture = new THREE.CanvasTexture(canvas)
  return texture
}

export function LagoriBall() {
  const gameState = useLagoriStore((state) => state.gameState)
  const ballCarrier = useLagoriStore((state) => state.ballCarrier)
  const eliminatePlayer = useLagoriStore((state) => state.eliminatePlayer)

  const [ref, api] = useSphere(() => ({
    mass: 0.8,
    position: [0, 1.2, 13],
    args: [0.18],
    linearDamping: 0.15,
    angularDamping: 0.2,
    restitution: 0.85,
    onCollide: (e) => {
      // If thrown by defender AI and collides with Player during chase phase, tag player out!
      if (gameState === 'REBUILD_DEFEND' && e.body && e.body.name === 'player_body') {
        eliminatePlayer()
      }
    }
  }))

  const ballPos = useRef([0, 1.2, 13])
  const ballVel = useRef([0, 0, 0])

  const texture = useMemo(() => createTennisBallTexture(), [])

  useEffect(() => {
    const unsubPos = api.position.subscribe(v => (ballPos.current = v || [0, 1.2, 13]))
    const unsubVel = api.velocity.subscribe(v => (ballVel.current = v || [0, 0, 0]))

    window.lagoriBall = {
      position: ballPos,
      velocity: ballVel,
      api: api
    }

    return () => {
      unsubPos()
      unsubVel()
      window.lagoriBall = null
    }
  }, [api])

  // Reposition ball on round reset
  useEffect(() => {
    if (gameState === 'AIM_THROW' || gameState === 'MENU') {
      api.position.set(0, 1.2, 13)
      api.velocity.set(0, 0, 0)
      api.angularVelocity.set(0, 0, 0)
    }
  }, [gameState, api])

  const meshRef = useRef()
  useFrame(() => {
    if (meshRef.current && (gameState === 'REBUILD_DEFEND' || gameState === 'AIM_THROW')) {
      const vx = ballVel.current[0]
      const vz = ballVel.current[2]
      const speed = Math.hypot(vx, vz)
      if (speed > 0.15) {
        meshRef.current.rotation.x += vz * 0.1
        meshRef.current.rotation.z -= vx * 0.1
      }

      // Safety check: Reset ball if clipped below ground
      if (ballPos.current[1] < -4) {
        api.position.set(0, 1.2, 0)
        api.velocity.set(0, 0, 0)
      }
    }
  })

  return (
    <group ref={ref}>
      <group ref={meshRef}>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.18, 20, 20]} />
          <meshStandardMaterial map={texture} roughness={0.4} metalness={0.05} />
        </mesh>
      </group>
    </group>
  )
}
