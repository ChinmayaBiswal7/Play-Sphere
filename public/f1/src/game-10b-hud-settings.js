  function drawMinimap() {
    const canvas = document.getElementById('minimap-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 90, 90);

    // Draw track path layout sector by sector to highlight yellow flag zones
    const sectors = typeof sectorFlags !== 'undefined' ? sectorFlags.length : 6;
    const pointsPerSector = 15;
    
    for (let s = 0; s < sectors; s++) {
      ctx.beginPath();
      const sFlag = (typeof sectorFlags !== 'undefined') ? sectorFlags[s] : 'green';
      const isYellow = sFlag === 'yellow' || safetyCarActive || vscActive;
      ctx.strokeStyle = isYellow ? "#f59e0b" : "rgba(255, 255, 255, 0.65)"; // Brighter track, prominent yellow highlight
      ctx.lineWidth = isYellow ? 6.5 : 3.5;

      for (let i = 0; i <= pointsPerSector; i++) {
        const t = (s + i / pointsPerSector) / sectors;
        const pt = trackCurve.getPointAt(t % 1.0);
        if (pt) {
          const cx = 45 + (pt.x / 250) * 38;
          const cy = 45 + (pt.z / 150) * 38;
          if (i === 0) ctx.moveTo(cx, cy);
          else ctx.lineTo(cx, cy);
        }
      }
      ctx.stroke();
    }

    // Render racers
    racers.forEach(r => {
      if (!r.mesh) return;
      const pt = r.mesh.position;
      const cx = 45 + (pt.x / 250) * 38;
      const cy = 45 + (pt.z / 150) * 38;

      ctx.beginPath();
      ctx.arc(cx, cy, r.isPlayer ? 4.5 : 3.5, 0, Math.PI * 2);
      ctx.fillStyle = r.isPlayer ? "#ef4444" : "#22d3ee"; // Red for player, Cyan for AI
      ctx.fill();

      if (r.isPlayer) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.0;
        ctx.stroke();
      }
    });
  }

  // 📊 Live updating F1 Leaderboard HUD Sidebar (Gap times & PIT status)
  function updateLeaderboardHUD() {
    const container = document.getElementById('leaderboard-rows-container');
    if (!container) return;

    // Throttling: only update leaderboard 10 times per second (every 100ms) for high performance!
    const nowTime = clock.getElapsedTime();
    if (nowTime - lastLeaderboardUpdate < 0.1) return;
    lastLeaderboardUpdate = nowTime;

    // Update lap count in header
    document.getElementById('leaderboard-lap-val').innerText = `LAP ${Math.min(maxLaps, currentLap)}/${maxLaps}`;

    const card = document.getElementById('f1-leaderboard-card');
    const headerText = document.getElementById('leaderboard-header-text');
    const lapVal = document.getElementById('leaderboard-lap-val');
    const btn = document.getElementById('btn-toggle-timing-tower');

    if (window.timingTowerCollapsed) {
      if (card) card.style.width = '145px';
      if (headerText) headerText.style.display = 'none';
      if (lapVal) lapVal.style.display = 'none';
      if (btn) {
        btn.innerHTML = '&gt;';
        btn.style.right = '8px';
      }
    } else {
      if (card) card.style.width = '220px';
      if (headerText) headerText.style.display = 'block';
      if (lapVal) lapVal.style.display = 'block';
      if (btn) {
        btn.innerHTML = '&lt;';
        btn.style.right = '8px';
      }
    }

    // Sort racers by posRank (ascending)
    const sorted = [...racers].sort((a, b) => a.posRank - b.posRank);

    const leaderScore = getRacerScore(sorted[0]);
    const playerIdx = sorted.findIndex(r => r.isPlayer);
    
    // Set container to flex layout for CSS order-based smooth animation sorting!
    container.style.display = 'flex';
    container.style.flexDirection = 'column';

    sorted.forEach((racer, idx) => {
      const pos = idx + 1;
      const key = racer.name.replace(/\s+/g, '');
      let row = document.getElementById(`leader-row-${key}`);
      
      if (!row) {
        row = document.createElement('div');
        row.id = `leader-row-${key}`;
        row.style.cssText = "display: flex; align-items: center; padding: 6px 12px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.72rem; position: relative; transition: transform 0.3s ease, background-color 0.3s;";
        container.appendChild(row);
      }

      // Visually sort using CSS order
      row.style.order = idx;

      // Collapse logic: hide row if collapsed and not player
      if (window.timingTowerCollapsed) {
        if (racer.isPlayer) {
          row.style.display = 'flex';
          row.style.padding = '8px 12px';
        } else {
          row.style.display = 'none';
        }
      } else {
        row.style.display = 'flex';
        row.style.padding = '6px 12px';
      }

      // Highlight player row - strong neon cyan left stripe + background glow
      if (racer.isPlayer) {
        row.style.background = "linear-gradient(90deg, rgba(6, 182, 212, 0.35) 0%, rgba(6, 182, 212, 0.10) 100%)";
        row.style.boxShadow = "inset 3px 0 0 0 #06b6d4, inset 0 0 14px rgba(6, 182, 212, 0.25)";
        row.style.color = "#ffffff";
        row.style.borderRadius = "0px";
      } else {
        row.style.background = "transparent";
        row.style.boxShadow = "none";
        row.style.color = "rgba(255,255,255,0.9)";
      }

      // Rebuild inner contents dynamically (keeps DOM transitions intact!)
      row.innerHTML = '';

      // F1 Position badge (P1, P2, P3...)
      const posEl = document.createElement('span');
      posEl.innerText = `P${pos}`;
      posEl.style.cssText = `font-weight: 900; width: 26px; ${racer.isPlayer ? 'color: var(--neon-cyan);' : 'color: rgba(255,255,255,0.65);'}`;
      row.appendChild(posEl);

      // Gained/Lost Place Indicator Badge relative to starting grid slot!
      const changeEl = document.createElement('span');
      const diff = (racer.gridStartPos || pos) - pos;
      if (diff > 0) {
        changeEl.innerText = `▲${diff}`;
        changeEl.style.cssText = "font-size: 0.55rem; color: #22c55e; width: 22px; font-weight: 900; margin-right: 4px; text-align: left;";
      } else if (diff < 0) {
        changeEl.innerText = `▼${Math.abs(diff)}`;
        changeEl.style.cssText = "font-size: 0.55rem; color: #ef4444; width: 22px; font-weight: 900; margin-right: 4px; text-align: left;";
      } else {
        changeEl.innerText = "—";
        changeEl.style.cssText = "font-size: 0.55rem; color: rgba(255,255,255,0.3); width: 22px; margin-right: 4px; text-align: left;";
      }
      row.appendChild(changeEl);

      // Team color strip
      const teamColor = F1_TEAMS[racer.teamIndex || 0].color;
      const strip = document.createElement('div');
      strip.style.cssText = `width: 3px; height: 14px; background: ${teamColor}; margin-right: 8px; border-radius: 1px;`;
      row.appendChild(strip);

      // Driver Name
      const threeLetterCode = racer.name.substring(0, 3).toUpperCase();
      const nameEl = document.createElement('span');
      nameEl.innerText = threeLetterCode;
      nameEl.style.cssText = `font-weight: 900; flex-grow: 1; letter-spacing: 0.5px; ${racer.isPlayer ? 'color: #fff;' : 'color: rgba(255,255,255,0.85);'}`;
      row.appendChild(nameEl);

      // Lap count badge (Updates LIVE every UI tick!)
      const lapBadge = document.createElement('span');
      lapBadge.innerText = `L${racer.completedLaps !== undefined ? racer.completedLaps : 0}`;
      lapBadge.style.cssText = "font-size: 0.65rem; color: rgba(255,255,255,0.5); font-weight: 700; margin-right: 8px; font-family: monospace;";
      row.appendChild(lapBadge);

      // Pit status or Gap / Lap time
      let isPittingNow = racer.isPlayer ? isPitting : (racer.isPitting || false);
      const gapEl = document.createElement('span');
      if (isPittingNow) {
        gapEl.innerText = "PIT";
        gapEl.style.cssText = "font-weight: 900; color: #22c55e; background: rgba(34,197,94,0.15); padding: 1px 5px; border-radius: 3px; font-size: 0.6rem; letter-spacing: 0.5px;";
      } else if (currentSessionIndex === 0 || currentSessionIndex === 1) {
        // Practice or Qualifying: show best lap time
        const bestLap = currentSessionIndex === 0 ? racer.bestPracticeLap : racer.bestQualifyingLap;
        let timeText = "";
        if (bestLap && bestLap !== Infinity) {
          timeText = formatLapTime(bestLap);
        } else {
          timeText = "--:--.---";
        }
        gapEl.innerText = timeText;
        gapEl.style.cssText = `font-weight: 700; font-size: 0.65rem; font-family: monospace; ${racer.isPlayer ? 'color: #facc15;' : 'color: rgba(255,255,255,0.7);'}`;
      } else {
        // Race: show gap to leader
        let gapText = "";
        if (idx === 0) {
          gapText = "LEADER";
        } else {
          const score = getRacerScore(racer);
          const diffScore = leaderScore - score;
          const gapSecs = diffScore * 20.0;
          gapText = `+${gapSecs.toFixed(3)}`;
        }
        gapEl.innerText = gapText;
        gapEl.style.cssText = `font-weight: 700; font-size: 0.65rem; ${racer.isPlayer ? 'color: #fff;' : 'color: rgba(255,255,255,0.7);'}`;
      }
      row.appendChild(gapEl);

      racer.posRank = pos;
    });
  }

  window.toggleFullscreen = () => {
    // Remove focus immediately to prevent Space key browser click triggers!
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error("Error enabling fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  let tempTrackSelection = 0;
  window.chooseTrackIndex = (idx) => {
    window.ApexAudio.playClick();
    tempTrackSelection = idx;
    
    document.getElementById('track-card-0').style.borderColor = idx === 0 ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.15)';
    document.getElementById('track-card-0').classList.toggle('selected', idx === 0);
    document.getElementById('track-card-1').style.borderColor = idx === 1 ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.15)';
    document.getElementById('track-card-1').classList.toggle('selected', idx === 1);
  };

  window.closeTrackSelection = () => {
    window.ApexAudio.playClick();
    const overlay = document.getElementById('track-selection-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
      overlay.style.display = 'none';
    }
  };

  window.confirmTrackSelection = () => {
    window.ApexAudio.playClick();
    activeTrack = tempTrackSelection;
    const overlay = document.getElementById('track-selection-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
      overlay.style.display = 'none';
    }
    
    // Hide career workstation if active
    const workstation = document.getElementById('f1-workstation-overlay');
    const isCareerSession = workstation && !workstation.classList.contains('hidden');
    if (workstation) {
      workstation.classList.add('hidden');
    }
    
    const sessionNames = ["PRACTICE", "QUALIFYING", "MAIN GP RACE"];
    const sessionTitle = isCareerSession ? sessionNames[currentSessionIndex] : "EXHIBITION GP";
    const trackNames = ["Sunset Coast Circuit", "Alpine Heights"];
    
    window.triggerLoadingScreen(sessionTitle, trackNames[activeTrack], () => {
      setupGame();
    });
  };

  window.openTrackSelection = () => {
    const overlay = document.getElementById('track-selection-overlay');
    if (overlay) {
      overlay.classList.remove('hidden');
      overlay.style.display = 'flex';
    }
    window.chooseTrackIndex(0);
  };

  // ════ GAME SETTINGS CONTROLLERS & LOGIC ════
  const actionLabels = {
    accelerate: { label: "ACCELERATE", desc: "Speed up player car" },
    brake: { label: "BRAKE / REVERSE", desc: "Slow down / drive backwards" },
    steerLeft: { label: "STEER LEFT", desc: "Turn left" },
    steerRight: { label: "STEER RIGHT", desc: "Turn right" },
    drift: { label: "DRIFT / HANDBRAKE", desc: "Hold to drift around corners / Pit QTE" },
    upshift: { label: "UP-SHIFT", desc: "Increase gear sequential gearbox" },
    downshift: { label: "DOWN-SHIFT", desc: "Decrease gear sequential gearbox" },
    drs: { label: "DRS FLAP", desc: "Toggle Drag Reduction System" },
    radio: { label: "TEAM RADIO (V)", desc: "Hold/Press to activate voice commands" },
    status: { label: "CAR STATUS (T)", desc: "Toggle telemetry diagnostics card" },
    fullscreen: { label: "FULLSCREEN (F)", desc: "Toggle full screen mode" },
    engineMode: { label: "ENGINE MODE (M)", desc: "Cycle through fuel / power modes" },
    pitStop: { label: "PIT REQUEST (P)", desc: "Call to box box box this lap" }
  };

  function formatKeyCode(code) {
    if (!code) return 'NONE';
    return code
      .replace('Key', '')
      .replace('Digit', '')
      .replace('ArrowUp', 'UP')
      .replace('ArrowDown', 'DOWN')
      .replace('ArrowLeft', 'LEFT')
      .replace('ArrowRight', 'RIGHT')
      .replace('Space', 'SPACEBAR')
      .replace('ShiftLeft', 'L-SHIFT')
      .replace('ShiftRight', 'R-SHIFT')
      .replace('ControlLeft', 'L-CTRL')
      .replace('ControlRight', 'R-CTRL')
      .replace('AltLeft', 'L-ALT')
      .replace('AltRight', 'R-ALT')
      .toUpperCase();
  }

  let activeSettingsTab = 0;
  window.switchSettingsTab = (idx) => {
    window.ApexAudio.playClick();
    activeSettingsTab = idx;
    const tabs = document.querySelectorAll('.settings-tab-btn');
    tabs.forEach((t, i) => {
      t.classList.toggle('active', i === idx);
    });
    renderSettingsTabContent();
  };

  let isSettingsOpen = false;
  window.toggleSettingsOverlay = () => {
    isSettingsOpen = !isSettingsOpen;
    const overlay = document.getElementById('settings-overlay');
    if (!overlay) return;

    if (isSettingsOpen) {
      window.isGamePaused = true;
      overlay.style.display = 'flex';
      overlay.classList.remove('hidden');
      
      // Stop engine humming sound / drop pitch to idle while settings are open
      if (window.ApexAudio.isPlayingEngine) {
        window.ApexAudio.updateEnginePitch(1500);
        if (window.ApexAudio.engineGain && window.ApexAudio.ctx) {
          window.ApexAudio.engineGain.gain.setValueAtTime(0.01, window.ApexAudio.ctx.currentTime);
        }
      }

      window.switchSettingsTab(0);
      window.ApexAudio.playClick();

      // Show END SESSION row in settings if we're in Practice or Qualifying
      const endSessionRow = document.getElementById('settings-end-session-row');
      if (endSessionRow) {
        const isQual = (currentSessionIndex === 1);
        endSessionRow.style.display = (currentSessionIndex === 0 || currentSessionIndex === 1) ? 'block' : 'none';
        
        const label = endSessionRow.querySelector('div');
        if (label) {
          label.innerText = isQual ? "QUALIFYING SESSION CONTROL" : "PRACTICE SESSION CONTROL";
        }
        const btn = endSessionRow.querySelector('button');
        if (btn) {
          btn.innerHTML = isQual 
            ? "&#9632; RETIRE FROM QUALIFYING &rarr; GP GRID" 
            : "&#9632; END PRACTICE SESSION &rarr; QUALIFYING";
        }
      }
    } else {
      window.isGamePaused = false;
      overlay.style.display = 'none';
      overlay.classList.add('hidden');
      window.ApexAudio.playClick();
      
      // Restore engine humming sound
      if (window.ApexAudio.isPlayingEngine && window.ApexAudio.engineGain && window.ApexAudio.ctx) {
        window.ApexAudio.engineGain.gain.setValueAtTime(0.04, window.ApexAudio.ctx.currentTime);
      }
    }
  };

  function renderSettingsTabContent() {
    const container = document.getElementById('settings-tab-content');
    if (!container) return;

    container.innerHTML = '';

    // Show/hide quit button based on whether a race session is active
    const quitBtn = document.getElementById('settings-quit-btn');
    if (quitBtn) {
      quitBtn.style.display = isRaceActive ? 'block' : 'none';
    }

    if (activeSettingsTab === 0) {
      // Keybinds tab
      const desc = document.createElement('div');
      desc.style.cssText = "font-family: 'Inter', sans-serif; font-size: 0.72rem; color: rgba(255,255,255,0.4); margin-bottom: 12px; line-height: 1.4;";
      desc.innerText = "Click on any binding button, then press the key you want to assign to that control. Press Escape to cancel re-binding.";
      container.appendChild(desc);

      const keysGrid = document.createElement('div');
      keysGrid.style.cssText = "display: flex; flex-direction: column; gap: 4px;";
      
      for (const [action, meta] of Object.entries(actionLabels)) {
        const row = document.createElement('div');
        row.className = 'settings-row';
        
        const labelCol = document.createElement('div');
        labelCol.className = 'settings-row-label';
        
        const nameSpan = document.createElement('span');
        nameSpan.innerText = meta.label;
        const descSpan = document.createElement('span');
        descSpan.className = 'settings-row-desc';
        descSpan.innerText = meta.desc;
        
        labelCol.appendChild(nameSpan);
        labelCol.appendChild(descSpan);
        
        const button = document.createElement('button');
        button.className = 'settings-bind-btn';
        
        if (window.rebindingAction === action) {
          button.innerText = 'PRESS ANY KEY...';
          button.classList.add('waiting');
        } else {
          const currentBinds = window.keyBindings[action] || [];
          button.innerText = currentBinds.map(formatKeyCode).join(' / ') || 'NONE';
        }
        
        button.onclick = () => {
          window.ApexAudio.playClick();
          window.rebindingAction = action;
          renderSettingsTabContent();
        };
        
        row.appendChild(labelCol);
        row.appendChild(button);
        keysGrid.appendChild(row);
      }
      container.appendChild(keysGrid);
    } 
    else if (activeSettingsTab === 1) {
      // Audio tab
      const audioList = document.createElement('div');
      audioList.style.cssText = "display: flex; flex-direction: column; gap: 8px;";
      
      // Master Volume
      const masterRow = document.createElement('div');
      masterRow.className = 'settings-row';
      masterRow.innerHTML = `
        <div class="settings-row-label">
          <span>MASTER VOLUME</span>
          <span class="settings-row-desc">Adjust overall game sound volume level</span>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <input type="range" class="settings-slider" min="0" max="1" step="0.05" value="${window.ApexAudio.masterVolume}" oninput="setGameMasterVolume(this.value)">
          <span id="audio-master-vol-value" style="font-size: 0.8rem; width: 45px; text-align: right; color: var(--neon-cyan);">${Math.round(window.ApexAudio.masterVolume * 100)}%</span>
        </div>
      `;
      audioList.appendChild(masterRow);

      // Engine Sound
      const engineRow = document.createElement('div');
      engineRow.className = 'settings-row';
      engineRow.innerHTML = `
        <div class="settings-row-label">
          <span>ENGINE SOUND</span>
          <span class="settings-row-desc">Enable or disable player car's motor sound FX</span>
        </div>
        <div>
          <select class="settings-select" onchange="toggleEngineSoundSetting(this.value === 'on')">
            <option value="on" ${window.engineSoundEnabled !== false ? 'selected' : ''}>ENABLED</option>
            <option value="off" ${window.engineSoundEnabled === false ? 'selected' : ''}>DISABLED</option>
          </select>
        </div>
      `;
      audioList.appendChild(engineRow);

      // Radio Sound
      const radioRow = document.createElement('div');
      radioRow.className = 'settings-row';
      radioRow.innerHTML = `
        <div class="settings-row-label">
          <span>TEAM RADIO VOICE</span>
          <span class="settings-row-desc">Adjust volume of pit wall race engineer speech</span>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <input type="range" class="settings-slider" min="0" max="1" step="0.05" value="${window.radioVolume}" oninput="setRadioVolume(this.value)">
          <span id="audio-radio-vol-value" style="font-size: 0.8rem; width: 45px; text-align: right; color: var(--neon-cyan);">${Math.round(window.radioVolume * 100)}%</span>
        </div>
      `;
      audioList.appendChild(radioRow);

      // Team Radio Audio Speech toggler (OFF by default)
      const speechRow = document.createElement('div');
      speechRow.className = 'settings-row';
      speechRow.innerHTML = `
        <div class="settings-row-label">
          <span>TEAM RADIO AUDIO</span>
          <span class="settings-row-desc">Enable spoken audio commentary from engineer</span>
        </div>
        <div>
          <select class="settings-select" onchange="toggleVoiceSpeechSetting(this.value === 'on')">
            <option value="off" ${window.voiceSpeechEnabled === false ? 'selected' : ''}>DISABLED (OFF)</option>
            <option value="on" ${window.voiceSpeechEnabled !== false ? 'selected' : ''}>ENABLED (ON)</option>
          </select>
        </div>
      `;
      audioList.appendChild(speechRow);

      container.appendChild(audioList);
    } 
    else if (activeSettingsTab === 2) {
      // Graphics tab
      const graphicsList = document.createElement('div');
      graphicsList.style.cssText = "display: flex; flex-direction: column; gap: 8px;";

      // Shadows Quality
      const shadowRow = document.createElement('div');
      shadowRow.className = 'settings-row';
      shadowRow.innerHTML = `
        <div class="settings-row-label">
          <span>SHADOW QUALITY</span>
          <span class="settings-row-desc">Toggle real-time car and track object shadows</span>
        </div>
        <div>
          <select class="settings-select" onchange="setShadowsQuality(this.value)">
            <option value="high" ${window.graphicsShadows === 'high' ? 'selected' : ''}>HIGH (PCF Soft Shadows)</option>
            <option value="off" ${window.graphicsShadows === 'off' ? 'selected' : ''}>LOW (Shadows Disabled)</option>
          </select>
        </div>
      `;
      graphicsList.appendChild(shadowRow);

      // Effects / Particles
      const particlesRow = document.createElement('div');
      particlesRow.className = 'settings-row';
      particlesRow.innerHTML = `
        <div class="settings-row-label">
          <span>VISUAL EFFECTS / PARTICLES</span>
          <span class="settings-row-desc">Exhaust smoke, drift tire sparks and dirt debris</span>
        </div>
        <div>
          <select class="settings-select" onchange="setParticlesSetting(this.value === 'on')">
            <option value="on" ${window.particlesEnabled !== false ? 'selected' : ''}>ENABLED</option>
            <option value="off" ${window.particlesEnabled === false ? 'selected' : ''}>DISABLED</option>
          </select>
        </div>
      `;
      graphicsList.appendChild(particlesRow);

      // Resolution Scale
      const resRow = document.createElement('div');
      resRow.className = 'settings-row';
      resRow.innerHTML = `
        <div class="settings-row-label">
          <span>RESOLUTION SCALE</span>
          <span class="settings-row-desc">Downscale 3D viewport rendering to increase frame rate</span>
        </div>
        <div>
          <select class="settings-select" onchange="setResolutionScale(this.value)">
            <option value="native" ${window.resScaleSetting === 'native' ? 'selected' : ''}>NATIVE RETINA/DPI</option>
            <option value="1.0" ${window.resScaleSetting === '1.0' ? 'selected' : ''}>1.0x (Sharp)</option>
            <option value="0.75" ${window.resScaleSetting === '0.75' ? 'selected' : ''}>0.75x (Performance)</option>
            <option value="0.5" ${window.resScaleSetting === '0.5' ? 'selected' : ''}>0.5x (Max FPS)</option>
          </select>
        </div>
      `;
      graphicsList.appendChild(resRow);

      // Regulations Era Selection
      const regRow = document.createElement('div');
      regRow.className = 'settings-row';
      regRow.innerHTML = `
        <div class="settings-row-label">
          <span>REGULATIONS ERA</span>
          <span class="settings-row-desc">2026 (Active Aero + Overtake Mode) vs Legacy (Classic DRS)</span>
        </div>
        <div>
          <select class="settings-select" onchange="setRegulationEraSetting(this.value)">
            <option value="2026" ${window.f1RegulationEra === '2026' ? 'selected' : ''}>2026 REGULATIONS</option>
            <option value="legacy" ${window.f1RegulationEra === 'legacy' ? 'selected' : ''}>LEGACY DRS ERA</option>
          </select>
        </div>
      `;
      graphicsList.appendChild(regRow);

      container.appendChild(graphicsList);
    } 
    else if (activeSettingsTab === 3) {
      // Camera tab
      const cameraList = document.createElement('div');
      cameraList.style.cssText = "display: flex; flex-direction: column; gap: 8px;";

      // Distance
      const distRow = document.createElement('div');
      distRow.className = 'settings-row';
      distRow.innerHTML = `
        <div class="settings-row-label">
          <span>CHASE CAMERA DISTANCE</span>
          <span class="settings-row-desc">How far behind the car the camera follows</span>
        </div>
        <div>
          <select class="settings-select" onchange="setCameraSetting('distance', this.value)">
            <option value="tcam" ${window.cameraDistanceSetting === 'tcam' ? 'selected' : ''}>T-CAM (F1 Cockpit)</option>
            <option value="near" ${window.cameraDistanceSetting === 'near' ? 'selected' : ''}>NEAR (3.8m)</option>
            <option value="normal" ${window.cameraDistanceSetting === 'normal' ? 'selected' : ''}>NORMAL (5.4m)</option>
            <option value="far" ${window.cameraDistanceSetting === 'far' ? 'selected' : ''}>FAR (7.0m)</option>
          </select>
        </div>
      `;
      cameraList.appendChild(distRow);

      // Height
      const heightRow = document.createElement('div');
      heightRow.className = 'settings-row';
      heightRow.innerHTML = `
        <div class="settings-row-label">
          <span>CHASE CAMERA HEIGHT</span>
          <span class="settings-row-desc">Elevation height of the pursuit camera</span>
        </div>
        <div>
          <select class="settings-select" onchange="setCameraSetting('height', this.value)">
            <option value="low" ${window.cameraHeightSetting === 'low' ? 'selected' : ''}>LOW (0.95m)</option>
            <option value="normal" ${window.cameraHeightSetting === 'normal' ? 'selected' : ''}>NORMAL (1.4m)</option>
            <option value="high" ${window.cameraHeightSetting === 'high' ? 'selected' : ''}>HIGH (2.0m)</option>
          </select>
        </div>
      `;
      cameraList.appendChild(heightRow);

      // Shake
      const shakeRow = document.createElement('div');
      shakeRow.className = 'settings-row';
      shakeRow.innerHTML = `
        <div class="settings-row-label">
          <span>CAMERA SHAKE</span>
          <span class="settings-row-desc">Vibrate camera dynamically at speeds above 100 km/h</span>
        </div>
        <div>
          <select class="settings-select" onchange="setCameraSetting('shake', this.value)">
            <option value="on" ${window.cameraShakeSetting !== false ? 'selected' : ''}>ENABLED</option>
            <option value="off" ${window.cameraShakeSetting === false ? 'selected' : ''}>DISABLED</option>
          </select>
        </div>
      `;
      cameraList.appendChild(shakeRow);

      // Tilt
      const tiltRow = document.createElement('div');
      tiltRow.className = 'settings-row';
      tiltRow.innerHTML = `
        <div class="settings-row-label">
          <span>CAMERA YAW TILT</span>
          <span class="settings-row-desc">Pivot camera slightly when sliding or drifting</span>
        </div>
        <div>
          <select class="settings-select" onchange="setCameraSetting('tilt', this.value)">
            <option value="on" ${window.cameraTiltSetting !== false ? 'selected' : ''}>ENABLED</option>
            <option value="off" ${window.cameraTiltSetting === false ? 'selected' : ''}>DISABLED</option>
          </select>
        </div>
      `;
      cameraList.appendChild(tiltRow);

      // Base FOV
      const fovRow = document.createElement('div');
      fovRow.className = 'settings-row';
      fovRow.innerHTML = `
        <div class="settings-row-label">
          <span>BASE FIELD OF VIEW (FOV)</span>
          <span class="settings-row-desc">Adjust horizontal viewpoint angle (base value)</span>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <input type="range" class="settings-slider" min="50" max="95" step="5" value="${window.baseFOV}" oninput="setCameraFOVSetting(this.value)">
          <span id="camera-fov-value" style="font-size: 0.8rem; width: 45px; text-align: right; color: var(--neon-cyan);">${window.baseFOV}°</span>
        </div>
      `;
      cameraList.appendChild(fovRow);

      container.appendChild(cameraList);
    }
  }

  // Settings adjustment handlers
  window.setGameMasterVolume = (val) => {
    window.ApexAudio.masterVolume = parseFloat(val);
    localStorage.setItem('apex_stars_master_volume', val);
    window.ApexAudio.setVolume(parseFloat(val));
    const volValText = document.getElementById('audio-master-vol-value');
    if (volValText) volValText.innerText = `${Math.round(val * 100)}%`;
  };

  window.toggleEngineSoundSetting = (checked) => {
    window.engineSoundEnabled = checked;
    localStorage.setItem('apex_stars_engine_sound', checked);
    if (!checked) {
      window.ApexAudio.stopEngine();
    } else {
      if (isRaceActive && !window.isGamePaused) {
        window.ApexAudio.startEngine();
      }
    }
  };

  window.setRadioVolume = (val) => {
    window.radioVolume = parseFloat(val);
    localStorage.setItem('apex_stars_radio_volume', val);
    const volValText = document.getElementById('audio-radio-vol-value');
    if (volValText) volValText.innerText = `${Math.round(val * 100)}%`;
  };

  window.toggleVoiceSpeechSetting = (checked) => {
    window.voiceSpeechEnabled = checked;
    localStorage.setItem('apex_stars_voice_speech', checked);
  };

  window.setShadowsQuality = (val) => {
    window.graphicsShadows = val;
    localStorage.setItem('apex_stars_shadows', val);
    if (!renderer) return;
    renderer.shadowMap.enabled = val === 'high';
    scene.traverse(child => {
      if (child.isMesh) {
        child.castShadow = val === 'high';
        child.receiveShadow = val === 'high';
      }
    });
    const dirLight = scene.children.find(c => c.isDirectionalLight);
    if (dirLight) {
      dirLight.castShadow = val === 'high';
    }
  };

  window.setParticlesSetting = (enabled) => {
    window.particlesEnabled = enabled;
    localStorage.setItem('apex_stars_particles', enabled);
  };

  window.setRegulationEraSetting = (val) => {
    window.f1RegulationEra = val;
    localStorage.setItem('f1_regulation_era', val);
    window.ApexAudio.playClick();
    
    // Reset DRS / Overtake Mode state variables immediately
    drsActive = false;
    drsAvailable = false;
    window.overtakeModeActive = false;
    window.overtakeModeEligible = false;
    if (playerKart) playerKart.ersEnergy = ERS_MAX_ENERGY;
    window.ersBatteryLevel = 100.0;
    
    // Hide or reset alert
    const alertEl = document.getElementById('hud-drs-alert');
    if (alertEl) alertEl.style.display = 'none';
    
    speakEngineerRadio(val === '2026' ? "Switched to 2026 regulations mode." : "Switched to legacy DRS regulations.");
    renderSettingsTabContent();
  };

  window.setResolutionScale = (val) => {
    window.resScaleSetting = val;
    localStorage.setItem('apex_stars_resscale', val);
    if (!renderer) return;
    const pixelRatio = val === 'native' ? window.devicePixelRatio : parseFloat(val);
    renderer.setPixelRatio(pixelRatio);
    window.dispatchEvent(new Event('resize'));
  };

  window.setCameraSetting = (type, val) => {
    localStorage.setItem(`apex_stars_camera_${type}`, val);
    if (type === 'distance') {
      window.cameraDistanceSetting = val;
    } else if (type === 'height') {
      window.cameraHeightSetting = val;
    } else if (type === 'shake') {
      window.cameraShakeSetting = val === 'on';
    } else if (type === 'tilt') {
      window.cameraTiltSetting = val === 'on';
    }
  };

  window.setCameraFOVSetting = (val) => {
    window.baseFOV = parseInt(val);
    localStorage.setItem('apex_stars_camera_fov', val);
    const fovValText = document.getElementById('camera-fov-value');
    if (fovValText) fovValText.innerText = `${val}°`;
  };

  window.restoreSettingsDefaults = () => {
    window.ApexAudio.playClick();
    
    // Clear localStorage values
    localStorage.removeItem('apex_stars_keybinds');
    localStorage.removeItem('apex_stars_master_volume');
    localStorage.removeItem('apex_stars_engine_sound');
    localStorage.removeItem('apex_stars_radio_volume');
    localStorage.removeItem('apex_stars_voice_speech');
    localStorage.removeItem('apex_stars_shadows');
    localStorage.removeItem('apex_stars_particles');
    localStorage.removeItem('apex_stars_resscale');
    localStorage.removeItem('apex_stars_camera_distance');
    localStorage.removeItem('apex_stars_camera_height');
    localStorage.removeItem('apex_stars_camera_shake');
    localStorage.removeItem('apex_stars_camera_tilt');
    localStorage.removeItem('apex_stars_camera_fov');

    // Reset variables to defaults
    window.keyBindings = {
      accelerate: ['KeyW', 'ArrowUp'],
      steerLeft: ['KeyA', 'ArrowLeft'],
      brake: ['KeyS', 'ArrowDown'],
      steerRight: ['KeyD', 'ArrowRight'],
      drift: ['Space'],
      upshift: ['KeyE'],
      downshift: ['KeyQ'],
      drs: ['ShiftLeft', 'ShiftRight'],
      radio: ['KeyV'],
      status: ['KeyT'],
      fullscreen: ['KeyF'],
      engineMode: ['KeyM'],
      pitStop: ['KeyP']
    };

    window.ApexAudio.masterVolume = 0.35;
    window.engineSoundEnabled = true;
    window.radioVolume = 1.0;
    window.voiceSpeechEnabled = false; // OFF by default!
    window.graphicsShadows = 'high';
    window.particlesEnabled = true;
    window.resScaleSetting = 'native';
    window.cameraDistanceSetting = 'normal';
    window.cameraHeightSetting = 'normal';
    window.cameraShakeSetting = true;
    window.cameraTiltSetting = true;
    window.baseFOV = 65;

    // Apply defaults immediately
    window.ApexAudio.setVolume(0.35);
    if (renderer) {
      renderer.shadowMap.enabled = true;
      renderer.setPixelRatio(window.devicePixelRatio);
    }
    
    // Refresh content
    renderSettingsTabContent();
    speakEngineerRadio("Settings reset to defaults.", 50);
  };

  window.quitToMainMenu = () => {
    window.ApexAudio.playClick();
    
    // Hide settings panel
    window.isGamePaused = false;
    const settingsOverlay = document.getElementById('settings-overlay');
    if (settingsOverlay) {
      settingsOverlay.style.display = 'none';
      settingsOverlay.classList.add('hidden');
    }
    
    // Hide game HUD
    const hud = document.getElementById('hud-layer');
    if (hud) hud.style.display = 'none';
    const leadCard = document.getElementById('f1-leaderboard-card');
    if (leadCard) leadCard.style.display = 'none';

    // Terminate active race
    isRaceActive = false;
    window.ApexAudio.stopEngine();

    // Show main menu
    const menu = document.getElementById('main-landing-screen');
    if (menu) {
      menu.classList.remove('hidden');
      menu.style.display = 'flex';
    }
    
    // Stop animation frame and clean scene
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    
    setupMenuPreview();
    speakEngineerRadio("Returned to base dashboard.", 50);
  };

  // Bind to landing tab #4 (OPTIONS)
  const originalSelectLandingTab = window.selectLandingTab;
  window.selectLandingTab = (idx, element) => {
    if (idx === 4) {
      window.ApexAudio.playClick();
      const items = document.querySelectorAll('.f1-nav-item');
      items.forEach(i => i.classList.remove('active'));
      element.classList.add('active');
      window.toggleSettingsOverlay();
      return;
    }
    originalSelectLandingTab(idx, element);
  };

