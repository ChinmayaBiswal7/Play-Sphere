import React from 'react'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { useFootballStore } from './footballStore'

export function Arena() {
  const incrementScore = useFootballStore((state) => state.incrementScore)
  const gameState = useFootballStore((state) => state.gameState)

  const handleGoalTrigger = (teamWhoScored) => {
    if (gameState === 'PLAYING') {
      incrementScore(teamWhoScored)
    }
  }

  return (
    <group>
      {/* 1. Ground Plane (Pitch) */}
      <RigidBody type="fixed" colliders={false} restitution={0.5} friction={0.6}>
        {/* Visual Turf Grid */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[40, 70]} />
          <meshStandardMaterial 
            color="#0b1e14" 
            roughness={0.8} 
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

        {/* Physics Floor Collider */}
        <CuboidCollider args={[20, 0.1, 35]} position={[0, -0.1, 0]} />
      </RigidBody>

      {/* 2. Side Walls & Back Fences (Rink Style) */}
      {/* Ball bounces off everything, never leaves play */}
      <RigidBody type="fixed" colliders={false} restitution={0.7} friction={0.2}>
        {/* Left Side Wall (X = -18) */}
        <mesh position={[-18, 2, 0]}>
          <boxGeometry args={[0.2, 4, 60]} />
          <meshPhysicalMaterial 
            color="#00d2ff" 
            transparent 
            opacity={0.15} 
            roughness={0.1} 
            transmission={0.6} 
            thickness={1}
          />
        </mesh>
        {/* Left wall glowing top rail */}
        <mesh position={[-18, 4.05, 0]}>
          <boxGeometry args={[0.3, 0.1, 60]} />
          <meshBasicMaterial color="#00d2ff" />
        </mesh>
        <CuboidCollider args={[0.1, 2, 30]} position={[-18, 2, 0]} />

        {/* Right Side Wall (X = 18) */}
        <mesh position={[18, 2, 0]}>
          <boxGeometry args={[0.2, 4, 60]} />
          <meshPhysicalMaterial 
            color="#00d2ff" 
            transparent 
            opacity={0.15} 
            roughness={0.1} 
            transmission={0.6} 
            thickness={1}
          />
        </mesh>
        {/* Right wall glowing top rail */}
        <mesh position={[18, 4.05, 0]}>
          <boxGeometry args={[0.3, 0.1, 60]} />
          <meshBasicMaterial color="#00d2ff" />
        </mesh>
        <CuboidCollider args={[0.1, 2, 30]} position={[18, 2, 0]} />

        {/* Back Wall - Red Goal Side (Z = -30) - with goal opening in center */}
        {/* Left post extension (X: -18 to -5) */}
        <mesh position={[-11.5, 2, -30]}>
          <boxGeometry args={[13, 4, 0.2]} />
          <meshPhysicalMaterial color="#ff007f" transparent opacity={0.15} transmission={0.6} thickness={1} />
        </mesh>
        <CuboidCollider args={[6.5, 2, 0.1]} position={[-11.5, 2, -30]} />

        {/* Right post extension (X: 5 to 18) */}
        <mesh position={[11.5, 2, -30]}>
          <boxGeometry args={[13, 4, 0.2]} />
          <meshPhysicalMaterial color="#ff007f" transparent opacity={0.15} transmission={0.6} thickness={1} />
        </mesh>
        <CuboidCollider args={[6.5, 2, 0.1]} position={[11.5, 2, -30]} />

        {/* Back Wall - Blue Goal Side (Z = 30) - with goal opening in center */}
        {/* Left post extension (X: -18 to -5) */}
        <mesh position={[-11.5, 2, 30]}>
          <boxGeometry args={[13, 4, 0.2]} />
          <meshPhysicalMaterial color="#39ff14" transparent opacity={0.15} transmission={0.6} thickness={1} />
        </mesh>
        <CuboidCollider args={[6.5, 2, 0.1]} position={[-11.5, 2, 30]} />

        {/* Right post extension (X: 5 to 18) */}
        <mesh position={[11.5, 2, 30]}>
          <boxGeometry args={[13, 4, 0.2]} />
          <meshPhysicalMaterial color="#39ff14" transparent opacity={0.15} transmission={0.6} thickness={1} />
        </mesh>
        <CuboidCollider args={[6.5, 2, 0.1]} position={[11.5, 2, 30]} />
      </RigidBody>

      {/* 3. Red Goal Box (Z = -30) - Protects Red Goal. Open in front (Z = -30), closed on back/sides */}
      <RigidBody type="fixed" colliders={false} restitution={0.4} friction={0.3}>
        {/* Goal Back Netting (Z = -33) */}
        <mesh position={[0, 2, -33]}>
          <boxGeometry args={[10, 4, 0.1]} />
          <meshStandardMaterial color="#2d0015" wireframe />
        </mesh>
        <CuboidCollider args={[5, 2, 0.05]} position={[0, 2, -33]} />

        {/* Goal Left Wall (X = -5) */}
        <mesh position={[-5, 2, -31.5]}>
          <boxGeometry args={[0.1, 4, 3]} />
          <meshStandardMaterial color="#2d0015" wireframe />
        </mesh>
        <CuboidCollider args={[0.05, 2, 1.5]} position={[-5, 2, -31.5]} />

        {/* Goal Right Wall (X = 5) */}
        <mesh position={[5, 2, -31.5]}>
          <boxGeometry args={[0.1, 4, 3]} />
          <meshStandardMaterial color="#2d0015" wireframe />
        </mesh>
        <CuboidCollider args={[0.05, 2, 1.5]} position={[5, 2, -31.5]} />

        {/* Goal Crossbar */}
        <mesh position={[0, 4, -30]}>
          <boxGeometry args={[10.2, 0.2, 0.2]} />
          <meshBasicMaterial color="#ff007f" />
        </mesh>
      </RigidBody>

      {/* 4. Blue Goal Box (Z = 30) - Protects Blue Goal. Open in front (Z = 30), closed on back/sides */}
      <RigidBody type="fixed" colliders={false} restitution={0.4} friction={0.3}>
        {/* Goal Back Netting (Z = 33) */}
        <mesh position={[0, 2, 33]}>
          <boxGeometry args={[10, 4, 0.1]} />
          <meshStandardMaterial color="#0b2b00" wireframe />
        </mesh>
        <CuboidCollider args={[5, 2, 0.05]} position={[0, 2, 33]} />

        {/* Goal Left Wall (X = -5) */}
        <mesh position={[-5, 2, 31.5]}>
          <boxGeometry args={[0.1, 4, 3]} />
          <meshStandardMaterial color="#0b2b00" wireframe />
        </mesh>
        <CuboidCollider args={[0.05, 2, 1.5]} position={[-5, 2, 31.5]} />

        {/* Goal Right Wall (X = 5) */}
        <mesh position={[5, 2, 31.5]}>
          <boxGeometry args={[0.1, 4, 3]} />
          <meshStandardMaterial color="#0b2b00" wireframe />
        </mesh>
        <CuboidCollider args={[0.05, 2, 1.5]} position={[5, 2, 31.5]} />

        {/* Goal Crossbar */}
        <mesh position={[0, 4, 30]}>
          <boxGeometry args={[10.2, 0.2, 0.2]} />
          <meshBasicMaterial color="#39ff14" />
        </mesh>
      </RigidBody>

      {/* 5. Goal Trigger Sensors */}
      {/* Red Goal Sensor (Z is between -30 and -33. Reaching this awards goal to Red) */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider 
          sensor 
          args={[4.8, 2, 1]} 
          position={[0, 2, -31.5]} 
          onIntersectionEnter={() => handleGoalTrigger('red')}
        />
      </RigidBody>

      {/* Blue Goal Sensor (Z is between 30 and 33. Reaching this awards goal to Blue) */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider 
          sensor 
          args={[4.8, 2, 1]} 
          position={[0, 2, 31.5]} 
          onIntersectionEnter={() => handleGoalTrigger('blue')}
        />
      </RigidBody>
    </group>
  )
}
