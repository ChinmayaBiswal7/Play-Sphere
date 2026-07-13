// Decision Review System (DRS) & LBW Cutscene Module

window.drsActive = false;
window.drsTimer = 10;
window.drsTimerActive = false;
window.drsState = 'idle'; // 'appeal', 'discuss', 'review', 'resolved'
window.drsStageTime = 0;
window.drsReviewTimer = 0;
window.drsDecision = 'OUT'; // 'OUT' or 'NOT OUT'
window.drsReviewsLeft = { user: 2, opp: 2 };

// Trajectory and Pitch Line objects
window.drsPitchLine = null;
window.drsBallTrail = null;
window.drsVirtualBall = null;
window.drsProjectedTrail = null;

function getReviewingTeam() {
  const isOut = (window.drsDecision === 'OUT');
  if (isOut) {
    // Batting team reviews
    return window.MATCH.userIsBatting ? 'user' : 'opp';
  } else {
    // Fielding team reviews
    return window.MATCH.userIsBatting ? 'opp' : 'user';
  }
}

function initDRSState() {
  if (window.MATCH) {
    if (window.MATCH.userReviewsLeft === undefined) window.MATCH.userReviewsLeft = 2;
    if (window.MATCH.oppReviewsLeft === undefined) window.MATCH.oppReviewsLeft = 2;
  }
}

function triggerLBWAppeal(pitchingStatus, impactStatus, wicketStatus, hitsStumps, finalDecision) {
  console.log(`[DRS] LBW appeal triggered! Pitching: ${pitchingStatus}, Impact: ${impactStatus}, Wickets: ${wicketStatus}, Hits: ${hitsStumps}, Decision: ${finalDecision}`);
  initDRSState();

  window.drsActive = true;
  window.drsState = 'discuss'; // Directly start in discuss mode
  window.drsStageTime = 0;
  window.drsTimer = 10;
  window.drsTimerActive = false;
  window.drsDecision = finalDecision;
  window.drsAITimer = 2.5; // AI decision cooldown during discuss state

  // Store variables for the DRS graphics
  window.drsData = {
    pitching: pitchingStatus,
    impact: impactStatus,
    wickets: wicketStatus,
    hits: hitsStumps,
    decision: finalDecision
  };

  if (typeof window.setGameState === 'function') {
    window.setGameState(window.STATES.CUTSCENE);
  }

  // Freeze ball physics
  if (window.ballBody) {
    window.ballBody.velocity.set(0, 0, 0);
    window.ballBody.angularVelocity.set(0, 0, 0);
    if (window.CANNON) {
      window.ballBody.type = window.CANNON.Body.STATIC;
    }
  }
  if (window.ballMesh) {
    window.ballMesh.visible = false;
  }

  // Prevent camera snap to umpire
  window.umpireSignalType = null;
  window.umpireSignalTimer = 999;
  
  if (window.CricketAudio && window.CricketAudio.playBowled) {
    window.CricketAudio.playGasp();
  }

  // Hide bottom HUD
  const bottomBar = document.querySelector('.hud-bottom-bar');
  if (bottomBar) bottomBar.style.display = 'none';

  // Force fielders to idle
  if (window.fielders) {
    window.fielders.forEach(f => {
      f.state = 'idle';
    });
  }
}

function updateLineGeometry(lineMesh, points) {
  if (!lineMesh || !points || points.length === 0) return;
  const geometry = lineMesh.geometry;
  const positionAttribute = geometry.getAttribute('position');
  
  for (let i = 0; i < points.length; i++) {
    positionAttribute.setXYZ(i, points[i].x, points[i].y, points[i].z);
  }
  positionAttribute.needsUpdate = true;
  geometry.setDrawRange(0, points.length);
}

