import React from 'react'

export function GullyFielders() {
  const fielders = [
    { id: 'keeper', pos: [0, 0, 15], name: 'KEEPER' },
    { id: 'cover', pos: [-7.5, 0, 2], name: 'COVER' },
    { id: 'midwicket', pos: [7.5, 0, -2], name: 'MIDWICKET' },
    { id: 'longwall', pos: [0, 0, -35], name: 'WALL FIELDER' }
  ]

  return (
    <group>
      {fielders.map((f) => (
        <group key={f.id} position={f.pos}>
          {/* Fielder Body */}
          <mesh castShadow position={[0, 1.1, 0]}>
            <cylinderGeometry args={[0.3, 0.26, 0.75, 14]} />
            <meshStandardMaterial color="#0284c7" roughness={0.4} />
          </mesh>
          {/* Head */}
          <mesh castShadow position={[0, 1.7, 0]}>
            <sphereGeometry args={[0.2, 14, 14]} />
            <meshStandardMaterial color="#f5d0a9" roughness={0.4} />
          </mesh>
          {/* Legs */}
          <mesh castShadow position={[-0.13, 0.4, 0]}>
            <cylinderGeometry args={[0.1, 0.08, 0.8, 12]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
          <mesh castShadow position={[0.13, 0.4, 0]}>
            <cylinderGeometry args={[0.1, 0.08, 0.8, 12]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
        </group>
      ))}
    </group>
  )
}
