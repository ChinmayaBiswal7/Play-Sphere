// Toss Cutscene and Match Setup Module

function randomizeConditions() {
  const weathers = ['Sunny / Clear', 'Overcast / Cloudy', 'Light Drizzle', 'Humid / Warm'];
  const temps = ['15°C', '24°C', '28°C', '31°C'];
  const winds = ['1 km/h', '5 km/h', '12 km/h', '18 km/h'];
  const pitches = ['Flat / Hard', 'Green / Damp', 'Dusty / Dry', 'Medium / Dry'];
  const outfields = ['Lush / Fast', 'Grassy / Slow', 'Dry / Sandy', 'Perfect / Fast'];

  const weatherVal = weathers[Math.floor(Math.random() * weathers.length)];
  const tempVal = temps[Math.floor(Math.random() * temps.length)];
  const windVal = winds[Math.floor(Math.random() * winds.length)];
  const pitchVal = pitches[Math.floor(Math.random() * pitches.length)];
  const outfieldVal = outfields[Math.floor(Math.random() * outfields.length)];

  const elWeather = document.getElementById('cond-weather');
  if (elWeather) elWeather.innerText = weatherVal;

  const elTemp = document.getElementById('cond-temp');
  if (elTemp) elTemp.innerText = tempVal;

  const elWind = document.getElementById('cond-wind');
  if (elWind) elWind.innerText = windVal;

  const elPitch = document.getElementById('cond-pitch');
  if (elPitch) elPitch.innerText = pitchVal;

  // Update Faceoff screen condition badges
  const faceoffPitch = document.getElementById('faceoff-cond-pitch');
  if (faceoffPitch) faceoffPitch.innerText = pitchVal.split(' / ')[0];

  const faceoffOutfield = document.getElementById('faceoff-cond-outfield');
  if (faceoffOutfield) faceoffOutfield.innerText = outfieldVal.split(' / ')[0];

  const faceoffWickets = document.getElementById('faceoff-cond-wickets');
  if (faceoffWickets) faceoffWickets.innerText = 'None';

  const faceoffTemp = document.getElementById('faceoff-cond-temp');
  if (faceoffTemp) faceoffTemp.innerText = tempVal;

  const faceoffWind = document.getElementById('faceoff-cond-wind');
  if (faceoffWind) faceoffWind.innerText = windVal;

  // Fallbacks for older/other layout IDs to prevent crash
  const elStadiumTime = document.getElementById('cond-stadium-time');
  if (elStadiumTime) elStadiumTime.innerText = weatherVal;

  const elPitchType = document.getElementById('cond-pitch-type');
  if (elPitchType) elPitchType.innerText = pitchVal;

  const elWindSpeed = document.getElementById('cond-wind-speed');
  if (elWindSpeed) elWindSpeed.innerText = windVal;
}