function updateDRSSystem(dt) {
  if (!window.drsActive) return;
  window.drsStageTime += dt;
  const THREE = window.THREE;

  // 1. Appeal Phase (Bypassed by default, but left for safety)
  if (window.drsState === 'appeal') {
    window.targetCamPos.set(0, 2.5, -20.2);
    window.targetCamLook.set(0, 1.5, -23.8);

    if (window.drsStageTime >= 0.1) {
      window.drsState = 'discuss';
      window.drsStageTime = 0;
      const bo = document.getElementById('broadcast-overlay');
      if (bo) bo.classList.add('hidden');
    }
  }

  // 2. Discussion Phase: Batsmen walk to pitch center, discuss, and show 10s review card
  else if (window.drsState === 'discuss') {
    let strikerReached = false;
    let nonStrikerReached = false;

    // Move Striker to Z = -9.2
    if (window.batsmanMesh) {
      const pos = window.batsmanMesh.position;
      const targetZ = -9.2;
      const targetX = 0.0;
      const dx = targetX - pos.x;
      const dz = targetZ - pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > 0.15) {
        const angle = Math.atan2(dx, dz);
        window.batsmanMesh.rotation.set(0, angle, 0);
        pos.x += Math.sin(angle) * 2.8 * dt;
        pos.z += Math.cos(angle) * 2.8 * dt;

        if (window.batsmanMesh.isFBX && typeof window.batsmanMesh.playAnimation === 'function') {
          window.batsmanMesh.playAnimation('walk', { crossFade: 0.2 });
        }
        const cycle = window.drsStageTime * 12;
        if (!window.batsmanMesh.isFBX && window.batsmanMesh.parts) {
          if (window.batsmanMesh.parts.leftLeg) window.batsmanMesh.parts.leftLeg.rotation.x = Math.sin(cycle) * 0.5;
          if (window.batsmanMesh.parts.rightLeg) window.batsmanMesh.parts.rightLeg.rotation.x = Math.sin(cycle + Math.PI) * 0.5;
        }
      } else {
        strikerReached = true;
        // Face non-striker
        window.batsmanMesh.rotation.set(0, Math.PI, 0);
        if (window.batsmanMesh.isFBX && typeof window.batsmanMesh.playAnimation === 'function') {
          window.batsmanMesh.playAnimation('idle', { crossFade: 0.2 });
        }
        if (!window.batsmanMesh.isFBX && window.batsmanMesh.parts) {
          if (window.batsmanMesh.parts.leftLeg) window.batsmanMesh.parts.leftLeg.rotation.x = 0;
          if (window.batsmanMesh.parts.rightLeg) window.batsmanMesh.parts.rightLeg.rotation.x = 0;
        }
      }
    } else {
      strikerReached = true;
    }

    // Move Non-Striker to Z = -10.8
    if (window.nonStrikerMesh) {
      const pos = window.nonStrikerMesh.position;
      const targetZ = -10.8;
      const targetX = 0.0;
      const dx = targetX - pos.x;
      const dz = targetZ - pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > 0.15) {
        const angle = Math.atan2(dx, dz);
        window.nonStrikerMesh.rotation.set(0, angle, 0);
        pos.x += Math.sin(angle) * 2.8 * dt;
        pos.z += Math.cos(angle) * 2.8 * dt;

        if (window.nonStrikerMesh.isFBX && typeof window.nonStrikerMesh.playAnimation === 'function') {
          window.nonStrikerMesh.playAnimation('walk', { crossFade: 0.2 });
        }
        const cycle = window.drsStageTime * 12;
        if (!window.nonStrikerMesh.isFBX && window.nonStrikerMesh.parts) {
          if (window.nonStrikerMesh.parts.leftLeg) window.nonStrikerMesh.parts.leftLeg.rotation.x = Math.sin(cycle) * 0.5;
          if (window.nonStrikerMesh.parts.rightLeg) window.nonStrikerMesh.parts.rightLeg.rotation.x = Math.sin(cycle + Math.PI) * 0.5;
        }
      } else {
        nonStrikerReached = true;
        // Face striker
        window.nonStrikerMesh.rotation.set(0, 0, 0);
        if (window.nonStrikerMesh.isFBX && typeof window.nonStrikerMesh.playAnimation === 'function') {
          window.nonStrikerMesh.playAnimation('idle', { crossFade: 0.2 });
        }
        if (!window.nonStrikerMesh.isFBX && window.nonStrikerMesh.parts) {
          if (window.nonStrikerMesh.parts.leftLeg) window.nonStrikerMesh.parts.leftLeg.rotation.x = 0;
          if (window.nonStrikerMesh.parts.rightLeg) window.nonStrikerMesh.parts.rightLeg.rotation.x = 0;
        }
      }
    } else {
      nonStrikerReached = true;
    }

    // Set camera to frame both discussing batsmen
    window.targetCamPos.set(4.0, 1.8, -10.0);
    window.targetCamLook.set(0, 1.2, -10.0);

    // Show prompt when both reach center
    if (strikerReached && nonStrikerReached) {
      const reviewingTeam = getReviewingTeam();
      const reviewsCount = (reviewingTeam === 'user') ? window.MATCH.userReviewsLeft : window.MATCH.oppReviewsLeft;
      const isAIReview = (reviewingTeam === 'opp');

      if (!window.drsTimerActive) {
        window.drsTimerActive = true;
        window.drsTimer = 10.0;
        
        // Show review prompt card
        const card = document.getElementById('drs-prompt-card');
        if (card) {
          card.classList.remove('hidden');
          
          const promptText = card.querySelector('.drs-prompt-text');
          const approveBtn = document.getElementById('drs-btn-approve');
          const declineBtn = document.getElementById('drs-btn-decline');

          if (isAIReview) {
            if (promptText) {
              promptText.innerText = (window.drsDecision === 'OUT') ? "AI BATSMAN DECIDING..." : "AI BOWLER DECIDING...";
            }
            if (approveBtn) {
              approveBtn.innerText = `AI DISCUSSING... [${reviewsCount} LEFT]`;
              approveBtn.disabled = true;
              approveBtn.style.opacity = '0.7';
              approveBtn.style.cursor = 'wait';
            }
            if (declineBtn) {
              declineBtn.style.display = 'none';
            }
          } else {
            if (promptText) {
              promptText.innerText = "CHALLENGE UMPIRE'S DECISION?";
            }
            if (approveBtn) {
              approveBtn.innerText = `DRS REVIEW (SPACE) [${reviewsCount} LEFT]`;
              if (reviewsCount <= 0) {
                approveBtn.disabled = true;
                approveBtn.style.opacity = '0.5';
                approveBtn.style.cursor = 'not-allowed';
              } else {
                approveBtn.disabled = false;
                approveBtn.style.opacity = '1.0';
                approveBtn.style.cursor = 'pointer';
              }
            }
            if (declineBtn) {
              declineBtn.style.display = 'inline-block';
              declineBtn.disabled = false;
              declineBtn.style.opacity = '1.0';
              declineBtn.style.cursor = 'pointer';
            }
          }
        }
        
        // Setup click listeners
        const approveBtn = document.getElementById('drs-btn-approve');
        if (approveBtn) {
          approveBtn.onclick = (e) => {
            e.stopPropagation();
            if (!isAIReview) startDRSReview();
          };
        }
        const declineBtn = document.getElementById('drs-btn-decline');
        if (declineBtn) {
          declineBtn.onclick = (e) => {
            e.stopPropagation();
            if (!isAIReview) declineDRSReview();
          };
        }
      }

      if (isAIReview) {
        window.drsAITimer -= dt;
        if (window.drsAITimer <= 0) {
          window.drsAITimer = 999; // prevent double trigger
          if (reviewsCount <= 0) {
            declineDRSReview();
          } else {
            const hits = window.drsData.hits;
            const wickets = window.drsData.wickets;
            const pitching = window.drsData.pitching;
            const impact = window.drsData.impact;
            
            let reviewProbability = 0.5;
            
            if (window.drsDecision === 'OUT') {
              if (!hits || pitching === 'OUTSIDE LEG' || (impact === 'OUTSIDE' && !window.MATCH.aiIsDefensive)) {
                reviewProbability = 0.85;
              } else if (wickets === 'UMPIRE\'S CALL') {
                reviewProbability = 0.35;
              } else {
                reviewProbability = 0.05;
              }
            } else {
              if (hits && pitching !== 'OUTSIDE LEG' && (impact !== 'OUTSIDE' || window.MATCH.aiIsDefensive)) {
                reviewProbability = 0.85;
              } else if (wickets === 'UMPIRE\'S CALL') {
                reviewProbability = 0.30;
              } else {
                reviewProbability = 0.05;
              }
            }
            
            const roll = Math.random();
            const doReview = (roll < reviewProbability);
            if (doReview) {
              startDRSReview();
            } else {
              declineDRSReview();
            }
          }
        }
      } else {
        window.drsTimer -= dt;
        if (window.drsTimer <= 0) {
          window.drsTimer = 0;
          declineDRSReview();
        }

        if (window.keys && window.keys.space) {
          window.keys.space = false;
          if (reviewsCount > 0) {
            startDRSReview();
          }
        }
        if (window.keys && window.keys.x) {
          window.keys.x = false;
          declineDRSReview();
        }
      }

      const timerVal = document.getElementById('drs-timer-value');
      if (timerVal) timerVal.innerText = Math.ceil(window.drsTimer);
      
      const progressPath = document.getElementById('drs-timer-progress');
      if (progressPath) {
        const dashValue = (window.drsTimer / 10.0) * 100;
        progressPath.style.strokeDasharray = `${dashValue}, 100`;
      }
    }
  }

  // 3. Review Tracking Cutscene Phase (Dynamic step-by-step trajectory review)
  else if (window.drsState === 'review') {
    window.drsReviewTimer += dt;
    const t = window.drsReviewTimer;

    // HIDE players/fielders/umpire to show only the pitch/stumps/ball
    hideAllPlayersForReview(true);

    const history = window.MATCH.ballPathHistory || [];
    const projPoints = window.drsProjPoints || [];
    const bounceIdx = window.drsBounceIdx || 0;

    const pitchingCard = document.getElementById('drs-panel-pitching');
    const impactCard = document.getElementById('drs-panel-impact');
    const wicketsCard = document.getElementById('drs-panel-wickets');
    const finalCard = document.getElementById('drs-final-card');

    // Phase 1: Release to Bounce (0 to 3.0s)
    if (t < 3.0) {
      const alpha = t / 3.0;
      const idx = Math.min(Math.floor(alpha * bounceIdx), bounceIdx);
      const currentPoint = history[idx];
      if (currentPoint && window.drsVirtualBall) {
        window.drsVirtualBall.position.copy(currentPoint);
        updateLineGeometry(window.drsBallTrail, history.slice(0, idx + 1));
      }

      // Camera: smoothly rotate from side-on to top-down view above bounce point
      if (history[bounceIdx]) {
        const bounceZ = history[bounceIdx].z;
        const camAlpha = Math.min(1.0, alpha * 1.15); // complete slightly early
        window.targetCamPos.lerpVectors(new THREE.Vector3(6.5, 2.0, -15.0), new THREE.Vector3(0, 6.5, bounceZ), camAlpha);
        window.targetCamLook.lerpVectors(new THREE.Vector3(0, 0.8, -10.0), new THREE.Vector3(0, 0.05, bounceZ), camAlpha);
      }
    }
    
    // Phase 1 Pause / Landing Check (3.0s to 4.5s)
    else if (t < 4.5) {
      if (history[bounceIdx] && window.drsVirtualBall) {
        window.drsVirtualBall.position.copy(history[bounceIdx]);
        updateLineGeometry(window.drsBallTrail, history.slice(0, bounceIdx + 1));
      }

      // Resolve Pitching card
      if (pitchingCard && pitchingCard.classList.contains('pending')) {
        pitchingCard.classList.remove('pending');
        pitchingCard.classList.add('show');
        const valEl = pitchingCard.querySelector('.drs-item-value');
        const status = window.drsData.pitching;
        if (valEl) valEl.innerText = status;
        if (status === 'IN LINE') pitchingCard.classList.add('inline-green');
        else if (status === 'OUTSIDE OFF') pitchingCard.classList.add('outside-blue');
        else pitchingCard.classList.add('outside-red');
        
        if (window.CricketAudio && window.CricketAudio.playHit) window.CricketAudio.playHit(0.6);
      }

      // Keep camera top-down looking at the bounce point
      if (history[bounceIdx]) {
        const bounceZ = history[bounceIdx].z;
        window.targetCamPos.set(0, 6.5, bounceZ);
        window.targetCamLook.set(0, 0.05, bounceZ);
      }
    }
    
    // Phase 2: Bounce to Impact (4.5s to 7.5s)
    else if (t < 7.5) {
      const alpha = (t - 4.5) / 3.0;
      const range = (history.length - 1) - bounceIdx;
      const idx = Math.min(bounceIdx + Math.floor(alpha * range), history.length - 1);
      const currentPoint = history[idx];
      if (currentPoint && window.drsVirtualBall) {
        window.drsVirtualBall.position.copy(currentPoint);
        updateLineGeometry(window.drsBallTrail, history.slice(0, idx + 1));
      }

      // Camera: transitions from top-down back to side-on view of the batsman's crease
      if (history[bounceIdx]) {
        const bounceZ = history[bounceIdx].z;
        window.targetCamPos.lerpVectors(new THREE.Vector3(0, 6.5, bounceZ), new THREE.Vector3(4.5, 1.2, -1.0), alpha);
        window.targetCamLook.lerpVectors(new THREE.Vector3(0, 0.05, bounceZ), new THREE.Vector3(0, 0.7, 0.5), alpha);
      }
    }
    
    // Phase 2 Pause / Crease Impact Check (7.5s to 9.0s)
    else if (t < 9.0) {
      const lastIdx = history.length - 1;
      if (history[lastIdx] && window.drsVirtualBall) {
        window.drsVirtualBall.position.copy(history[lastIdx]);
        updateLineGeometry(window.drsBallTrail, history);
      }

      // Resolve Impact card
      if (impactCard && impactCard.classList.contains('pending')) {
        impactCard.classList.remove('pending');
        impactCard.classList.add('show');
        const valEl = impactCard.querySelector('.drs-item-value');
        const status = window.drsData.impact;
        if (valEl) valEl.innerText = status;
        if (status === 'IN LINE') impactCard.classList.add('inline-green');
        else impactCard.classList.add('outside-blue');
        
        if (window.CricketAudio && window.CricketAudio.playHit) window.CricketAudio.playHit(0.6);
      }

      // Keep camera side-on crease view
      window.targetCamPos.set(4.5, 1.2, -1.0);
      window.targetCamLook.set(0, 0.7, 0.5);
    }
    
    // Phase 3: Impact to Stumps Projected (9.0s to 12.0s)
    else if (t < 12.0) {
      const alpha = (t - 9.0) / 3.0;
      const idx = Math.min(Math.floor(alpha * projPoints.length), projPoints.length - 1);
      const currentPoint = projPoints[idx];
      if (currentPoint && window.drsVirtualBall) {
        window.drsVirtualBall.position.copy(currentPoint);
        updateLineGeometry(window.drsProjectedTrail, projPoints.slice(0, idx + 1));
      }

      // Keep pre-impact trail fully drawn
      updateLineGeometry(window.drsBallTrail, history);

      // Camera: transitions to a front-on view from behind the stumps looking down the pitch
      window.targetCamPos.lerpVectors(new THREE.Vector3(4.5, 1.2, -1.0), new THREE.Vector3(0, 1.5, 6.5), alpha);
      window.targetCamLook.lerpVectors(new THREE.Vector3(0, 0.7, 0.5), new THREE.Vector3(0, 0.7, 1.2), alpha);
    }
    
    // Phase 3 Pause / Stumps Wickets Check (12.0s to 13.5s)
    else if (t < 13.5) {
      const lastIdx = projPoints.length - 1;
      if (projPoints[lastIdx] && window.drsVirtualBall) {
        window.drsVirtualBall.position.copy(projPoints[lastIdx]);
        updateLineGeometry(window.drsProjectedTrail, projPoints);
      }
      updateLineGeometry(window.drsBallTrail, history);

      // Resolve Wickets card
      if (wicketsCard && wicketsCard.classList.contains('pending')) {
        wicketsCard.classList.remove('pending');
        wicketsCard.classList.add('show');
        const valEl = wicketsCard.querySelector('.drs-item-value');
        const status = window.drsData.wickets;
        if (valEl) valEl.innerText = status;
        if (status === 'HITTING') wicketsCard.classList.add('inline-green');
        else if (status === 'UMPIRE\'S CALL') wicketsCard.classList.add('umpires-call-yellow');
        else wicketsCard.classList.add('outside-red');
        
        if (window.CricketAudio && window.CricketAudio.playHit) window.CricketAudio.playHit(0.8);
      }

      // Camera: stay focused front-on
      window.targetCamPos.set(0, 1.5, 6.5);
      window.targetCamLook.set(0, 0.7, 1.2);
    }
    
    // Phase 4: Final Decision (13.5s to 15.5s)
    else {
      if (finalCard && finalCard.classList.contains('hidden')) {
        finalCard.classList.remove('hidden');
        const decisionEl = document.getElementById('drs-final-decision-value');
        const reviewEl = document.getElementById('drs-review-status-value');

        if (decisionEl) decisionEl.innerText = window.drsData.decision;
        if (window.drsData.decision === 'OUT') {
          if (decisionEl) { decisionEl.className = 'drs-decision-value out'; }
          if (reviewEl) {
            reviewEl.innerText = 'REVIEW LOST';
            reviewEl.style.color = '#ef4444';
          }
        } else {
          if (decisionEl) { decisionEl.className = 'drs-decision-value notout'; }
          if (reviewEl) {
            reviewEl.innerText = 'REVIEW RETAINED';
            reviewEl.style.color = '#10b981';
          }
        }

        if (window.drsData.wickets === 'UMPIRE\'S CALL' && reviewEl) {
          reviewEl.innerText = 'REVIEW RETAINED';
          reviewEl.style.color = '#10b981';
        }

        if (window.CricketAudio && window.CricketAudio.playBowled) {
          if (window.drsData.decision === 'OUT') {
            window.CricketAudio.playGasp();
          } else {
            if (typeof window.playCrowdCheer === 'function') window.playCrowdCheer();
          }
        }
      }

      if (t >= 16.0) {
        resolveDRSDecision();
      }
    }
  }
}

