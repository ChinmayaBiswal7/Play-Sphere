import React, { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Physics } from '@react-three/cannon'
import { Environment, Stars, Sky } from '@react-three/drei'
import { useFootballStore } from './footballStore'
import { Arena } from './Arena'
import { Ball } from './Ball'
import { Player } from './Player'
import { Bot } from './Bot'
import * as THREE from 'three'

// Dynamic Goalkeeper Allocator & Goal Trigger
function GoalkeeperManager() {
  const setGKs = useFootballStore((state) => state.setGKs)
  const gameState = useFootballStore((state) => state.gameState)
  const incrementScore = useFootballStore((state) => state.incrementScore)

  useFrame(() => {
    if (gameState !== 'PLAYING') return

    const ball = window.footballBall
    if (!ball || !ball.position || !Array.isArray(ball.position.current)) return

    const ballPos = ball.position.current
    const zPos = ballPos[2]

    const redGK = zPos > 0 ? 'player1' : null
    const blueGK = zPos < 0 ? 'bot1' : null

    const currentRed = useFootballStore.getState().redGK
    const currentBlue = useFootballStore.getState().blueGK

    if (redGK !== currentRed || blueGK !== currentBlue) {
      setGKs(redGK, blueGK)
    }

    // Goal triggers at Z = ±60.25 (Goal width 16)
    if (zPos < -60.25 && Math.abs(ballPos[0]) < 8.0) {
      incrementScore('red')
    } else if (zPos > 60.25 && Math.abs(ballPos[0]) < 8.0) {
      incrementScore('blue')
    }
  })

  return null
}

function ReplayRecorder() {
  const gameState = useFootballStore((state) => state.gameState)
  const pushReplayFrame = useFootballStore((state) => state.pushReplayFrame)
  const lastRecordTime = useRef(0)

  useFrame((state) => {
    if (gameState !== 'PLAYING') return

    const now = state.clock.getElapsedTime()
    if (now - lastRecordTime.current > 0.06) {
      lastRecordTime.current = now

      const ball = window.footballBall
      const p = window.footballPlayer
      const b = window.footballBot

      const bPos = ball && Array.isArray(ball.position.current) ? [...ball.position.current] : [0, 0, 0]
      const pPos = p && Array.isArray(p.position.current) ? [...p.position.current] : [0, 0, 0]
      const botPos = b && Array.isArray(b.position.current) ? [...b.position.current] : [0, 0, 0]

      pushReplayFrame({ bPos, pPos, botPos })
    }
  })

  return null
}

function CinematicReplayCamera() {
  const gameState = useFootballStore((state) => state.gameState)
  const lastScorer = useFootballStore((state) => state.lastScorer)
  const replayBuffer = useFootballStore((state) => state.replayBuffer)
  const animAngle = useRef(0)
  const replayFrameIdx = useRef(0)

  useFrame((state, dt) => {
    if (gameState === 'GOAL_CELEBRATION') {
      animAngle.current += dt * 1.5

      const scorerPos = lastScorer === 'red' 
        ? (window.footballPlayer ? window.footballPlayer.position.current : [0, 1.2, 0])
        : (window.footballBot ? window.footballBot.position.current : [0, 1.2, 0])

      const camX = scorerPos[0] + Math.sin(animAngle.current) * 4.5
      const camY = scorerPos[1] + 2.0
      const camZ = scorerPos[2] + Math.cos(animAngle.current) * 4.5

      state.camera.position.set(camX, camY, camZ)
      state.camera.lookAt(scorerPos[0], scorerPos[1] + 1.2, scorerPos[2])

    } else if (gameState === 'GOAL_REPLAY') {
      if (replayBuffer.length > 0) {
        replayFrameIdx.current = (replayFrameIdx.current + 1) % replayBuffer.length
        const frame = replayBuffer[replayFrameIdx.current]

        if (frame && frame.bPos) {
          const ballX = frame.bPos[0]
          const ballZ = frame.bPos[2]

          state.camera.position.set(24, 10, ballZ + 8)
          state.camera.lookAt(ballX, 1.0, ballZ)
        }
      }
    } else if (gameState === 'MENU') {
      state.camera.position.set(0, 1.6, 5.2)
      state.camera.lookAt(0, 1.0, 0)
    }
  })

  return null
}

