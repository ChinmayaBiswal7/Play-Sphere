/**
 * PlaySphere Boot Screen Component Logic
 */

(function () {
  'use strict';

  let introAnimationCompleted = false;
  let bootSequencePerformed = false;

  function performBootSequence() {
    if (bootSequencePerformed) return;
    bootSequencePerformed = true;
    
    console.log("[ps5_boot] performBootSequence started");
    // Auto-start background music on boot (browser allows audio after first user interaction)
    if (typeof window.ps5LoadYouTubeAPI === 'function') {
      console.log("[ps5_boot] Loading YouTube API");
      window.ps5LoadYouTubeAPI();
    }
    
    // Play the boot sound synthesiser
    if (window.sounds && typeof window.sounds.playBoot === 'function') {
      console.log("[ps5_boot] Playing boot sound");
      window.sounds.playBoot();
    }

    const btn = document.getElementById('ps5-boot-btn');
    if (btn) {
      console.log("[ps5_boot] Boot button found, setting text");
      btn.textContent = 'SYSTEM BOOTING...';
      btn.style.pointerEvents = 'none';
    } else {
      console.log("[ps5_boot] Boot button not found!");
    }

    setTimeout(() => {
      console.log("[ps5_boot] Boot transition timeout fired");
      const bootScr = document.getElementById('ps5-boot');
      if (bootScr) {
        console.log("[ps5_boot] Fading out boot screen element");
        bootScr.classList.add('fade-out');
      } else {
        console.log("[ps5_boot] Boot screen element (#ps5-boot) NOT found!");
      }

      // Stop canvas animation loop now that boot screen is fading
      if (typeof window._stopIntroAnimation === 'function') {
        console.log("[ps5_boot] Stopping intro animation");
        window._stopIntroAnimation();
      }
      
      const dash = document.getElementById('ps5-dash');
      if (dash) {
        console.log("[ps5_boot] Setting dashboard style to flex");
        dash.style.display = 'flex';
      } else {
        console.log("[ps5_boot] Dashboard element (#ps5-dash) NOT found!");
      }
      
      // Start background particle drift
      if (typeof window.initBackgroundParticles === 'function') {
        console.log("[ps5_boot] Starting background particles");
        window.initBackgroundParticles();
      }
      if (typeof window.startClock === 'function') {
        console.log("[ps5_boot] Starting clock");
        window.startClock();
      }
      
      // Sync initial profile values (uses cached local data first)
      if (typeof window.syncPlaySphereProfileDisplay === 'function') {
        console.log("[ps5_boot] Syncing profile display");
        window.syncPlaySphereProfileDisplay();
      }

      // Setup Navigation inputs
      if (typeof window.setupInputListeners === 'function') {
        console.log("[ps5_boot] Setting up input listeners");
        window.setupInputListeners();
      }

      // Start WebSocket listener for mobile controller pairing at boot
      if (typeof window.initSocket === 'function') {
        console.log("[ps5_boot] Initializing console socket manager");
        window.initSocket();
      }

      // Initialize Firebase to check for a saved persistent login session.
      // Only show the login modal AFTER Firebase has resolved — this prevents
      // a jarring flash of the login screen for returning logged-in users.
      if (typeof window.ensureFirebase === 'function') {
        const FIREBASE_WAIT_MS = 3500; // Graceful timeout for slow/offline connections
        const firebaseTimeout = setTimeout(() => {
          // Firebase took too long or is offline — treat as guest and show modal
          if (!window.currentUser) {
            const profModal = document.getElementById('ps5-profile-modal');
            if (profModal) profModal.classList.add('show');
          }
        }, FIREBASE_WAIT_MS);

        window.ensureFirebase().then(() => {
          clearTimeout(firebaseTimeout);
          // If still no user after Firebase resolved, show the modal
          if (!window.currentUser || window.profileNeedsComplete) {
            const profModal = document.getElementById('ps5-profile-modal');
            if (profModal) profModal.classList.add('show');
          }
        }).catch(() => {
          clearTimeout(firebaseTimeout);
          // Firebase failed (offline) — show modal as guest
          const profModal = document.getElementById('ps5-profile-modal');
          if (profModal) profModal.classList.add('show');
        });
      } else {
        // Firebase not available — immediately show modal as guest
        const profModal = document.getElementById('ps5-profile-modal');
        if (profModal) profModal.classList.add('show');
      }
    }, 2000);
  }

  function initBootScreen() {
    // Set flag immediately to allow instant skip/boot on user click
    introAnimationCompleted = true;

    // Initial user interaction resumer (since browser blocks AudioContext)
    const bootHandler = (e) => {
      window.removeEventListener('click', bootHandler);
      window.removeEventListener('keydown', bootHandler);
      performBootSequence();
    };

    window.addEventListener('click', bootHandler);
    window.addEventListener('keydown', bootHandler);
    
    const bootBtn = document.getElementById('ps5-boot-btn');
    if (bootBtn) {
      bootBtn.addEventListener('click', bootHandler);
    }

    // Auto-boot after 1.5 seconds to prevent the user from being stuck on a black screen
    setTimeout(() => {
      const bootScr = document.getElementById('ps5-boot');
      if (bootScr && !bootScr.classList.contains('fade-out')) {
        window.removeEventListener('click', bootHandler);
        window.removeEventListener('keydown', bootHandler);
        performBootSequence();
      }
    }, 1500);
  }

  // Hook init immediately since components are already parsed in the DOM via document.write
  initBootScreen();

  // Export so that other modules can call if needed
  window.performBootSequence = performBootSequence;

})();