function updateMatchupScreenUI() {
  const userKey = window.MATCH.userTeam || 'IND';
  const oppKey = window.MATCH.oppTeam || 'AUS';

  const uTeam = window.TEAMS[userKey] || window.TEAMS.IND;
  const oTeam = window.TEAMS[oppKey] || window.TEAMS.AUS;

  // 1. Update Left/Home Captain Card
  const elUserFlag = document.getElementById('faceoff-user-flag');
  if (elUserFlag) elUserFlag.innerText = uTeam.flag || '🇮🇳';

  const elUserTeamName = document.getElementById('faceoff-user-team-name');
  if (elUserTeamName) elUserTeamName.innerText = uTeam.name.toUpperCase();

  const elUserRating = document.getElementById('faceoff-user-rating');
  if (elUserRating) elUserRating.innerText = `OVR ${uTeam.rating || 80}`;

  const elUserCaptain = document.getElementById('faceoff-user-captain-name');
  if (elUserCaptain) elUserCaptain.innerText = (uTeam.lineup && uTeam.lineup[0]) ? uTeam.lineup[0].toUpperCase() : 'CAPTAIN';

  // 2. Update Right/Away Captain Card
  const elOppFlag = document.getElementById('faceoff-opp-flag');
  if (elOppFlag) elOppFlag.innerText = oTeam.flag || '🇦🇺';

  const elOppTeamName = document.getElementById('faceoff-opp-team-name');
  if (elOppTeamName) elOppTeamName.innerText = oTeam.name.toUpperCase();

  const elOppRating = document.getElementById('faceoff-opp-rating');
  if (elOppRating) elOppRating.innerText = `OVR ${oTeam.rating || 80}`;

  const elOppCaptain = document.getElementById('faceoff-opp-captain-name');
  if (elOppCaptain) elOppCaptain.innerText = (oTeam.lineup && oTeam.lineup[0]) ? oTeam.lineup[0].toUpperCase() : 'CAPTAIN';

  // 3. Update Stadium Name
  const elStadiumName = document.getElementById('faceoff-stadium-name');
  if (elStadiumName) {
    const stadiumSelect = document.getElementById('matchup-stadium');
    if (stadiumSelect) {
      const selectedOption = stadiumSelect.options[stadiumSelect.selectedIndex];
      elStadiumName.innerText = selectedOption ? selectedOption.text.toUpperCase() : 'MCG';
    }
  }

  // 4. Update Match Mode Title
  const elMatchMode = document.getElementById('faceoff-match-mode-title');
  if (elMatchMode) {
    elMatchMode.innerText = window.matchMode === window.MODES.PVP ? "MULTIPLAYER T20" : "T20 INTERNATIONAL";
  }

  // Re-create players in 3D scene to reflect new team jersey/colors!
  if (typeof window.createPlayers === 'function') {
    window.createPlayers();
  }
}

function createCoinTexture(text) {
  const THREE = window.THREE;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  
  // Background gradient (shiny gold)
  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, '#fef08a');   // Bright gold
  grad.addColorStop(0.7, '#eab308'); // Golden yellow
  grad.addColorStop(1, '#a16207');   // Dark gold edge
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  
  // Draw gold border rings
  ctx.strokeStyle = '#854d0e';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(128, 128, 110, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(128, 128, 98, 0, Math.PI * 2);
  ctx.stroke();
  
  // Draw the text (H or T) embossed
  ctx.font = 'bold 120px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Shadow/emboss effect
  ctx.fillStyle = '#713f12';
  ctx.fillText(text, 128 + 3, 128 + 4);
  
  ctx.fillStyle = '#fef08a';
  ctx.fillText(text, 128, 128);
  
  const texture = new THREE.CanvasTexture(canvas);
  if (THREE.SRGBColorSpace) {
    texture.colorSpace = THREE.SRGBColorSpace;
  } else if (THREE.sRGBEncoding) {
    texture.encoding = THREE.sRGBEncoding;
  }
  return texture;
}

