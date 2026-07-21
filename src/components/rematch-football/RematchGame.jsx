import React, { Suspense, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Physics } from '@react-three/cannon'
import { Environment, Stars, Sky } from '@react-three/drei'
import { useFootballStore } from './footballStore'
import { Arena } from './Arena'
import { Ball } from './Ball'
import { Player } from './Player'
import { Bot } from './Bot'
import * as THREE from 'three'

// Dynamic GK allocator and goal detection coordinator
function GoalkeeperManager() {
  const setGKs = useFootballStore((state) => state.setGKs)
  const gameState = useFootballStore((state) => state.gameState)
  const incrementScore = useFootballStore((state) => state.incrementScore)

  useFrame(() => {
    const ball = window.footballBall
    if (!ball) return

    const ballPos = ball.position.current
    const zPos = ballPos[2]

    // 1. Red team defends Z = 30. Who is closest to Z = 30?
    // P1 is the only player on Red team in 1v1.
    // If the ball is on Red half (Z > 0), set Red GK to 'player1' (user) so they get diving controls
    const redGK = zPos > 0 ? 'player1' : null

    // 2. Blue team defends Z = -30. Who is closest to Z = -30?
    // Bot is the only player on Blue team in 1v1.
    // If the ball is on Blue half (Z < 0), set Blue GK to 'bot1'
    const blueGK = zPos < 0 ? 'bot1' : null

    const currentRed = useFootballStore.getState().redGK
    const currentBlue = useFootballStore.getState().blueGK

    if (redGK !== currentRed || blueGK !== currentBlue) {
      setGKs(redGK, blueGK)
    }

    // 3. Goal Scoring Zone Triggers
    if (gameState === 'PLAYING') {
      if (zPos < -30.25 && Math.abs(ballPos[0]) < 5.0) {
        incrementScore('red') // Red scores in Opponent's goal (Z = -30)
      } else if (zPos > 30.25 && Math.abs(ballPos[0]) < 5.0) {
        incrementScore('blue') // Blue scores in User's goal (Z = 30)
      }
    }
  })

  return null
}