function startDRSReview() {
  console.log("[DRS] Starting DRS review cutscene...");
  window.drsState = 'review';
  window.drsReviewTimer = 0;

  // Deduct review count
  const reviewingTeam = getReviewingTeam();
  if (reviewingTeam === 'user') {
    window.MATCH.userReviewsLeft--;
  } else {
    window.MATCH.oppReviewsLeft--;
  }

  // Hide prompt UI
  const prompt = document.getElementById('drs-prompt-card');
  if (prompt) prompt.classList.add('hidden');

  // Show DRS review container overlays
  const container = document.getElementById('drs-review-container');
  if (container) {
    container.classList.remove('hidden');
    
    // Reset left items classes
    ['drs-panel-pitching', 'drs-panel-impact', 'drs-panel-wickets'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.className = 'drs-tracking-item pending';
        el.classList.remove('show');
        const val = el.querySelector('.drs-item-value');
        if (val) val.innerText = '-';
      }
    });

    const finalCard = document.getElementById('drs-final-card');
    if (finalCard) finalCard.classList.add('hidden');
  }

  // Create Three.js 3D tracking geometries
  create3DTrajectoryVisuals();
}

function declineDRSReview() {
  console.log("[DRS] DRS review declined or timer expired. Decision stood as:", window.drsDecision);
  // Close prompt
  const prompt = document.getElementById('drs-prompt-card');
  if (prompt) prompt.classList.add('hidden');

  window.drsActive = false;
  window.drsTimerActive = false;

  // Restore hud bottom
  const bottomBar = document.querySelector('.hud-bottom-bar');
  if (bottomBar) bottomBar.style.display = 'flex';

  if (window.drsDecision === 'OUT') {
    window.MATCH.isOutThisBall = true;
    window.MATCH.outType = 'LBW';

    // Batsman walkoff cutscene
    if (typeof window.startWicketCutscene === 'function') {
      window.startWicketCutscene();
      window.wicketStage = 2; // Transition directly to walkoff (Stage 2)
      window.wicketStageTime = 0;
    }
  } else {
    // Decision stands as NOT OUT
    window.MATCH.isOutThisBall = false;
    window.MATCH.outType = '';
    if (typeof window.showFeedback === 'function') {
      window.showFeedback('NOT OUT!', 'DECISION STANDS', 'perfect');
    }
    if (typeof window.setGameState === 'function') {
      window.setGameState(window.STATES.RESULT); // Proceed to next ball/result processing
    }
  }
}