function startTossCutscene3D() {
  const THREE = window.THREE;
  const CANNON = window.CANNON;

  window.tossCutsceneActive = true;
  window.tossCoinState = 'idle';
  window.tossCoinTimer = 0;
  window.tossCoinTime = 0;
  
  if (typeof window.setGameState === 'function') window.setGameState(window.STATES.CUTSCENE);
  randomizeConditions();

  // Hide players temporarily during toss focus (except the main umpire)
  if (window.keeperMesh) window.keeperMesh.visible = false;
  if (window.nonStrikerMesh) window.nonStrikerMesh.visible = false;
  if (window.umpireSquareLeg) window.umpireSquareLeg.visible = false;
  if (window.fielders) {
    window.fielders.forEach(f => { if (f.mesh) f.mesh.visible = false; });
  }

  // Show Umpire standing behind the toss scene to verify (upright standing, no sleeping tilt)
  if (window.umpireMain) {
    window.umpireMain.visible = true;
    window.umpireMain.position.set(0.0, 0, -10.6);
    
    // Rotate only around Y axis so he stands upright looking at the coin landing spot
    const dx = 0.0 - window.umpireMain.position.x;
    const dz = -9.2 - window.umpireMain.position.z;
    const angle = Math.atan2(dx, dz);
    window.umpireMain.rotation.set(0, angle, 0);
  }

  if (window.batsmanMesh) window.batsmanMesh.visible = true;
  if (window.bowlerMesh) window.bowlerMesh.visible = true;

  // Create 3D Coin Mesh on Pitch center (initially held in Away Captain's hand at 0.08, 0.94, -10.0)
  const geo = new THREE.CylinderGeometry(0.02, 0.02, 0.003, 32);
  
  const sideMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, metalness: 0.9, roughness: 0.15 });
  const topMat = new THREE.MeshStandardMaterial({
    map: createCoinTexture('H'),
    metalness: 0.8,
    roughness: 0.2
  });
  const bottomMat = new THREE.MeshStandardMaterial({
    map: createCoinTexture('T'),
    metalness: 0.8,
    roughness: 0.2
  });
  
  const materials = [sideMat, topMat, bottomMat];
  const coin = new THREE.Mesh(geo, materials);
  coin.castShadow = true;
  coin.position.set(0.08, 0.94, -10.0); // Held in Away Captain's hand/fingers sphere!
  window.scene.add(coin);
  window.tossCoin3D = coin;

  // Show toss panel
  const tossScreen = document.getElementById('toss-screen');
  if (tossScreen) {
    tossScreen.classList.remove('hidden');
    document.getElementById('toss-choices-container').classList.add('hidden');
    document.getElementById('toss-proceed-container').classList.add('hidden');
    
    // Hide Head/Tails buttons initially (only show while coin is in air)
    const callContainer = document.getElementById('toss-call-container');
    if (callContainer) callContainer.classList.add('hidden');
    
    // Show Flip Coin button
    const flipBtn = document.getElementById('toss-btn-flip');
    if (flipBtn) flipBtn.classList.remove('hidden');
    
    const statusText = document.getElementById('toss-status-text');
    if (statusText) statusText.innerText = 'Click FLIP COIN to toss the coin!';
  }
}

function startCoinToss() {
  if (window.tossCoinState !== 'idle') return;
  window.tossCoinState = 'flipping';
  window.tossCoinTimer = 0;
  window.tossCoinTime = 0;
  
  // Hide Flip button
  const flipBtn = document.getElementById('toss-btn-flip');
  if (flipBtn) flipBtn.classList.add('hidden');
  
  const statusText = document.getElementById('toss-status-text');
  if (statusText) statusText.innerText = 'Coin is in the air...';
  
  if (window.CricketAudio && window.CricketAudio.playHit) {
    window.CricketAudio.playHit(0.5);
  }
}

function resolveTossCall(call) {
  if (window.tossCoinState !== 'paused') return;
  window.tossCallValue = call;

  // Change state to falling
  window.tossCoinState = 'falling';
  window.tossCoinTime = 0;
  
  const callContainer = document.getElementById('toss-call-container');
  if (callContainer) callContainer.classList.add('hidden');
  
  const statusText = document.getElementById('toss-status-text');
  if (statusText) statusText.innerText = `Flipping... you called ${call.toUpperCase()}`;
}

function resolveTossDecisionUI() {
  const userTeamVal = window.MATCH.userTeam || 'IND';
  const oppTeamVal = window.MATCH.oppTeam || 'AUS';
  const userTeam = window.TEAMS[userTeamVal] || window.TEAMS.IND;
  const oppTeam = window.TEAMS[oppTeamVal] || window.TEAMS.AUS;

  const choicesContainer = document.getElementById('toss-choices-container');
  const proceedContainer = document.getElementById('toss-proceed-container');
  const statusText = document.getElementById('toss-status-text');

  const flipOutcome = Math.random() < 0.5 ? 'heads' : 'tails';
  window.tossResult = flipOutcome;
  const userWonToss = (window.tossCallValue === flipOutcome);

  // Set final coin rotation
  if (window.tossCoin3D) {
    if (flipOutcome === 'heads') {
      window.tossCoin3D.rotation.set(0, 0, 0);
    } else {
      window.tossCoin3D.rotation.set(Math.PI, 0, 0);
    }
  }

  const resultStr = flipOutcome.toUpperCase();
  const userCaptain = userTeam.lineup[0] || 'You';
  const oppCaptain = oppTeam.lineup[0] || 'Opponent';

  if (userWonToss) {
    statusText.innerText = `Landed on ${resultStr}! ${userCaptain} won the toss. Choose to Bat or Bowl first.`;
    choicesContainer.classList.remove('hidden');
    proceedContainer.classList.add('hidden');
  } else {
    const oppChoiceRoll = Math.random() < 0.5 ? 'bat' : 'bowl';
    if (oppChoiceRoll === 'bat') {
      window.MATCH.userIsBatting = false;
      window.MATCH.tossResultText = `${oppTeam.name} won the toss and elected to bat first`;
      statusText.innerText = `Landed on ${resultStr}! ${oppCaptain} won the toss and elected to BAT first.`;
    } else {
      window.MATCH.userIsBatting = true;
      window.MATCH.tossResultText = `${oppTeam.name} won the toss and elected to bowl first`;
      statusText.innerText = `Landed on ${resultStr}! ${oppCaptain} won the toss and elected to BOWL first.`;
    }
    choicesContainer.classList.add('hidden');
    proceedContainer.classList.remove('hidden');
  }
}

