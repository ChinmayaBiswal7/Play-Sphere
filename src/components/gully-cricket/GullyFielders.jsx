import React, { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

function Fielder({ f }) {
  const ref = useRef()
  const [pos, setPos] = useState(f.pos)
  
  useFrame((state, delta) => {
    if (!ref.current) return
    
    // Animate toward ball if ball is in play
    const ball = window.gullyBall
    if (ball && ball.position && ball.position.current) {
      const bpos = ball.position.current
      if (bpos[1] > 0 && bpos[2] > -20 && bpos[2] < 20) { // If ball is somewhat near
        const dx = bpos[0] - pos[0]
        const dz = bpos[2] - pos[2]
        const dist = Math.hypot(dx, dz)
        if (dist > 1 && dist < 15) {
          const moveX = (dx / dist) * delta * 2
          const moveZ = (dz / dist) * delta * 2
          setPos([pos[0] + moveX, pos[1], pos[2] + moveZ])
        }
      }
    }
    ref.current.position.set(pos[0], pos[1], pos[2])
    
    // Look at ball roughly
    if (ball && ball.position && ball.position.current) {
       ref.current.lookAt(ball.position.current[0], 0, ball.position.current[2])
    }
  })

  return (
    <group ref={ref} position={f.pos}>
      {/* Ground Shadow */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.06, 0]}>
        <circleGeometry args={[0.4, 16]} />
        <meshBasicMaterial color="#000" transparent opacity={0.3} />
      </mesh>

      <mesh castShadow position={[-0.15, 0.4, 0]}><cylinderGeometry args={[0.08, 0.07, 0.8, 12]} /><meshStandardMaterial color="#1e293b" /></mesh>
      <mesh castShadow position={[0.15, 0.4, 0]}><cylinderGeometry args={[0.08, 0.07, 0.8, 12]} /><meshStandardMaterial color="#1e293b" /></mesh>
      <mesh castShadow position={[0, 1.15, 0]}><cylinderGeometry args={[0.22, 0.19, 0.6, 12]} /><meshStandardMaterial color={f.color} roughness={0.4} /></mesh>
      <mesh castShadow position={[-0.25, 1.1, -0.1]} rotation={[0.4, 0, 0]}><cylinderGeometry args={[0.05, 0.05, 0.45, 12]} /><meshStandardMaterial color="#f5d0a9" /></mesh>
      <mesh castShadow position={[0.25, 1.1, -0.1]} rotation={[0.4, 0, 0]}><cylinderGeometry args={[0.05, 0.05, 0.45, 12]} /><meshStandardMaterial color="#f5d0a9" /></mesh>
      <mesh position={[0, 1.52, 0]}><cylinderGeometry args={[0.07, 0.08, 0.1, 12]} /><meshStandardMaterial color="#f5d0a9" /></mesh>
      <mesh castShadow position={[0, 1.68, 0]}><sphereGeometry args={[0.15, 16, 16]} /><meshStandardMaterial color="#f5d0a9" /></mesh>
      <mesh castShadow position={[0, 1.76, 0]}><sphereGeometry args={[0.16, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#1d4ed8" /></mesh>
      
      <Html position={[0, 2, 0]} center distanceFactor={15}>
        <div style={{ color: '#fff', fontSize: '0.6rem', fontWeight: 'bold', background: 'rgba(0,0,0,0.5)', padding: '2px 4px', borderRadius: '4px' }}>
          {f.name}
        </div>
      </Html>
    </group>
  )
}

export function GullyFielders() {
  const fielders = useMemo(() => [
    { id: 'f1', name: 'GULLY (SLIP)', pos: [-4.5, 0, 8.0], color: '#3b82f6' },
    { id: 'f2', name: 'POINT', pos: [-7.0, 0, 0], color: '#3b82f6' },
    { id: 'f3', name: 'COVER', pos: [-6.5, 0, -10.0], color: '#3b82f6' },
    { id: 'f4', name: 'MID-ON', pos: [4.0, 0, -16.0], color: '#3b82f6' },
    { id: 'f5', name: 'MID-OFF', pos: [-4.0, 0, -16.0], color: '#3b82f6' },
    { id: 'f6', name: 'SQUARE LEG', pos: [6.5, 0, 4.0], color: '#3b82f6' }
  ], [])

  return (
    <group>
      {fielders.map((f) => (
        <Fielder key={f.id} f={f} />
      ))}
    </group>
  )
}