function create3DTrajectoryVisuals() {
  const THREE = window.THREE;
  const scene = window.scene;
  if (!scene) return;

  // 1. Wide semi-transparent blue mat line down the pitch center from stumps
  const matGeo = new THREE.PlaneGeometry(0.44, 23.6);
  const matMat = new THREE.MeshBasicMaterial({
    color: '#2563eb', // Royal Blue
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide
  });
  window.drsPitchLine = new THREE.Mesh(matGeo, matMat);
  window.drsPitchLine.rotation.x = -Math.PI / 2;
  window.drsPitchLine.position.set(0, 0.052, -10.6); // Centered on the pitch stretching from -22.4 to 1.2
  scene.add(window.drsPitchLine);

  // 2. Pre-impact trajectory path history setup
  const history = window.MATCH.ballPathHistory || [];
  const maxPoints = 500;
  
  const positions = new Float32Array(maxPoints * 3);
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  trailGeo.setDrawRange(0, 0);
  
  const trailMat = new THREE.LineBasicMaterial({
    color: '#38bdf8', // Glowing light blue
    linewidth: 5
  });
  window.drsBallTrail = new THREE.Line(trailGeo, trailMat);
  scene.add(window.drsBallTrail);

  // Calculate bounce point index inside history
  let minY = Infinity;
  let bounceIdx = 0;
  history.forEach((p, idx) => {
    if (p.y < minY) {
      minY = p.y;
      bounceIdx = idx;
    }
  });
  if (bounceIdx === 0 && history.length > 0) {
    bounceIdx = Math.floor(history.length * 0.6);
  }
  window.drsBounceIdx = bounceIdx;

  // 3. Projected trajectory path post-impact setup
  const impactPos = window.lbwImpactPos;
  const impactVel = window.lbwImpactVel;
  let projPoints = [];
  if (impactPos && impactVel) {
    const g = 9.81;
    // Project forward 30 steps or until stumps plane
    const tMax = (window.WICKET_Z - impactPos.z) / Math.max(impactVel.z, 0.1);
    for (let i = 0; i <= 30; i++) {
      const frac = i / 30;
      const tVal = frac * tMax;
      const px = impactPos.x + impactVel.x * tVal;
      const py = impactPos.y + impactVel.y * tVal - 0.5 * g * tVal * tVal;
      const pz = impactPos.z + impactVel.z * tVal;
      projPoints.push(new THREE.Vector3(px, py, pz));
    }
  }
  window.drsProjPoints = projPoints;

  const projPositions = new Float32Array(maxPoints * 3);
  const projGeo = new THREE.BufferGeometry();
  projGeo.setAttribute('position', new THREE.BufferAttribute(projPositions, 3));
  projGeo.setDrawRange(0, 0);
  
  const isHitting = window.drsData.hits;
  const isUmpiresCall = window.drsData.wickets === 'UMPIRE\'S CALL';
  let pathColor = '#ef4444'; // Red
  if (isHitting) {
    pathColor = isUmpiresCall ? '#f59e0b' : '#10b981'; // Yellow for Umpire's Call, Green for Hitting
  }
  const projMat = new THREE.LineBasicMaterial({
    color: pathColor,
    linewidth: 5
  });
  window.drsProjectedTrail = new THREE.Line(projGeo, projMat);
  scene.add(window.drsProjectedTrail);

  // 4. Virtual tracking ball mesh
  window.drsVirtualBall = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 16, 16),
    new THREE.MeshBasicMaterial({ color: '#ff1111' })
  );
  window.drsVirtualBall.position.copy(history[0] || new THREE.Vector3(0.8, 1.8, -22.2));
  scene.add(window.drsVirtualBall);
}

