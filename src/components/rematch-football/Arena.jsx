import React from 'react'
import { usePlane, useBox } from '@react-three/cannon'

function StaticWall({ position, args, color }) {
  const [ref] = useBox(() => ({
    type: 'Static',
    position,
    args,
    restitution: 0.72, // Springy boundaries
    friction: 0.1
  }))

  return (
    <mesh ref={ref}>
      <boxGeometry args={args} />
      <meshPhysicalMaterial 
        color={color} 
        transparent 
        opacity={0.16} 
        roughness={0.1} 
        transmission={0.65} 
        thickness={1}
      />
    </mesh>
  )
}

function WallCap({ position, args, color }) {
  return (
    <mesh position={position}>
      <boxGeometry args={args} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}

export function Arena() {
  // Ground floor plane
  const [floorRef] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, 0, 0],
    type: 'Static',
    restitution: 0.45,
    friction: 0.6
  }))

  // Goal back nets (Static boxes)
  const [redGoalBackRef] = useBox(() => ({ type: 'Static', position: [0, 2, -33.0], args: [10, 4, 0.2] }))
  const [redGoalLeftRef] = useBox(() => ({ type: 'Static', position: [-5, 2, -31.5], args: [0.2, 4, 3] }))
  const [redGoalRightRef] = useBox(() => ({ type: 'Static', position: [5, 2, -31.5], args: [0.2, 4, 3] }))

  const [blueGoalBackRef] = useBox(() => ({ type: 'Static', position: [0, 2, 33.0], args: [10, 4, 0.2] }))
  const [blueGoalLeftRef] = useBox(() => ({ type: 'Static', position: [-5, 2, 31.5], args: [0.2, 4, 3] }))
  const [blueGoalRightRef] = useBox(() => ({ type: 'Static', position: [5, 2, 31.5], args: [0.2, 4, 3] }))

  return (
    <group>
      {/* 1. Ground Plane (Turf) */}
      <mesh ref={floorRef} receiveShadow>
        <planeGeometry args={[40, 70]} />
        <meshStandardMaterial 
          color="#0b1e14" 
          roughness={0.85} 
          metalness={0.1}
        />
      </mesh>
      
      {/* Center line, center circle markings */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[36, 0.2]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <ringGeometry args={[6, 6.2, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
      </mesh>

      {/* 2. Side Walls & Back Fences (Rink Style) */}
      {/* Left Side Wall (X = -18) */}
      <StaticWall position={[-18, 2, 0]} args={[0.25, 4, 60]} color="#00d2ff" />
      <WallCap position={[-18, 4.05, 0]} args={[0.3, 0.1, 60]} color="#00d2ff" />

      {/* Right Side Wall (X = 18) */}
      <StaticWall position={[18, 2, 0]} args={[0.25, 4, 60]} color="#00d2ff" />
      <WallCap position={[18, 4.05, 0]} args={[0.3, 0.1, 60]} color="#00d2ff" />

      {/* Back Wall - Red Goal Side (Z = -30) - with goal opening in center */}
      {/* Left post extension (X: -18 to -5) */}
      <StaticWall position={[-11.5, 2, -30]} args={[13, 4, 0.2]} color="#ff007f" />
      {/* Right post extension (X: 5 to 18) */}
      <StaticWall position={[11.5, 2, -30]} args={[13, 4, 0.2]} color="#ff007f" />

      {/* Back Wall - Blue Goal Side (Z = 30) - with goal opening in center */}
      {/* Left post extension (X: -18 to -5) */}
      <StaticWall position={[-11.5, 2, 30]} args={[13, 4, 0.2]} color="#39ff14" />
      {/* Right post extension (X: 5 to 18) */}
      <StaticWall position={[11.5, 2, 30]} args={[13, 4, 0.2]} color="#39ff14" />

      {/* 3. Red Goal Box Visuals & Physics */}
      <mesh ref={redGoalBackRef}>
        <boxGeometry args={[10, 4, 0.1]} />
        <meshStandardMaterial color="#ff007f" wireframe />
      </mesh>
      <mesh ref={redGoalLeftRef}>
        <boxGeometry args={[0.1, 4, 3]} />
        <meshStandardMaterial color="#ff007f" wireframe />
      </mesh>
      <mesh ref={redGoalRightRef}>
        <boxGeometry args={[0.1, 4, 3]} />
        <meshStandardMaterial color="#ff007f" wireframe />
      </mesh>
      <mesh position={[0, 4, -30.0]}>
        <boxGeometry args={[10.2, 0.2, 0.2]} />
        <meshBasicMaterial color="#ff007f" />
      </mesh>

      {/* 4. Blue Goal Box Visuals & Physics */}
      <mesh ref={blueGoalBackRef}>
        <boxGeometry args={[10, 4, 0.1]} />
        <meshStandardMaterial color="#39ff14" wireframe />
      </mesh>
      <mesh ref={blueGoalLeftRef}>
        <boxGeometry args={[0.1, 4, 3]} />
        <meshStandardMaterial color="#39ff14" wireframe />
      </mesh>
      <mesh ref={blueGoalRightRef}>
        <boxGeometry args={[0.1, 4, 3]} />
        <meshStandardMaterial color="#39ff14" wireframe />
      </mesh>
      <mesh position={[0, 4, 30.0]}>
        <boxGeometry args={[10.2, 0.2, 0.2]} />
        <meshBasicMaterial color="#39ff14" />
      </mesh>
    </group>
  )
}
