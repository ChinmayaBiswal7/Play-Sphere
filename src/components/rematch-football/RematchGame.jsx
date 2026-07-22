import React, { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Physics } from '@react-three/cannon'
import { Environment, Stars, Sky } from '@react-three/drei'
import { useFootballStore } from './footballStore'
import { Arena } from './Arena'
import { Ball } from './Ball'
import { Player } from './Player'
import { Bot } from './Bot'
import { HumanModel } from './HumanModel'
import * as THREE from 'three'

// Dynamic Goalkeeper Allocator & Goal Trigger
function GoalkeeperManager() {
  const setGKs = useFootballStore((state) => state.setGKs)
  const gameState = useFootballStore((state) => state.gameState)
  const incrementScore = useFootballStore((state) => state.incrementScore)

  useFrame(() => {
    const ball = window.footballBall
    if (!ball) return

    const ballPos = ball.position.current
    const zPos = ballPos[2]

    const redGK = zPos > 0 ? 'player1' : null
    const blueGK = zPos < 0 ? 'bot1' : null

    const currentRed = useFootballStore.getState().redGK
    const currentBlue = useFootballStore.getState().blueGK

    if (redGK !== currentRed || blueGK !== currentBlue) {
      setGKs(redGK, blueGK)
    }

    if (gameState === 'PLAYING') {
      if (zPos < -30.25 && Math.abs(ballPos[0]) < 5.0) {
        incrementScore('red')
      } else if (zPos > 30.25 && Math.abs(ballPos[0]) < 5.0) {
        incrementScore('blue')
      }
    }
  })

  return null
}

/**
 * Circular Radar Mini-Map
 */
