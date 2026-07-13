// ── RUN-OUT & 3RD UMPIRE REVIEW SYSTEM ──────────────────────────────────

(function() {
  // Check if style block exists, if not inject it
  if (!document.getElementById('runout-review-styles')) {
    const style = document.createElement('style');
    style.id = 'runout-review-styles';
    style.innerHTML = `
      /* 3rd Umpire Referral Screen Overlay */
      #third-umpire-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: radial-gradient(circle, rgba(15,23,42,0.6) 0%, rgba(2,6,23,0.92) 100%);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 99999;
        font-family: 'Inter', 'Outfit', sans-serif;
        color: #fff;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.5s ease;
      }
      #third-umpire-overlay.visible {
        opacity: 1;
        pointer-events: auto;
      }
      
      /* TV Broadcast Scanlines & Frame */
      .tv-frame {
        position: absolute;
        top: 4%;
        left: 4%;
        right: 4%;
        bottom: 4%;
        border: 4px solid rgba(255,255,255,0.15);
        border-radius: 20px;
        pointer-events: none;
        box-shadow: inset 0 0 100px rgba(0,0,0,0.8);
      }
      .tv-scanlines {
        position: absolute;
        top: 0; left: 0; width: 100%; height: 100%;
        background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 255, 0, 0.06));
        background-size: 100% 4px, 6px 100%;
        opacity: 0.85;
        pointer-events: none;
      }
      .tv-recording-red-dot {
        position: absolute;
        top: 40px;
        right: 40px;
        display: flex;
        align-items: center;
        gap: 12px;
        font-weight: 800;
        letter-spacing: 2px;
        color: #ef4444;
        text-shadow: 0 0 10px #ef4444;
      }
      .tv-recording-red-dot::before {
        content: '';
        width: 14px;
        height: 14px;
        background-color: #ef4444;
        border-radius: 50%;
        animation: recBlink 1s infinite alternate;
      }
      @keyframes recBlink {
        0% { opacity: 0.2; }
        100% { opacity: 1; }
      }

      /* Review Title Banner */
      .referral-banner {
        text-align: center;
        margin-bottom: 40px;
      }
      .referral-title {
        font-size: 2.8rem;
        font-weight: 900;
        letter-spacing: 6px;
        background: linear-gradient(135deg, #facc15 0%, #eab308 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        text-shadow: 0 0 35px rgba(234, 179, 8, 0.35);
        text-transform: uppercase;
        margin: 0;
      }
      .referral-subtitle {
        font-size: 1.1rem;
        font-weight: 700;
        letter-spacing: 4px;
        color: rgba(255,255,255,0.7);
        margin-top: 8px;
        text-transform: uppercase;
      }

      /* Decision Display Cards */
      .decision-card-container {
        position: relative;
        width: 480px;
        height: 180px;
        display: flex;
        justify-content: center;
        align-items: center;
        perspective: 1000px;
      }
      .decision-card {
        width: 100%;
        height: 100%;
        border-radius: 16px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        transform: scale(0.85);
        opacity: 0;
        transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        box-shadow: 0 0 100px rgba(0,0,0,0.6);
      }
      .decision-card.show {
        transform: scale(1);
        opacity: 1;
      }
      
      .decision-card.out {
        background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
        border: 4px solid #ef4444;
        box-shadow: 0 0 80px rgba(239, 68, 68, 0.5), 0 0 160px rgba(153, 27, 27, 0.3);
        animation: cardFlash 0.35s infinite alternate;
      }
      .decision-card.not-out {
        background: linear-gradient(135deg, #16a34a 0%, #166534 100%);
        border: 4px solid #22c55e;
        box-shadow: 0 0 80px rgba(34, 197, 94, 0.5), 0 0 160px rgba(22, 101, 52, 0.3);
        animation: cardFlash 0.35s infinite alternate;
      }
      
      @keyframes cardFlash {
        0% { filter: brightness(0.9) contrast(1); }
        100% { filter: brightness(1.15) contrast(1.1); }
      }

      .decision-text {
        font-size: 4.5rem;
        font-weight: 900;
        letter-spacing: 12px;
        margin: 0;
        text-transform: uppercase;
        color: #fff;
        text-shadow: 0 0 30px rgba(255,255,255,0.6);
      }
      .decision-subtext {
        font-size: 1.2rem;
        font-weight: 800;
        letter-spacing: 6px;
        color: rgba(255,255,255,0.8);
        text-transform: uppercase;
        margin-top: 6px;
      }

      /* Slow Motion Subtitle Overlay */
      .slowmo-banner {
        position: absolute;
        bottom: 12%;
        background: rgba(15,23,42,0.85);
        border: 1px solid rgba(255,255,255,0.15);
        padding: 14px 40px;
        border-radius: 30px;
        font-weight: 700;
        font-size: 1.1rem;
        letter-spacing: 4px;
        text-transform: uppercase;
        color: #facc15;
        box-shadow: 0 0 40px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        gap: 16px;
        animation: slowmoPulse 2s infinite;
      }
      @keyframes slowmoPulse {
        0%, 100% { opacity: 0.8; }
        50% { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  // Inject DOM elements dynamically
  let overlay = document.getElementById('third-umpire-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'third-umpire-overlay';
    overlay.innerHTML = `
      <div class="tv-frame"></div>
      <div class="tv-scanlines"></div>
      <div class="tv-recording-red-dot">3RD UMPIRE LIVE</div>
      
      <div class="referral-banner">
        <h1 class="referral-title">3rd Umpire Referral</h1>
        <p class="referral-subtitle">Decision Pending</p>
      </div>

      <div class="decision-card-container">
        <div id="decision-card-element" class="decision-card">
          <h2 class="decision-text">PENDING</h2>
          <p class="decision-subtext">REVIEWING</p>
        </div>
      </div>

      <div id="slowmo-overlay-banner" class="slowmo-banner">
        <span>SLOW-MOTION REPLAY (0.15x)</span>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  // Run-out tracking variables
  window.runoutActive = false;
  window.runoutState = 'idle'; // 'idle', 'throwing', 'stump_strike', 'referral', 'decision'
  
  let throwStart = new THREE.Vector3();
  let throwEnd = new THREE.Vector3();
  let throwDuration = 0.8; // seconds
  let throwTimer = 0;
  
  let targetStumpsZ = 1.2;
  let isBatsmanEnd = true;
  
  let runoutDismissedIndex = 0;
  let runoutIsSafe = false;
  let runoutDistToCrease = 0;
  let runoutCreaseZ = 0;
  
  // Replay review timer
  let referralStartTime = 0;
  let reviewStateTimer = 0;

  // Cache variables for running trajectory computation during slow-mo
  let cachedRunStartTime = 0;
  let cachedRunDuration = 1.5;
  let cachedIsCancelled = false;
  let cachedStrikerZ = 0;
  let cachedNonStrikerZ = -22.4;

  window.triggerReturnThrow = function(fromPos, toPos) {
    console.log('[RunoutSystem] Throw triggered. From:', fromPos, 'To:', toPos);
    
    // De-couple from default instant reset
    window.runoutActive = true;
    window.runoutState = 'throwing';
    
    throwStart.copy(fromPos);
    throwEnd.copy(toPos);
    
    // Dynamic duration based on distance
    const dist = fromPos.distanceTo(toPos);
    throwDuration = Math.max(0.65, dist / 24.0); // realistic 24m/s throwing speed
    throwTimer = 0;
    
    targetStumpsZ = toPos.z;
    isBatsmanEnd = (Math.abs(targetStumpsZ - window.WICKET_Z) < 3.0);
    
    // Cache the active running variables so we can evaluate them deterministically
    cachedRunStartTime = window.runStartTime;
    cachedRunDuration = window.RUN_DURATION;
    cachedIsCancelled = (window.runningState === 'cancelled');
    cachedStrikerZ = window.BATSMAN_CREASE_Z;
    cachedNonStrikerZ = window.nonStrikerStartZ;
    
    // Set game state to custom throw state so update loops know how to handle camera
    if (typeof window.setGameState === 'function') {
      window.setGameState(window.STATES.THROW_IN_FLIGHT || 'THROW_IN_FLIGHT');
    }
    
    // Set physical ball to kinematic visual-only movement
    if (window.ballBody) {
      window.ballBody.type = CANNON.Body.KINEMATIC;
      window.ballBody.velocity.set(0, 0, 0);
      window.ballBody.angularVelocity.set(0, 0, 0);
      window.ballBody.position.copy(fromPos);
    }
    if (window.ballMesh) {
      window.ballMesh.visible = true;
    }
    
    // Keep running batsmen active
    window.fielderRetrieved = true; // prevents runs from accumulating during throw
  };

  window.updateRunoutSystem = function(dt) {
    if (!window.runoutActive) return;

    const ballBody = window.ballBody;
    const ballMesh = window.ballMesh;

    switch (window.runoutState) {
      case 'throwing': {
        throwTimer += dt;
        const progress = Math.min(1.0, throwTimer / throwDuration);
        
        // Parabolic arc interpolation
        const currentPos = new THREE.Vector3().lerpVectors(throwStart, throwEnd, progress);
        const arcHeight = Math.sin(progress * Math.PI) * 2.2; // 2.2m throw height peak
        currentPos.y += arcHeight;
        
        if (ballBody) ballBody.position.copy(currentPos);
        if (ballMesh) ballMesh.position.copy(currentPos);
        
        // Camera follows the ball flight closely, tracking it through the air
        if (window.targetCamPos && window.targetCamLook) {
          window.targetCamPos.set(currentPos.x + 3.5, currentPos.y + 1.8, currentPos.z + 5.5);
          window.targetCamLook.copy(currentPos);
        }
        
        if (progress >= 1.0) {
          if (window.MATCH && window.MATCH.isOverthrowThisBall) {
            console.log('[RunoutSystem] Overthrow! Keeper/bowler missed the ball.');
            if (ballBody) {
              ballBody.type = CANNON.Body.DYNAMIC;
              ballBody.mass = 0.16;
              ballBody.updateMassProperties();
              
              // Calculate velocity continuing past the stumps
              const throwDir = new THREE.Vector3().subVectors(throwEnd, throwStart).normalize();
              const throwSpeed = 16.0; // speed of ball flying past
              ballBody.velocity.set(throwDir.x * throwSpeed, 1.2, throwDir.z * throwSpeed);
              ballBody.angularVelocity.set(0, 0, 0);
            }
            
            // Exit runout sequence and return to play!
            window.runoutActive = false;
            window.runoutState = 'idle';
            window.fielderRetrieved = false;
            
            if (typeof window.setGameState === 'function') {
              window.setGameState(window.STATES.HIT);
            }

            // Reset FSM states on all fielders so they can chase the overthrown ball from their CURRENT positions
            if (window.fielders) {
              window.fielders.forEach(f => {
                f.state = 'idle';
                f.isClosest = false;
                f.collectTimer = 0;
                f.throwTimer = 0;
                f.hasBall = false;
                f.hasTriggeredEvent = false;
                if (typeof window.resetFielderPose === 'function') {
                  window.resetFielderPose(f);
                }
              });
            }

            // Recalculate closest fielder to chase the overthrown ball!
            if (typeof window.triggerFieldingFSM === 'function') {
              window.triggerFieldingFSM();
            }
          } else {
            window.runoutState = 'stump_strike';
            throwTimer = 0;
          }
        }
        break;
      }
      
      case 'stump_strike': {
        // Check running batsman position at the EXACT impact moment
        evaluateRunoutDecision();
        
        const shouldStrikeStumps = window.runoutIsDirectHit || (!runoutIsSafe && window.runningState !== 'idle') || (window.runningState !== 'idle' && runoutDistToCrease <= 0.85);

        if (shouldStrikeStumps) {
          // dislodge bails physically
          if (typeof window.dislodgeBails === 'function') {
            window.dislodgeBails(isBatsmanEnd);
          } else if (window.bailBodies) {
            // Fallback: apply impulse to bails
            window.bailBodies.forEach(b => {
              if (b) {
                b.type = CANNON.Body.DYNAMIC;
                b.mass = 0.02;
                b.updateMassProperties();
                b.applyImpulse(new CANNON.Vec3((Math.random() - 0.5) * 0.4, 1.5, (Math.random() - 0.5) * 0.4), b.position);
              }
            });
          }
          
          // Play wicket hit sound
          if (window.CricketAudio && window.CricketAudio.playBowled) {
            window.CricketAudio.playBowled();
          }
        }
        
        // Determine referral vs direct outcome
        // Close decision threshold: batsman within 0.85 meters of safety
        const isCloseCall = (runoutDistToCrease <= 0.85);
        
        if (isCloseCall && window.runningState !== 'idle') {
          // Trigger 3rd Umpire Referral!
          window.runoutState = 'referral';
          referralStartTime = Date.now();
          reviewStateTimer = 0;
          
          if (typeof window.setGameState === 'function') {
            window.setGameState(window.STATES.RUNOUT_REVIEW || 'RUNOUT_REVIEW');
          }
          
          // Trigger Umpire TV sign
          window.umpireSignalType = 'third_umpire';
          window.umpireSignalTimer = 0;
          
          console.log('[RunoutSystem] Close decision! Referral triggered. Distance to crease:', runoutDistToCrease.toFixed(2));
        } else {
          // Direct Decision
          giveDirectRunoutDecision();
        }
        break;
      }
      
      case 'referral': {
        reviewStateTimer += dt;
        
        // Animate slow-mo replay visually (Date.now() elapsed)
        const elapsed = (Date.now() - referralStartTime) / 1000; // seconds
        
        // Display broadcast TV overlay after 1.5s (umpire completes TV sign)
        if (elapsed >= 1.5 && elapsed < 6.5) {
          const overlayElement = document.getElementById('third-umpire-overlay');
          if (overlayElement) {
            overlayElement.classList.add('visible');
            const slowmoBanner = document.getElementById('slowmo-overlay-banner');
            if (slowmoBanner) {
              const frameIdx = Math.floor(elapsed * 12) % 4 + 1;
              slowmoBanner.innerHTML = `<span>SLOW-MOTION REPLAY (0.15x) — FRAME ${frameIdx}</span>`;
            }
          }
          
          // Animate the camera panning slowly around the crease and batsman's bat
          if (window.targetCamPos && window.targetCamLook) {
            // Side-angle focus on crease
            const zTarget = isBatsmanEnd ? window.WICKET_Z : -22.4;
            window.targetCamPos.set(isBatsmanEnd ? -3.0 : 3.0, 0.45, zTarget - 0.5);
            window.targetCamLook.set(0, 0.25, zTarget);
          }
          
          // Animate players in slow-motion around the impact point!
          // We map the 5s review duration to a narrow window of slow-motion progress
          const slowmoProgress = Math.min(1.0, (elapsed - 1.5) / 4.8);
          // Map slowmoProgress to running progress: from 0.82 to 0.98
          const evalProgress = 0.82 + slowmoProgress * 0.16;
          
          // Calculate and set positions dynamically for the review visual
          const _strikerZ = cachedStrikerZ;
          const _nonStrkZ = cachedNonStrikerZ;
          
          if (window.batsmanMesh) {
            window.batsmanMesh.position.z = THREE.MathUtils.lerp(_strikerZ, _nonStrkZ, cachedIsCancelled ? (1 - evalProgress) : evalProgress);
          }
          if (window.nonStrikerMesh) {
            window.nonStrikerMesh.position.z = THREE.MathUtils.lerp(_nonStrkZ, _strikerZ, cachedIsCancelled ? (1 - evalProgress) : evalProgress);
          }
          
          // Ball travels to stumps in slow motion
          if (window.ballBody && window.ballMesh) {
            const ballZ = THREE.MathUtils.lerp(throwStart.z, throwEnd.z, evalProgress);
            const ballY = Math.max(0.12, throwEnd.y + Math.sin(evalProgress * Math.PI) * 0.3);
            window.ballBody.position.set(0, ballY, ballZ);
            window.ballMesh.position.set(0, ballY, ballZ);
          }
        }
        
        if (elapsed >= 6.8) {
          window.runoutState = 'decision';
          referralStartTime = Date.now();
          
          // Hide slowmo sub banner, trigger the big OUT / NOT OUT cards
          const slowmoBanner = document.getElementById('slowmo-overlay-banner');
          if (slowmoBanner) slowmoBanner.style.display = 'none';
          
          const card = document.getElementById('decision-card-element');
          if (card) {
            card.className = `decision-card show ${runoutIsSafe ? 'not-out' : 'out'}`;
            card.querySelector('.decision-text').innerText = runoutIsSafe ? 'NOT OUT' : 'OUT';
            card.querySelector('.decision-subtext').innerText = runoutIsSafe ? 'BATSMAN SAFE' : 'RUN OUT';
          }
          
          // Play decision audio
          if (window.CricketAudio) {
            if (runoutIsSafe) {
              if (window.CricketAudio.playCheer) window.CricketAudio.playCheer(false);
            } else {
              if (window.CricketAudio.playGasp) window.CricketAudio.playGasp();
            }
          }
        }
        break;
      }
      
      case 'decision': {
        const elapsed = (Date.now() - referralStartTime) / 1000;
        
        if (elapsed >= 3.5) {
          // Hide overlay, resolve game state
          const overlayElement = document.getElementById('third-umpire-overlay');
          if (overlayElement) overlayElement.classList.remove('visible');
          
          // Reset card element
          const card = document.getElementById('decision-card-element');
          if (card) card.className = 'decision-card';
          
          const slowmoBanner = document.getElementById('slowmo-overlay-banner');
          if (slowmoBanner) slowmoBanner.style.display = '';

          resolveReferralOutcome();
        }
        break;
      }
    }
  };

  function evaluateRunoutDecision() {
    const MATCH = window.MATCH;
    const strikerZ = window.batsmanMesh.position.z;
    const nonStrikerZ = window.nonStrikerMesh.position.z;
    
    let targetBatsmanZ = strikerZ;
    let creaseZ = 0.0;
    
    // Determine target batsman and crease Z
    if (isBatsmanEnd) {
      // Striker end stumps Z = 1.2, crease Z = 0.0
      creaseZ = 0.0;
      if (cachedIsCancelled) {
        // cancelled: striker is returning to 0.0
        targetBatsmanZ = strikerZ;
        runoutDismissedIndex = MATCH.strikerIndex;
      } else {
        // called: non-striker is running to 0.0
        targetBatsmanZ = nonStrikerZ;
        runoutDismissedIndex = 1 - MATCH.strikerIndex;
      }
      // Striker end safety: Z >= 0.0 (or Z >= -0.15 for bat reach)
      runoutIsSafe = (targetBatsmanZ >= -0.15);
      runoutDistToCrease = Math.abs(targetBatsmanZ - creaseZ);
    } else {
      // Bowler end stumps Z = -22.4, crease Z = -21.2
      creaseZ = -21.2;
      if (cachedIsCancelled) {
        // cancelled: non-striker is returning to -22.4
        targetBatsmanZ = nonStrikerZ;
        runoutDismissedIndex = 1 - MATCH.strikerIndex;
      } else {
        // called: striker is running to -22.4
        targetBatsmanZ = strikerZ;
        runoutDismissedIndex = MATCH.strikerIndex;
      }
      // Bowler end safety: Z <= -21.0
      runoutIsSafe = (targetBatsmanZ <= -21.05);
      runoutDistToCrease = Math.abs(targetBatsmanZ - creaseZ);
    }
  }

  function giveDirectRunoutDecision() {
    const MATCH = window.MATCH;
    
    // Direct outcome
    if (!runoutIsSafe && window.runningState !== 'idle') {
      console.log('[RunoutSystem] Direct OUT - Run Out!');
      MATCH.isOutThisBall = true;
      MATCH.outType = 'RUN OUT';
      MATCH.dismissedBatsmanIndex = runoutDismissedIndex;
      if (!MATCH.userIsBatting && typeof window.unlockAchievement === 'function') {
        window.unlockAchievement('run_out');
      }
      
      if (window.updateLastBallHUD) {
        window.updateLastBallHUD(window.deliverySpeedKmh, `OUT (RUN OUT)`, window.lastShotName);
      }
      
      window.queueCelebration(
        'out', 'OUT!', 'RUN OUT!', 'OUT!', 'RUN OUT!', 'out',
        () => {
          if (window.CricketAudio && window.CricketAudio.playGasp) window.CricketAudio.playGasp();
        }
      );
    } else {
      console.log('[RunoutSystem] Direct SAFE - Not Out.');
      // Safe, reset play to result state
      window.runningState = 'idle';
      window.runProgress = 0;
      window.MATCH.pendingRun = false;
      
      if (window.batsmanMesh) window.batsmanMesh.position.z = window.BATSMAN_CREASE_Z;
      if (window.nonStrikerMesh) window.nonStrikerMesh.position.z = window.nonStrikerStartZ;
      
      if (typeof window.resetAllFieldersToHome === 'function') {
        window.resetAllFieldersToHome();
      }
      if (typeof window.setGameState === 'function') {
        window.setGameState(window.STATES.RESULT);
      }
    }
    
    window.runoutActive = false;
    window.runoutState = 'idle';
  }

  function resolveReferralOutcome() {
    const MATCH = window.MATCH;
    
    if (!runoutIsSafe) {
      console.log('[RunoutSystem] Referral OUT - Run Out!');
      MATCH.isOutThisBall = true;
      MATCH.outType = 'RUN OUT';
      MATCH.dismissedBatsmanIndex = runoutDismissedIndex;
      if (!MATCH.userIsBatting && typeof window.unlockAchievement === 'function') {
        window.unlockAchievement('run_out');
      }
      
      if (window.updateLastBallHUD) {
        window.updateLastBallHUD(window.deliverySpeedKmh, `OUT (RUN OUT)`, window.lastShotName);
      }
      
      window.queueCelebration(
        'out', 'OUT!', 'RUN OUT!', 'OUT!', 'RUN OUT!', 'out',
        () => {
          if (window.CricketAudio && window.CricketAudio.playGasp) window.CricketAudio.playGasp();
        }
      );
    } else {
      console.log('[RunoutSystem] Referral SAFE - Not Out.');
      window.runningState = 'idle';
      window.runProgress = 0;
      window.MATCH.pendingRun = false;
      
      if (window.batsmanMesh) window.batsmanMesh.position.z = window.BATSMAN_CREASE_Z;
      if (window.nonStrikerMesh) window.nonStrikerMesh.position.z = window.nonStrikerStartZ;
      
      if (typeof window.resetAllFieldersToHome === 'function') {
        window.resetAllFieldersToHome();
      }
      if (typeof window.setGameState === 'function') {
        window.setGameState(window.STATES.RESULT);
      }
    }
    
    window.runoutActive = false;
    window.runoutState = 'idle';
  }

})();
