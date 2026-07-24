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

// Dynamic Camera Rig
function CameraRig() {
  const cameraView = useGullyCricketStore((state) => state.cameraView)
  const phase = useGullyCricketStore((state) => state.phase)

  useFrame((state) => {
    if (phase === 'SHOT_HIT') {
      const ball = window.gullyBall
      if (ball && ball.position && Array.isArray(ball.position.current)) {
        const bPos = ball.position.current
        state.camera.position.lerp(new THREE.Vector3(bPos[0] + 12, 10, bPos[2] + 10), 0.1)
        state.camera.lookAt(bPos[0], 1.0, bPos[2])
        return
      }
    }

    if (cameraView === 'BATTER_VIEW') {
      state.camera.position.lerp(new THREE.Vector3(0, 3.2, 17.5), 0.12)
      state.camera.lookAt(0, 1.2, -6.0)
    } else if (cameraView === 'BOWLER_VIEW') {
      state.camera.position.lerp(new THREE.Vector3(0, 3.8, -19.0), 0.12)
      state.camera.lookAt(0, 1.2, 8.0)
    } else {
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

// ── 1. STANDALONE DRAFT COIN TOSS SCREEN ──
function DraftTossScreen() {
  const [coinFlipping, setCoinFlipping] = useState(false)
  const [tossResult, setTossResult] = useState(null)
  const setGameState = useGullyCricketStore((state) => state.setGameState)

  const handleFlipCoin = (choice) => {
    setCoinFlipping(true)
    setTimeout(() => {
      const result = Math.random() > 0.5 ? 'HEADS' : 'TAILS'
      const userWon = choice === result
      setTossResult({ result, userWon })
      setCoinFlipping(false)
      useGullyCricketStore.setState({
        draftTossWinner: userWon ? 'USER' : 'AI',
        draftTurn: userWon ? 'USER' : 'AI'
      })
    }, 1800)
  }

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'radial-gradient(circle at center, rgba(15,23,42,0.95), rgba(9,13,22,0.98))',
      zIndex: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Orbitron', sans-serif", padding: '40px', pointerEvents: 'auto'
    }}>
      <h1 style={{ color: '#facc15', fontSize: '2.8rem', fontStyle: 'italic', letterSpacing: '4px', margin: '0 0 10px' }}>
        🪙 DRAFT COIN TOSS
      </h1>
      <p style={{ color: '#94a3b8', fontSize: '1rem', marginBottom: '30px' }}>
        CHOOSE HEADS OR TAILS TO DETERMINE FIRST PICK IN MEGA DRAFT!
      </p>

      <div style={{
        width: '120px', height: '120px', borderRadius: '50%', background: 'linear-gradient(135deg, #facc15, #ca8a04)',
        border: '4px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '2.5rem', fontWeight: '900', color: '#000',
        boxShadow: '0 0 40px rgba(250, 204, 21, 0.7)',
        transform: coinFlipping ? 'rotateY(1440deg) scale(1.15)' : 'scale(1)',
        transition: 'transform 1.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}>
        🪙
      </div>

      {!tossResult && !coinFlipping && (
        <div style={{ display: 'flex', gap: '24px', marginTop: '40px' }}>
          <button
            onClick={() => handleFlipCoin('HEADS')}
            style={{
              background: 'linear-gradient(135deg, #0284c7, #0369a1)', color: '#fff', border: '2px solid #38bdf8',
              borderRadius: '30px', padding: '14px 44px', fontWeight: '900', fontSize: '1.2rem', cursor: 'pointer',
              boxShadow: '0 8px 25px rgba(2,132,199,0.5)'
            }}
          >
            HEADS
          </button>
          <button
            onClick={() => handleFlipCoin('TAILS')}
            style={{
              background: 'linear-gradient(135deg, #9333ea, #6b21a8)', color: '#fff', border: '2px solid #c084fc',
              borderRadius: '30px', padding: '14px 44px', fontWeight: '900', fontSize: '1.2rem', cursor: 'pointer',
              boxShadow: '0 8px 25px rgba(147,51,234,0.5)'
            }}
          >
            TAILS
          </button>
        </div>
      )}

      {tossResult && (
        <div style={{ marginTop: '35px', textAlign: 'center' }}>
          <h2 style={{ color: tossResult.userWon ? '#22c55e' : '#ef4444', fontSize: '1.8rem', margin: '0 0 15px' }}>
            {tossResult.result}! {tossResult.userWon ? 'YOU WON THE TOSS!' : 'STREET REBELS WON THE TOSS!'}
          </h2>
          <p style={{ color: '#cbd5e1', fontSize: '1rem', marginBottom: '25px' }}>
            {tossResult.userWon ? 'You get 1st pick in the Mega Draft!' : 'AI gets 1st pick in the Mega Draft!'}
          </p>
          <button
            onClick={() => setGameState('MEGA_DRAFT')}
            style={{
              background: '#facc15', color: '#000', border: 'none', borderRadius: '30px', padding: '16px 50px',
              fontWeight: '900', fontSize: '1.2rem', cursor: 'pointer', letterSpacing: '2px'
            }}
          >
            PROCEED TO MEGA DRAFT ➔
          </button>
        </div>
      )}
    </div>
  )
}

// ── 2. STANDALONE CLASH ROYALE STYLE MEGA DRAFT SCREEN ──
function MegaDraftScreen() {
  const draftPool = useGullyCricketStore((state) => state.draftPool)
  const userSquad = useGullyCricketStore((state) => state.userSquad)
  const aiSquad = useGullyCricketStore((state) => state.aiSquad)
  const draftTurn = useGullyCricketStore((state) => state.draftTurn)
  const pickDraftPlayer = useGullyCricketStore((state) => state.pickDraftPlayer)
  const makeAiDraftPick = useGullyCricketStore((state) => state.makeAiDraftPick)
  const setHoveredPlayerId = useGullyCricketStore((state) => state.setHoveredPlayerId)
  const teamSize = useGullyCricketStore((state) => state.teamSize)

  // Auto trigger AI draft pick when it's AI's turn
  useEffect(() => {
    if (draftTurn === 'AI') {
      const timer = setTimeout(() => {
        makeAiDraftPick()
      }, 1200)
      return () => clearTimeout(timer)
    }
  }, [draftTurn, makeAiDraftPick])

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'radial-gradient(circle at center, rgba(15,23,42,0.96), rgba(9,13,22,0.99))',
      zIndex: 130, display: 'flex', flexDirection: 'column', padding: '24px 36px',
      fontFamily: "'Orbitron', sans-serif", userSelect: 'none', pointerEvents: 'auto'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <h1 style={{ color: '#facc15', fontSize: '2.2rem', fontStyle: 'italic', margin: 0, letterSpacing: '3px' }}>
          ⚔️ GULLY MEGA DRAFT ⚔️
        </h1>
        <p style={{ color: draftTurn === 'USER' ? '#38bdf8' : '#ef4444', fontSize: '1rem', fontWeight: '900', marginTop: '6px' }}>
          {draftTurn === 'USER' ? '👉 YOUR TURN TO PICK A PLAYER!' : '⏳ AI IS CHOOSING A PLAYER...'}
        </p>
      </div>

      <div style={{ display: 'flex', gap: '20px', flex: 1, overflow: 'hidden' }}>
        {/* Left Column: User Squad */}
        <div style={{
          width: '260px', background: 'rgba(15, 23, 42, 0.9)', border: '2px solid #0284c7',
          borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px'
        }}>
          <h3 style={{ color: '#38bdf8', fontSize: '1rem', margin: 0, textAlign: 'center' }}>
            CHINMAYA XI ({userSquad.length}/{teamSize})
          </h3>
          {Array.from({ length: teamSize }).map((_, i) => {
            const p = userSquad[i]
            return (
              <div key={i} style={{
                height: '50px', background: p ? 'rgba(2, 132, 199, 0.2)' : 'rgba(255,255,255,0.05)',
                border: '1.5px dashed', borderColor: p ? '#0284c7' : 'rgba(255,255,255,0.2)',
                borderRadius: '8px', display: 'flex', alignItems: 'center', padding: '0 12px', gap: '10px'
              }}>
                {p ? (
                  <>
                    <span style={{ fontSize: '1.2rem' }}>🏏</span>
                    <div>
                      <div style={{ color: '#fff', fontSize: '0.75rem', fontWeight: '900' }}>{p.name}</div>
                      <div style={{ color: '#38bdf8', fontSize: '0.62rem' }}>BAT: {p.bat} | BOWL: {p.bowl}</div>
                    </div>
                  </>
                ) : (
                  <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Empty Slot {i + 1}</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Center Grid: Clash Royale 10 Player Cards Pool */}
        <div style={{
          flex: 1, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', alignContent: 'center'
        }}>
          {draftPool.map((p) => (
            <div
              key={p.id}
              onClick={() => {
                if (draftTurn === 'USER') pickDraftPlayer(p.id)
              }}
              onMouseEnter={() => setHoveredPlayerId(p.id)}
              style={{
                background: `linear-gradient(180deg, rgba(15,23,42,0.9) 0%, rgba(30,41,59,0.95) 100%)`,
                border: '2.5px solid', borderColor: p.color, borderRadius: '12px',
                padding: '12px 10px', cursor: draftTurn === 'USER' ? 'pointer' : 'not-allowed',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                textAlign: 'center', boxShadow: `0 6px 20px rgba(0,0,0,0.6), 0 0 15px ${p.color}44`,
                transition: 'transform 0.15s', height: '220px'
              }}
            >
              <div style={{ color: p.color, fontSize: '0.75rem', fontWeight: '900', fontStyle: 'italic' }}>{p.trait}</div>
              <div style={{ fontSize: '2.5rem', margin: '4px 0' }}>👤</div>
              <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: '900', lineHeight: 1.1 }}>{p.name}</div>
              
              <div style={{ width: '100%', fontSize: '0.62rem', color: '#cbd5e1', marginTop: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>BAT</span><span>{p.bat}</span></div>
                <div style={{ width: '100%', height: '4px', background: '#334155', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${p.bat}%`, height: '100%', background: '#facc15' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}><span>BOWL</span><span>{p.bowl}</span></div>
                <div style={{ width: '100%', height: '4px', background: '#334155', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${p.bowl}%`, height: '100%', background: '#ef4444' }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: AI Squad */}
        <div style={{
          width: '260px', background: 'rgba(15, 23, 42, 0.9)', border: '2px solid #ef4444',
          borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px'
        }}>
          <h3 style={{ color: '#ef4444', fontSize: '1rem', margin: 0, textAlign: 'center' }}>
            STREET REBELS ({aiSquad.length}/{teamSize})
          </h3>
          {Array.from({ length: teamSize }).map((_, i) => {
            const p = aiSquad[i]
            return (
              <div key={i} style={{
                height: '50px', background: p ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.05)',
                border: '1.5px dashed', borderColor: p ? '#ef4444' : 'rgba(255,255,255,0.2)',
                borderRadius: '8px', display: 'flex', alignItems: 'center', padding: '0 12px', gap: '10px'
              }}>
                {p ? (
                  <>
                    <span style={{ fontSize: '1.2rem' }}>⚾</span>
                    <div>
                      <div style={{ color: '#fff', fontSize: '0.75rem', fontWeight: '900' }}>{p.name}</div>
                      <div style={{ color: '#ef4444', fontSize: '0.62rem' }}>BAT: {p.bat} | BOWL: {p.bowl}</div>
                    </div>
                  </>
                ) : (
                  <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Empty Slot {i + 1}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── 3. STANDALONE MATCH TOSS SCREEN ──
function MatchTossScreen() {
  const [userChoice, setUserChoice] = useState(null)
  const resetMatch = useGullyCricketStore((state) => state.resetMatch)

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'radial-gradient(circle at center, rgba(15,23,42,0.96), rgba(9,13,22,0.99))',
      zIndex: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Orbitron', sans-serif", padding: '40px', pointerEvents: 'auto'
    }}>
      <h1 style={{ color: '#facc15', fontSize: '3rem', fontStyle: 'italic', letterSpacing: '4px', margin: '0 0 10px' }}>
        🪙 MATCH TOSS
      </h1>
      <p style={{ color: '#22c55e', fontSize: '1.2rem', fontWeight: '900', marginBottom: '30px' }}>
        CHINMAYA XI WON THE MATCH TOSS! CHOOSE TO BAT OR BOWL FIRST!
      </p>

      <div style={{ display: 'flex', gap: '30px', marginBottom: '40px' }}>
        <button
          onClick={() => setUserChoice('BAT')}
          style={{
            background: userChoice === 'BAT' ? 'linear-gradient(135deg, #facc15, #eab308)' : 'rgba(15,23,42,0.9)',
            color: userChoice === 'BAT' ? '#000' : '#fff', border: '3px solid #facc15',
            borderRadius: '20px', padding: '24px 48px', fontSize: '1.5rem', fontWeight: '900', cursor: 'pointer',
            boxShadow: '0 10px 30px rgba(250,204,21,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px'
          }}
        >
          <span style={{ fontSize: '3rem' }}>🏏</span>
          <span>ELECT TO BAT</span>
        </button>

        <button
          onClick={() => setUserChoice('BOWL')}
          style={{
            background: userChoice === 'BOWL' ? 'linear-gradient(135deg, #0284c7, #0369a1)' : 'rgba(15,23,42,0.9)',
            color: '#fff', border: '3px solid #0284c7',
            borderRadius: '20px', padding: '24px 48px', fontSize: '1.5rem', fontWeight: '900', cursor: 'pointer',
            boxShadow: '0 10px 30px rgba(2,132,199,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px'
          }}
        >
          <span style={{ fontSize: '3rem' }}>⚾</span>
          <span>ELECT TO BOWL</span>
        </button>
      </div>

      {userChoice && (
        <button
          onClick={resetMatch}
          style={{
            background: '#22c55e', color: '#fff', border: 'none', borderRadius: '35px',
            padding: '18px 60px', fontWeight: '900', fontSize: '1.3rem', letterSpacing: '3px', cursor: 'pointer'
          }}
        >
          START MATCH ⚡
        </button>
      )}
    </div>
  )
}

export function GullyCricketGame({ onExit }) {
  const gameState = useGullyCricketStore((state) => state.gameState)
  const setGameState = useGullyCricketStore((state) => state.setGameState)
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
  const cameraView = useGullyCricketStore((state) => state.cameraView)
  const setCameraView = useGullyCricketStore((state) => state.setCameraView)
  const resetMatch = useGullyCricketStore((state) => state.resetMatch)
  const startInnings2 = useGullyCricketStore((state) => state.startInnings2)

  const [deliveryTarget, setDeliveryTarget] = useState([0, -2.0])
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [selectedMenuIndex, setSelectedMenuIndex] = useState(0)

  // Preload images on mount
  useEffect(() => {
    preloadGameImages()
  }, [])

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

  useEffect(() => {
    if (gameState === 'BOOT') {
      const timer = setTimeout(() => {
        setGameState('MENU')
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [gameState, setGameState])

  const handleDeliverBall = (target) => {
    setDeliveryTarget(target)
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#090d16', position: 'relative', overflow: 'hidden', userSelect: 'none' }}>
      
      {/* ── 1. BOOT / LOADING SCREEN ── */}
      {gameState === 'BOOT' && (
        <div style={{
          position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, #1e293b 0%, #090d16 100%)',
          zIndex: 999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Orbitron', sans-serif"
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '4.5rem', fontWeight: '900', letterSpacing: '8px' }}>
            <span>🏏</span>
            <span style={{ color: '#ffffff' }}>GULLY</span>
            <span style={{ color: '#facc15', fontStyle: 'italic' }}>CRICKET</span>
            <span style={{ color: '#0284c7' }}>3D</span>
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
        <directionalLight position={[20, 35, 15]} intensity={1.8} castShadow />

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
        const startDraft = () => useGullyCricketStore.getState().startMegaDraftFlow()
        const CARDS = [
          {
            id: 'quick',
            title: 'QUICK MATCH',
            sub: 'JUMP IN & DRAFT SQUAD FOR QUICK MATCH',
            color: '#0284c7',
            img: '/card_quick.jpg',
            action: () => {
              useGullyCricketStore.setState({ totalOvers: 1, teamSize: 5, gameMode: 'STREET_SERIES' })
              startDraft()
            }
          },
          {
            id: 'tournament',
            title: 'TOURNAMENT',
            sub: 'DRAFT STREET KINGS & WIN TROPHY',
            color: '#16a34a',
            img: '/card_tournament.jpg',
            action: () => {
              useGullyCricketStore.setState({ totalOvers: 2, teamSize: 5, gameMode: 'STREET_SERIES' })
              startDraft()
            }
          },
          {
            id: 'career',
            title: 'CAREER MODE',
            sub: 'RISE FROM THE STREETS TO BECOME A LEGEND',
            color: '#9333ea',
            img: '/card_career.jpg',
            action: () => {
              useGullyCricketStore.setState({ totalOvers: 2, teamSize: 5, gameMode: 'STREET_SERIES' })
              startDraft()
            }
          },
          {
            id: '2v2',
            title: '2v2 MODE',
            sub: 'TEAM UP WITH YOUR FRIEND & DOMINATE',
            color: '#ea580c',
            img: '/card_2v2.jpg',
            action: () => {
              useGullyCricketStore.setState({ totalOvers: 1, teamSize: 2, gameMode: '1V1_CHALLENGE' })
              startDraft()
            }
          },
          {
            id: 'practice',
            title: 'PRACTICE',
            sub: 'SHARPEN YOUR SKILLS IN THE NETS',
            color: '#0d9488',
            img: '/card_practice.jpg',
            action: () => {
              useGullyCricketStore.setState({ totalOvers: 5, teamSize: 5, gameMode: 'FREE_HIT' })
              resetMatch()
            }
          },
          {
            id: 'custom',
            title: 'CUSTOM MATCH',
            sub: 'CREATE YOUR OWN MATCH YOUR RULES',
            color: '#be185d',
            img: '/card_custom.jpg',
            action: () => setIsSettingsOpen(true)
          }
        ]

        const activeCard = CARDS[selectedMenuIndex] || CARDS[0]

        return (
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'auto', display: 'flex', flexDirection: 'column',
            justifyContent: 'space-between', padding: '24px 36px', fontFamily: "'Orbitron', sans-serif",
            backgroundImage: "linear-gradient(180deg, rgba(9, 13, 22, 0.4) 0%, rgba(9, 13, 22, 0.75) 100%), url('/gully_bg.jpg')",
            backgroundSize: 'cover', backgroundPosition: 'center', boxSizing: 'border-box', userSelect: 'none', zIndex: 100
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.92))',
                border: '1.5px solid rgba(59, 130, 246, 0.5)', borderRadius: '14px', padding: '8px 14px', minWidth: '280px'
              }}>
                <img src="/gully_avatar.jpg" alt="Avatar" style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', border: '2px solid #facc15' }} />
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#fff', fontSize: '0.95rem', fontWeight: '900' }}>CHINMAYA</span>
                    <span style={{ background: '#000', border: '1.5px solid #facc15', color: '#facc15', fontSize: '0.62rem', fontWeight: '900', padding: '1px 6px', borderRadius: '4px', marginLeft: 'auto' }}>12</span>
                  </div>
                  <div style={{ color: '#facc15', fontSize: '0.68rem', fontWeight: '700', fontStyle: 'italic' }}>Gully Legend</div>
                </div>
              </div>

              <div style={{ textAlign: 'center', flex: 1, margin: '0 20px' }}>
                <h1 style={{ fontSize: '3.4rem', fontWeight: '900', letterSpacing: '3px', margin: 0, fontStyle: 'italic', lineHeight: 1 }}>
                  <span style={{ color: '#ffffff' }}>GULLY </span>
                  <span style={{ color: '#facc15' }}>CRICKET </span>
                  <span>🔴</span>
                </h1>
                <div style={{ color: '#ffffff', fontSize: '0.72rem', fontWeight: '900', letterSpacing: '5px', marginTop: '4px' }}>
                  APNA GAME. APNA STYLE.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ background: 'rgba(15, 23, 42, 0.92)', border: '1.5px solid #facc15', borderRadius: '8px', padding: '4px 10px', color: '#fff', fontWeight: '900', fontSize: '0.88rem' }}>
                  🪙 1250
                </div>
                <div style={{ background: 'rgba(15, 23, 42, 0.92)', border: '1.5px solid #a855f7', borderRadius: '8px', padding: '4px 10px', color: '#fff', fontWeight: '900', fontSize: '0.88rem' }}>
                  💎 35
                </div>
              </div>
            </div>

            {/* Mode Cards Shelf */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', alignItems: 'stretch', margin: '18px 0', flex: 1, maxHeight: '380px' }}>
              {CARDS.map((card, idx) => {
                const isSelected = idx === selectedMenuIndex
                return (
                  <div
                    key={card.id}
                    onClick={() => setSelectedMenuIndex(idx)}
                    onDoubleClick={card.action}
                    style={{
                      flex: 1, backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.85) 100%), url('${card.img}')`,
                      backgroundSize: 'cover', backgroundPosition: 'center', border: '2.5px solid',
                      borderColor: isSelected ? '#facc15' : card.color, borderRadius: '12px', padding: '16px 10px',
                      cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                      textAlign: 'center', transition: 'all 0.25s', transform: isSelected ? 'translateY(-14px) scale(1.05)' : 'scale(0.98)'
                    }}
                  >
                    <h3 style={{ color: '#ffffff', fontSize: '1.2rem', fontWeight: '900', margin: 0, fontStyle: 'italic' }}>{card.title}</h3>
                    <div style={{ background: 'rgba(0,0,0,0.7)', padding: '6px 4px', borderRadius: '6px' }}>
                      <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.62rem', fontWeight: '800', margin: 0 }}>{card.sub}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Bottom Row */}
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              <button
                onClick={activeCard.action}
                style={{
                  background: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)', color: '#000',
                  border: '3px solid #ffffff', borderRadius: '35px', padding: '16px 64px',
                  fontSize: '1.6rem', fontWeight: '900', fontStyle: 'italic', letterSpacing: '3px', cursor: 'pointer',
                  boxShadow: '0 10px 35px rgba(250, 204, 21, 0.6)'
                }}
              >
                PLAY NOW 🏏
              </button>
            </div>
          </div>
        )
      })()}

      {/* ── 4. STAGE SCREENS (DRAFT TOSS, MEGA DRAFT, MATCH TOSS) ── */}
      {gameState === 'DRAFT_TOSS' && <DraftTossScreen />}
      {gameState === 'MEGA_DRAFT' && <MegaDraftScreen />}
      {gameState === 'MATCH_TOSS' && <MatchTossScreen />}

      {/* ── 5. IN-GAME HUD OVERLAYS ── */}
      {(gameState === 'INNINGS_1' || gameState === 'INNINGS_2') && (
        <>
          <div style={{
            position: 'absolute', top: '25px', left: '30px', background: 'rgba(15, 23, 42, 0.88)',
            border: '1px solid rgba(250, 204, 21, 0.4)', borderRadius: '12px', padding: '12px 24px',
            fontFamily: "'Orbitron', sans-serif", zIndex: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '6px' }}>
              <span style={{ background: '#facc15', color: '#000', fontSize: '0.7rem', fontWeight: '900', padding: '2px 8px', borderRadius: '4px' }}>
                INNINGS {currentInnings}
              </span>
              <span style={{ color: '#ffffff', fontSize: '1.4rem', fontWeight: '900' }}>
                {runs} / {wickets}
              </span>
              <span style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: '800' }}>
                ({completedOvers}.{ballsInOver} / {totalOvers} OVERS)
              </span>
            </div>
            <div style={{ display: 'flex', gap: '14px', fontSize: '0.75rem', color: '#cbd5e1' }}>
              <span>🏏 {strikerName}: <b>{strikerRuns}</b> ({strikerBalls})</span>
              <span>⚾ {bowlerName}</span>
            </div>
          </div>

          <div style={{ position: 'absolute', top: '25px', right: '30px', zIndex: 10, display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setCameraView(cameraView === 'BATTER_VIEW' ? 'BOWLER_VIEW' : 'BATTER_VIEW')}
              style={{ background: 'rgba(15, 23, 42, 0.88)', border: '1px solid #00d2ff', color: '#00d2ff', borderRadius: '8px', padding: '8px 16px', fontWeight: '900', cursor: 'pointer', fontFamily: "'Orbitron', sans-serif", fontSize: '0.8rem' }}
            >
              📹 CAMERA [C]: {cameraView === 'BATTER_VIEW' ? 'BATTER VIEW' : 'BOWLER VIEW'}
            </button>
          </div>
        </>
      )}

      {/* ── 6. INNINGS BREAK OVERLAY ── */}
      {gameState === 'INNINGS_BREAK' && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(9, 13, 22, 0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 150, fontFamily: "'Orbitron', sans-serif" }}>
          <h1 style={{ color: '#facc15', fontSize: '3rem', margin: 0, letterSpacing: '6px' }}>INNINGS BREAK!</h1>
          <button onClick={startInnings2} style={{ marginTop: '30px', background: '#facc15', color: '#000', border: 'none', borderRadius: '30px', padding: '16px 40px', fontWeight: '900', fontSize: '1rem', cursor: 'pointer' }}>
            ▶ START INNINGS 2 CHASE
          </button>
        </div>
      )}

      {/* ── 7. MATCH RESULT OVERLAY ── */}
      {gameState === 'RESULT' && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(9, 13, 22, 0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 150, fontFamily: "'Orbitron', sans-serif" }}>
          <h1 style={{ color: '#facc15', fontSize: '3.5rem', margin: 0, letterSpacing: '8px' }}>
            {runs >= targetRuns ? '🏆 CHASE SUCCESSFUL!' : '👑 INNINGS DEFENDED!'}
          </h1>
          <div style={{ display: 'flex', gap: '20px', marginTop: '35px' }}>
            <button onClick={resetMatch} style={{ background: '#facc15', color: '#000', border: 'none', borderRadius: '30px', padding: '16px 40px', fontWeight: '900', fontSize: '1rem', cursor: 'pointer' }}>
              🔄 PLAY AGAIN
            </button>
            <button onClick={() => setGameState('MENU')} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid #fff', borderRadius: '30px', padding: '16px 40px', fontWeight: '900', fontSize: '1rem', cursor: 'pointer' }}>
              🏠 MAIN MENU
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