function MiniMapRadar() {
  const canvasRef = useRef(null)

  useEffect(() => {
    let animId
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const draw = () => {
      ctx.clearRect(0, 0, 140, 140)

      // Radar Background
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'
      ctx.beginPath()
      ctx.arc(70, 70, 64, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
      ctx.lineWidth = 2
      ctx.stroke()

      // Pitch Boundary
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
      ctx.strokeRect(35, 20, 70, 100)

      ctx.beginPath()
      ctx.moveTo(35, 70)
      ctx.lineTo(105, 70)
      ctx.stroke()

      // Goal Boxes
      ctx.strokeRect(55, 20, 30, 12)
      ctx.strokeRect(55, 108, 30, 12)

      const mapX = (x) => 70 + (x / 18) * 35
      const mapZ = (z) => 70 + (z / 30) * 50

      // Player 1 (Red)
      const p = window.footballPlayer
      if (p) {
        const px = mapX(p.position.current[0])
        const pz = mapZ(p.position.current[2])
        ctx.fillStyle = '#ef4444'
        ctx.beginPath()
        ctx.arc(px, pz, 5, 0, Math.PI * 2)
        ctx.fill()
      }

      // Bot (Blue)
      const b = window.footballBot
      if (b) {
        const bx = mapX(b.position.current[0])
        const bz = mapZ(b.position.current[2])
        ctx.fillStyle = '#0284c7'
        ctx.beginPath()
        ctx.arc(bx, bz, 5, 0, Math.PI * 2)
        ctx.fill()
      }

      // Ball
      const ball = window.footballBall
      if (ball) {
        const ballX = mapX(ball.position.current[0])
        const ballZ = mapZ(ball.position.current[2])
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(ballX, ballZ, 4, 0, Math.PI * 2)
        ctx.fill()
      }

      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animId)
  }, [])

  return (
    <div style={{
      position: 'absolute',
      bottom: '30px',
      right: '30px',
      width: '140px',
      height: '140px',
      borderRadius: '50%',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      pointerEvents: 'none',
      zIndex: 20
    }}>
      <canvas ref={canvasRef} width={140} height={140} />
    </div>
  )
}

function ShowcaseCamera() {
  useFrame((state) => {
    state.camera.position.set(0, 1.8, 3.8)
    state.camera.lookAt(0, 1.35, 0)
  })
  return null
}

const PRO_TIPS = [
  "Staying high up on the pitch allows to receive passes and counter-attack quickly but will leave your teammates in inferior numbers and vulnerable.",
  "Wall rebounds are valid pass routes! Bounce the ball off side barriers to bypass aggressive defenders.",
  "Hold SPACE to charge your shot power before releasing towards goal.",
  "Use L-SHIFT to sprint down the wings when you spot open grass."
]

export function RematchGame({ onExit }) {
  const score = useFootballStore((state) => state.score)
  const gameState = useFootballStore((state) => state.gameState)
  const timer = useFootballStore((state) => state.timer)
  const stamina = useFootballStore((state) => state.stamina)
  const goalAlert = useFootballStore((state) => state.goalAlert)
  const setGameState = useFootballStore((state) => state.setGameState)
  const resetMatch = useFootballStore((state) => state.resetMatch)
  const tickTimer = useFootballStore((state) => state.tickTimer)
  
  const activeMenuTab = useFootballStore((state) => state.activeMenuTab)
  const setActiveMenuTab = useFootballStore((state) => state.setActiveMenuTab)
  const characterPreset = useFootballStore((state) => state.characterPreset)
  const setCharacterPreset = useFootballStore((state) => state.setCharacterPreset)
  const arenaStyle = useFootballStore((state) => state.arenaStyle)
  const setArenaStyle = useFootballStore((state) => state.setArenaStyle)

  const [tipIndex, setTipIndex] = useState(0)

  // Boot Loading Screen Timer
  useEffect(() => {
    if (gameState === 'BOOT') {
      const bootTimer = setTimeout(() => {
        setGameState('MENU')
      }, 2800)
      return () => clearTimeout(bootTimer)
    }
  }, [gameState])

  // Match Play Timer
  useEffect(() => {
    let interval
    if (gameState === 'PLAYING') {
      interval = setInterval(() => {
        tickTimer()
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [gameState])

  // Kickoff delay
  useEffect(() => {
    if (gameState === 'KICKOFF' || gameState === 'GOAL_SCRIBED') {
      const timeout = setTimeout(() => {
        setGameState('PLAYING')
      }, 2500)
      return () => clearTimeout(timeout)
    }
  }, [gameState])

  const startMatchWithLoading = () => {
    setGameState('LOADING_MATCH')
    setTimeout(() => {
      resetMatch()
    }, 1800)
  }

  const formatTime = (timeInSecs) => {
    const mins = Math.floor(timeInSecs / 60)
    const secs = timeInSecs % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#090d16', position: 'relative', overflow: 'hidden', userSelect: 'none' }}>
      
      {/* ── 1. AUTHENTIC REMATCH BOOT / LOADING SCREEN (Matching Screenshot 1) ── */}
      {(gameState === 'BOOT' || gameState === 'LOADING_MATCH') && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at center, #1e293b 0%, #090d16 100%)',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px 80px',
          fontFamily: "'Orbitron', sans-serif"
        }}>
          {/* Top Decorative Slash Lines */}
          <div style={{ position: 'absolute', top: 0, right: '20%', width: '400px', height: '100%', background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, transparent 80%)', transform: 'skewX(-25deg)', pointerEvents: 'none' }} />

          {/* Center Title Logo */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            {/* Generated REMATCH Logo or Styled Text */}
            <img 
              src="/rematch_logo.png" 
              alt="REMATCH" 
              style={{ maxWidth: '640px', width: '80%', height: 'auto', filter: 'drop-shadow(0 0 30px rgba(34, 197, 94, 0.4))' }} 
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                document.getElementById('fallback-rematch-logo').style.display = 'flex'
              }}
            />

            {/* Fallback CSS REMATCH Logo with Cyan/Green Slash */}
            <div id="fallback-rematch-logo" style={{ display: 'none', alignItems: 'center', gap: '5px', fontSize: '5rem', fontWeight: '900', letterSpacing: '12px', color: '#fff', textShadow: '0 0 40px rgba(34, 197, 94, 0.6)' }}>
              <span>RE</span>
              <span style={{ color: '#22c55e', fontStyle: 'italic', transform: 'skewX(-15deg)', display: 'inline-block' }}>/</span>
              <span>MATCH</span>
            </div>
          </div>

          {/* Bottom Info Row (Screenshot 1 Layout) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', zIndex: 10 }}>
            {/* Bottom Left Pro Tip */}
            <div style={{ maxWidth: '580px', color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.6', fontFamily: 'sans-serif', background: 'rgba(15, 23, 42, 0.6)', padding: '16px 20px', borderRadius: '8px', borderLeft: '3px solid #22c55e' }}>
              {PRO_TIPS[tipIndex]}
            </div>

            {/* Bottom Right Connecting Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', color: '#cbd5e1', fontSize: '0.95rem', fontWeight: '800' }}>
              <span>Connecting to server</span>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '3px solid #22c55e', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
            </div>
          </div>

          {/* CSS Animation Keyframes */}
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* ── 2. 3D SCENE CANVAS ── */}
      <Canvas
        shadows
        camera={{ fov: 65, position: [0, 2.2, 16] }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <color attach="background" args={arenaStyle === 'desert' ? ['#fdf4ff'] : ['#030712']} />
        <fog attach="fog" args={arenaStyle === 'desert' ? ['#fae8ff', 40, 100] : ['#030712', 30, 95]} />

        <ambientLight intensity={0.6} />
        <directionalLight 
          position={[15, 25, 10]} 
          intensity={1.8} 
          castShadow 
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-15, 20, -10]} intensity={0.6} />

        {arenaStyle !== 'desert' && (
          <>
            <Sky distance={450000} sunPosition={[10, 12, 10]} inclination={0.6} azimuth={0.25} />
            <Stars radius={100} depth={50} count={1000} factor={4} saturation={0.5} fade speed={1} />
            <Environment preset="night" environmentIntensity={0.8} />
          </>
        )}

        <Suspense fallback={null}>
          <Physics gravity={[0, -15, 0]}>
            <Arena />

            {/* Menu Character Showcase Mode */}
            {gameState === 'MENU' ? (
              <>
                <ShowcaseCamera />
                <group position={[0, 0, 0]}>
                  <HumanModel 
                    preset={characterPreset} 
                    teamColor="#ef4444" 
                    secColor="#1e293b" 
                    number={7} 
                  />
                </group>
              </>
            ) : (
              /* Active Match Mode */
              <>
                <Ball />
                <Player id="player1" />
                <Bot id="bot1" />
                <GoalkeeperManager />
              </>
            )}
          </Physics>
        </Suspense>
      </Canvas>

      {/* ── 3. MAIN MENU / LOBBY (Screenshots 4 & 5) ── */}
      {gameState === 'MENU' && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '30px 40px', fontFamily: "'Orbitron', sans-serif" }}>
          
          {/* Top Bar Navigation Tabs */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 24px', backdropFilter: 'blur(10px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '1.4rem' }}>⚽</span>
              <span style={{ color: '#fff', fontSize: '1.2rem', fontWeight: '900', letterSpacing: '3px' }}>REMATCH</span>
              <span style={{ background: '#22c55e', color: '#000', fontSize: '0.65rem', fontWeight: '900', padding: '2px 8px', borderRadius: '4px' }}>SEASON 0</span>
            </div>

            <div style={{ display: 'flex', gap: '20px' }}>
              {['PLAY', 'SEASON 0', 'CUSTOMIZATION', 'PROFILE', 'STORE'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveMenuTab(tab)}
                  style={{
                    background: activeMenuTab === tab ? '#22c55e' : 'transparent',
                    color: activeMenuTab === tab ? '#000' : '#94a3b8',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 20px',
                    fontWeight: '900',
                    fontSize: '0.85rem',
                    letterSpacing: '1px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', color: '#cbd5e1', fontSize: '0.8rem', fontWeight: '800' }}>
              <span>TAB SOCIAL</span>
              <button 
                onClick={onExit} 
                style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#ef4444', padding: '6px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '900' }}
              >
                EXIT
              </button>
            </div>
          </div>

          {/* TAB 1: PLAY MENU (Screenshot 4) */}
          {activeMenuTab === 'PLAY' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%', marginBottom: '20px' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '320px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '24px', backdropFilter: 'blur(10px)' }}>
                <button
                  onClick={startMatchWithLoading}
                  style={{
                    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '18px 24px',
                    fontWeight: '900',
                    fontSize: '1.1rem',
                    letterSpacing: '2px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(34, 197, 94, 0.4)'
                  }}
                >
                  ▶ QUICK MATCH 1V1
                </button>

                {['RANKED MATCH 5VS5', 'CUSTOM MATCH', 'PRACTICE', 'PROLOGUE', 'SYSTEM'].map((mode, i) => (
                  <button
                    key={mode}
                    onClick={startMatchWithLoading}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      color: i === 0 ? '#fff' : '#64748b',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '8px',
                      padding: '14px 20px',
                      fontWeight: '800',
                      fontSize: '0.85rem',
                      letterSpacing: '1px',
                      textAlign: 'left',
                      cursor: 'pointer'
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px 24px', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ background: '#0284c7', color: '#fff', padding: '10px 14px', borderRadius: '8px', fontWeight: '900' }}>
                    <small style={{ display: 'block', fontSize: '0.6rem' }}>LEVEL</small>
                    27
                  </div>
                  <div>
                    <h4 style={{ margin: 0, color: '#facc15', fontSize: '1rem', fontWeight: '900' }}>BRONZE DIV 3</h4>
                    <small style={{ color: '#64748b' }}>Matchmaking Ready</small>
                  </div>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '12px', padding: '16px 24px', width: '280px', backdropFilter: 'blur(10px)' }}>
                  <h4 style={{ margin: '0 0 6px', color: '#22c55e', fontSize: '0.9rem' }}>Season 0 Feedback</h4>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.75rem', lineHeight: '1.4', fontFamily: 'sans-serif' }}>
                    Welcome to Rematch Arcade! Share your gameplay feedback to shape future updates.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CUSTOMIZATION MENU (Screenshot 5) */}
          {activeMenuTab === 'CUSTOMIZATION' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '20px' }}>
              <div style={{ width: '320px', background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px', backdropFilter: 'blur(10px)' }}>
                <h3 style={{ color: '#fff', fontSize: '1rem', margin: '0 0 15px', letterSpacing: '2px' }}>CHARACTER PRESETS</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { id: 'female_striker', name: 'Female Striker (Red Hoodie)', desc: 'Sloclap Signature' },
                    { id: 'male_hoodie', name: 'Male Striker (Blue Hoodie)', desc: 'Athletic Cut' },
                    { id: 'captain_pro', name: 'Captain Pro (Gold Kit)', desc: 'Veteran Leader' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setCharacterPreset(p.id)}
                      style={{
                        background: characterPreset === p.id ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255,255,255,0.03)',
                        border: characterPreset === p.id ? '2px solid #22c55e' : '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '10px',
                        padding: '14px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: '#fff'
                      }}
                    >
                      <b style={{ display: 'block', fontSize: '0.85rem', color: characterPreset === p.id ? '#22c55e' : '#fff' }}>{p.name}</b>
                      <small style={{ color: '#64748b' }}>{p.desc}</small>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ width: '300px', background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px', backdropFilter: 'blur(10px)' }}>
                <h3 style={{ color: '#fff', fontSize: '1rem', margin: '0 0 15px', letterSpacing: '2px' }}>STADIUM ARENAS</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button
                    onClick={() => setArenaStyle('neon')}
                    style={{
                      background: arenaStyle === 'neon' ? 'rgba(0, 210, 255, 0.2)' : 'rgba(255,255,255,0.03)',
                      border: arenaStyle === 'neon' ? '2px solid #00d2ff' : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '10px',
                      padding: '14px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      color: '#fff'
                    }}
                  >
                    <b style={{ display: 'block', fontSize: '0.85rem', color: '#00d2ff' }}>Neon Palms Stadium</b>
                    <small style={{ color: '#64748b' }}>Striped Grass & Neon Skyline</small>
                  </button>

                  <button
                    onClick={() => setArenaStyle('desert')}
                    style={{
                      background: arenaStyle === 'desert' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(255,255,255,0.03)',
                      border: arenaStyle === 'desert' ? '2px solid #eab308' : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '10px',
                      padding: '14px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      color: '#fff'
                    }}
                  >
                    <b style={{ display: 'block', fontSize: '0.85rem', color: '#eab308' }}>Desert Oasis Arena</b>
                    <small style={{ color: '#64748b' }}>Golden Sand & Pink Tree</small>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeMenuTab !== 'PLAY' && activeMenuTab !== 'CUSTOMIZATION' && (
            <div style={{ background: 'rgba(15, 23, 42, 0.85)', padding: '30px', borderRadius: '14px', color: '#94a3b8', textAlign: 'center', marginBottom: '40px' }}>
              <h3 style={{ color: '#fff' }}>{activeMenuTab} MODULE</h3>
              <p>Content available in Season 0 online updates!</p>
            </div>
          )}
        </div>
      )}

      {/* ── 4. IN-GAME HUD OVERLAYS ── */}
      {gameState !== 'MENU' && gameState !== 'BOOT' && gameState !== 'LOADING_MATCH' && (
        <>
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
            zIndex: 10,
            pointerEvents: 'none'
          }}>
            <span style={{ color: '#ffffff', fontSize: '1.2rem', fontWeight: '900', letterSpacing: '1px' }}>
              {gameState === 'KICKOFF' ? '05:00' : formatTime(timer)}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#090d16', padding: '6px 16px', borderRadius: '6px' }}>
              <span style={{ color: '#ef4444', fontWeight: '900', fontSize: '1.1rem' }}>{score.red}</span>
              <span style={{ color: '#64748b' }}>|</span>
              <span style={{ color: '#0284c7', fontWeight: '900', fontSize: '1.1rem' }}>{score.blue}</span>
            </div>
          </div>

          <div style={{ position: 'absolute', top: '25px', right: '30px', color: '#64748b', fontSize: '0.75rem', fontFamily: 'monospace', textAlign: 'right', pointerEvents: 'none', zIndex: 10 }}>
            <div>PING: 24ms</div>
            <div>FPS: 60</div>
          </div>

          {/* Segmented Cyan Stamina Bar */}
          <div style={{
            position: 'absolute',
            bottom: '35px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '280px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 10,
            pointerEvents: 'none'
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
                      background: filled ? 'linear-gradient(90deg, #00f2fe, #4facfe)' : 'rgba(255,255,255,0.06)',
                      borderRadius: '2px',
                      transition: 'background 0.15s ease'
                    }}
                  />
                )
              })}
            </div>
            <span style={{ color: '#94a3b8', fontSize: '0.65rem', fontWeight: '900', letterSpacing: '1px', marginTop: '4px', fontFamily: "'Orbitron', sans-serif" }}>STAMINA [SHIFT]</span>
          </div>

          <MiniMapRadar />

          {(gameState === 'KICKOFF' || gameState === 'GOAL_SCRIBED') && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(2, 6, 23, 0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              zIndex: 100
            }}>
              <h1 style={{
                fontSize: '4.5rem',
                fontWeight: '900',
                letterSpacing: '8px',
                color: '#fff',
                textShadow: '0 0 30px rgba(0, 242, 254, 0.6)',
                fontFamily: "'Orbitron', sans-serif",
                margin: 0
              }}>
                {gameState === 'KICKOFF' ? 'READY?' : goalAlert}
              </h1>
            </div>
          )}

          {gameState === 'GAMEOVER' && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(2,6,23,0.94)',
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
                color: score.red > score.blue ? '#ef4444' : '#0284c7',
                marginBottom: '10px'
              }}>
                {score.red > score.blue ? 'RED VICTORY!' : 'BLUE VICTORY!'}
              </h1>
              <p style={{ fontFamily: 'monospace', fontSize: '1.4rem', color: '#94a3b8', margin: '0 0 40px' }}>
                Final Score: {score.red} - {score.blue}
              </p>
              
              <div style={{ display: 'flex', gap: '20px' }}>
                <button 
                  onClick={startMatchWithLoading}
                  style={{
                    background: '#22c55e',
                    color: '#000',
                    padding: '16px 36px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: "'Orbitron', sans-serif",
                    fontWeight: '900',
                    fontSize: '0.9rem',
                    letterSpacing: '2px'
                  }}
                >
                  PLAY AGAIN
                </button>
                <button 
                  onClick={() => setGameState('MENU')}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    color: '#94a3b8',
                    border: '1px solid rgba(255,255,255,0.1)',
                    padding: '16px 36px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: '0.9rem'
                  }}
                >
                  MAIN MENU
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