function proceedFromMatchIntro() {
  const introScreen = document.getElementById('match-intro-screen');
  if (introScreen && !introScreen.classList.contains('hidden')) {
    introScreen.classList.add('hidden');
    
    const oversSelect = document.getElementById('matchup-overs');
    const targetInput = document.getElementById('matchup-target');
    if (oversSelect) window.MATCH.maxBalls = parseInt(oversSelect.value) * 6;
    if (targetInput) window.MATCH.target = parseInt(targetInput.value);
    
    const stadiumSelect = document.getElementById('matchup-stadium');
    const selectedStadiumVal = stadiumSelect ? stadiumSelect.value : 'default';
    
    if (typeof window.triggerMatchLoading === 'function') {
      window.triggerMatchLoading(() => {
        window.ui.hud.style.display = 'flex';
        window.ui.hudMode.innerText = 'QUICK MATCH';
        window.matchMode = window.MODES.SOLO;
        
        window.MATCH.currentInnings = 1;
        window.MATCH.firstInningsRuns = 0;
        
        if (typeof window.restartMatch === 'function') window.restartMatch();
      }, selectedStadiumVal);
    }
  }
}

function proceedFromInningsBreak() {
  const breakScreen = document.getElementById('innings-break-screen');
  if (breakScreen && !breakScreen.classList.contains('hidden')) {
    breakScreen.classList.add('hidden');
    
    const stadiumSelect = document.getElementById('matchup-stadium');
    const selectedStadiumVal = stadiumSelect ? stadiumSelect.value : (window.currentStadiumVal || 'default');
    
    if (typeof window.triggerMatchLoading === 'function') {
      window.triggerMatchLoading(() => {
        if (typeof window.restartMatch === 'function') window.restartMatch();
      }, selectedStadiumVal);
    }
  }
}