function animateVirtualBallProjected() {
  // Glow effect or custom action when virtual ball animation hits stumps plane
}

function hideAllPlayersForReview(shouldHide) {
  const isVisible = !shouldHide;
  if (window.batsmanMesh) window.batsmanMesh.visible = isVisible;
  if (window.nonStrikerMesh) window.nonStrikerMesh.visible = isVisible;
  if (window.bowlerMesh) window.bowlerMesh.visible = isVisible;
  if (window.umpireMain) window.umpireMain.visible = isVisible;
  if (window.umpireSquareLeg) window.umpireSquareLeg.visible = isVisible;
  if (window.keeperMesh) window.keeperMesh.visible = isVisible;
  if (window.fielders) {
    window.fielders.forEach(f => {
      if (f.mesh) f.mesh.visible = isVisible;
    });
  }
}

function cleanupDRSVisuals() {
  const scene = window.scene;
  if (!scene) return;

  if (window.drsPitchLine) { scene.remove(window.drsPitchLine); window.drsPitchLine = null; }
  if (window.drsBallTrail) { scene.remove(window.drsBallTrail); window.drsBallTrail = null; }
  if (window.drsVirtualBall) { scene.remove(window.drsVirtualBall); window.drsVirtualBall = null; }
  if (window.drsProjectedTrail) { scene.remove(window.drsProjectedTrail); window.drsProjectedTrail = null; }
}

