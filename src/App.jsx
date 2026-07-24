import React, { useMemo, useState } from 'react'
import { Gauge, RadioTower, Settings, Trophy, Users, Wrench } from 'lucide-react'
import { GameCanvas } from './components/GameCanvas.jsx'
import { RematchGame } from './components/rematch-football/RematchGame.jsx'
import { LagoriGame } from './components/lagori-game/LagoriGame.jsx'
import { GullyCricketGame } from './components/gully-cricket/GullyCricketGame.jsx'
import './App.css'

const defaultSetup = {
  frontWing: 32,
  rearWing: 36,
  suspension: 54,
  rideHeight: 31,
  tyrePressure: 24,
  brakeBias: 56,
  ersMode: 'Balanced',
}

const setupFields = [
  ['frontWing', 'Front wing', 5, 50, 'More bite in fast corners, less top speed'],
  ['rearWing', 'Rear wing', 8, 55, 'Rear stability and traction under power'],
  ['suspension', 'Suspension', 20, 90, 'Stiffer is sharper but harsher over kerbs'],
  ['rideHeight', 'Ride height', 18, 60, 'Low is faster until plank strikes hurt grip'],
  ['tyrePressure', 'Tyre pressure', 18, 31, 'High pressure warms fast, low pressure grips longer'],
  ['brakeBias', 'Brake bias', 50, 64, 'Forward bias calms braking, rearward rotates the car'],
]

function SliderRow({ field, value, onChange }) {
  const [key, label, min, max, hint] = field
  return (
    <label className="setup-row">
      <span>
        <strong>{label}</strong>
        <small>{hint}</small>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(key, Number(e.target.value))}
      />
      <b>{value}</b>
    </label>
  )
}

function ModeCard({ icon: Icon, title, text, active, onClick }) {
  return (
    <button className={`mode-card ${active ? 'active' : ''}`} onClick={onClick}>
      <Icon size={22} />
      <span>{title}</span>
      <small>{text}</small>
    </button>
  )
}

function MainMenu({ setup, setSetup, onStart }) {
  const [tab, setTab] = useState('race')
  const [mode, setMode] = useState('Grand Prix')
  const setupScore = useMemo(() => {
    const aero = Math.round((setup.frontWing + setup.rearWing) / 2)
    const straight = Math.max(0, 100 - aero - Math.round(setup.rideHeight / 2))
    const tyre = Math.max(35, 100 - Math.abs(setup.tyrePressure - 23) * 5)
    return { aero, straight, tyre }
  }, [setup])

  const updateSetup = (key, value) => setSetup((prev) => ({ ...prev, [key]: value }))

  return (
    <main className="shell">
      <section className="menu-hero">
        <div className="brand-block">
          <span className="eyebrow">FRIDAY ENGINE</span>
          <h1>F1 Apex</h1>
          <p>
            A browser-native racing prototype with live setup tuning, hybrid boost, tyre
            degradation, AI traffic, rain grip loss, evolving track rubber, and cockpit-grade HUD.
          </p>
        </div>
        <div className="hero-car" aria-hidden="true">
          <div className="car-shadow" />
          <div className="car-top">
            <i />
            <i />
          </div>
        </div>
      </section>

      <nav className="top-tabs">
        <button className={tab === 'race' ? 'selected' : ''} onClick={() => setTab('race')}>
          <Trophy size={17} /> Race
        </button>
        <button className={tab === 'garage' ? 'selected' : ''} onClick={() => setTab('garage')}>
          <Wrench size={17} /> Garage
        </button>
        <button className={tab === 'lobby' ? 'selected' : ''} onClick={() => setTab('lobby')}>
          <Users size={17} /> Lobby
        </button>
      </nav>

      {tab === 'race' && (
        <section className="menu-grid">
          <div className="mode-stack">
            <ModeCard
              icon={Trophy}
              title="Grand Prix"
              text="Full weekend simulation with practice, qualifying, and dynamic weather strategy."
              active={mode === 'Grand Prix'}
              onClick={() => setMode('Grand Prix')}
            />
            <ModeCard
              icon={Gauge}
              title="Sprint Showdown"
              text="Short-form high-downforce sprint where battery management dominates."
              active={mode === 'Sprint Showdown'}
              onClick={() => setMode('Sprint Showdown')}
            />
            <ModeCard
              icon={RadioTower}
              title="Time Trial"
              text="Clean air, warm tyres, ghost telemetry, and raw single-lap pace."
              active={mode === 'Time Trial'}
              onClick={() => setMode('Time Trial')}
            />
          </div>

          <div className="summary-panel card">
            <h3>Race Directive</h3>
            <p>
              Silverstone International Layout • 14 Turns • Evolving Rubber Line • Variable Cloud
            </p>

            <div className="stats-row">
              <div>
                <span>Downforce</span>
                <strong>{setupScore.aero}%</strong>
              </div>
              <div>
                <span>Top Speed</span>
                <strong>{setupScore.straight}%</strong>
              </div>
              <div>
                <span>Tyre Life</span>
                <strong>{setupScore.tyre}%</strong>
              </div>
            </div>

            <button className="primary-btn" onClick={() => onStart({ mode, setup })}>
              Launch Session
            </button>
          </div>
        </section>
      )}

      {tab === 'garage' && (
        <section className="garage-grid card">
          <div className="garage-header">
            <h3>Aero & Chassis Setup</h3>
            <p>Tweak aerodynamic balance, damper stiffness, and brake bias before track entry.</p>
          </div>
          <div className="setup-list">
            {setupFields.map((field) => (
              <SliderRow
                key={field[0]}
                field={field}
                value={setup[field[0]]}
                onChange={updateSetup}
              />
            ))}
          </div>
        </section>
      )}

      {tab === 'lobby' && (
        <section className="lobby-card card">
          <h3>Multiplayer Paddock</h3>
          <p>Local simulation lobby ready for WebSocket sync hooks.</p>
          <div className="driver-list">
            {['You (P1)', 'Bottas_AI', 'Hamilton_AI', 'Verstappen_AI'].map((name, i) => (
              <div key={name} className="driver-row">
                <span>{name}</span>
                <b>{i === 0 ? 'HOST' : i === 1 ? 'READY' : 'SETUP'}</b>
              </div>
            ))}
          </div>
        </section>
      )}

      <button className="launch-button" onClick={() => onStart({ mode, setup })}>
        IGNITION
      </button>
    </main>
  )
}