function setupMatchSetupAndTossListeners() {
  window.addEventListener('click', (e) => {
    if (e.target.closest('#batsman-selection-screen') || e.target.closest('#prematch-batsman-selection-screen') || e.target.closest('.bowler-card') || e.target.closest('#batsman-selection-grid')) {
      return;
    }
    if (window.entranceCutsceneActive) {
      if (typeof window.skipEntranceCutscene === 'function') window.skipEntranceCutscene();
    } else if (window.wicketCutsceneActive) {
      if (window.wicketStage === 3) return;
      if (window.gameState === window.STATES.REPLAY) {
        if (window.replaySystem) window.replaySystem.stopReplay();
      } else {
        if (typeof window.skipWicketCutscene === 'function') window.skipWicketCutscene();
      }
    }
  });

  const ballTypeBtns = document.querySelectorAll('.ball-type-btn');
  ballTypeBtns.forEach(btn => {
    btn.onclick = () => {
      const type = btn.getAttribute('data-type');
      if (typeof window.selectBallType === 'function') window.selectBallType(type);
    };
  });

  // Home & Away team selector card click binds
  const panelHome = document.getElementById('faceoff-panel-home');
  if (panelHome) {
    panelHome.onclick = () => {
      if (typeof window.openTeamSelection === 'function') window.openTeamSelection('home');
    };
  }

  const panelAway = document.getElementById('faceoff-panel-away');
  if (panelAway) {
    panelAway.onclick = () => {
      if (typeof window.openTeamSelection === 'function') window.openTeamSelection('away');
    };
  }

  // Edit Lineup Button
  const editLineupBtn = document.getElementById('matchup-btn-lineup');
  if (editLineupBtn) {
    editLineupBtn.onclick = () => {
      if (typeof window.openLineupEditor === 'function') window.openLineupEditor();
    };
  }

  // Match settings modal binds
  const settingsModal = document.getElementById('match-settings-modal');
  const settingsBtnMatchup = document.getElementById('matchup-btn-settings');
  if (settingsBtnMatchup && settingsModal) {
    settingsBtnMatchup.onclick = () => {
      settingsModal.classList.remove('hidden');
    };
  }

  const closeSettingsModalBtn = document.getElementById('settings-modal-close-btn');
  if (closeSettingsModalBtn && settingsModal) {
    closeSettingsModalBtn.onclick = () => {
      settingsModal.classList.add('hidden');
      updateMatchupScreenUI();
    };
  }

  const flipBtn = document.getElementById('toss-btn-flip');
  if (flipBtn) {
    flipBtn.onclick = () => {
      startCoinToss();
    };
  }

  const headsBtn = document.getElementById('toss-btn-heads');
  if (headsBtn) {
    headsBtn.onclick = () => {
      resolveTossCall('heads');
    };
  }

  const tailsBtn = document.getElementById('toss-btn-tails');
  if (tailsBtn) {
    tailsBtn.onclick = () => {
      resolveTossCall('tails');
    };
  }

  const batBtn = document.getElementById('toss-btn-bat');
  if (batBtn) {
    batBtn.onclick = () => {
      window.MATCH.userIsBatting = true;
      const userTeamVal = window.MATCH.userTeam || 'IND';
      const userTeam = window.TEAMS[userTeamVal] || window.TEAMS.IND;
      window.MATCH.tossResultText = `${userTeam.name} won the toss and elected to bat`;
      document.getElementById('toss-status-text').innerText = `You elected to bat first.`;
      document.getElementById('toss-choices-container').classList.add('hidden');
      document.getElementById('toss-proceed-container').classList.remove('hidden');
    };
  }

  const bowlBtn = document.getElementById('toss-btn-bowl');
  if (bowlBtn) {
    bowlBtn.onclick = () => {
      window.MATCH.userIsBatting = false;
      const userTeamVal = window.MATCH.userTeam || 'IND';
      const userTeam = window.TEAMS[userTeamVal] || window.TEAMS.IND;
      window.MATCH.tossResultText = `${userTeam.name} won the toss and elected to bowl`;
      document.getElementById('toss-status-text').innerText = `You elected to bowl first.`;
      document.getElementById('toss-choices-container').classList.add('hidden');
      document.getElementById('toss-proceed-container').classList.remove('hidden');
    };
  }

  const proceedBtn = document.getElementById('toss-btn-proceed');
  if (proceedBtn) {
    proceedBtn.onclick = () => {
      document.getElementById('toss-screen').classList.add('hidden');
      
      if (window.tossCoin3D) {
        window.scene.remove(window.tossCoin3D);
        window.tossCoin3D = null;
      }
      window.tossCutsceneActive = false;

      if (window.keeperMesh) window.keeperMesh.visible = true;
      if (window.nonStrikerMesh) window.nonStrikerMesh.visible = true;
      if (window.umpireMain) {
        window.umpireMain.visible = true;
        window.umpireMain.position.set(0, 0, -23.8); // reset back to default pitch crease
        window.umpireMain.rotation.set(0, 0, 0);
      }
      if (window.umpireSquareLeg) window.umpireSquareLeg.visible = true;
      if (window.fielders) {
        window.fielders.forEach(f => { if (f.mesh) f.mesh.visible = true; });
      }

      if (window.batsmanMesh) {
        window.batsmanMesh.position.set(window.stanceX || 0.8, 0, window.BATSMAN_CREASE_Z);
        window.batsmanMesh.rotation.set(0, Math.PI / 2, 0);
        if (window.batsmanMesh.parts && window.batsmanMesh.parts.bat) {
          window.batsmanMesh.parts.bat.scale.set(1, 1, 1);
        }
        if (window.batsmanMesh.parts && window.batsmanMesh.parts.batBlade) {
          window.batsmanMesh.parts.batBlade.scale.set(1, 1, 1);
        }
        const bones = typeof window.getFBXBones === 'function' ? window.getFBXBones(window.batsmanMesh) : null;
        if (bones && bones.bat) {
          bones.bat.scale.setScalar(1);
        }
      }
      if (window.bowlerMesh) {
        window.bowlerMesh.position.set(0.6, 0, -23.2);
        window.bowlerMesh.rotation.set(0, 0, 0);
        if (window.bowlerMesh.parts && window.bowlerMesh.parts.bat) {
          window.bowlerMesh.parts.bat.scale.set(1, 1, 1);
        }
        if (window.bowlerMesh.parts && window.bowlerMesh.parts.batBlade) {
          window.bowlerMesh.parts.batBlade.scale.set(1, 1, 1);
        }
        const bones = typeof window.getFBXBones === 'function' ? window.getFBXBones(window.bowlerMesh) : null;
        if (bones && bones.bat) {
          bones.bat.scale.setScalar(1);
        }
      }

      const introScreen = document.getElementById('match-intro-screen');
      if (introScreen) {
        const userTeamVal = window.MATCH.userTeam || 'IND';
        const oppTeamVal = window.MATCH.oppTeam || 'AUS';
        const userTeam = window.TEAMS[userTeamVal] || window.TEAMS.IND;
        const oppTeam = window.TEAMS[oppTeamVal] || window.TEAMS.AUS;
        
        document.getElementById('intro-matchup-text').innerText = `${userTeam.name.toUpperCase()} VS ${oppTeam.name.toUpperCase()}`;
        
        const stadiumSelect = document.getElementById('matchup-stadium');
        const stadiumName = stadiumSelect ? stadiumSelect.options[stadiumSelect.selectedIndex].text : 'Melbourne Cricket Ground';
        document.getElementById('intro-stadium-val').innerText = stadiumName;
        
        const oversSelect = document.getElementById('matchup-overs');
        const oversVal = oversSelect ? oversSelect.options[oversSelect.selectedIndex].text : '2 Overs';
        document.getElementById('intro-overs-val').innerText = oversVal;
        
        document.getElementById('intro-toss-val').innerText = window.MATCH.tossResultText;
        
        introScreen.classList.remove('hidden');
      }
    };
  }

  const introScreen = document.getElementById('match-intro-screen');
  if (introScreen) {
    introScreen.onclick = () => {
      proceedFromMatchIntro();
    };
  }

  const breakScreen = document.getElementById('innings-break-screen');
  if (breakScreen) {
    breakScreen.onclick = () => {
      proceedFromInningsBreak();
    };
  }

  const backBtnMatchup = document.getElementById('matchup-btn-back');
  if (backBtnMatchup) {
    backBtnMatchup.onclick = () => {
      window.faceoffActive = false;
      document.getElementById('matchup-screen').classList.add('hidden');
      window.ui.mainMenu.classList.remove('hidden');
    };
  }

  const startBtnMatchup = document.getElementById('matchup-btn-start');
  if (startBtnMatchup) {
    startBtnMatchup.onclick = () => {
      window.faceoffActive = false;
      document.getElementById('matchup-screen').classList.add('hidden');
      startTossCutscene3D();
    };
  }

}

// Expose globally
window.randomizeConditions = randomizeConditions;
window.updateMatchupScreenUI = updateMatchupScreenUI;
window.startTossCutscene3D = startTossCutscene3D;
window.startCoinToss = startCoinToss;
window.resolveTossCall = resolveTossCall;
window.resolveTossDecisionUI = resolveTossDecisionUI;
window.proceedFromMatchIntro = proceedFromMatchIntro;
window.proceedFromInningsBreak = proceedFromInningsBreak;
window.setupMatchSetupAndTossListeners = setupMatchSetupAndTossListeners;
