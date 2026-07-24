import React, { useMemo } from 'react'

export function GullyFielders() {
  // Strategic Street Fielding Positions [x, z] around alley
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
        <group key={f.id} position={f.pos}>
          {/* Fielder Character Model */}
          {/* Legs */}
          <mesh castShadow position={[-0.15, 0.4, 0]}>
            <cylinderGeometry args={[0.08, 0.07, 0.8, 12]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          <mesh castShadow position={[0.15, 0.4, 0]}>
            <cylinderGeometry args={[0.08, 0.07, 0.8, 12]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>

          {/* Torso Jersey */}
          <mesh castShadow position={[0, 1.15, 0]}>
            <cylinderGeometry args={[0.22, 0.19, 0.6, 12]} />
            <meshStandardMaterial color={f.color} roughness={0.4} />
          </mesh>

          {/* Arms (Ready fielding crouch posture) */}
          <mesh castShadow position={[-0.25, 1.1, -0.1]} rotation={[0.4, 0, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.45, 12]} />
            <meshStandardMaterial color="#f5d0a9" />
          </mesh>
          <mesh castShadow position={[0.25, 1.1, -0.1]} rotation={[0.4, 0, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.45, 12]} />
            <meshStandardMaterial color="#f5d0a9" />
          </mesh>

          {/* Head & Cap */}
          <mesh position={[0, 1.52, 0]}>
            <cylinderGeometry args={[0.07, 0.08, 0.1, 12]} />
            <meshStandardMaterial color="#f5d0a9" />
          </mesh>
          <mesh castShadow position={[0, 1.68, 0]}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial color="#f5d0a9" />
          </mesh>
          <mesh castShadow position={[0, 1.76, 0]}>
            <sphereGeometry args={[0.16, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#1d4ed8" />
          </mesh>
        </group>
      ))}
    </group>
  )
}
