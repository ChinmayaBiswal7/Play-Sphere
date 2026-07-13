// Wicket Batting & Celebration Cutscene Module

window.wicketCutsceneActive = false;
window.wicketCutsceneTime = 0;
window.wicketStage = 0;
window.wicketStageTime = 0;
window.outBatsmanStats = null;
window.newBatsmanName = "";

function startWicketCutscene() {
   console.log("[Wicket Cutscene] startWicketCutscene() triggered.");
   if (window.replaySystem) {
     window.replaySystem.isRecording = false;
   }
   window.wicketCutsceneActive = true;
   window.wicketCutsceneTime = 0;
   window.wicketStage = 0;
   window.wicketStageTime = 0;
   if (typeof window.setGameState === 'function') {
     window.setGameState(window.STATES.CUTSCENE);
   }

   window.umpireSignalType = 'out';
   window.umpireSignalTimer = 0;

   // Freeze ball physics
   if (window.ballBody) {
     window.ballBody.velocity.set(0, 0, 0);
     window.ballBody.angularVelocity.set(0, 0, 0);
     if (window.CANNON) {
       window.ballBody.type = window.CANNON.Body.STATIC;
     }
   }
   // Hide ball mesh
   if (window.ballMesh) {
     window.ballMesh.visible = false;
   }

   const bottomBar = document.querySelector('.hud-bottom-bar');
   if (bottomBar) bottomBar.style.display = 'none';

   // Fullscreen celebration overlay
   if (typeof window.showBroadcastCelebration === 'function') {
     if (window.MATCH.outType === 'CAUGHT') {
       window.showBroadcastCelebration('OUT!', 'CAUGHT OUT', 'out');
     } else if (window.MATCH.outType === 'BOWLED') {
       window.showBroadcastCelebration('OUT!', 'CLEAN BOWLED', 'out');
     } else {
       window.showBroadcastCelebration('OUT!', 'WICKET', 'out');
     }
   }

   const card = document.getElementById('prematch-player-card');
   if (card) card.classList.add('hidden');
   const outCard = document.getElementById('out-batsman-card');
   if (outCard) outCard.classList.add('hidden');
   const newCard = document.getElementById('new-batsman-card');
   if (newCard) newCard.classList.add('hidden');

    // Record out batsman stats
    const dismissedIdx = (window.MATCH.dismissedBatsmanIndex !== undefined) ? window.MATCH.dismissedBatsmanIndex : window.MATCH.strikerIndex;
    
    // Reset dismissedBatsmanIndex
    window.MATCH.dismissedBatsmanIndex = undefined;

    const currentStriker = window.MATCH.batters[dismissedIdx];
    if (currentStriker) {
      window.outBatsmanStats = {
        name: currentStriker.name,
        runs: currentStriker.runs,
        balls: currentStriker.balls,
        outType: window.MATCH.outType || "OUT",
        dismissedIndex: dismissedIdx
      };
      window.MATCH.dismissedPlayerNames = window.MATCH.dismissedPlayerNames || [];
      if (!window.MATCH.dismissedPlayerNames.includes(currentStriker.name)) {
        window.MATCH.dismissedPlayerNames.push(currentStriker.name);
      }
    } else {
      window.outBatsmanStats = { name: "Batsman", runs: 0, balls: 0, outType: "OUT", dismissedIndex: dismissedIdx };
    }

   // Next batsman fallback
   let newBatterName = "New Batsman";
   const nextIdx = window.MATCH.nextBatsmanIndex;
   const userTeamVal = window.MATCH.userTeam || 'IND';
   const battingTeam = window.MATCH.userIsBatting ? (window.TEAMS[userTeamVal] || window.TEAMS.IND) : null;
   const lineup = battingTeam ? battingTeam.lineup : window.BATTING_LINEUP;
   if (lineup && nextIdx < lineup.length) {
     newBatterName = lineup[nextIdx];
   }
   window.newBatsmanName = newBatterName;

   // Scatter fielders around pitch center Z = -15
   if (window.fielders) {
     window.fielders.forEach((f, idx) => {
       if (!f.mesh) return;
       const angle = (idx / window.fielders.length) * Math.PI * 2;
       f.mesh.position.set(Math.cos(angle) * 3.5, 0, -15.0 + Math.sin(angle) * 3.5);
       f.walkCycle = Math.random() * 10;
       f.state = 'idle';
       f.hasBall = false;
       f.hasTriggeredEvent = false;
     });
   }

   // Move dismissed batsman back
   if (window.batsmanMesh) {
     window.batsmanMesh.position.set(0.8, 0, 0.0);
     window.batsmanMesh.rotation.set(0, 0, 0);
   }
}