function resolveDRSDecision() {
  console.log("[DRS] Resolving DRS decision...");
  window.drsActive = false;
  window.drsTimerActive = false;

  // Restore players visibility
  hideAllPlayersForReview(false);

  // Remove 3D lines
  cleanupDRSVisuals();

  // Hide container overlay
  const container = document.getElementById('drs-review-container');
  if (container) container.classList.add('hidden');

  // Restore bottom HUD
  const bottomBar = document.querySelector('.hud-bottom-bar');
  if (bottomBar) bottomBar.style.display = 'flex';

  const finalDecision = window.drsData.decision;
  const isWicketsUmpiresCall = window.drsData.wickets === 'UMPIRE\'S CALL';

  // Deduct reviews if appropriate (Umpire's Call on wicket retains the review!)
  if (finalDecision === 'OUT' && !isWicketsUmpiresCall) {
    // Review lost! Already decremented, keep it decremented.
  } else {
    // Decision overturned (NOT OUT) or Umpire's Call -> REVIEW RETAINED!
    // Restore the review count we decremented at start
    const reviewingTeam = getReviewingTeam();
    if (reviewingTeam === 'user') {
      window.MATCH.userReviewsLeft++;
    } else {
      window.MATCH.oppReviewsLeft++;
    }
  }

  // Sync back to wickets remaining, etc.
  if (finalDecision === 'OUT') {
    // Strike the batsman out!
    window.MATCH.isOutThisBall = true;
    window.MATCH.outType = 'LBW';

    if (typeof window.startWicketCutscene === 'function') {
      window.startWicketCutscene();
      window.wicketStage = 2; // Transition directly to walkoff (Stage 2)
      window.wicketStageTime = 0;
    }
  } else {
    // Decision overturned! Not Out.
    window.MATCH.isOutThisBall = false;
    window.MATCH.outType = '';

    // Show feedback and proceed to next ball
    if (typeof window.showFeedback === 'function') {
      window.showFeedback('NOT OUT!', 'DECISION OVERTURNED', 'perfect');
    }

    if (typeof window.setGameState === 'function') {
      window.setGameState(window.STATES.RESULT); // RESULT -> processBallResult will record dot ball
    }
  }
}

// Expose globally
window.triggerLBWAppeal = triggerLBWAppeal;
window.updateDRSSystem = updateDRSSystem;
window.startDRSReview = startDRSReview;
window.declineDRSReview = declineDRSReview;
window.cleanupDRSVisuals = cleanupDRSVisuals;