function MiniMapRadar() {
  const canvasRef = useRef(null)

  useEffect(() => {
    let animId
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const draw = () => {
      ctx.clearRect(0, 0, 140, 140)

      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)'
      ctx.beginPath()
      ctx.arc(70, 70, 64, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
      ctx.strokeRect(35, 15, 70, 110)

      ctx.beginPath()
      ctx.moveTo(35, 70)
      ctx.lineTo(105, 70)
      ctx.stroke()

      ctx.strokeRect(55, 15, 30, 14)
      ctx.strokeRect(55, 111, 30, 14)

      const mapX = (x) => 70 + (x / 75) * 35
      const mapZ = (z) => 70 + (z / 120) * 55

      const p = window.footballPlayer
      if (p && p.position && Array.isArray(p.position.current)) {
        const px = mapX(p.position.current[0])
        const pz = mapZ(p.position.current[2])
        ctx.fillStyle = '#ef4444'
        ctx.beginPath()
        ctx.arc(px, pz, 5, 0, Math.PI * 2)
        ctx.fill()
      }

      const b = window.footballBot
      if (b && b.position && Array.isArray(b.position.current)) {
        const bx = mapX(b.position.current[0])
        const bz = mapZ(b.position.current[2])
        ctx.fillStyle = '#0284c7'
        ctx.beginPath()
        ctx.arc(bx, bz, 5, 0, Math.PI * 2)
        ctx.fill()
      }

      const ball = window.footballBall
      if (ball && ball.position && Array.isArray(ball.position.current)) {
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

const PRO_TIPS = [
  "Staying high up on the pitch allows to receive passes and counter-attack quickly but will leave your teammates in inferior numbers and vulnerable.",
  "Wall rebounds are valid pass routes! Bounce the ball off side barriers to bypass aggressive defenders.",
  "Hold SPACE to charge your Power Shot before releasing towards goal.",
  "Use L-SHIFT to sprint down the wings when you spot open grass."
]

export function RematchGame({ onExit }) {
  const score = useFootballStore((state) => state.score)
  const half = useFootballStore((state) => state.half)
  const gameState = useFootballStore((state) => state.gameState)
  const timer = useFootballStore((state) => state.timer)
  const stamina = useFootballStore((state) => state.stamina)
  const goalAlert = useFootballStore((state) => state.goalAlert)
  const lastScorer = useFootballStore((state) => state.lastScorer)
  const setGameState = useFootballStore((state) => state.setGameState)
  const setGoalAlert = useFootballStore((state) => state.setGoalAlert)
  const resetMatch = useFootballStore((state) => state.resetMatch)
  const tickTimer = useFootballStore((state) => state.tickTimer)
  
  const activeMenuTab = useFootballStore((state) => state.activeMenuTab)
  const setActiveMenuTab = useFootballStore((state) => state.setActiveMenuTab)
  const characterPreset = useFootballStore((state) => state.characterPreset)
  const setCharacterPreset = useFootballStore((state) => state.setCharacterPreset)
  const arenaStyle = useFootballStore((state) => state.arenaStyle)
  const setArenaStyle = useFootballStore((state) => state.setArenaStyle)

  // ── MULTIPLAYER HOOKS ──
  const matchMode = useFootballStore((state) => state.matchMode)
  const setMatchMode = useFootballStore((state) => state.setMatchMode)
  const multiplayerFormat = useFootballStore((state) => state.multiplayerFormat)
  const setMultiplayerFormat = useFootballStore((state) => state.setMultiplayerFormat)
  const roomCode = useFootballStore((state) => state.roomCode)
  const setRoomCode = useFootballStore((state) => state.setRoomCode)
  const isHost = useFootballStore((state) => state.isHost)
  const setIsHost = useFootballStore((state) => state.setIsHost)
  const matchmakingStatus = useFootballStore((state) => state.matchmakingStatus)
  const setMatchmakingStatus = useFootballStore((state) => state.setMatchmakingStatus)
  const connectedPlayers = useFootballStore((state) => state.connectedPlayers)
  const setConnectedPlayers = useFootballStore((state) => state.setConnectedPlayers)

  const [inputRoomCode, setInputRoomCode] = useState('')
  const [multiplayerSubSection, setMultiplayerSubSection] = useState('ONLINE_MATCH') // 'ONLINE_MATCH' | 'PLAY_WITH_FRIEND'
  const [tipIndex, setTipIndex] = useState(0)

  // Socket.io integration
  useEffect(() => {
    const socket = window.parent && window.parent.socket ? window.parent.socket : (window.socket || null)
    if (!socket) return

    const handleRoomCreated = ({ roomCode, isHost, players }) => {
      setRoomCode(roomCode)
      setIsHost(isHost)
      setConnectedPlayers(players || [])
      setMatchmakingStatus('IDLE')
    }

    const handleRoomJoined = ({ roomCode, players }) => {
      setRoomCode(roomCode)
      setConnectedPlayers(players || [])
      setMatchmakingStatus('CONNECTED')
      startMatchWithLoading()
    }

    const handleSearching = ({ format, queuedCount }) => {
      setMatchmakingStatus('SEARCHING')
    }

    const handleMatchFound = ({ roomCode, format, players }) => {
      setRoomCode(roomCode)
      setConnectedPlayers(players || [])
      setMatchmakingStatus('FOUND')
      setTimeout(() => {
        startMatchWithLoading()
      }, 1000)
    }

    const handleError = (msg) => {
      alert(msg)
      setMatchmakingStatus('IDLE')
    }

    socket.on('rematch-pvp-room-created', handleRoomCreated)
    socket.on('rematch-pvp-room-joined', handleRoomJoined)
    socket.on('rematch-pvp-searching', handleSearching)
    socket.on('rematch-pvp-match-found', handleMatchFound)
    socket.on('rematch-pvp-error', handleError)

    return () => {
      socket.off('rematch-pvp-room-created', handleRoomCreated)
      socket.off('rematch-pvp-room-joined', handleRoomJoined)
      socket.off('rematch-pvp-searching', handleSearching)
      socket.off('rematch-pvp-match-found', handleMatchFound)
      socket.off('rematch-pvp-error', handleError)
    }
  }, [])

  useEffect(() => {
    if (gameState === 'BOOT') {
      const bootTimer = setTimeout(() => {
        setGameState('MENU')
      }, 2800)
      return () => clearTimeout(bootTimer)
    }
  }, [gameState])

  useEffect(() => {
    let interval
    if (gameState === 'PLAYING') {
      interval = setInterval(() => {
        tickTimer()
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [gameState])

  useEffect(() => {
    if (gameState === 'KICKOFF') {
      const timeout = setTimeout(() => {
        setGameState('PLAYING')
      }, 2200)
      return () => clearTimeout(timeout)
    } else if (gameState === 'GOAL_CELEBRATION') {
      const timeout = setTimeout(() => {
        setGameState('GOAL_REPLAY')
      }, 3500)
      return () => clearTimeout(timeout)
    } else if (gameState === 'GOAL_REPLAY') {
      const timeout = setTimeout(() => {
        setGoalAlert('')
        setGameState('KICKOFF')
      }, 6000)
      return () => clearTimeout(timeout)
    } else if (gameState === 'HALF_TIME') {
      const timeout = setTimeout(() => {
        setGameState('KICKOFF')
      }, 3500)
      return () => clearTimeout(timeout)
    }
  }, [gameState])

  const skipReplay = () => {
    setGoalAlert('')
    setGameState('KICKOFF')
  }

  const startMatchWithLoading = () => {
    setGameState('LOADING_MATCH')
    setTimeout(() => {
      resetMatch()
    }, 1800)
  }

  // Multiplayer Actions
  const handleCreateFriendRoom = () => {
    const socket = window.parent && window.parent.socket ? window.parent.socket : (window.socket || null)
    const username = window.currentUser ? window.currentUser.displayName : 'Player 1'
    if (socket) {
      socket.emit('rematch-pvp-create-room', { format: multiplayerFormat, username })
    } else {
      setRoomCode('FOOT-LOCAL')
      setIsHost(true)
    }
  }

  const handleJoinFriendRoom = () => {
    if (!inputRoomCode.trim()) return
    const socket = window.parent && window.parent.socket ? window.parent.socket : (window.socket || null)
    const username = window.currentUser ? window.currentUser.displayName : 'Player 2'
    if (socket) {
      socket.emit('rematch-pvp-join-room', { roomCode: inputRoomCode, username })
    } else {
      startMatchWithLoading()
    }
  }

  const handleFindOnlineMatch = () => {
    const socket = window.parent && window.parent.socket ? window.parent.socket : (window.socket || null)
    const username = window.currentUser ? window.currentUser.displayName : 'Player'
    setMatchmakingStatus('SEARCHING')
    if (socket) {
      socket.emit('rematch-pvp-find-match', { format: multiplayerFormat, username })
    } else {
      setTimeout(() => {
        startMatchWithLoading()
      }, 1500)
    }
  }

  const formatTime = (timeInSecs) => {
    const mins = Math.floor(timeInSecs / 60)
    const secs = timeInSecs % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#090d16', position: 'relative', overflow: 'hidden', userSelect: 'none' }}>
      
      {/* ── 1. FULL-BLEED SEAMLESS REMATCH BOOT / LOADING SCREEN ── */}
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
          <div style={{ position: 'absolute', top: 0, right: '15%', width: '600px', height: '100%', background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, transparent 80%)', transform: 'skewX(-25deg)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 0, left: '10%', width: '300px', height: '100%', background: 'linear-gradient(135deg, rgba(0, 210, 255, 0.05) 0%, transparent 80%)', transform: 'skewX(-25deg)', pointerEvents: 'none' }} />

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '6rem', fontWeight: '900', letterSpacing: '14px' }}>
              <span style={{ color: '#ffffff' }}>RE</span>
              <span style={{ color: '#22c55e', fontStyle: 'italic', transform: 'skewX(-18deg)', display: 'inline-block', textShadow: '0 0 50px rgba(34, 197, 94, 0.8)' }}>/</span>
              <span style={{ color: '#ffffff' }}>MATCH</span>
            </div>
            <p style={{ color: '#94a3b8', letterSpacing: '6px', fontSize: '1rem', marginTop: '10px', fontWeight: '800' }}>
              {matchMode === 'SINGLE_PLAYER' ? 'ARCADE FOOTBALL 2026' : `MULTIPLAYER ${multiplayerFormat} ARENA`}
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', zIndex: 10 }}>
            <div style={{ maxWidth: '620px', color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.6', fontFamily: 'sans-serif', background: 'rgba(15, 23, 42, 0.75)', padding: '18px 24px', borderRadius: '10px', borderLeft: '4px solid #22c55e', backdropFilter: 'blur(10px)' }}>
              {PRO_TIPS[tipIndex]}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#cbd5e1', fontSize: '0.95rem', fontWeight: '800' }}>
              <span>Connecting to match server...</span>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', border: '3px solid #22c55e', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
            </div>
          </div>

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
        camera={{ fov: 62, position: [0, 2.2, 16] }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <color attach="background" args={arenaStyle === 'desert' ? ['#fdf4ff'] : ['#030712']} />
        <fog attach="fog" args={arenaStyle === 'desert' ? ['#fae8ff', 60, 200] : ['#030712', 60, 200]} />

        <ambientLight intensity={0.7} />
        <directionalLight position={[25, 45, 20]} intensity={1.8} castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-25, 35, -20]} intensity={0.6} />

        {arenaStyle !== 'desert' && (
          <>
            <Sky distance={450000} sunPosition={[10, 12, 10]} inclination={0.6} azimuth={0.25} />
            <Stars radius={120} depth={60} count={1000} factor={4} saturation={0.5} fade speed={1} />
            <Environment preset="night" environmentIntensity={0.85} />
          </>
        )}

        <Suspense fallback={null}>
          <Physics gravity={[0, -15, 0]}>
            <Arena />
            <CinematicReplayCamera />
            <ReplayRecorder />

            <Ball />
            <Player id="player1" />
            <Bot id="bot1" />
            <GoalkeeperManager />
          </Physics>
        </Suspense>
      </Canvas>

      {/* ── 3. MAIN MENU / MULTIPLAYER HUB ── */}
      {gameState === 'MENU' && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '30px 40px', fontFamily: "'Orbitron', sans-serif" }}>
          
          {/* Header Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 24px', backdropFilter: 'blur(10px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '1.4rem' }}>⚽</span>
              <span style={{ color: '#fff', fontSize: '1.2rem', fontWeight: '900', letterSpacing: '3px' }}>REMATCH</span>
              <span style={{ background: '#22c55e', color: '#000', fontSize: '0.65rem', fontWeight: '900', padding: '2px 8px', borderRadius: '4px' }}>MULTIPLAYER 2026</span>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              {['PLAY', 'CUSTOMIZATION', 'PROFILE'].map((tab) => (
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

            <button 
              onClick={onExit} 
              style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#ef4444', padding: '6px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '900' }}
            >
              EXIT
            </button>
          </div>

          {/* MAIN PLAY PANEL (SINGLE PLAYER VS MULTIPLAYER HUB) */}
          {activeMenuTab === 'PLAY' && (
            <div style={{ display: 'flex', gap: '30px', height: 'calc(100% - 120px)', marginTop: '20px' }}>
              
              {/* Left Column: Mode Switcher */}
              <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '14px', background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px', backdropFilter: 'blur(10px)' }}>
                <h3 style={{ color: '#94a3b8', fontSize: '0.8rem', letterSpacing: '2px', margin: '0 0 4px' }}>MATCH MODE</h3>

                <button
                  onClick={() => setMatchMode('SINGLE_PLAYER')}
                  style={{
                    background: matchMode === 'SINGLE_PLAYER' ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : 'rgba(255,255,255,0.03)',
                    color: matchMode === 'SINGLE_PLAYER' ? '#000' : '#fff',
                    border: matchMode === 'SINGLE_PLAYER' ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    padding: '16px',
                    fontWeight: '900',
                    fontSize: '0.95rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    boxShadow: matchMode === 'SINGLE_PLAYER' ? '0 4px 20px rgba(34, 197, 94, 0.4)' : 'none'
                  }}
                >
                  🤖 SINGLE PLAYER
                  <small style={{ display: 'block', fontSize: '0.7rem', marginTop: '4px', opacity: 0.8, fontFamily: 'sans-serif' }}>
                    Practice vs Smart AI Bots
                  </small>
                </button>

                <button
                  onClick={() => setMatchMode('MULTIPLAYER')}
                  style={{
                    background: matchMode === 'MULTIPLAYER' ? 'linear-gradient(135deg, #00d2ff 0%, #0284c7 100%)' : 'rgba(255,255,255,0.03)',
                    color: matchMode === 'MULTIPLAYER' ? '#000' : '#fff',
                    border: matchMode === 'MULTIPLAYER' ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    padding: '16px',
                    fontWeight: '900',
                    fontSize: '0.95rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    boxShadow: matchMode === 'MULTIPLAYER' ? '0 4px 20px rgba(0, 210, 255, 0.4)' : 'none'
                  }}
                >
                  🌐 MULTIPLAYER HUB
                  <small style={{ display: 'block', fontSize: '0.7rem', marginTop: '4px', opacity: 0.8, fontFamily: 'sans-serif' }}>
                    Friends & Online Matchmaking
                  </small>
                </button>
              </div>

              {/* Right Column: Mode Content */}
              <div style={{ flex: 1, background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '28px', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                
                {/* 1. SINGLE PLAYER OPTIONS */}
                {matchMode === 'SINGLE_PLAYER' && (
                  <div>
                    <h2 style={{ color: '#22c55e', fontSize: '1.4rem', margin: '0 0 10px', letterSpacing: '3px' }}>
                      🤖 SINGLE PLAYER vs AI BOTS
                    </h2>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', fontFamily: 'sans-serif', margin: '0 0 25px' }}>
                      Jump directly into quick matches against adaptive AI bot opponents.
                    </p>

                    <button
                      onClick={startMatchWithLoading}
                      style={{
                        background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                        color: '#000',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '18px 36px',
                        fontWeight: '900',
                        fontSize: '1.1rem',
                        letterSpacing: '2px',
                        cursor: 'pointer',
                        boxShadow: '0 8px 30px rgba(34, 197, 94, 0.4)'
                      }}
                    >
                      ▶ START SINGLE PLAYER MATCH
                    </button>
                  </div>
                )}

                {/* 2. MULTIPLAYER HUB (2 SECTIONS: PLAY WITH FRIEND & ONLINE MATCHMAKING) */}
                {matchMode === 'MULTIPLAYER' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    
                    {/* Section Switcher Tabs */}
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                      <button
                        onClick={() => setMultiplayerSubSection('ONLINE_MATCH')}
                        style={{
                          background: multiplayerSubSection === 'ONLINE_MATCH' ? '#00d2ff' : 'rgba(255,255,255,0.05)',
                          color: multiplayerSubSection === 'ONLINE_MATCH' ? '#000' : '#94a3b8',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '10px 20px',
                          fontWeight: '900',
                          fontSize: '0.85rem',
                          letterSpacing: '1px',
                          cursor: 'pointer'
                        }}
                      >
                        🌐 SECTION 1: ONLINE MATCHMAKING
                      </button>

                      <button
                        onClick={() => setMultiplayerSubSection('PLAY_WITH_FRIEND')}
                        style={{
                          background: multiplayerSubSection === 'PLAY_WITH_FRIEND' ? '#facc15' : 'rgba(255,255,255,0.05)',
                          color: multiplayerSubSection === 'PLAY_WITH_FRIEND' ? '#000' : '#94a3b8',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '10px 20px',
                          fontWeight: '900',
                          fontSize: '0.85rem',
                          letterSpacing: '1px',
                          cursor: 'pointer'
                        }}
                      >
                        🤝 SECTION 2: PLAY WITH FRIEND
                      </button>
                    </div>

                    {/* Format Selector Pills (1v1, 2v2, 3v3, 5v5) */}
                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', letterSpacing: '1px', marginBottom: '10px' }}>
                        SELECT MATCH FORMAT:
                      </label>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        {['1v1', '2v2', '3v3', '5v5'].map((fmt) => (
                          <button
                            key={fmt}
                            onClick={() => setMultiplayerFormat(fmt)}
                            style={{
                              background: multiplayerFormat === fmt ? '#22c55e' : 'rgba(255,255,255,0.04)',
                              color: multiplayerFormat === fmt ? '#000' : '#fff',
                              border: multiplayerFormat === fmt ? 'none' : '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '8px',
                              padding: '12px 24px',
                              fontWeight: '900',
                              fontSize: '1rem',
                              cursor: 'pointer',
                              boxShadow: multiplayerFormat === fmt ? '0 4px 16px rgba(34, 197, 94, 0.4)' : 'none'
                            }}
                          >
                            {fmt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* SECTION 1 CONTENT: ONLINE MATCHMAKING */}
                    {multiplayerSubSection === 'ONLINE_MATCH' && (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px' }}>
                          <h3 style={{ color: '#00d2ff', margin: '0 0 8px', fontSize: '1.1rem' }}>
                            GLOBAL MATCHMAKING QUEUE ({multiplayerFormat})
                          </h3>
                          <p style={{ color: '#94a3b8', fontSize: '0.8rem', fontFamily: 'sans-serif', margin: 0 }}>
                            Automatically pair with real online players in {multiplayerFormat} format.
                          </p>

                          {matchmakingStatus === 'SEARCHING' && (
                            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px', color: '#facc15', fontSize: '0.85rem' }}>
                              <div style={{ width: '16px', height: '16px', border: '2px solid #facc15', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                              <span>Searching for {multiplayerFormat} opponents...</span>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={handleFindOnlineMatch}
                          style={{
                            background: 'linear-gradient(135deg, #00d2ff 0%, #0284c7 100%)',
                            color: '#000',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '18px 36px',
                            fontWeight: '900',
                            fontSize: '1.1rem',
                            letterSpacing: '2px',
                            cursor: 'pointer',
                            boxShadow: '0 8px 30px rgba(0, 210, 255, 0.4)',
                            width: '320px'
                          }}
                        >
                          🌐 FIND ONLINE {multiplayerFormat} MATCH
                        </button>
                      </div>
                    )}

                    {/* SECTION 2 CONTENT: PLAY WITH FRIEND */}
                    {multiplayerSubSection === 'PLAY_WITH_FRIEND' && (
                      <div style={{ flex: 1, display: 'flex', gap: '24px' }}>
                        
                        {/* Host Private Room */}
                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div>
                            <h4 style={{ color: '#facc15', margin: '0 0 6px', fontSize: '1rem' }}>HOST PRIVATE ROOM</h4>
                            <p style={{ color: '#94a3b8', fontSize: '0.75rem', fontFamily: 'sans-serif', margin: '0 0 16px' }}>
                              Create a room code and invite friends to join your private {multiplayerFormat} lobby.
                            </p>

                            {roomCode && (
                              <div style={{ background: '#090d16', border: '1px solid #facc15', padding: '10px 16px', borderRadius: '8px', color: '#facc15', fontWeight: '900', fontSize: '1.2rem', textAlign: 'center', marginBottom: '12px' }}>
                                ROOM CODE: {roomCode}
                              </div>
                            )}
                          </div>

                          <button
                            onClick={handleCreateFriendRoom}
                            style={{
                              background: '#facc15',
                              color: '#000',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '14px',
                              fontWeight: '900',
                              fontSize: '0.9rem',
                              letterSpacing: '1px',
                              cursor: 'pointer'
                            }}
                          >
                            ➕ CREATE ROOM CODE
                          </button>
                        </div>

                        {/* Join Friend's Room */}
                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div>
                            <h4 style={{ color: '#22c55e', margin: '0 0 6px', fontSize: '1rem' }}>JOIN FRIEND'S ROOM</h4>
                            <p style={{ color: '#94a3b8', fontSize: '0.75rem', fontFamily: 'sans-serif', margin: '0 0 16px' }}>
                              Enter your friend's 4-letter room code to connect to their lobby.
                            </p>

                            <input
                              type="text"
                              maxLength={8}
                              placeholder="e.g. FOOT-ABCD"
                              value={inputRoomCode}
                              onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
                              style={{
                                width: '100%',
                                background: '#090d16',
                                border: '1px solid rgba(255,255,255,0.15)',
                                color: '#fff',
                                padding: '12px 16px',
                                borderRadius: '8px',
                                fontFamily: "'Orbitron', sans-serif",
                                fontWeight: '900',
                                fontSize: '1rem',
                                outline: 'none',
                                marginBottom: '12px'
                              }}
                            />
                          </div>

                          <button
                            onClick={handleJoinFriendRoom}
                            style={{
                              background: '#22c55e',
                              color: '#000',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '14px',
                              fontWeight: '900',
                              fontSize: '0.9rem',
                              letterSpacing: '1px',
                              cursor: 'pointer'
                            }}
                          >
                            ➡️ JOIN ROOM
                          </button>
                        </div>

                      </div>
                    )}

                  </div>
                )}

              </div>
            </div>
          )}

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
            <span style={{ background: '#22c55e', color: '#000', fontSize: '0.7rem', fontWeight: '900', padding: '3px 8px', borderRadius: '4px' }}>
              {half === 1 ? '1ST HALF' : '2ND HALF'}
            </span>

            <span style={{ color: '#ffffff', fontSize: '1.2rem', fontWeight: '900', letterSpacing: '1px' }}>
              {gameState === 'KICKOFF' ? '02:30' : formatTime(timer)}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#090d16', padding: '6px 16px', borderRadius: '6px' }}>
              <span style={{ color: '#ef4444', fontWeight: '900', fontSize: '1.1rem' }}>{score.red}</span>
              <span style={{ color: '#64748b' }}>|</span>
              <span style={{ color: '#0284c7', fontWeight: '900', fontSize: '1.1rem' }}>{score.blue}</span>
            </div>
          </div>

          <MiniMapRadar />
        </>
      )}
    </div>
  )
}