function populateBatsmenList() {
  try {
    console.log('[DEBUG] populateBatsmenList called!');
    const grid = document.getElementById('batsman-selection-grid');
    console.log('[DEBUG] batsman-selection-grid:', grid);
    if (!grid) return;
    grid.innerHTML = '';

    const userTeamVal = window.MATCH.userTeam || 'IND';
    const team = window.TEAMS[userTeamVal] || window.TEAMS.IND;
    console.log('[DEBUG] userTeamVal:', userTeamVal, 'team lineup:', team ? team.lineup : 'null');

    const nonStriker = window.MATCH.batters[1 - window.MATCH.strikerIndex]; // fallback
    const dismissedIdx = (window.outBatsmanStats && window.outBatsmanStats.dismissedIndex !== undefined)
      ? window.outBatsmanStats.dismissedIndex
      : window.MATCH.strikerIndex;
    const battingPartnerIdx = 1 - dismissedIdx;
    const battingPartner = window.MATCH.batters[battingPartnerIdx];
    const nonStrikerName = battingPartner ? battingPartner.name : '';
    console.log('[DEBUG] nonStriker:', nonStriker, 'nonStrikerName:', nonStrikerName);

    team.lineup.forEach((player) => {
      const isNonStriker = (player === nonStrikerName);
      const isDismissed = (window.MATCH.dismissedPlayerNames || []).includes(player);
      const isCurrentStriker = window.outBatsmanStats && (player === window.outBatsmanStats.name);
      const isEligible = !isNonStriker && !isDismissed && !isCurrentStriker;

      const card = document.createElement('div');
      card.className = `bowler-card ${!isEligible ? 'disabled' : ''}`;
      
      let statusText = 'READY';
      if (isDismissed) statusText = 'DISMISSED';
      else if (isNonStriker) statusText = 'BATTING';

      card.innerHTML = `
        <span>${player}</span>
        <span class="bowler-role-badge">${statusText}</span>
      `;

      if (isEligible) {
        card.addEventListener('click', (e) => {
          e.stopPropagation();
          selectNextBatsman(player);
        });

        // Sync mouse hover highlight
        card.addEventListener('mouseenter', () => {
          const eligibleCards = Array.from(grid.querySelectorAll('.bowler-card:not(.disabled)'));
          const idx = eligibleCards.indexOf(card);
          if (idx !== -1) {
            window.batsmanSelectNavHighlightIndex = idx;
            eligibleCards.forEach((c, cIdx) => {
              if (cIdx === idx) c.classList.add('nav-highlight');
              else c.classList.remove('nav-highlight');
            });
          }
        });
      }
      grid.appendChild(card);
    });

    window.batsmanSelectNavHighlightIndex = 0;
    const eligibleCards = Array.from(grid.querySelectorAll('.bowler-card:not(.disabled)'));
    if (eligibleCards.length > 0) {
      eligibleCards[0].classList.add('nav-highlight');
    }
  } catch (err) {
    console.error('[ERROR] Error in populateBatsmenList:', err);
  }
}

