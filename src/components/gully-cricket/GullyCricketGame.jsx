import React, { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Physics } from '@react-three/cannon'
import { Environment, Stars, Sky } from '@react-three/drei'
import { useGullyCricketStore } from './gullyCricketStore'
import { GullyStreetArena } from './GullyStreetArena'
import { GullyBall } from './GullyBall'
import { GullyBatter } from './GullyBatter'
import { GullyBowler } from './GullyBowler'
import { GullyFielders } from './GullyFielders'
import * as THREE from 'three'

// Dynamic Camera Controller
function CameraRig() {
  const cameraView = useGullyCricketStore((state) => state.cameraView)
  const phase = useGullyCricketStore((state) => state.phase)

  useFrame((state) => {
    if (phase === 'SHOT_HIT') {
      // Dynamic Action Cam following tennis ball flight
      const ball = window.gullyBall
      if (ball && ball.position && Array.isArray(ball.position.current)) {
        const bPos = ball.position.current
        state.camera.position.lerp(new THREE.Vector3(bPos[0] + 12, 10, bPos[2] + 10), 0.1)
        state.camera.lookAt(bPos[0], 1.0, bPos[2])
        return
      }
    }

    if (cameraView === 'BATTER_VIEW') {
      // Camera behind batter's back looking down pitch towards bowler at Z = -13
      state.camera.position.lerp(new THREE.Vector3(0, 3.2, 17.5), 0.12)
      state.camera.lookAt(0, 1.2, -6.0)
    } else if (cameraView === 'BOWLER_VIEW') {
      // Camera behind bowler's back looking down pitch towards batter at Z = 12
      state.camera.position.lerp(new THREE.Vector3(0, 3.8, -19.0), 0.12)
      state.camera.lookAt(0, 1.2, 8.0)
    } else {
      // High Broadcast View
      state.camera.position.lerp(new THREE.Vector3(18, 14, 0), 0.1)
      state.camera.lookAt(0, 1.0, 0)
    }
  })

  return null
}

const PRO_TIPS = [
  "REMEMBER THE ONE-TIPPI RULE: If the ball bounces ONCE on the road and a fielder catches it directly, YOU ARE OUT!",
  "Direct Wall Hits give 4 Runs! High roof hits give 6 Runs!",
  "Be careful with lofted shots — hitting the ball over the building roof breaks neighbors' windows and results in OUT!",
  "Use Arrow Keys or WASD to aim your Cover Drive, Pull Shot, or Ramp Scoop!"
]

