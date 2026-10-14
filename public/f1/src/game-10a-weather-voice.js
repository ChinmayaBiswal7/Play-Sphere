  function updateWeatherEvent(delta) {
    if (!isRaceActive) return;
    const elapsed = clock.getElapsedTime() - startTime;
    if (elapsed > rainTriggerTime && !rainAlertTriggered) {
      rainAlertTriggered = true;
      isRainActive = true;
      if (scene) {
        scene.background = new THREE.Color(0x334155);
        scene.fog.color = new THREE.Color(0x334155);
        if (trackMesh) {
          trackMesh.material.roughness = 0.1; // wet shiny track
        }
      }
      speakEngineerRadio("Rain is starting! Should we box for intermediate tyres?");
      pendingRadioQuestion = "rain";
    }
  }

  let isSpeechListening = false;

  // ════ VOICE CONTROL ENGINE (WEB SPEECH API) ════
  function setupVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      return;
    }
    if (recognition) return;

    try {
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        isSpeechListening = true;
        const btn = document.getElementById('hud-mic-btn');
        if (btn) btn.classList.add('listening');
      };

      recognition.onend = () => {
        isSpeechListening = false;
        const btn = document.getElementById('hud-mic-btn');
        if (btn) btn.classList.remove('listening');
        
        // Auto-restart recognition if temporary listening window is active!
        if (window.keepListeningForVoice) {
          setTimeout(() => {
            try {
              if (window.keepListeningForVoice && !isSpeechListening) {
                recognition.start();
              }
            } catch(e) {}
          }, 300);
        }
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition error:", event.error);
        isSpeechListening = false;
        const btn = document.getElementById('hud-mic-btn');
        if (btn) btn.classList.remove('listening');
        if (event.error === 'not-allowed') {
          speakEngineerRadio("Microphone permission denied. Allow mic access in browser.", 50, true);
        }
      };

      recognition.onresult = (event) => {
        if (!event.results || !event.results[0] || !event.results[0][0]) return;
        const text = event.results[0][0].transcript.toLowerCase();
        parseVoiceCommand(text);
      };
    } catch(e) {
      console.warn("Voice recognition init error:", e);
    }
  }

  window.toggleVoiceListening = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      speakEngineerRadio("Speech recognition is not supported on this browser.", 50, true);
      return;
    }
    if (!recognition) {
      setupVoiceRecognition();
    }
    if (!recognition) return;

    if (isSpeechListening) {
      window.keepListeningForVoice = false;
      try {
        recognition.stop();
      } catch(e) {}
    } else {
      try {
        if (window.speechSynthesis && window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        recognition.start();
      } catch(e) {
        try { recognition.stop(); } catch(err) {}
      }
    }
  };

  window.toggleTelemetryPanel = () => {
    const panel = document.getElementById('hud-telemetry-panel');
    const btn = document.getElementById('hud-telemetry-btn');
    if (!panel) return;

    panel.classList.toggle('show');
    if (btn) {
      btn.classList.toggle('active');
    }

    if (panel.classList.contains('show')) {
      speakEngineerRadio("Displaying telemetry diagnostics.", 30, true);
      updateTelemetryPanelUI();
    } else {
      speakEngineerRadio("Telemetry feed disconnected.", 30, true);
    }
  };

  function updateTelemetryPanelUI() {
    const panel = document.getElementById('hud-telemetry-panel');
    if (!panel) return;

    // 1. Calculate color based on tyreWear
    const wearVal = Math.floor(tyreWear);
    let tireColor = '#22c55e'; // Green
    if (wearVal >= 65) {
      tireColor = '#ef4444'; // Red
    } else if (wearVal >= 30) {
      tireColor = '#eab308'; // Yellow
    }

    ['telemetry-wheel-fl', 'telemetry-wheel-fr', 'telemetry-wheel-rl', 'telemetry-wheel-rr'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.setAttribute('fill', tireColor);
    });

    // 2. Calculate color based on carDamage
    const damageVal = Math.floor(carDamage);
    let bodyColor = '#22c55e'; // Green
    if (damageVal >= 50) {
      bodyColor = '#ef4444'; // Red
    } else if (damageVal >= 20) {
      bodyColor = '#eab308'; // Yellow
    }

    // Color nose, front wing, body, sidepods, rear wing
    ['telemetry-front-wing', 'telemetry-nose', 'telemetry-body', 'telemetry-sidepod-l', 'telemetry-sidepod-r', 'telemetry-rear-wing'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.setAttribute('fill', bodyColor);
    });

    // 3. Update text details
    const wearBadge = document.getElementById('telemetry-wear-badge');
    if (wearBadge) wearBadge.innerText = `Wear: ${wearVal}%`;

    const dmgVal = document.getElementById('telemetry-damage-val');
    if (dmgVal) {
      dmgVal.innerText = `${damageVal}%`;
      dmgVal.style.color = bodyColor;
    }

    // 4. Update Tyre Compound Badge
    const badge = document.getElementById('telemetry-tyre-badge');
    const nameEl = document.getElementById('telemetry-tyre-name');
    const lapsEl = document.getElementById('telemetry-tyre-laps');

    if (badge && nameEl && lapsEl) {
      const compoundUpper = activeCompound.toUpperCase();
      nameEl.innerText = compoundUpper;
      
      // Letter badge
      let letter = "M";
      let badgeColor = "#eab308"; // Yellow for Medium
      
      if (activeCompound === 'soft') {
        letter = "S";
        badgeColor = "#ef4444"; // Red
      } else if (activeCompound === 'hard') {
        letter = "H";
        badgeColor = "#ffffff"; // White
      } else if (activeCompound === 'intermediate') {
        letter = "I";
        badgeColor = "#22c55e"; // Green
      } else if (activeCompound === 'wet') {
        letter = "W";
        badgeColor = "#3b82f6"; // Blue
      }

      badge.innerText = letter;
      badge.style.borderColor = badgeColor;
      badge.style.color = badgeColor === '#ffffff' ? '#000' : '#fff';
      badge.style.background = badgeColor === '#ffffff' ? '#fff' : 'transparent';

      // Estimate laps completed (simplified as a fraction of currentOffset / laps)
      const tyreLapsCompleted = Math.max(0, Math.floor(currentLap - 1 + playerKart.currentOffset));
      lapsEl.innerText = `${tyreLapsCompleted} LAPS`;
    }
  }

  let radioQueue = [];
  let isRadioSpeaking = false;
  let currentRadioPriority = 0;
  let activeUtterance = null;
  const recentSpokenRadioMessages = new Map();

  function speakEngineerRadio(msg, priorityLevel = 30, isExplicitResponse = false) {
    if (!('speechSynthesis' in window)) return;
    
    // Convert old true/false priorities
    if (priorityLevel === true) priorityLevel = 100;
    else if (priorityLevel === false) priorityLevel = 30;

    // Suppress repeating identical messages within 45 seconds (unless explicit user response)
    const nowTime = Date.now();
    const lastSpoken = recentSpokenRadioMessages.get(msg) || 0;
    if (!isExplicitResponse && (nowTime - lastSpoken) < 45000) {
      return; // Debounce identical voice messages
    }
    recentSpokenRadioMessages.set(msg, nowTime);

    // Display on HUD radio subtitles instantly
    const subEl = document.getElementById('hud-radio-subtitles');
    if (subEl) {
      subEl.innerText = `"${msg}"`;
    }
    const radioBanner = document.getElementById('hud-radio-banner');
    if (radioBanner) {
      radioBanner.classList.add('show');
      // Hide banner after 5.5 seconds
      clearTimeout(window.radioBannerTimeout);
      window.radioBannerTimeout = setTimeout(() => {
        radioBanner.classList.remove('show');
      }, 5500);
    }

    // Suppress speech synthesis only if user explicitly turned it off in settings
    if (window.voiceSpeechEnabled === false && !isExplicitResponse) {
      return;
    }

    // Interrupt if new message has higher priority than current speaking message!
    if (isRadioSpeaking && priorityLevel > currentRadioPriority) {
      window.speechSynthesis.cancel();
      isRadioSpeaking = false;
      currentRadioPriority = 0;
      activeUtterance = null;
    }

    // Remove duplicates or lower-priority pending messages if a higher priority one arrives
    if (priorityLevel >= 70) {
      radioQueue = radioQueue.filter(item => item.priority >= priorityLevel);
    }

    radioQueue.push({ text: msg, priority: priorityLevel });
    // Sort queue by priority (descending)
    radioQueue.sort((a, b) => b.priority - a.priority);

    processRadioQueue();
  }

  function processRadioQueue() {
    if (isRadioSpeaking || radioQueue.length === 0) return;

    if (window.speechSynthesis.paused) {
      try { window.speechSynthesis.resume(); } catch(e) {}
    }

    isRadioSpeaking = true;
    const msgItem = radioQueue.shift();
    currentRadioPriority = msgItem.priority;

    const utterance = new SpeechSynthesisUtterance(msgItem.text);
    activeUtterance = utterance;

    const voices = window.speechSynthesis.getVoices();
    // Prioritize natural or Google US/UK English voices for fluent, high-fidelity speech
    let bestVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google') && v.name.includes('US English'));
    if (!bestVoice) bestVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google') && v.name.includes('UK English'));
    if (!bestVoice) bestVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google'));
    if (!bestVoice) bestVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Natural'));
    if (!bestVoice) bestVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Microsoft'));
    if (!bestVoice) bestVoice = voices.find(v => v.lang.startsWith('en'));
    
    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    utterance.volume = (typeof window.radioVolume === 'number') ? Math.max(0.05, Math.min(1.0, window.radioVolume)) : 1.0;
    utterance.pitch = 0.90; // Natural, clear pitwall radio voice tone
    utterance.rate = 1.02;

    utterance.onend = () => {
      activeUtterance = null;
      setTimeout(() => {
        isRadioSpeaking = false;
        currentRadioPriority = 0;
        processRadioQueue();
      }, 120); // Fast release pause (120ms) for fluent, connected speech flow
    };

    utterance.onerror = () => {
      activeUtterance = null;
      isRadioSpeaking = false;
      currentRadioPriority = 0;
      processRadioQueue();
    };

    try {
      window.speechSynthesis.speak(utterance);
    } catch(err) {
      console.warn("Speech synthesis error:", err);
      isRadioSpeaking = false;
    }
  }

  function parseVoiceCommand(text) {
    // Reset listening window upon receiving input
    window.keepListeningForVoice = false;

    // 1. Interactive QTE confirmations
    if (pendingRadioQuestion === 'crash') {
      if (text.includes("yes") || text.includes("yeah") || text.includes("ok") || text.includes("sure")) {
        pendingRadioQuestion = null;
        pendingPitStop = true; // Schedule pit lane entry
        speakEngineerRadio("Copy that, boxing this lap.", 70, true);
        return;
      } else if (text.includes("no") || text.includes("nope") || text.includes("stay out")) {
        pendingRadioQuestion = null;
        speakEngineerRadio("Copy, stay out. Keep pushing.", 70, true);
        return;
      }
    }

    if (pendingRadioQuestion === 'tyres') {
      if (text.includes("yes") || text.includes("yeah") || text.includes("box") || text.includes("pit")) {
        pendingRadioQuestion = null;
        pendingPitStop = true; // Schedule pit lane entry
        speakEngineerRadio("Copy, boxing this lap for fresh rubber.", 70, true);
        return;
      } else if (text.includes("no") || text.includes("stay out")) {
        pendingRadioQuestion = null;
        speakEngineerRadio("Copy, stay out. Keep pushing.", 70, true);
        return;
      }
    }

    if (pendingRadioQuestion === 'rain') {
      if (text.includes("yes") || text.includes("yeah") || text.includes("ok") || text.includes("sure")) {
        pendingRadioQuestion = null;
        activeCompound = 'intermediate';
        window.voiceSelectedCompound = 'intermediate';
        speakEngineerRadio("Copy, boxing for intermediates.", 70, true);
        triggerPitStop();
        return;
      } else if (text.includes("no") || text.includes("nope")) {
        pendingRadioQuestion = null;
        speakEngineerRadio("Copy, stay out. Be careful on the slicks.", 70, true);
        return;
      }
    }

    if (pendingRadioQuestion === 'tyres_choice') {
      let comp = null;
      if (text.includes("soft") || text.includes("red")) comp = 'soft';
      else if (text.includes("medium") || text.includes("med") || text.includes("yellow")) comp = 'medium';
      else if (text.includes("hard") || text.includes("white")) comp = 'hard';
      else if (text.includes("inter") || text.includes("green")) comp = 'intermediate';
      else if (text.includes("wet") || text.includes("blue")) comp = 'wet';

      if (comp) {
        activeCompound = comp;
        window.voiceSelectedCompound = comp;
        pendingRadioQuestion = null;
        speakEngineerRadio(`${comp.toUpperCase()} tyres confirmed. Box box box.`, 70, true);
        
        // Sync selected button style in HTML if overlay is shown
        const btn = document.getElementById(`compound-${comp}`);
        if (btn) selectTyreCompound(comp, btn);
        return;
      }
    }

    // 2. Weather command
    if (text.includes("weather") || text.includes("rain") || text.includes("report")) {
      if (isRainActive) {
        speakEngineerRadio("Track is wet. Rain is falling. Get onto wet tyres immediately.", 30, true);
      } else {
        speakEngineerRadio("Track is dry. Weather is clear. Slicks are the fastest choice.", 30, true);
      }
      return;
    }

    // 3. Gap & Race Updates
    if (text.includes("gap") || text.includes("update") || text.includes("position") || text.includes("ahead") || text.includes("behind")) {
      const sorted = [...racers].sort((a, b) => getRacerScore(b) - getRacerScore(a));
      const playerIdx = sorted.findIndex(r => r.isPlayer);
      const pos = playerIdx + 1;
      
      if (playerIdx === 0) {
        const nextCar = sorted[1];
        speakEngineerRadio(`You are leading! P1. ${nextCar ? nextCar.name : 'The field'} is behind. Keep pushing.`, 30, true);
      } else {
        const carAhead = sorted[playerIdx - 1];
        const aheadGap = ((sorted[playerIdx - 1].currentOffset - playerKart.currentOffset) * 20.0).toFixed(1);
        speakEngineerRadio(`You are P${pos}. ${carAhead.name} is ${Math.abs(aheadGap)} seconds ahead. Push now.`, 30, true);
      }
      return;
    }

    // 4. Combined Command: "Box Soft", "Box Medium", etc.
    if ((text.includes("box") || text.includes("pit")) && (text.includes("soft") || text.includes("medium") || text.includes("med") || text.includes("hard") || text.includes("wet") || text.includes("inter") || text.includes("red") || text.includes("yellow") || text.includes("white") || text.includes("green") || text.includes("blue"))) {
      let comp = 'medium';
      if (text.includes("soft") || text.includes("red")) comp = 'soft';
      else if (text.includes("hard") || text.includes("white")) comp = 'hard';
      else if (text.includes("wet") || text.includes("blue")) comp = 'wet';
      else if (text.includes("inter") || text.includes("green")) comp = 'intermediate';
      
      activeCompound = comp;
      window.voiceSelectedCompound = comp;
      pendingPitStop = true;
      speakEngineerRadio(`${comp.toUpperCase()} confirmed. Box box box.`, 70, true);
      
      const btn = document.getElementById(`compound-${comp}`);
      if (btn) selectTyreCompound(comp, btn);
      return;
    }

    // 5. Box / Pit command alone
    if (text.includes("box") || text.includes("pit")) {
      pendingRadioQuestion = 'tyres_choice';
      pendingPitStop = true; // Schedule it!
      speakEngineerRadio("Copy, boxing this lap. Which compound?", 70, true);
      // Keep mic listening for 5 seconds window
      window.keepListeningForVoice = true;
      window.micTimeoutTimer = 5.0;
      return;
    }

    // 6. Tyre choices alone
    if (text.includes("soft") || text.includes("medium") || text.includes("med") || text.includes("hard") || text.includes("wet") || text.includes("inter") || text.includes("intermediate")) {
      let comp = 'medium';
      if (text.includes("soft")) comp = 'soft';
      else if (text.includes("hard")) comp = 'hard';
      else if (text.includes("wet")) comp = 'wet';
      else if (text.includes("inter") || text.includes("intermediate")) comp = 'intermediate';

      activeCompound = comp;
      window.voiceSelectedCompound = comp;
      speakEngineerRadio(`Copy, tyres changed to ${comp.toUpperCase()} compound.`, 30, true);
      const btn = document.getElementById(`compound-${comp}`);
      if (btn) selectTyreCompound(comp, btn);
      return;
    }

    // 7. Stay out / Cancel pit
    if (text.includes("stay out") || text.includes("cancel") || text.includes("no box") || text.includes("no stop")) {
      pendingPitStop = false;
      pendingRadioQuestion = null;
      window.voiceSelectedCompound = null;
      speakEngineerRadio("Copy, cancelling box. Stay out, push now.", 70, true);
      return;
    }

    // 8. Engine Mode voice commands
    if (text.includes("push") || text.includes("attack") || text.includes("standard") || text.includes("fuel save") || text.includes("save fuel") || text.includes("faster") || text.includes("power")) {
      let mode = 'standard';
      if (text.includes("push") || text.includes("faster") || text.includes("power")) mode = 'push';
      if (text.includes("attack")) mode = 'attack';
      else if (text.includes("save") || text.includes("fuel save")) mode = 'fuel_save';

      currentEngineMode = mode;
      speakEngineerRadio(`Copy, engine mode set to ${mode.toUpperCase()}.`, 30, true);
      
      const hMode = document.getElementById('steering-hud-mode');
      if (hMode) {
        hMode.innerText = mode.toUpperCase();
        hMode.style.color = mode === 'push' || mode === 'attack' ? '#ef4444' : '#06b6d4';
      }
      return;
    }

    // 9. Status & Telemetry command
    if (text.includes("status") || text.includes("telemetry") || text.includes("damage") || text.includes("car")) {
      toggleTelemetryPanel();
      const wearVal = Math.floor(tyreWear);
      const dmgVal = Math.floor(carDamage);
      speakEngineerRadio(`Car status: Tyre wear at ${wearVal} percent. Damage at ${dmgVal} percent.`, 30, true);
      return;
    }

    // 10. DRS activation
    if (text.includes("drs") || text.includes("wing")) {
      triggerDRS();
      return;
    }

    // 11. Radio check
    if (text.includes("radio check") || text.includes("hear me") || text.includes("hello")) {
      speakEngineerRadio("Loud and clear. Five by five, radio channel active.", 10, true);
      return;
    }

    // Default fallthrough
    speakEngineerRadio("Radio static. Say again.", 10, true);
  }


  // ════ DYNAMIC 2D MINIMAP ════