function selectNextBatsman(playerName) {
  window.newBatsmanName = playerName;

  const replaceIdx = (window.outBatsmanStats && window.outBatsmanStats.dismissedIndex !== undefined) ? window.outBatsmanStats.dismissedIndex : window.MATCH.strikerIndex;

  window.MATCH.batters[replaceIdx] = {
    name: playerName,
    runs: 0,
    balls: 0,
    stamina: 100
  };
  
  // Increment batsman index for subsequent wickets
  window.MATCH.nextBatsmanIndex++;

  // Recreate player models so the new batsman has the correct skin, jersey, scale, and accessories
  if (typeof window.createPlayers === 'function') {
    window.createPlayers();
    
    // Hide the newly created ball mesh so it doesn't float on the pitch during the walk-in cutscene
    if (window.ballMesh) {
      window.ballMesh.visible = false;
    }
  }

  const screen = document.getElementById('batsman-selection-screen');
  if (screen) screen.classList.add('hidden');

  window.wicketStage = 4;
  window.wicketStageTime = 0;
  console.log(`[Wicket Cutscene] Next batsman selected: ${playerName}. Transitioning to Stage 4.`);
}

function updateWicketCutscene(dt) {
  const THREE = window.THREE;
  window.wicketCutsceneTime += dt;
  
  if (window.wicketStage !== 3) {
    window.wicketStageTime += dt;
  }
  const time = window.wicketStageTime;

  // Stage 0: Umpire OUT signal close-up
  if (window.wicketStage === 0) {
    window.targetCamPos.set(0, 2.5, -20.2);
    window.targetCamLook.set(0, 1.5, -23.8);

    if (window.umpireMain) {
      if (window.umpireMain.isFBX) {
        if (typeof window.getFBXBones === 'function') {
          const bones = window.getFBXBones(window.umpireMain);
          if (bones.rightArm) bones.rightArm.rotation.set(-2.8, 0, -0.1);
          if (bones.rightForeArm) bones.rightForeArm.rotation.set(0, 0, 0);
        }
      } else if (window.umpireMain.parts) {
        window.umpireMain.parts.rightArm.rotation.set(-Math.PI * 0.92, 0, 0.05);
        window.umpireMain.parts.rightForearm.rotation.set(0, 0, 0);
        window.umpireMain.parts.leftArm.rotation.set(-0.5, 0, -0.2);
        window.umpireMain.parts.leftForearm.rotation.set(0.8, 0, 0);
      }
    }

    if (time >= 4.0) {
      window.wicketStage = 1;
      window.wicketStageTime = 0;
      console.log("[Wicket Cutscene] Stage 0 completed. Transitioning to Stage 1 (Celebration).");
    }
  }
  // Stage 1: Team Celebration Grouping Orbit
  else if (window.wicketStage === 1) {
    if (time < 0.5 && window.fielderRetrieved) {
      window.fielderRetrieved = null;
    }

    if (window.fielders) {
      window.fielders.forEach((f, idx) => {
        if (!f.mesh) return;
        const angle = (idx / window.fielders.length) * Math.PI * 2;
        const dest = new THREE.Vector3(Math.cos(angle) * 1.8, 0, -15.0 + Math.sin(angle) * 1.8);
        const dist = f.mesh.position.distanceTo(dest);
        if (dist > 0.4) {
          const dir = new THREE.Vector3().subVectors(dest, f.mesh.position).normalize();
          f.mesh.position.addScaledVector(dir, 5.0 * dt);
          f.mesh.lookAt(dest);
          f.walkCycle += dt * 14;
          if (f.mesh.parts && !f.isFBX) {
            const cycle = f.walkCycle;
            if (f.mesh.parts.leftLeg) f.mesh.parts.leftLeg.rotation.x = Math.sin(cycle) * 0.7;
            if (f.mesh.parts.rightLeg) f.mesh.parts.rightLeg.rotation.x = Math.sin(cycle + Math.PI) * 0.7;
            if (f.mesh.parts.leftArm) f.mesh.parts.leftArm.rotation.x = Math.sin(cycle + Math.PI) * 0.7;
            if (f.mesh.parts.rightArm) f.mesh.parts.rightArm.rotation.x = Math.sin(cycle) * 0.7;
          }
        } else {
          // Face inward towards the huddle center
          f.mesh.lookAt(0, 0, -15.0);
          f.walkCycle += dt * 18;
          f.mesh.position.y = Math.max(0, Math.sin(f.walkCycle) * 0.35); // Hop in place
          if (f.mesh.parts && !f.isFBX) {
            if (f.mesh.parts.leftArm) f.mesh.parts.leftArm.rotation.set(-2.0, 0, 0.4);
            if (f.mesh.parts.rightArm) f.mesh.parts.rightArm.rotation.set(-2.0, 0, -0.4);
            if (f.mesh.parts.leftLeg) f.mesh.parts.leftLeg.rotation.x = 0;
            if (f.mesh.parts.rightLeg) f.mesh.parts.rightLeg.rotation.x = 0;
          }
        }
      });
    }

    const angle = time * 0.6;
    window.targetCamPos.set(Math.sin(angle) * 7.5, 2.5, -15.0 + Math.cos(angle) * 7.5);
    window.targetCamLook.set(0, 1.2, -15.0);

    if (time >= 5.0) {
      if (window.replaySystem) {
        window.replaySystem.startReplay(() => {
          window.wicketStage = 2;
          window.wicketStageTime = 0;
          console.log("[Wicket Cutscene] Replay completed. Resetting fielders. Transitioning to Stage 2 (Walkoff).");
          if (window.fielders) {
            window.fielders.forEach(f => {
              if (!f.mesh) return;
              f.mesh.position.copy(f.startPos || f.homePosition);
              f.mesh.position.y = 0;
              f.mesh.lookAt(0, 0, 0);
              if (f.mesh.parts && !f.isFBX) {
                if (f.mesh.parts.leftLeg) f.mesh.parts.leftLeg.rotation.x = 0;
                if (f.mesh.parts.rightLeg) f.mesh.parts.rightLeg.rotation.x = 0;
                if (f.mesh.parts.leftArm) f.mesh.parts.leftArm.rotation.set(0.1, 0, 0);
                if (f.mesh.parts.rightArm) f.mesh.parts.rightArm.rotation.set(0.1, 0, 0);
              }
            });
          }
          window.setGameState(window.STATES.CUTSCENE);
        });
      } else {
        window.wicketStage = 2;
        window.wicketStageTime = 0;
        console.log("[Wicket Cutscene] Stage 1 completed. Resetting fielders. Transitioning to Stage 2 (Walkoff).");
        if (window.fielders) {
          window.fielders.forEach(f => {
            if (!f.mesh) return;
            f.mesh.position.copy(f.startPos || f.homePosition);
            f.mesh.position.y = 0;
            f.mesh.lookAt(0, 0, 0);
            if (f.mesh.parts && !f.isFBX) {
              if (f.mesh.parts.leftLeg) f.mesh.parts.leftLeg.rotation.x = 0;
              if (f.mesh.parts.rightLeg) f.mesh.parts.rightLeg.rotation.x = 0;
              if (f.mesh.parts.leftArm) f.mesh.parts.leftArm.rotation.set(0.1, 0, 0);
              if (f.mesh.parts.rightArm) f.mesh.parts.rightArm.rotation.set(0.1, 0, 0);
            }
          });
        }
      }
    }
  }
  // Stage 2: Out batsman walkoff + display scoreboard card
  else if (window.wicketStage === 2) {
    const dismissedIdx = (window.outBatsmanStats && window.outBatsmanStats.dismissedIndex !== undefined) ? window.outBatsmanStats.dismissedIndex : window.MATCH.strikerIndex;
    const walkoffMesh = (dismissedIdx === window.MATCH.strikerIndex) ? window.batsmanMesh : window.nonStrikerMesh;

    if (walkoffMesh) {
      walkoffMesh.position.z += 3.8 * dt; // walk away towards boundary
      walkoffMesh.rotation.set(0, 0, 0); // face positive Z (boundary/pavilion) to walk forward
      if (walkoffMesh.isFBX && typeof walkoffMesh.playAnimation === 'function') {
        walkoffMesh.playAnimation('walk', { crossFade: 0.2, timeScale: 1.0 });
        if (window.FBXPlayers && typeof window.FBXPlayers.getBone === 'function') {
          const hips = window.FBXPlayers.getBone(walkoffMesh, 'Hips');
          if (hips) hips.rotation.set(0, 0, 0); // reset hips rotation from sideways stance
        }
      }
      const walkTime = window.wicketCutsceneTime * 12;
      try {
        if (!walkoffMesh.isFBX && walkoffMesh.parts) {
          if (walkoffMesh.parts.leftLeg) walkoffMesh.parts.leftLeg.rotation.x = Math.sin(walkTime) * 0.5;
          if (walkoffMesh.parts.rightLeg) walkoffMesh.parts.rightLeg.rotation.x = Math.sin(walkTime + Math.PI) * 0.5;
          if (walkoffMesh.parts.leftArm) walkoffMesh.parts.leftArm.rotation.x = -Math.sin(walkTime + Math.PI) * 0.3;
          if (walkoffMesh.parts.rightArm) walkoffMesh.parts.rightArm.rotation.x = -Math.sin(walkTime) * 0.3;
        }
      } catch(e) { /* FBX mesh — skip */ }
    }

    if (walkoffMesh) {
      const bp = walkoffMesh.position;
      window.targetCamPos.set(bp.x + 2.5, 1.4, bp.z + 4.2);
      window.targetCamLook.set(bp.x, 1.2, bp.z);
    }

    const outCard = document.getElementById('out-batsman-card');
    if (outCard && outCard.classList.contains('hidden') && window.outBatsmanStats) {
      outCard.classList.remove('hidden');
      
      const nameEl = document.getElementById('out-player-name');
      if (nameEl) nameEl.innerText = window.outBatsmanStats.name.toUpperCase();
      
      const dismissalEl = document.getElementById('out-dismissal-info');
      if (dismissalEl) {
        const outType = window.outBatsmanStats.outType;
        if (outType === 'CAUGHT') {
          dismissalEl.innerText = `c Fielder b ${window.MATCH.bowlerName}`;
        } else if (outType === 'BOWLED') {
          dismissalEl.innerText = `b ${window.MATCH.bowlerName}`;
        } else if (outType === 'LBW') {
          dismissalEl.innerText = `lbw b ${window.MATCH.bowlerName}`;
        } else if (outType === 'RUN OUT') {
          dismissalEl.innerText = `run out`;
        } else {
          dismissalEl.innerText = `out`;
        }
      }
      
      const runsEl = document.getElementById('out-player-runs');
      if (runsEl) runsEl.innerText = window.outBatsmanStats.runs;
      
      const ballsEl = document.getElementById('out-player-balls');
      if (ballsEl) ballsEl.innerText = window.outBatsmanStats.balls;

      const runs = window.outBatsmanStats.runs;
      const balls = window.outBatsmanStats.balls;
      const sr = balls > 0 ? ((runs / balls) * 100).toFixed(1) : "0.0";
      const srEl = document.getElementById('out-player-sr');
      if (srEl) srEl.innerText = sr;
    }

    if (time >= 5.0) {
      try {
        window.wicketStage = 3;
        window.wicketStageTime = 0;
        console.log("[DEBUG] Stage 2 completed. Transitioning to Stage 3 (Batsman Selection).");
        
        const outCardClose = document.getElementById('out-batsman-card');
        if (outCardClose) outCardClose.classList.add('hidden');

        console.log('[DEBUG] userIsBatting:', window.MATCH.userIsBatting);
        if (window.MATCH.userIsBatting) {
          const screen = document.getElementById('batsman-selection-screen');
          console.log('[DEBUG] batsman-selection-screen:', screen);
          if (screen) {
            screen.classList.remove('hidden');
            console.log('[DEBUG] batsman-selection-screen classList after remove:', screen.className);
          }
          populateBatsmenList();
        } else {
          // AI auto selection
          const oppTeamVal = window.MATCH.oppTeam || 'AUS';
          const oppTeam = window.TEAMS[oppTeamVal] || window.TEAMS.AUS;
          const nonStriker = window.MATCH.batters[1 - window.MATCH.strikerIndex];
          const nonStrikerName = nonStriker ? nonStriker.name : '';
          
          let selectedPlayer = null;
          for (let i = 0; i < oppTeam.lineup.length; i++) {
            const player = oppTeam.lineup[i];
            const isNonStriker = (player === nonStrikerName);
            const isDismissed = (window.MATCH.dismissedPlayerNames || []).includes(player);
            const isCurrentStriker = window.outBatsmanStats && (player === window.outBatsmanStats.name);
            
            if (!isNonStriker && !isDismissed && !isCurrentStriker) {
              selectedPlayer = player;
              break;
            }
          }
          if (!selectedPlayer) selectedPlayer = "AI Batsman";
          selectNextBatsman(selectedPlayer);
        }
      } catch (e) {
        console.error('[CRITICAL ERROR] Error transitioning from Stage 2 to Stage 3:', e);
      }
    }
  }
  // Stage 3: Batsman Selection Sidebar (UI open - waiting for selectNextBatsman click)
  else if (window.wicketStage === 3) {
    window.targetCamPos.set(0.8, 1.4, 16.0);
    window.targetCamLook.set(0.8, 1.2, 0.0);
  }
  // Stage 4: New batsman walks in
  else if (window.wicketStage === 4) {
    if (time < 2.5) {
      const newCard = document.getElementById('new-batsman-card');
      if (newCard && newCard.classList.contains('hidden')) {
        newCard.classList.remove('hidden');
        const nameEl = document.getElementById('new-player-name');
        if (nameEl) nameEl.innerText = window.newBatsmanName.toUpperCase();
      }
      const defaultCard = document.getElementById('prematch-player-card');
      if (defaultCard) defaultCard.classList.add('hidden');
    } else {
      const newCard = document.getElementById('new-batsman-card');
      if (newCard) newCard.classList.add('hidden');

      const defaultCard = document.getElementById('prematch-player-card');
      if (defaultCard && defaultCard.classList.contains('hidden')) {
        if (typeof window.updatePlayerCardUI === 'function') {
          window.updatePlayerCardUI(window.newBatsmanName, false, window.MATCH.userTeam);
        }
      }
    }

    const dismissedIdx = (window.outBatsmanStats && window.outBatsmanStats.dismissedIndex !== undefined) ? window.outBatsmanStats.dismissedIndex : window.MATCH.strikerIndex;
    const walkinMesh = (dismissedIdx === window.MATCH.strikerIndex) ? window.batsmanMesh : window.nonStrikerMesh;
    const targetZ = (dismissedIdx === window.MATCH.strikerIndex) ? 0.0 : (window.nonStrikerStartZ || -21.2);
    const targetX = (dismissedIdx === window.MATCH.strikerIndex) ? (window.stanceX || 0.8) : -1.2;

    if (walkinMesh) {
      if (time < 0.1) {
        walkinMesh.position.set(targetX, 0, 32.0);
      }

      if (walkinMesh.position.z > targetZ) {
        walkinMesh.position.z -= 4.8 * dt;
        walkinMesh.rotation.set(0, Math.PI, 0); // face negative Z (toward stumps/crease) while walking from boundary
        if (walkinMesh.isFBX && typeof walkinMesh.playAnimation === 'function') {
          walkinMesh.playAnimation('walk', { crossFade: 0.2, timeScale: 1.0 });
          if (window.FBXPlayers && typeof window.FBXPlayers.getBone === 'function') {
            const hips = window.FBXPlayers.getBone(walkinMesh, 'Hips');
            if (hips) hips.rotation.set(0, 0, 0); // reset hips rotation from sideways stance
          }
        }
        const cycle = window.wicketCutsceneTime * 12;
        try {
          if (!walkinMesh.isFBX && walkinMesh.parts) {
            if (walkinMesh.parts.leftLeg) walkinMesh.parts.leftLeg.rotation.x = Math.sin(cycle) * 0.5;
            if (walkinMesh.parts.rightLeg) walkinMesh.parts.rightLeg.rotation.x = Math.sin(cycle + Math.PI) * 0.5;
            if (walkinMesh.parts.leftArm) walkinMesh.parts.leftArm.rotation.x = Math.sin(cycle + Math.PI) * 0.3;
            if (walkinMesh.parts.rightArm) walkinMesh.parts.rightArm.rotation.x = Math.sin(cycle) * 0.3;
          }
        } catch(e) { /* FBX mesh — skip */ }
      } else {
        walkinMesh.position.set(targetX, 0, targetZ);
        if (dismissedIdx === window.MATCH.strikerIndex) {
          walkinMesh.rotation.set(0, Math.PI / 2, 0); // sideways batting stance
        } else {
          walkinMesh.rotation.set(0, 0, 0); // front-on stance
        }
        if (walkinMesh.isFBX && typeof walkinMesh.playAnimation === 'function') {
          walkinMesh.playAnimation('idle', { crossFade: 0.2 });
        }
        if (!walkinMesh.isFBX && walkinMesh.parts) {
          if (walkinMesh.parts.leftLeg) walkinMesh.parts.leftLeg.rotation.x = 0;
          if (walkinMesh.parts.rightLeg) walkinMesh.parts.rightLeg.rotation.x = 0;
        }
      }
    }

    if (walkinMesh) {
      const bp = walkinMesh.position;
      window.targetCamPos.set(bp.x - 2.5, 1.4, bp.z - 4.2);
      window.targetCamLook.set(bp.x, 1.2, bp.z);
    }

    if (time >= 5.0) {
      window.wicketStage = 5;
      window.wicketStageTime = 0;
      console.log("[Wicket Cutscene] Stage 4 completed. Proceeding to skipWicketCutscene().");
      skipWicketCutscene();
    }
  }
}

