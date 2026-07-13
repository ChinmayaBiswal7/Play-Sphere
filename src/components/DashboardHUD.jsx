import React from 'react'

function formatTime(value = 0) {
  const minutes = Math.floor(value / 60)
  const seconds = (value % 60).toFixed(3).padStart(6, '0')
  return `${minutes}:${seconds}`
}

function RPMBar({ rpm, maxRPM = 18000 }) {
  const total = 15
  const lit = Math.floor((rpm / maxRPM) * total)
  const flash = rpm > 16000
  return (
    <div className={`rpm-strip ${flash ? 'flash' : ''}`}>
      {Array.from({ length: total }).map((_, i) => (
        <i
          key={i}
          className={i < lit ? (i < 5 ? 'green' : i < 10 ? 'amber' : 'red') : ''}
        />
      ))}
    </div>
  )
}

function MiniBar({ label, value, color = '#35e58f' }) {
  return (
    <div className="mini-bar">
      <span>{label}</span>
      <b>{Math.round(value)}%</b>
      <em>
        <i style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
      </em>
    </div>
  )
}

export function DashboardHUD({ telemetry = {}, mode, setup, onExit }) {
  const {
    speed = 0,
    gear = 1,
    rpm = 800,
    ersBattery = 100,
    ersBoosting = false,
    drs = false,
    braking = false,
    cameraMode = 0,
    tireWear = 0,
    tireTemp = 78,
    trackGrip = 100,
    trackRubber = 0,
    damage = 0,
    lap = 1,
    lapTime = 0,
    bestLap = null,
    wetness = 0,
  } = telemetry

  const holdControl = (key, value) => (event) => {
    event.preventDefault()
    if (window.__f1Controls) window.__f1Controls[key] = value
  }

  return (
    <div className="race-hud">
      {braking && <div className="brake-flash" />}
      {ersBoosting && <div className="boost-flash" />}

      <section className="timing-tower">
        <header>{mode}</header>
        <div><span>LAP</span><b>{lap}/5</b></div>
        <div><span>CURRENT</span><b>{formatTime(lapTime)}</b></div>
        <div><span>BEST</span><b>{bestLap ? formatTime(bestLap) : '--:--.---'}</b></div>
        <div><span>WEATHER</span><b>{wetness > 55 ? 'WET' : wetness > 5 ? 'DAMP' : 'DRY'}</b></div>
      </section>

      <section className="position-tower">
        <header>RACE DATA</header>
        {['YOU', 'A. SENNANET', 'K. CARBON', 'M. VECTOR', 'L. SLIPSTREAM'].map((name, i) => (
          <div key={name} className={i === 0 ? 'player' : ''}>
            <span>P{i + 1}</span><b>{name}</b>
          </div>
        ))}
      </section>

      <section className="systems-panel">
        <MiniBar label="ERS" value={ersBattery} color={ersBoosting ? '#00ffc8' : '#35e58f'} />
        <MiniBar label="TYRE" value={100 - tireWear} color={tireWear > 65 ? '#ff4d4d' : '#ffd166'} />
        <MiniBar label="GRIP" value={trackGrip} color="#60a5fa" />
        <MiniBar label="DMG" value={damage} color="#ef4444" />
        <div className="temp-row">
          <span>TYRE TEMP</span><b>{tireTemp} C</b>
          <small>RUBBER {trackRubber}%</small>
        </div>
      </section>

      <section className="wheel-hud">
        <RPMBar rpm={rpm} />
        <div className="wheel-grid">
          <div>
            <span>SPEED</span>
            <strong>{String(Math.min(999, speed)).padStart(3, '0')}</strong>
            <small>KM/H</small>
          </div>
          <div className="gear-box">
            <span>GEAR</span>
            <strong>{gear}</strong>
          </div>
          <div className="state-stack">
            <b className={drs ? 'on' : ''}>DRS {drs ? 'OPEN' : 'LOCK'}</b>
            <b className={ersBoosting ? 'on' : ''}>ERS {ersBoosting ? 'DEPLOY' : setup?.ersMode || 'READY'}</b>
            <b>{['CHASE', 'COCKPIT', 'T-CAM', 'TV CAM'][cameraMode] || 'CHASE'}</b>
          </div>
        </div>
      </section>

      <section className="control-help">
        <b>W/UP</b> throttle
        <b>A/D</b> steer
        <b>SPACE</b> brake
        <b>SHIFT</b> ERS
        <b>C</b> camera
        <b>R</b> reset
      </section>

      <section className="touch-drive">
        <button
          onPointerDown={holdControl('left', true)}
          onPointerUp={holdControl('left', false)}
          onPointerLeave={holdControl('left', false)}
        >
          LEFT
        </button>
        <button
          className="throttle"
          onPointerDown={holdControl('forward', true)}
          onPointerUp={holdControl('forward', false)}
          onPointerLeave={holdControl('forward', false)}
        >
          HOLD DRIVE
        </button>
        <button
          onPointerDown={holdControl('right', true)}
          onPointerUp={holdControl('right', false)}
          onPointerLeave={holdControl('right', false)}
        >
          RIGHT
        </button>
        <button
          className="brake"
          onPointerDown={holdControl('brake', true)}
          onPointerUp={holdControl('brake', false)}
          onPointerLeave={holdControl('brake', false)}
        >
          BRAKE
        </button>
      </section>

      <button className="exit-button" onClick={onExit}>GARAGE</button>
    </div>
  )
}
