import React, { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Physics } from '@react-three/cannon'
import { Environment, Stars, Sky } from '@react-three/drei'
import { useFootballStore } from './footballStore'
import { Arena } from './Arena'
import { Ball } from './Ball'
import { Player } from './Player'
import { Bot } from './Bot'
import { Referee } from './Referee'
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
      animAngle.current += dt * 2.0

      const scorerPos = lastScorer === 'red' 
        ? (window.footballPlayer ? window.footballPlayer.position.current : [0, 1.2, 0])
        : (window.footballBot ? window.footballBot.position.current : [0, 1.2, 0])

      const camX = scorerPos[0] + Math.sin(animAngle.current) * 4.2
      const camY = scorerPos[1] + 1.8
      const camZ = scorerPos[2] + Math.cos(animAngle.current) * 4.2

      state.camera.position.set(camX, camY, camZ)
      state.camera.lookAt(scorerPos[0], scorerPos[1] + 1.1, scorerPos[2])

    } else if (gameState === 'GOAL_REPLAY') {
      if (replayBuffer.length > 0) {
        replayFrameIdx.current = (replayFrameIdx.current + 1) % replayBuffer.length
        const frame = replayBuffer[replayFrameIdx.current]

        if (frame && frame.bPos) {
          const ballX = frame.bPos[0]
          const ballZ = frame.bPos[2]

          state.camera.position.set(22, 9, ballZ + 7)
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
  const matchMinute = useFootballStore((state) => state.matchMinute)
  const stamina = useFootballStore((state) => state.stamina)
  const goalAlert = useFootballStore((state) => state.goalAlert)
  const lastScorer = useFootballStore((state) => state.lastScorer)
  const celebrationType = useFootballStore((state) => state.celebrationType)
  const setGameState = useFootballStore((state) => state.setGameState)
  const setGoalAlert = useFootballStore((state) => state.setGoalAlert)
  const resetMatch = useFootballStore((state) => state.resetMatch)
  const tickMatchClock = useFootballStore((state) => state.tickMatchClock)
  
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
  const [multiplayerSubSection, setMultiplayerSubSection] = useState('ONLINE_MATCH')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [tipIndex, setTipIndex] = useState(0)

  // Key F = Fullscreen, Key ESC = Pause Settings Menu ONLY
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'KeyF') {
        toggleFullscreen()
      } else if (e.code === 'Escape') {
        e.preventDefault()
        setIsSettingsOpen((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

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

    const handleSearching = () => {
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

  // EA FC 90-Minute Match Clock Ticker
  useEffect(() => {
    let interval
    if (gameState === 'PLAYING') {
      interval = setInterval(() => {
        tickMatchClock()
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
      }, 4000)
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
      }, 4000)
      return () => clearTimeout(timeout)
    }
  }, [gameState])

  const skipCelebration = () => {
    setGameState('GOAL_REPLAY')
  }

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

  const formatMatchClock = (mins) => {
    const m = Math.floor(mins)
    const s = Math.floor((mins - m) * 60)
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}'`
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '6rem', fontWeight: '900', letterSpacing: '14px' }}>
              <span style={{ color: '#ffffff' }}>RE</span>
              <span style={{ color: '#22c55e', fontStyle: 'italic', transform: 'skewX(-18deg)', display: 'inline-block' }}>/</span>
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
            <Referee />
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
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 24px', backdropFilter: 'blur(10px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '1.4rem' }}>⚽</span>
              <span style={{ color: '#fff', fontSize: '1.2rem', fontWeight: '900', letterSpacing: '3px' }}>REMATCH</span>
              <span style={{ background: '#22c55e', color: '#000', fontSize: '0.65rem', fontWeight: '900', padding: '2px 8px', borderRadius: '4px' }}>MULTIPLAYER 2026</span>
            </div>

            <button 
              onClick={onExit} 
              style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#ef4444', padding: '6px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '900' }}
            >
              EXIT
            </button>
          </div>

          {activeMenuTab === 'PLAY' && (
            <div style={{ display: 'flex', gap: '30px', height: 'calc(100% - 120px)', marginTop: '20px' }}>
              
              <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '14px', background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px', backdropFilter: 'blur(10px)' }}>
                <h3 style={{ color: '#94a3b8', fontSize: '0.8rem', letterSpacing: '2px', margin: '0 0 4px' }}>MATCH MODE</h3>

                <button
                  onClick={() => setMatchMode('SINGLE_PLAYER')}
                  style={{
                    background: matchMode === 'SINGLE_PLAYER' ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : 'rgba(255,255,255,0.03)',
                    color: matchMode === 'SINGLE_PLAYER' ? '#000' : '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '16px',
                    fontWeight: '900',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  🤖 SINGLE PLAYER
                </button>

                <button
                  onClick={() => setMatchMode('MULTIPLAYER')}
                  style={{
                    background: matchMode === 'MULTIPLAYER' ? 'linear-gradient(135deg, #00d2ff 0%, #0284c7 100%)' : 'rgba(255,255,255,0.03)',
                    color: matchMode === 'MULTIPLAYER' ? '#000' : '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '16px',
                    fontWeight: '900',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  🌐 MULTIPLAYER HUB
                </button>
              </div>

              <div style={{ flex: 1, background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '28px', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                
                {matchMode === 'SINGLE_PLAYER' && (
                  <div>
                    <h2 style={{ color: '#22c55e', fontSize: '1.4rem', margin: '0 0 10px', letterSpacing: '3px' }}>
                      🤖 SINGLE PLAYER vs AI BOTS
                    </h2>
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
                        cursor: 'pointer'
                      }}
                    >
                      ▶ START SINGLE PLAYER MATCH
                    </button>
                  </div>
                )}

                {matchMode === 'MULTIPLAYER' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
                          cursor: 'pointer'
                        }}
                      >
                        🌐 ONLINE MATCHMAKING
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
                          cursor: 'pointer'
                        }}
                      >
                        🤝 PLAY WITH FRIEND
                      </button>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', marginBottom: '10px' }}>SELECT FORMAT:</label>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        {['1v1', '2v2', '3v3', '5v5'].map((fmt) => (
                          <button
                            key={fmt}
                            onClick={() => setMultiplayerFormat(fmt)}
                            style={{
                              background: multiplayerFormat === fmt ? '#22c55e' : 'rgba(255,255,255,0.04)',
                              color: multiplayerFormat === fmt ? '#000' : '#fff',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '12px 24px',
                              fontWeight: '900',
                              cursor: 'pointer'
                            }}
                          >
                            {fmt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {multiplayerSubSection === 'ONLINE_MATCH' && (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
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
                            cursor: 'pointer',
                            width: '320px'
                          }}
                        >
                          🌐 FIND ONLINE {multiplayerFormat} MATCH
                        </button>
                      </div>
                    )}

                    {multiplayerSubSection === 'PLAY_WITH_FRIEND' && (
                      <div style={{ flex: 1, display: 'flex', gap: '24px' }}>
                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <button onClick={handleCreateFriendRoom} style={{ background: '#facc15', color: '#000', border: 'none', borderRadius: '8px', padding: '14px', fontWeight: '900', cursor: 'pointer' }}>
                            ➕ CREATE ROOM CODE
                          </button>
                        </div>
                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <input type="text" placeholder="ROOM CODE" value={inputRoomCode} onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())} style={{ width: '100%', background: '#090d16', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '12px', borderRadius: '8px', fontWeight: '900', marginBottom: '12px' }} />
                          <button onClick={handleJoinFriendRoom} style={{ background: '#22c55e', color: '#000', border: 'none', borderRadius: '8px', padding: '14px', fontWeight: '900', cursor: 'pointer' }}>
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
        </div>
      )}

      {/* ── 4. IN-GAME HUD OVERLAYS ── */}
      {gameState !== 'MENU' && gameState !== 'BOOT' && gameState !== 'LOADING_MATCH' && (
        <>
          {/* Top-Left EA FC Scorebar with 90-Min Clock */}
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
            <span style={{ background: '#22c55e', color: '#000', fontSize: '0.75rem', fontWeight: '900', padding: '3px 8px', borderRadius: '4px' }}>
              {half === 1 ? '1ST HALF' : '2ND HALF'}
            </span>

            <span style={{ color: '#facc15', fontSize: '1.2rem', fontWeight: '900', letterSpacing: '1px' }}>
              {formatMatchClock(matchMinute)}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#090d16', padding: '6px 16px', borderRadius: '6px' }}>
              <span style={{ color: '#ef4444', fontWeight: '900', fontSize: '1.1rem' }}>{score.red}</span>
              <span style={{ color: '#64748b' }}>|</span>
              <span style={{ color: '#0284c7', fontWeight: '900', fontSize: '1.1rem' }}>{score.blue}</span>
            </div>
          </div>

          {/* Top-Right Fullscreen & Settings Buttons */}
          <div style={{ position: 'absolute', top: '25px', right: '30px', display: 'flex', gap: '12px', zIndex: 10 }}>
            <button
              onClick={toggleFullscreen}
              style={{
                background: 'rgba(15, 23, 42, 0.88)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                borderRadius: '8px',
                padding: '10px 14px',
                fontWeight: '900',
                cursor: 'pointer',
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '0.8rem'
              }}
            >
              ⛶ [F]
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              style={{
                background: 'rgba(15, 23, 42, 0.88)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                borderRadius: '8px',
                padding: '10px 14px',
                fontWeight: '900',
                cursor: 'pointer',
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '0.8rem'
              }}
            >
              ⚙️ [ESC]
            </button>
          </div>

          <MiniMapRadar />

          {/* ── 5. GOAL CELEBRATION CUTSCENE ── */}
          {gameState === 'GOAL_CELEBRATION' && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle at center, transparent 30%, rgba(2, 6, 23, 0.85) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              zIndex: 120,
              fontFamily: "'Orbitron', sans-serif",
              pointerEvents: 'auto'
            }}>
              <h1 style={{
                fontSize: '5rem',
                fontWeight: '900',
                letterSpacing: '10px',
                color: lastScorer === 'red' ? '#ef4444' : '#0284c7',
                textShadow: lastScorer === 'red' ? '0 0 50px rgba(239, 68, 68, 0.9)' : '0 0 50px rgba(2, 132, 199, 0.9)',
                margin: 0
              }}>
                GOAL!
              </h1>
              <p style={{ color: '#ffffff', fontSize: '1.4rem', letterSpacing: '4px', marginTop: '10px', fontWeight: '800' }}>
                {celebrationType.toUpperCase()} CELEBRATION
              </p>

              <button
                onClick={skipCelebration}
                style={{
                  marginTop: '30px',
                  background: '#facc15',
                  color: '#000',
                  border: 'none',
                  borderRadius: '30px',
                  padding: '14px 36px',
                  fontWeight: '900',
                  fontSize: '0.9rem',
                  letterSpacing: '2px',
                  cursor: 'pointer',
                  boxShadow: '0 8px 30px rgba(250, 204, 21, 0.5)'
                }}
              >
                ⏭ SKIP CELEBRATION
              </button>
            </div>
          )}

          {/* ── 6. GOAL REPLAY VIEW WITH SKIP BUTTON ── */}
          {gameState === 'GOAL_REPLAY' && (
            <div style={{
              position: 'absolute',
              inset: 0,
              zIndex: 130,
              fontFamily: "'Orbitron', sans-serif",
              pointerEvents: 'auto'
            }}>
              <div style={{ position: 'absolute', top: '35px', left: '40px', background: 'rgba(239, 68, 68, 0.9)', color: '#fff', padding: '8px 20px', borderRadius: '6px', fontWeight: '900', fontSize: '1rem', letterSpacing: '3px' }}>
                ⏺ GOAL REPLAY (CINEMATIC)
              </div>

              <div style={{ position: 'absolute', bottom: '50px', left: '50%', transform: 'translateX(-50%)', zIndex: 140 }}>
                <button
                  onClick={skipReplay}
                  style={{
                    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '30px',
                    padding: '16px 40px',
                    fontWeight: '900',
                    fontSize: '1rem',
                    letterSpacing: '3px',
                    cursor: 'pointer',
                    boxShadow: '0 8px 30px rgba(34, 197, 94, 0.5)'
                  }}
                >
                  ⏭ SKIP REPLAY
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── 7. PAUSE SETTINGS MODAL ── */}
      {isSettingsOpen && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(9, 13, 22, 0.92)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          fontFamily: "'Orbitron', sans-serif"
        }}>
          <div style={{ width: '420px', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(34, 197, 94, 0.5)', borderRadius: '16px', padding: '30px', color: '#fff' }}>
            <h2 style={{ color: '#22c55e', fontSize: '1.4rem', margin: '0 0 20px', textAlign: 'center', letterSpacing: '3px' }}>
              ⚙️ REMATCH GAME SETTINGS
            </h2>

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '14px', fontSize: '0.8rem', lineHeight: '1.6', marginBottom: '24px' }}>
              <b style={{ color: '#22c55e', display: 'block', marginBottom: '8px' }}>CONTROLS CHEAT SHEET:</b>
              <div>• <b>WASD</b>: Move Striker</div>
              <div>• <b>SPACE / LEFT CLICK</b>: Charge Power Shot</div>
              <div>• <b>E KEY</b>: Short Ground Pass</div>
              <div>• <b>Q KEY / RIGHT CLICK</b>: Slide Tackle / Dive</div>
              <div>• <b>R KEY</b>: Speed Surge Ability</div>
              <div>• <b>L-SHIFT</b>: Sprint Boost</div>
              <div>• <b>F KEY</b>: Fullscreen Mode</div>
              <div>• <b>ESC KEY</b>: Pause Settings Menu</div>
            </div>

            <button
              onClick={() => setIsSettingsOpen(false)}
              style={{
                width: '100%',
                background: '#22c55e',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                padding: '14px',
                fontWeight: '900',
                fontSize: '0.95rem',
                cursor: 'pointer'
              }}
            >
              RESUME MATCH
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