function skipWicketCutscene() {
  if (!window.wicketCutsceneActive) return;
  if (window.wicketStage === 3) {
    console.log("[Wicket Cutscene] skipWicketCutscene() ignored: User must select next batsman.");
    return;
  }

  // If user is batting and we haven't selected the batsman yet (Stages 0, 1, 2)
  if (window.MATCH.userIsBatting && window.wicketStage < 3) {
    console.log("[Wicket Cutscene] User is batting, skipping visual cutscene directly to batsman selection screen.");
    window.wicketStage = 3;
    window.wicketStageTime = 0;
    
    const outCard = document.getElementById('out-batsman-card');
    if (outCard) outCard.classList.add('hidden');
    
    // Hide broadcast overlay celebration banner if any
    const bo = document.getElementById('broadcast-overlay');
    if (bo) bo.classList.add('hidden');
    if (window.ui && window.ui.broadcastOverlay) {
      window.ui.broadcastOverlay.classList.add('hidden');
    }

    const selectionScreen = document.getElementById('batsman-selection-screen');
    if (selectionScreen) selectionScreen.classList.remove('hidden');
    populateBatsmenList();
    return;
  }

  // If user is bowling and we haven't auto-selected the AI batsman yet (Stages 0, 1, 2)
  if (!window.MATCH.userIsBatting && window.wicketStage < 3) {
    console.log("[Wicket Cutscene] AI is batting, auto-selecting new batsman and skipping cutscene.");
    const oppTeamVal = window.MATCH.oppTeam || 'AUS';
    const oppTeam = window.TEAMS[oppTeamVal] || window.TEAMS.AUS;
    
    const dismissedIdx = (window.outBatsmanStats && window.outBatsmanStats.dismissedIndex !== undefined) 
      ? window.outBatsmanStats.dismissedIndex 
      : window.MATCH.strikerIndex;
    const nonStriker = window.MATCH.batters[1 - dismissedIdx];
    const nonStrikerName = nonStriker ? nonStriker.name : '';
    
    let selectedPlayer = null;
    for (let i = 0; i < oppTeam.lineup.length; i++) {
      const player = oppTeam.lineup[i];
      const isNonStriker = (player === nonStrikerName);
      const isDismissed = (window.MATCH.dismissedPlayerNames || []).includes(player);
      const isCurrentStriker = window.outBatsmanStats && (player === window.outBatsmanStats.name);
      
      if (!isNonStriker && !isDismissed && !isCurrentStriker) {
        selectedPlayer = player;
        break;
      }
    }
    if (!selectedPlayer) selectedPlayer = "AI Batsman";
    selectNextBatsman(selectedPlayer);
    
    // Skip Stage 4 walk-in too
    window.wicketStage = 5; 
  }

  console.log("[Wicket Cutscene] skipWicketCutscene() called. Resuming play.");
  window.wicketCutsceneActive = false;

  window.umpireSignalType = null;

  const outCard = document.getElementById('out-batsman-card');
  if (outCard) outCard.classList.add('hidden');
  const newCard = document.getElementById('new-batsman-card');
  if (newCard) newCard.classList.add('hidden');
  const defaultCard = document.getElementById('prematch-player-card');
  if (defaultCard) defaultCard.classList.add('hidden');
  const selectionScreen = document.getElementById('batsman-selection-screen');
  if (selectionScreen) selectionScreen.classList.add('hidden');
  if (window.ui && window.ui.broadcastOverlay) {
    window.ui.broadcastOverlay.classList.add('hidden');
  }

  if (typeof window.snapBatsmenToCreases === 'function') {
    window.snapBatsmenToCreases();
  }

  // Restore fielders to home
  if (window.fielders) {
    window.fielders.forEach(f => {
      if (!f.mesh) return;
      f.mesh.position.copy(f.startPos || f.homePosition);
      f.mesh.position.y = 0;
      f.mesh.lookAt(0, 0, 0);
      if (f.mesh.parts && !f.isFBX) {
        if (f.mesh.parts.leftLeg) f.mesh.parts.leftLeg.rotation.x = 0;
        if (f.mesh.parts.rightLeg) f.mesh.parts.rightLeg.rotation.x = 0;
        if (f.mesh.parts.leftArm) f.mesh.parts.leftArm.rotation.set(0.1, 0, 0);
        if (f.mesh.parts.rightArm) f.mesh.parts.rightArm.rotation.set(0.1, 0, 0);
      }
      f.state = 'idle';
      f.hasBall = false;
      f.hasTriggeredEvent = false;
    });
  }

  if (window.ballMesh) {
    window.ballMesh.visible = true;
  }

  if (window.ui && window.ui.hud) {
    window.ui.hud.style.display = 'flex';
  }
  const bottomBar = document.querySelector('.hud-bottom-bar');
  if (bottomBar) bottomBar.style.display = 'flex';

  if (typeof window.setGameState === 'function') {
    window.setGameState(window.STATES.RESULT);
  }
}

// Expose globally
window.startWicketCutscene = startWicketCutscene;
window.populateBatsmenList = populateBatsmenList;
window.selectNextBatsman = selectNextBatsman;
window.updateWicketCutscene = updateWicketCutscene;
window.skipWicketCutscene = skipWicketCutscene;
