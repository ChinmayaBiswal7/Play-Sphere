import React, { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/cannon'
import { Environment, Sky, Stars } from '@react-three/drei'
import { useLagoriStore } from './lagoriStore'
import { LagoriGround } from './LagoriGround'
import { StoneStack } from './StoneStack'
import { LagoriBall } from './LagoriBall'
import { LagoriPlayer } from './LagoriPlayer'
import { LagoriBot } from './LagoriBot'
import * as THREE from 'three'

export function LagoriGame({ onExit }) {
  const gameState = useLagoriStore((state) => state.gameState)
  const score = useLagoriStore((state) => state.score)
  const round = useLagoriStore((state) => state.round)
  const stonesRebuilt = useLagoriStore((state) => state.stonesRebuilt)
  const heldStonesCount = useLagoriStore((state) => state.heldStonesCount)
  const stamina = useLagoriStore((state) => state.stamina)
  const isStackKnockedDown = useLagoriStore((state) => state.isStackKnockedDown)
  const roundResultAlert = useLagoriStore((state) => state.roundResultAlert)
  const setGameState = useLagoriStore((state) => state.setGameState)
  const resetRound = useLagoriStore((state) => state.resetRound)
  const resetMatch = useLagoriStore((state) => state.resetMatch)

  useEffect(() => {
    if (gameState === 'BOOT') {
      const timer = setTimeout(() => {
        setGameState('MENU')
      }, 2400)
      return () => clearTimeout(timer)
    }
  }, [gameState])

  const startMatch = () => {
    resetMatch()
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#090d16', position: 'relative', overflow: 'hidden', userSelect: 'none' }}>
      
      {/* ── 1. BOOT SCREEN ── */}
      {gameState === 'BOOT' && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at center, #1e1b4b 0%, #090d16 100%)',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Orbitron', sans-serif"
        }}>
          <h1 style={{ fontSize: '5rem', fontWeight: '900', color: '#facc15', letterSpacing: '12px', textShadow: '0 0 40px rgba(250, 204, 21, 0.8)', margin: 0 }}>
            LAGORI
          </h1>
          <p style={{ color: '#94a3b8', letterSpacing: '6px', fontSize: '1.1rem', marginTop: '12px', fontWeight: '800' }}>
            SEVEN STONES 3D ARCADE 2026
          </p>
        </div>
      )}

      {/* ── 2. 3D SCENE CANVAS ── */}
      <Canvas
        shadows
        camera={{ fov: 62, position: [0, 2.4, 16] }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <color attach="background" args={['#0c0a09']} />
        <fog attach="fog" args={['#0c0a09', 50, 180]} />

        <ambientLight intensity={0.75} />
        <directionalLight 
          position={[25, 45, 20]} 
          intensity={2.2} 
          castShadow 
          shadow-mapSize={[1024, 1024]}
        />

        <Sky distance={450000} sunPosition={[15, 20, 10]} inclination={0.5} azimuth={0.25} />
        <Stars radius={100} depth={50} count={800} factor={4} fade />
        <Environment preset="park" environmentIntensity={0.8} />

        <Suspense fallback={null}>
          <Physics gravity={[0, -15, 0]}>
            <LagoriGround />
            <StoneStack />
            <LagoriBall />
            <LagoriPlayer id="player1" />
            <LagoriBot id="bot1" team="defenders" />
          </Physics>
        </Suspense>
      </Canvas>

      {/* ── 3. MAIN MENU / LOBBY ── */}
      {gameState === 'MENU' && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(9, 13, 22, 0.85)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Orbitron', sans-serif",
          zIndex: 100
        }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <span style={{ fontSize: '4rem', display: 'block', marginBottom: '10px' }}>🪨</span>
            <h1 style={{ fontSize: '4rem', fontWeight: '900', color: '#facc15', letterSpacing: '8px', margin: 0 }}>
              LAGORI 3D
            </h1>
            <p style={{ color: '#94a3b8', letterSpacing: '4px', fontSize: '1rem', marginTop: '10px' }}>
              SEVEN STONES INDIAN OUTDOOR CHAMPIONSHIP
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '320px' }}>
            <button
              onClick={startMatch}
              style={{
                background: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)',
                color: '#000',
                border: 'none',
                borderRadius: '10px',
                padding: '18px 30px',
                fontWeight: '900',
                fontSize: '1.1rem',
                letterSpacing: '2px',
                cursor: 'pointer',
                boxShadow: '0 8px 30px rgba(250, 204, 21, 0.4)'
              }}
            >
              ▶ PLAY 1V1 MATCH
            </button>

            <button
              onClick={onExit}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#94a3b8',
                borderRadius: '10px',
                padding: '14px 30px',
                fontWeight: '800',
                fontSize: '0.9rem',
                letterSpacing: '1px',
                cursor: 'pointer'
              }}
            >
              EXIT TO CONSOLE
            </button>
          </div>

          <div style={{ marginTop: '50px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(250, 204, 21, 0.3)', borderRadius: '12px', padding: '16px 24px', maxWidth: '500px', textAlign: 'center' }}>
            <h4 style={{ margin: '0 0 6px', color: '#facc15', fontSize: '0.95rem' }}>HOW TO PLAY</h4>
            <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.8rem', lineHeight: '1.5', fontFamily: 'sans-serif' }}>
              1. <b>Left Click</b> to throw ball and knock down 7 stacked stones.<br />
              2. <b>Press E</b> to pick up scattered stones on ground.<br />
              3. Run to center pedestal and <b>Press E</b> to rebuild all 7 stones before Defender hits you!
            </p>
          </div>
        </div>
      )}

      {/* ── 4. IN-GAME HUD OVERLAYS ── */}
      {(gameState === 'AIM_THROW' || gameState === 'REBUILD_DEFEND') && (
        <>
          {/* Top Scorebar */}
          <div style={{
            position: 'absolute',
            top: '25px',
            left: '30px',
            background: 'rgba(15, 23, 42, 0.88)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            padding: '10px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            fontFamily: "'Orbitron', sans-serif",
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(10px)',
            zIndex: 10
          }}>
            <span style={{ background: '#facc15', color: '#000', fontSize: '0.75rem', fontWeight: '900', padding: '3px 8px', borderRadius: '4px' }}>
              ROUND {round}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#090d16', padding: '6px 16px', borderRadius: '6px' }}>
              <span style={{ color: '#ef4444', fontWeight: '900', fontSize: '1.1rem' }}>SEEKERS {score.seekers}</span>
              <span style={{ color: '#64748b' }}>|</span>
              <span style={{ color: '#0284c7', fontWeight: '900', fontSize: '1.1rem' }}>{score.defenders} DEFENDERS</span>
            </div>
          </div>

          {/* Phase Banner */}
          <div style={{
            position: 'absolute',
            top: '25px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(15, 23, 42, 0.9)',
            border: '2px solid #facc15',
            borderRadius: '30px',
            padding: '10px 28px',
            color: '#facc15',
            fontFamily: "'Orbitron', sans-serif",
            fontWeight: '900',
            fontSize: '0.9rem',
            letterSpacing: '2px',
            boxShadow: '0 4px 20px rgba(250, 204, 21, 0.3)',
            zIndex: 10
          }}>
            {gameState === 'AIM_THROW' ? '🎯 LEFT CLICK TO THROW BALL AT STACK!' : '🏃 REBUILD THE 7-STONE STACK!'}
          </div>

          {/* Stack Progress Counter & Inventory */}
          <div style={{
            position: 'absolute',
            bottom: '35px',
            right: '30px',
            background: 'rgba(15, 23, 42, 0.88)',
            border: '1px solid rgba(250, 204, 21, 0.5)',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            fontFamily: "'Orbitron', sans-serif",
            color: '#fff',
            zIndex: 10
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>STACK REBUILT:</span>
              <b style={{ color: '#facc15' }}>{stonesRebuilt} / 7 STONES</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>INVENTORY CARRIED:</span>
              <b style={{ color: '#22c55e' }}>{heldStonesCount} STONES</b>
            </div>
          </div>

          {/* Segmented Stamina Bar */}
          <div style={{
            position: 'absolute',
            bottom: '35px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '280px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 10
          }}>
            <div style={{ display: 'flex', width: '100%', height: '12px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', overflow: 'hidden', padding: '2px', gap: '3px' }}>
              {[1, 2, 3, 4, 5].map((seg) => {
                const filled = stamina >= seg * 20
                return (
                  <div
                    key={seg}
                    style={{
                      flex: 1,
                      height: '100%',
                      background: filled ? 'linear-gradient(90deg, #facc15, #eab308)' : 'rgba(255,255,255,0.06)',
                      borderRadius: '2px'
                    }}
                  />
                )
              })}
            </div>
            <span style={{ color: '#94a3b8', fontSize: '0.65rem', fontWeight: '900', letterSpacing: '1px', marginTop: '4px', fontFamily: "'Orbitron', sans-serif" }}>
              STAMINA [SHIFT]
            </span>
          </div>
        </>
      )}

      {/* ── 5. ROUND RESULT OVERLAY ── */}
      {gameState === 'ROUND_OVER' && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(9, 13, 22, 0.92)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 150,
          fontFamily: "'Orbitron', sans-serif"
        }}>
          <h1 style={{
            fontSize: '3rem',
            fontWeight: '900',
            letterSpacing: '4px',
            color: '#facc15',
            textAlign: 'center',
            maxWidth: '700px',
            margin: '0 0 20px'
          }}>
            {roundResultAlert}
          </h1>

          <p style={{ color: '#cbd5e1', fontSize: '1.2rem', margin: '0 0 40px' }}>
            Score: SEEKERS {score.seekers} - {score.defenders} DEFENDERS
          </p>

          <button
            onClick={resetRound}
            style={{
              background: '#facc15',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              padding: '16px 36px',
              fontWeight: '900',
              fontSize: '1rem',
              letterSpacing: '2px',
              cursor: 'pointer',
              boxShadow: '0 8px 30px rgba(250, 204, 21, 0.4)'
            }}
          >
            NEXT ROUND ▶
          </button>
        </div>
      )}
    </div>
  )
}