export function GullyCricketGame({ onExit }) {
  const gameState = useGullyCricketStore((state) => state.gameState)
  const setGameState = useGullyCricketStore((state) => state.setGameState)
  const gameMode = useGullyCricketStore((state) => state.gameMode)
  const setGameMode = useGullyCricketStore((state) => state.setGameMode)
  const currentInnings = useGullyCricketStore((state) => state.currentInnings)
  const runs = useGullyCricketStore((state) => state.runs)
  const wickets = useGullyCricketStore((state) => state.wickets)
  const ballsInOver = useGullyCricketStore((state) => state.ballsInOver)
  const completedOvers = useGullyCricketStore((state) => state.completedOvers)
  const totalOvers = useGullyCricketStore((state) => state.totalOvers)
  const targetRuns = useGullyCricketStore((state) => state.targetRuns)
  const overHistory = useGullyCricketStore((state) => state.overHistory)
  const strikerName = useGullyCricketStore((state) => state.strikerName)
  const bowlerName = useGullyCricketStore((state) => state.bowlerName)
  const strikerRuns = useGullyCricketStore((state) => state.strikerRuns)
  const strikerBalls = useGullyCricketStore((state) => state.strikerBalls)
  const phase = useGullyCricketStore((state) => state.phase)
  const setPhase = useGullyCricketStore((state) => state.setPhase)
  const shotFeedback = useGullyCricketStore((state) => state.shotFeedback)
  const lastShotOutcome = useGullyCricketStore((state) => state.lastShotOutcome)
  const commentaryText = useGullyCricketStore((state) => state.commentaryText)
  const cameraView = useGullyCricketStore((state) => state.cameraView)
  const setCameraView = useGullyCricketStore((state) => state.setCameraView)
  const resetMatch = useGullyCricketStore((state) => state.resetMatch)
  const startInnings2 = useGullyCricketStore((state) => state.startInnings2)

  const [deliveryTarget, setDeliveryTarget] = useState([0, -2.0])
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState('GULLY_RULES')
  const [tipIndex, setTipIndex] = useState(0)
  const [selectedMenuIndex, setSelectedMenuIndex] = useState(0)

  // Auto-advance ball result pause
  useEffect(() => {
    if (phase === 'RESULT_PAUSE') {
      const timeout = setTimeout(() => {
        if (useGullyCricketStore.getState().gameState === 'INNINGS_1' || useGullyCricketStore.getState().gameState === 'INNINGS_2') {
          setPhase('BOWLING_AIM')
        }
      }, 3500)
      return () => clearTimeout(timeout)
    }
  }, [phase, setPhase])

  // Key bindings for camera & settings
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'KeyC') {
        setCameraView(cameraView === 'BATTER_VIEW' ? 'BOWLER_VIEW' : 'BATTER_VIEW')
      } else if (e.code === 'KeyF') {
        toggleFullscreen()
      } else if (e.code === 'Escape') {
        e.preventDefault()
        setIsSettingsOpen(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cameraView, setCameraView])

  useEffect(() => {
    if (gameState === 'BOOT') {
      const timer = setTimeout(() => {
        setGameState('MENU')
      }, 2500)
      return () => clearTimeout(timer)
    }
  }, [gameState, setGameState])

  const toggleFullscreen = () => {
    try {
      let iframeEl = null
      if (window.parent && window.parent.document) {
        iframeEl = window.parent.document.getElementById('game-session-iframe')
      }
      const doc = (window.parent && window.parent.document) ? window.parent.document : document
      const fullEl = doc.fullscreenElement || document.fullscreenElement

      if (!fullEl) {
        if (iframeEl && iframeEl.requestFullscreen) {
          iframeEl.requestFullscreen().catch(() => {
            if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen()
          })
        } else if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {})
        }
      } else {
        if (doc.exitFullscreen) {
          doc.exitFullscreen().catch(() => {})
        } else if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {})
        }
      }
    } catch (err) {
      console.warn('Fullscreen notice:', err)
    }
  }

  const handleDeliverBall = (target) => {
    setDeliveryTarget(target)
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#090d16', position: 'relative', overflow: 'hidden', userSelect: 'none' }}>
      
      {/* ── 1. BOOT / LOADING SCREEN ── */}
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
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '5rem', fontWeight: '900', letterSpacing: '10px' }}>
              <span>🏏</span>
              <span style={{ color: '#ffffff' }}>GULLY</span>
              <span style={{ color: '#facc15', fontStyle: 'italic' }}>CRICKET</span>
              <span style={{ color: '#0284c7' }}>3D</span>
            </div>
            <p style={{ color: '#94a3b8', letterSpacing: '6px', fontSize: '1rem', marginTop: '10px', fontWeight: '800' }}>
              INDIAN STREET CHAMPIONSHIP 2026
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', zIndex: 10 }}>
            <div style={{ maxWidth: '620px', color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.6', fontFamily: 'sans-serif', background: 'rgba(15, 23, 42, 0.75)', padding: '18px 24px', borderRadius: '10px', borderLeft: '4px solid #facc15', backdropFilter: 'blur(10px)' }}>
              {PRO_TIPS[tipIndex]}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#cbd5e1', fontSize: '0.95rem', fontWeight: '800' }}>
              <span>Loading Gully Arena...</span>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', border: '3px solid #facc15', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
            </div>
          </div>
        </div>
      )}

      {/* ── 2. 3D SCENE CANVAS ── */}
      <Canvas
        shadows
        camera={{ fov: 60, position: [0, 3.2, 17.5] }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <color attach="background" args={['#090d16']} />
        <fog attach="fog" args={['#090d16', 50, 180]} />

        <ambientLight intensity={0.65} />
        <directionalLight position={[20, 35, 15]} intensity={1.8} castShadow shadow-mapSize={[1024, 1024]} />

        <Sky distance={450000} sunPosition={[5, 10, 8]} inclination={0.5} azimuth={0.2} />
        <Stars radius={100} depth={50} count={800} factor={3} saturation={0.5} fade speed={1} />
        <Environment preset="sunset" environmentIntensity={0.8} />

        <Suspense fallback={null}>
          <Physics gravity={[0, -14, 0]}>
            <GullyStreetArena />
            <CameraRig />

            <GullyBall aimTarget={deliveryTarget} />
            <GullyBatter />
            <GullyBowler onDeliverBall={handleDeliverBall} />
            <GullyFielders />
          </Physics>
        </Suspense>
      </Canvas>

      {/* ── 3. HOME MENU SCREEN ── */}
      {gameState === 'MENU' && (() => {
        const MENU_OPTIONS = [
          {
            id: 'quick',
            title: 'QUICK MATCH',
            subtitle: 'NEIGHBORHOOD SHOWDOWN',
            icon: '🏏',
            desc: 'Jump straight into a 1-over, 5v5 gully cricket match. Ideal for a fast-paced street showdown with no lobby waits.',
            bullets: [
              '⏱️ Format: 1 Over (6 balls)',
              '👥 Teams: 5v5 Street Teams',
              '🧱 Rules: Standard Gully Rules',
              '📍 Pitch: Narrow Asphalt Alley'
            ],
            color: '#facc15',
            action: () => {
              useGullyCricketStore.setState({ totalOvers: 1, teamSize: 5, gameMode: 'STREET_SERIES' });
              resetMatch();
            },
            banner: (
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(250,204,21,0.08)', filter: 'blur(30px)' }} />
                <span style={{ fontSize: '7rem', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}>🏏</span>
                <div style={{ position: 'absolute', bottom: '15px', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '4px' }}>ALLEYWAY ARENA</div>
              </div>
            )
          },
          {
            id: 'tournament',
            title: 'TOURNAMENT',
            subtitle: 'STREET CHAMPIONSHIP',
            icon: '🏆',
            desc: 'Play a full 2-over street series match to climb the local ranks and win the Gully Cricket Championship Cup.',
            bullets: [
              '⏱️ Format: 2 Overs (12 balls)',
              '🏆 Cup: Street Series Trophy',
              '🔥 Challenge: Advanced AI Bowlers',
              '🎯 Rules: One-Tippi catches active'
            ],
            color: '#10b981',
            action: () => {
              useGullyCricketStore.setState({ totalOvers: 2, teamSize: 5, gameMode: 'STREET_SERIES' });
              resetMatch();
            },
            banner: (
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(16,185,129,0.08)', filter: 'blur(30px)' }} />
                <span style={{ fontSize: '7rem', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}>🏆</span>
                <div style={{ position: 'absolute', bottom: '15px', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '4px' }}>CHAMPIONSHIP STAGE</div>
              </div>
            )
          },
          {
            id: 'duel',
            title: '1V1 GULLY DUEL',
            subtitle: 'STREET FACE-OFF',
            icon: '⚔️',
            desc: '1v1 single over battle between Batter and Bowler on a narrow asphalt street pitch. No fielders, just direct dueling.',
            bullets: [
              '⏱️ Format: 1 Over (6 balls)',
              '👥 Teams: 1v1 Batter vs Bowler',
              '🎯 Focus: Pure hitting & pitching',
              '🛡️ Status: High-stakes local rivalry'
            ],
            color: '#06b6d4',
            action: () => {
              useGullyCricketStore.setState({ totalOvers: 1, teamSize: 1, gameMode: '1V1_CHALLENGE' });
              resetMatch();
            },
            banner: (
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #083344 0%, #155e75 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(6,182,212,0.08)', filter: 'blur(30px)' }} />
                <span style={{ fontSize: '7rem', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}>⚔️</span>
                <div style={{ position: 'absolute', bottom: '15px', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '4px' }}>ASPHALT CREASE</div>
              </div>
            )
          },
          {
            id: 'practice',
            title: 'PRACTICE NETS',
            subtitle: 'TRAINING & WARMUP',
            icon: '⚾',
            desc: 'Perfect your timing feedback and batting stroke placement in the nets against an automatic bowling machine.',
            bullets: [
              '⏱️ Format: Endless Balls',
              '🎯 Feedback: Live timing guide',
              '🛡️ Status: Infinite balls, no wickets',
              '💪 Skill: Master Cover Drive & Pull'
            ],
            color: '#a855f7',
            action: () => {
              useGullyCricketStore.setState({ totalOvers: 5, teamSize: 5, gameMode: 'FREE_HIT' });
              resetMatch();
            },
            banner: (
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #3b0764 0%, #581c87 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(168,85,247,0.08)', filter: 'blur(30px)' }} />
                <span style={{ fontSize: '7rem', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}>⚾</span>
                <div style={{ position: 'absolute', bottom: '15px', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '4px' }}>TRAINING NETS</div>
              </div>
            )
          },
          {
            id: 'rules',
            title: 'GULLY RULES',
            subtitle: 'LOCAL CODES & LAWS',
            icon: '📜',
            desc: 'Learn the unique rules of Indian street cricket: One-Tippi catches count as OUT, direct wall hits score 4s/6s, and neighbor window breaks lead to OUT.',
            bullets: [
              '🥎 One-Tippi: Catches after 1 bounce are OUT!',
              '🧱 Wall Hits: Side wall hits = 4 Runs!',
              '🏠 Roof Hits: Direct roof hits = 6 Runs!',
              '🪟 Windows: Over the roof = OUT (Lost Ball!)'
            ],
            color: '#ef4444',
            action: () => {
              setIsSettingsOpen(true);
            },
            banner: (
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(239,68,68,0.08)', filter: 'blur(30px)' }} />
                <span style={{ fontSize: '7rem', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}>📜</span>
                <div style={{ position: 'absolute', bottom: '15px', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '4px' }}>LOCAL STREET LAW</div>
              </div>
            )
          },
          {
            id: 'exit',
            title: 'EXIT GAME',
            subtitle: 'RETURN TO CONSOLE',
            icon: '🚪',
            desc: 'Exit Gully Cricket 3D and return to the PlaySphere Console dashboard home to access other games.',
            bullets: [
              '💾 Status: Session ended cleanly',
              '🎮 Console: Back to PS5 Hub',
              '👥 Profile: Statistics preserved'
            ],
            color: '#64748b',
            action: onExit,
            banner: (
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(100,116,139,0.08)', filter: 'blur(30px)' }} />
                <span style={{ fontSize: '7rem', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}>🚪</span>
                <div style={{ position: 'absolute', bottom: '15px', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '4px' }}>POWER OFF</div>
              </div>
            )
          }
        ];

        const selected = MENU_OPTIONS[selectedMenuIndex];

        return (
          <div style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
            padding: '24px 36px',
            fontFamily: "'Orbitron', sans-serif",
            background: 'radial-gradient(circle at center, rgba(15, 23, 42, 0.45) 0%, rgba(9, 13, 22, 0.85) 100%)',
            boxSizing: 'border-box'
          }}>
            {/* ── HEADER PANEL (Mocked from user reference screen) ── */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              marginBottom: '20px',
              flexShrink: 0
            }}>
              {/* Profile card block */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
                border: '1.5px solid rgba(250, 204, 21, 0.3)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.4), 0 0 15px rgba(250,204,21,0.1)',
                borderRadius: '12px',
                padding: '8px 16px',
                minWidth: '280px',
                backdropFilter: 'blur(10px)'
              }}>
                {/* Avatar SVG silhouette */}
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3b82f6, #1e3a8a)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #facc15',
                  boxShadow: '0 0 8px rgba(250,204,21,0.5)',
                  flexShrink: 0
                }}>
                  <svg viewBox="0 0 38 38" width="30" height="30" fill="none">
                    <circle cx="19" cy="14" r="6.5" fill="rgba(255,255,255,0.9)"/>
                    <ellipse cx="19" cy="32" rx="11" ry="8" fill="rgba(255,255,255,0.9)"/>
                  </svg>
                </div>
                {/* Profile details */}
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#fff', fontSize: '0.9rem', fontWeight: '900', letterSpacing: '1px' }}>CHINMAYA</span>
                    <span style={{
                      background: 'linear-gradient(135deg, #facc15, #eab308)',
                      color: '#000',
                      fontSize: '0.62rem',
                      fontWeight: '900',
                      padding: '1px 5px',
                      borderRadius: '3px',
                      fontFamily: 'monospace'
                    }}>LVL 12</span>
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.65rem', fontWeight: '800', marginBottom: '4px', letterSpacing: '0.5px' }}>Gully Legend</div>
                  {/* XP Bar */}
                  <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: '70%', height: '100%', background: '#3b82f6', boxShadow: '0 0 6px #3b82f6' }} />
                  </div>
                </div>
              </div>

              {/* Title Logo block */}
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <h1 style={{
                  fontSize: '2rem',
                  fontWeight: '900',
                  letterSpacing: '6px',
                  margin: 0,
                  background: 'linear-gradient(90deg, #ffffff 0%, #facc15 50%, #ffffff 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 4px 15px rgba(0,0,0,0.5)'
                }}>GULLY CRICKET</h1>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.58rem', fontWeight: '800', letterSpacing: '4px', marginTop: '2px' }}>APNA GAME. APNA STYLE.</span>
              </div>

              {/* Currency & System buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {/* Coins */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1.5px solid rgba(250, 204, 21, 0.4)',
                  borderRadius: '10px',
                  padding: '6px 12px',
                  fontSize: '0.82rem',
                  fontWeight: '900',
                  color: '#facc15'
                }}>
                  <span>🪙</span>
                  <span>1,250</span>
                </div>
                {/* Diamonds */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1.5px solid rgba(139, 92, 246, 0.4)',
                  borderRadius: '10px',
                  padding: '6px 12px',
                  fontSize: '0.82rem',
                  fontWeight: '900',
                  color: '#a78bfa'
                }}>
                  <span>💎</span>
                  <span>35</span>
                </div>
              </div>
            </div>

            {/* ── MAIN WORKSPACE (FC26 style split layout) ── */}
            <div style={{
              display: 'flex',
              flex: 1,
              width: '100%',
              gap: '30px',
              minHeight: 0,
              boxSizing: 'border-box'
            }}>
              {/* LEFT COLUMN: Vertical Navigation Menu List */}
              <div style={{
                width: '320px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                overflowY: 'auto',
                paddingRight: '6px',
                boxSizing: 'border-box'
              }}>
                {MENU_OPTIONS.map((opt, idx) => {
                  const isActive = idx === selectedMenuIndex;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => {
                        setSelectedMenuIndex(idx);
                        if (window.sounds && typeof window.sounds.playNav === 'function') window.sounds.playNav();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        background: isActive 
                          ? `linear-gradient(90deg, rgba(250, 204, 21, 0.22) 0%, rgba(15, 23, 42, 0.85) 100%)` 
                          : 'rgba(15, 23, 42, 0.55)',
                        border: '1.5px solid',
                        borderColor: isActive ? '#facc15' : 'rgba(255, 255, 255, 0.08)',
                        boxShadow: isActive ? '0 0 14px rgba(250,204,21,0.15)' : 'none',
                        borderRadius: '10px',
                        padding: '16px 20px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        transform: isActive ? 'translateX(6px)' : 'none',
                        textAlign: 'left'
                      }}
                    >
                      <span style={{ fontSize: '1.6rem', filter: isActive ? 'drop-shadow(0 0 4px rgba(250,204,21,0.5))' : 'none' }}>
                        {opt.icon}
                      </span>
                      <div>
                        <div style={{ color: isActive ? '#facc15' : '#fff', fontWeight: '900', fontSize: '0.85rem', letterSpacing: '1px' }}>
                          {opt.title}
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.58rem', fontWeight: '700', marginTop: '2px', letterSpacing: '0.5px' }}>
                          {opt.subtitle}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* RIGHT COLUMN: Dynamic Preview Details Panel */}
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                background: 'rgba(15, 23, 42, 0.72)',
                border: '1.5px solid rgba(255,255,255,0.08)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                borderRadius: '16px',
                overflow: 'hidden',
                backdropFilter: 'blur(16px)',
                boxSizing: 'border-box'
              }}>
                {/* Banner illustration */}
                <div style={{ height: '170px', width: '100%', flexShrink: 0 }}>
                  {selected.banner}
                </div>

                {/* Details body */}
                <div style={{
                  padding: '24px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  flex: 1,
                  textAlign: 'left',
                  boxSizing: 'border-box'
                }}>
                  <div>
                    <span style={{ color: selected.color, fontSize: '0.72rem', fontWeight: '800', letterSpacing: '2px', textTransform: 'uppercase' }}>
                      {selected.subtitle}
                    </span>
                    <h2 style={{ color: '#fff', fontSize: '1.6rem', margin: '4px 0 10px', fontWeight: '900', letterSpacing: '1px' }}>
                      {selected.title}
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.82rem', lineHeight: '1.55', margin: '0 0 18px', fontFamily: 'sans-serif' }}>
                      {selected.desc}
                    </p>

                    {/* Bullet Highlights Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px 16px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1.5px solid rgba(255,255,255,0.04)',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      fontFamily: 'sans-serif'
                    }}>
                      {selected.bullets.map((b, idx) => (
                        <div key={idx} style={{ color: 'rgba(255,255,255,0.68)', fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {b}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action CTA Button */}
                  <button
                    onClick={selected.action}
                    style={{
                      background: `linear-gradient(135deg, ${selected.color}, ${selected.color}dd)`,
                      color: '#000',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '16px 20px',
                      fontFamily: 'inherit',
                      fontSize: '0.92rem',
                      fontWeight: '900',
                      letterSpacing: '2px',
                      cursor: 'pointer',
                      boxShadow: `0 8px 24px rgba(0,0,0,0.3), 0 0 15px ${selected.color}33`,
                      transition: 'transform 0.15s, box-shadow 0.2s',
                      width: '100%',
                      marginTop: '16px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px) scale(1.01)';
                      e.currentTarget.style.boxShadow = `0 12px 30px rgba(0,0,0,0.4), 0 0 25px ${selected.color}55`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.3), 0 0 15px ${selected.color}33`;
                    }}
                  >
                    ▶ LAUNCH SESSION
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── 4. IN-GAME HUD OVERLAYS ── */}
      {(gameState === 'INNINGS_1' || gameState === 'INNINGS_2') && (
        <>
          {/* Top-Left Scoreboard */}
          <div style={{
            position: 'absolute',
            top: '25px',
            left: '30px',
            background: 'rgba(15, 23, 42, 0.88)',
            border: '1px solid rgba(250, 204, 21, 0.4)',
            borderRadius: '12px',
            padding: '12px 24px',
            fontFamily: "'Orbitron', sans-serif",
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(10px)',
            zIndex: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '6px' }}>
              <span style={{ background: '#facc15', color: '#000', fontSize: '0.7rem', fontWeight: '900', padding: '2px 8px', borderRadius: '4px' }}>
                INNINGS {currentInnings}
              </span>
              <span style={{ color: '#ffffff', fontSize: '1.4rem', fontWeight: '900', letterSpacing: '1px' }}>
                {runs} / {wickets}
              </span>
              <span style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: '800' }}>
                ({completedOvers}.{ballsInOver} / {totalOvers} OVERS)
              </span>
            </div>

            {targetRuns && (
              <div style={{ color: '#00d2ff', fontSize: '0.8rem', fontWeight: '900' }}>
                TARGET: {targetRuns} RUNS (NEED {Math.max(0, targetRuns - runs)} RUNS)
              </div>
            )}

            <div style={{ display: 'flex', gap: '14px', marginTop: '6px', fontSize: '0.75rem', color: '#cbd5e1' }}>
              <span>🏏 {strikerName}: <b>{strikerRuns}</b> ({strikerBalls})</span>
              <span>⚾ {bowlerName}</span>
            </div>
          </div>

          {/* Top-Right Camera Switcher & Controls Badge */}
          <div style={{ position: 'absolute', top: '25px', right: '30px', zIndex: 10, display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setCameraView(cameraView === 'BATTER_VIEW' ? 'BOWLER_VIEW' : 'BATTER_VIEW')}
              style={{
                background: 'rgba(15, 23, 42, 0.88)',
                border: '1px solid #00d2ff',
                color: '#00d2ff',
                borderRadius: '8px',
                padding: '8px 16px',
                fontWeight: '900',
                cursor: 'pointer',
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '0.8rem'
              }}
            >
              📹 CAMERA [C]: {cameraView === 'BATTER_VIEW' ? 'BATTER VIEW' : 'BOWLER VIEW'}
            </button>
          </div>

          {/* Center Commentary & Feedback Banner */}
          {shotFeedback && (
            <div style={{
              position: 'absolute',
              top: '120px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(15, 23, 42, 0.92)',
              border: '2px solid #facc15',
              borderRadius: '30px',
              padding: '10px 30px',
              color: '#facc15',
              fontFamily: "'Orbitron', sans-serif",
              fontSize: '1.3rem',
              fontWeight: '900',
              letterSpacing: '3px',
              boxShadow: '0 0 30px rgba(250, 204, 21, 0.5)',
              zIndex: 30
            }}>
              {shotFeedback} — {lastShotOutcome}
            </div>
          )}

          {/* Bottom Over History Bar */}
          <div style={{
            position: 'absolute',
            bottom: '30px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '16px',
            padding: '10px 24px',
            backdropFilter: 'blur(12px)',
            fontFamily: "'Orbitron', sans-serif",
            zIndex: 30
          }}>
            <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '900', marginRight: '8px' }}>THIS OVER:</span>
            {overHistory.slice(-6).map((ball, i) => (
              <span
                key={i}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '900',
                  fontSize: '0.8rem',
                  background: ball === '4' ? '#22c55e' : ball === '6' ? '#a855f7' : ball === 'W' || ball === '1T' ? '#ef4444' : 'rgba(255,255,255,0.1)',
                  color: '#fff'
                }}
              >
                {ball}
              </span>
            ))}
          </div>
        </>
      )}

      {/* ── 5. INNINGS BREAK OVERLAY ── */}
      {gameState === 'INNINGS_BREAK' && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(9, 13, 22, 0.9)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 150, fontFamily: "'Orbitron', sans-serif" }}>
          <h1 style={{ color: '#facc15', fontSize: '3rem', margin: 0, letterSpacing: '6px' }}>INNINGS BREAK!</h1>
          <p style={{ color: '#fff', fontSize: '1.4rem', marginTop: '15px' }}>
            Innings 1 Score: <b>{runs} / {wickets}</b>
          </p>
          <p style={{ color: '#00d2ff', fontSize: '1.2rem', marginTop: '5px' }}>
            TARGET FOR INNINGS 2: <b>{targetRuns} RUNS</b> IN {totalOvers} OVERS!
          </p>
          <button
            onClick={startInnings2}
            style={{ marginTop: '30px', background: '#facc15', color: '#000', border: 'none', borderRadius: '30px', padding: '16px 40px', fontWeight: '900', fontSize: '1rem', letterSpacing: '2px', cursor: 'pointer' }}
          >
            ▶ START INNINGS 2 CHASE
          </button>
        </div>
      )}

      {/* ── 6. MATCH RESULT OVERLAY ── */}
      {gameState === 'RESULT' && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(9, 13, 22, 0.95)', backdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 150, fontFamily: "'Orbitron', sans-serif" }}>
          <h1 style={{ color: '#facc15', fontSize: '3.5rem', margin: 0, letterSpacing: '8px' }}>
            {runs >= targetRuns ? '🏆 CHASE SUCCESSFUL!' : '👑 INNINGS DEFENDED!'}
          </h1>
          <p style={{ color: '#fff', fontSize: '1.3rem', marginTop: '20px' }}>
            Final Score: <b>{runs} / {wickets}</b> (Target: {targetRuns})
          </p>
          <div style={{ display: 'flex', gap: '20px', marginTop: '35px' }}>
            <button
              onClick={resetMatch}
              style={{ background: '#facc15', color: '#000', border: 'none', borderRadius: '30px', padding: '16px 40px', fontWeight: '900', fontSize: '1rem', letterSpacing: '2px', cursor: 'pointer' }}
            >
              🔄 PLAY AGAIN
            </button>
            <button
              onClick={() => setGameState('MENU')}
              style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid #fff', borderRadius: '30px', padding: '16px 40px', fontWeight: '900', fontSize: '1rem', letterSpacing: '2px', cursor: 'pointer' }}
            >
              🏠 MAIN MENU
            </button>
          </div>
        </div>
      )}

      {/* ── 7. PAUSE / GULLY RULES SETTINGS MODAL ── */}
      {isSettingsOpen && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(9, 13, 22, 0.92)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, fontFamily: "'Orbitron', sans-serif" }}>
          <div style={{ width: '500px', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid #facc15', borderRadius: '16px', padding: '30px', color: '#fff' }}>
            <h2 style={{ color: '#facc15', fontSize: '1.4rem', margin: '0 0 16px', textAlign: 'center', letterSpacing: '3px' }}>
              📜 GULLY CRICKET RULES
            </h2>

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '16px', fontSize: '0.85rem', lineHeight: '1.8', marginBottom: '24px' }}>
              <div>• <b>ONE-TIPPI OUT</b>: Catching ball after 1 ground bounce is OUT!</div>
              <div>• <b>WALL BOUNDARY</b>: Direct side wall hit = 4 Runs!</div>
              <div>• <b>HIGH ROOF HIT</b>: Direct high roof wall hit = 6 Runs!</div>
              <div>• <b>WINDOW BREAK / BALL LOST</b>: Over building roof = OUT!</div>
              <div>• <b>WASD / ARROWS</b>: Aim Shot / Position Pitch Target</div>
              <div>• <b>SPACE / CLICK</b>: Swing Bat / Deliver Ball</div>
              <div>• <b>C KEY</b>: Toggle Batter / Bowler Camera</div>
              <div>• <b>F KEY</b>: Toggle Fullscreen</div>
            </div>

            <button
              onClick={() => setIsSettingsOpen(false)}
              style={{ width: '100%', background: '#facc15', color: '#000', border: 'none', borderRadius: '8px', padding: '14px', fontWeight: '900', cursor: 'pointer' }}
            >
              RESUME GAME
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