export default function App() {
  const getUrlGame = () => {
    const params = new URLSearchParams(window.location.search)
    return params.get('game') || 'lagori'
  }

  const [activeGame, setActiveGame] = useState(getUrlGame)
  const [setup, setSetup] = useState(defaultSetup)
  const [session, setSession] = useState(null)

  const handleExit = () => {
    if (window.parent && typeof window.parent.closeGameIframe === 'function') {
      window.parent.closeGameIframe()
    } else {
      setActiveGame('menu')
    }
  }

  if (activeGame === 'lagori') {
    return <LagoriGame onExit={handleExit} />
  }

  if (activeGame === 'rematch') {
    return <RematchGame onExit={handleExit} />
  }

  if (activeGame === 'gullycricket') {
    return <GullyCricketGame onExit={handleExit} />
  }

  if (activeGame === 'f1') {
    if (session) {
      return <GameCanvas mode={session.mode} setup={session.setup} onExit={() => setSession(null)} />
    }
    return <MainMenu setup={setup} setSetup={setSetup} onStart={setSession} />
  }

  // Fallback standalone launcher
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Orbitron', sans-serif",
      color: '#fff'
    }}>
      <h1 style={{ fontSize: '3rem', fontWeight: '900', letterSpacing: '8px', marginBottom: '10px', background: 'linear-gradient(90deg, #00d2ff, #facc15)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>PLAY-SPHERE CONSOLE</h1>
      <p style={{ color: '#64748b', letterSpacing: '4px', marginBottom: '50px', fontSize: '0.9rem' }}>SELECT A 3D CHAMPIONSHIP EVENT</p>
      
      <div style={{ display: 'flex', gap: '30px' }}>
        <button 
          onClick={() => setActiveGame('lagori')}
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(250, 204, 21, 0.4)',
            borderRadius: '16px',
            padding: '35px 25px',
            width: '240px',
            cursor: 'pointer',
            textAlign: 'center',
            color: '#fff',
            transition: 'all 0.3s',
            boxShadow: '0 8px 30px rgba(250, 204, 21, 0.15)'
          }}
        >
          <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: '15px' }}>🪨</span>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '800', margin: '0 0 8px', letterSpacing: '2px', color: '#facc15' }}>LAGORI 7 STONES</h2>
          <small style={{ color: '#94a3b8', fontFamily: 'sans-serif', display: 'block', lineHeight: '1.4' }}>Knock 7-stone stack, pick & rebuild, dodge defender throws.</small>
        </button>

        <button 
          onClick={() => setActiveGame('rematch')}
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(0, 210, 255, 0.2)',
            borderRadius: '16px',
            padding: '35px 25px',
            width: '240px',
            cursor: 'pointer',
            textAlign: 'center',
            color: '#fff',
            transition: 'all 0.3s'
          }}
        >
          <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: '15px' }}>⚽</span>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '800', margin: '0 0 8px', letterSpacing: '2px' }}>ARCADE FOOTBALL</h2>
          <small style={{ color: '#94a3b8', fontFamily: 'sans-serif', display: 'block', lineHeight: '1.4' }}>Rematch-style physics, dynamic goalkeepers, 1v1 AI duel.</small>
        </button>

        <button 
          onClick={() => setActiveGame('gullycricket')}
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(250, 204, 21, 0.4)',
            borderRadius: '16px',
            padding: '35px 25px',
            width: '240px',
            cursor: 'pointer',
            textAlign: 'center',
            color: '#fff',
            transition: 'all 0.3s',
            boxShadow: '0 8px 30px rgba(250, 204, 21, 0.2)'
          }}
        >
          <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: '15px' }}>🏏</span>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '800', margin: '0 0 8px', letterSpacing: '2px', color: '#facc15' }}>GULLY CRICKET 3D</h2>
          <small style={{ color: '#94a3b8', fontFamily: 'sans-serif', display: 'block', lineHeight: '1.4' }}>Indian street cricket! One-Tippi catches out, wall hits 4s & 6s.</small>
        </button>
      </div>
    </div>
  )
}