export function RematchGame({ onExit }) {
  const score = useFootballStore((state) => state.score)
  const gameState = useFootballStore((state) => state.gameState)
  const timer = useFootballStore((state) => state.timer)
  const stamina = useFootballStore((state) => state.stamina)
  const goalAlert = useFootballStore((state) => state.goalAlert)
  const setGameState = useFootballStore((state) => state.setGameState)
  const resetMatch = useFootballStore((state) => state.resetMatch)
  const tickTimer = useFootballStore((state) => state.tickTimer)

  // Start kickoff reset
  useEffect(() => {
    resetMatch()
  }, [])

  // Match Play Timer countdown
  useEffect(() => {
    let interval
    if (gameState === 'PLAYING') {
      interval = setInterval(() => {
        tickTimer()
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [gameState])

  // Kickoff delay timer
  useEffect(() => {
    if (gameState === 'KICKOFF' || gameState === 'GOAL_SCRIBED') {
      const timeout = setTimeout(() => {
        setGameState('PLAYING')
      }, 2500)
      return () => clearTimeout(timeout)
    }
  }, [gameState])

  const formatTime = (timeInSecs) => {
    const mins = Math.floor(timeInSecs / 60)
    const secs = timeInSecs % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#020617', position: 'relative', overflow: 'hidden' }}>
      
      {/* 1. 3D R3F Viewport Canvas */}
      <Canvas
        shadows
        camera={{ fov: 60, position: [0, 6, 12] }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <color attach="background" args={['#030712']} />
        <fog attach="fog" args={['#030712', 30, 95]} />

        {/* Lighting setup */}
        <ambientLight intensity={0.4} />
        <directionalLight 
          position={[15, 25, 10]} 
          intensity={1.5} 
          castShadow 
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-15, 20, -10]} intensity={0.5} />
        
        {/* Sky box / Arena setting */}
        <Sky distance={450000} sunPosition={[10, 12, 10]} inclination={0.6} azimuth={0.25} />
        <Stars radius={100} depth={50} count={1000} factor={4} saturation={0.5} fade speed={1} />
        <Environment preset="night" environmentIntensity={0.8} />

        {/* Cannon Physics World */}
        <Suspense fallback={null}>
          <Physics gravity={[0, -15, 0]}>
            <Arena />
            <Ball />
            <Player id="player1" />
            <Bot id="bot1" />
            <GoalkeeperManager />
          </Physics>
        </Suspense>
      </Canvas>

      {/* 2. Scoreboard & Timer Overlay */}
      <div style={{
        position: 'absolute',
        top: '25px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(15, 23, 42, 0.85)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        padding: '12px 30px',
        display: 'flex',
        alignItems: 'center',
        gap: '40px',
        fontFamily: "'Orbitron', sans-serif",
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(10px)',
        zIndex: 10,
        pointerEvents: 'none'
      }}>
        {/* Red Team Score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ color: '#ff007f', fontWeight: '900', fontSize: '1rem', letterSpacing: '2px' }}>RED</span>
          <span style={{ color: '#fff', fontSize: '2rem', fontWeight: '900' }}>{score.red}</span>
        </div>

        {/* Timer */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ color: '#64748b', fontSize: '0.7rem', letterSpacing: '2px', marginBottom: '2px' }}>TIME</span>
          <span style={{ color: '#39ff14', fontSize: '1.6rem', fontWeight: '800' }}>
            {gameState === 'KICKOFF' ? 'READY' : formatTime(timer)}
          </span>
        </div>

        {/* Blue Team Score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ color: '#fff', fontSize: '2rem', fontWeight: '900' }}>{score.blue}</span>
          <span style={{ color: '#00d2ff', fontWeight: '900', fontSize: '1rem', letterSpacing: '2px' }}>BLUE</span>
        </div>
      </div>

      {/* 3. Stamina Meter Overlay (Left-bottom corner) */}
      <div style={{
        position: 'absolute',
        bottom: '30px',
        left: '30px',
        width: '240px',
        background: 'rgba(15, 23, 42, 0.8)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '8px',
        padding: '12px 16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        zIndex: 10,
        pointerEvents: 'none'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.75rem', fontWeight: '800', color: '#cbd5e1', letterSpacing: '1px', fontFamily: '-apple-system, sans-serif' }}>
          <span>STAMINA (L-SHIFT)</span>
          <span>{Math.round(stamina)}%</span>
        </div>
        <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ width: `${stamina}%`, height: '100%', background: 'linear-gradient(90deg, #ff007f, #39ff14)', transition: 'width 0.1s ease' }}></div>
        </div>
      </div>

      {/* 4. Controls HUD Info Overlay (Right-bottom corner) */}
      <div style={{
        position: 'absolute',
        bottom: '30px',
        right: '30px',
        background: 'rgba(15, 23, 42, 0.75)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '8px',
        padding: '12px 18px',
        color: '#94a3b8',
        fontSize: '0.75rem',
        lineHeight: '1.5',
        fontFamily: 'sans-serif',
        pointerEvents: 'none',
        zIndex: 10
      }}>
        <b style={{ color: '#fff', fontSize: '0.8rem', display: 'block', marginBottom: '5px' }}>🎮 QUICK KEYBINDS:</b>
        Move: <b>W A S D</b> / Sprint: <b>L-SHIFT</b><br />
        Shoot: <b>SPACE (Hold to Charge)</b> / Pass: <b>E</b><br />
        Slide Tackle: <b>Q</b> / Save Dive (GK only): <b>SPACE</b>
      </div>

      {/* 5. Kickoff / Goal Flasher Alert Overlay */}
      {(gameState === 'KICKOFF' || gameState === 'GOAL_SCRIBED') && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(2, 6, 23, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          zIndex: 100,
          animation: 'fade-in 0.3s ease-out'
        }}>
          <h1 style={{
            fontSize: '4.5rem',
            fontWeight: '900',
            letterSpacing: '10px',
            color: '#fff',
            textShadow: '0 0 30px rgba(0, 210, 255, 0.6)',
            fontFamily: "'Orbitron', sans-serif",
            margin: 0
          }}>
            {gameState === 'KICKOFF' ? 'READY?' : goalAlert}
          </h1>
          <p style={{ color: '#64748b', fontSize: '1.2rem', letterSpacing: '4px', marginTop: '15px', textTransform: 'uppercase' }}>
            {gameState === 'KICKOFF' ? 'Match Ignition Starting...' : 'Resetting center kick...'}
          </p>
        </div>
      )}

      {/* 6. Game Over / Match End Screen Overlay */}
      {gameState === 'GAMEOVER' && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(2,6,23,0.92)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 150
        }}>
          <h1 style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '3.6rem',
            fontWeight: '900',
            letterSpacing: '6px',
            color: score.red > score.blue ? '#ff007f' : '#00d2ff',
            textShadow: `0 0 40px ${score.red > score.blue ? '#ff007f' : '#00d2ff'}`,
            marginBottom: '10px'
          }}>
            {score.red > score.blue ? 'RED TEAM WINS!' : 'BLUE TEAM WINS!'}
          </h1>
          <p style={{ fontFamily: 'monospace', fontSize: '1.4rem', color: '#94a3b8', margin: '0 0 40px' }}>
            Final Score: {score.red} - {score.blue}
          </p>
          
          <div style={{ display: 'flex', gap: '20px' }}>
            <button 
              onClick={resetMatch}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                padding: '16px 36px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'Orbitron', sans-serif",
                fontWeight: '900',
                letterSpacing: '2px',
                fontSize: '0.9rem',
                boxShadow: '0 4px 15px rgba(16,185,129,0.3)',
                transition: 'all 0.2s'
              }}
            >
              PLAY AGAIN
            </button>
            <button 
              onClick={onExit}
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: '#94a3b8',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '16px 36px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '0.9rem',
                letterSpacing: '2px'
              }}
            >
              EXIT TO MENU
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
