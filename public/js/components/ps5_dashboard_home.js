/**
 * PlaySphere Dashboard Home Screen Component Logic
 */

(function () {
  'use strict';

  let selectedGameIndex = 0;
  const gamesMetadata = [
    {
      id: 'lagori',
      title: 'Lagori 7 Stones 3D',
      desc: 'Traditional Indian 3D street game! Throw the tennis ball to knock down the 7-stone stack, run to pick up scattered stones, and rebuild the tower at the center pedestal while dodging defender throws!',
      rating: '⭐ 5.0 Rating',
      pill: 'ESRB: E',
      dev: 'DeepMind India Arcade',
      unlocked: true
    },
    {
      id: 'rematch',
      title: 'Rematch Football',
      desc: 'Fast-paced 3D arcade soccer with zero rules! Experience physics-based ball bounce dynamics, dynamic goalkeeper diving, visual shot charging, sliding tackle dashes, and smart bot opponents.',
      rating: '⭐ 4.9 Rating',
      pill: 'ESRB: E',
      dev: 'DeepMind Arcade',
      unlocked: true
    },
    {
      id: 'football',
      title: 'Football Pro 2026',
      desc: 'Next-generation 3D physics-driven football simulation. Experience responsive pass/shoot dynamics, spectacular curve ball VFX, player running/kicking animations, and dual remote phone controller support.',
      rating: '⭐ 4.8 Rating',
      pill: 'ESRB: E',
      dev: 'DeepMind Football',
      unlocked: true
    },
    {
      id: 'cricket',
      title: 'Cricket Pro 2026',
      desc: 'Experience next-generation 3D physics-driven cricket gameplay. Take control of professional matches with timing-based batting, circular catch dials, throw QTEs, and slow-motion 3rd umpire referrals.',
      rating: '⭐ 4.9 Rating',
      pill: 'ESRB: E',
      dev: 'DeepMind Sports',
      unlocked: true
    },
    {
      id: 'f1',
      title: 'APEX STARS: CHIBI F1',
      desc: 'High-octane cartoon F1 kart racing! Choose your bobblehead driver, collect glowing power-up stars, drift around hairpins for speed boosts, and fire soda rockets to cross the line first!',
      rating: '⭐ 4.9 Rating',
      pill: 'ESRB: E',
      dev: 'DeepMind Karting',
      unlocked: true
    },
    {
      id: 'tennis',
      title: 'Chibi Tennis Duel',
      desc: 'Local live 2-player arcade tennis! Connect two phones as controllers, select your match points, and clash in high-octane 3D split-screen rallies!',
      rating: '⭐ 4.8 Rating',
      pill: 'ESRB: E',
      dev: 'DeepMind Tennis',
      unlocked: true
    },
    {
      id: 'wwe',
      title: 'WWE Chibi Rumble',
      desc: 'Lightweight 2.5D wrestling battle! Punch, grapple, slam, throw your opponent into ropes for rebounds, and trigger cinematic finishers before pinning them for the 1-2-3 count!',
      rating: '⭐ 4.9 Rating',
      pill: 'ESRB: T',
      dev: 'DeepMind Wrestling',
      unlocked: true
    },
    {
      id: 'fps',
      title: 'Delhi Defiance',
      desc: '5v5 tactical first-person shooter! Choose Agni or Vayu, deploy unique abilities, eliminate enemy bots, and hold your line in the futuristic sandstone ruins of Rajdhani!',
      rating: '⭐ 4.9 Rating',
      pill: 'ESRB: T',
      dev: 'DeepMind Tactical',
      unlocked: true
    }
  ];

  function selectGame(index) {
    const cards = document.querySelectorAll('.ps5-game-card');
    cards.forEach((c, idx) => {
      if (idx === index) {
        c.classList.add('selected');
        const shelf = document.getElementById('ps5-shelf');
        if (shelf) {
          const cardOffsetLeft = c.offsetLeft;
          const cardWidth = c.offsetWidth;
          const shelfWidth = shelf.offsetWidth;
          const targetScrollLeft = cardOffsetLeft - (shelfWidth / 2) + (cardWidth / 2);
          shelf.scrollTo({
            left: targetScrollLeft,
            behavior: 'smooth'
          });
        }
      } else {
        c.classList.remove('selected');
      }
    });

    // Update details pane
    const meta = gamesMetadata[index];
    const detailsPane = document.getElementById('ps5-details');
    if (detailsPane) detailsPane.classList.remove('visible');

    setTimeout(() => {
      document.getElementById('game-title').textContent = meta.title;
      document.getElementById('game-desc').textContent = meta.desc;
      
      const playBtn = document.getElementById('ps5-play-game');
      if (meta.unlocked) {
        playBtn.style.display = 'flex';
      } else {
        playBtn.style.display = 'none';
      }
      
      if (detailsPane) detailsPane.classList.add('visible');
    }, 220);

    if (window.sounds && typeof window.sounds.playHover === 'function') {
      window.sounds.playHover();
    }
  }

  function handleInputNavigation(dir) {
    // Only allow card navigation if store view and profile modal are closed
    const storeView = document.getElementById('ps5-store-view');
    const profModal = document.getElementById('ps5-profile-modal');
    
    if (storeView && storeView.style.display === 'flex') return;
    if (profModal && profModal.classList.contains('show')) return;

    let nextIndex = selectedGameIndex + dir;
    if (nextIndex >= 0 && nextIndex < gamesMetadata.length) {
      selectedGameIndex = nextIndex;
      selectGame(selectedGameIndex);
    }
  }

  // ── BACKGROUND DRIFTING PARTICLES ──
  let bgCanvas, bgCtx, animationFrameId;
  const particles = [];

  function initBackgroundParticles() {
    bgCanvas = document.getElementById('ps5-bg-canvas');
    if (!bgCanvas) return;
    bgCtx = bgCanvas.getContext('2d');
    resizeBgCanvas();
    window.addEventListener('resize', resizeBgCanvas);

    particles.length = 0; // Clear any existing
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * bgCanvas.width,
        y: Math.random() * bgCanvas.height,
        radius: Math.random() * 3.5 + 1.2,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        alpha: Math.random() * 0.6 + 0.1
      });
    }

    animateParticles();
  }

  function resizeBgCanvas() {
    if (bgCanvas) {
      bgCanvas.width = window.innerWidth;
      bgCanvas.height = window.innerHeight;
    }
  }

  function animateParticles() {
    if (!bgCtx || !bgCanvas) return;
    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > bgCanvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > bgCanvas.height) p.vy *= -1;

      // Draw glowing radial gradient particle
      const grad = bgCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3.5);
      grad.addColorStop(0, `rgba(59, 130, 246, ${p.alpha})`);
      grad.addColorStop(0.3, `rgba(96, 165, 250, ${p.alpha * 0.4})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      bgCtx.fillStyle = grad;
      bgCtx.beginPath();
      bgCtx.arc(p.x, p.y, p.radius * 3.5, 0, Math.PI * 2);
      bgCtx.fill();
    });

    animationFrameId = requestAnimationFrame(animateParticles);
  }

  // ── CLOCK TIMER ──
  function startClock() {
    const timeEl = document.getElementById('ps5-time');
    const update = () => {
      const d = new Date();
      let hours = d.getHours();
      const mins = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      if (timeEl) timeEl.textContent = `${hours}:${mins} ${ampm}`;
    };
    update();
    setInterval(update, 1000);
  }

  // ── NAVIGATION & GAME LAUNCH ──
  window.ps5LaunchGame = function(gameId, roomCode) {
    // Pause background music when entering the game
    if (window.ps5YtPlayer && window.ps5YtReady) {
      try { window.ps5YtPlayer.pauseVideo(); } catch(e) {}
    }

    const launchOverlay = document.getElementById('ps5-launch');
    if (launchOverlay) {
      launchOverlay.classList.add('active');
    }

    if (window.sounds && typeof window.sounds.playLaunch === 'function') {
      window.sounds.playLaunch();
    }

    setTimeout(() => {
      const root = document.getElementById('ps5-console-root');

      if (gameId === 'cricket') {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', resizeBgCanvas);
        if (root) {
          // Safeguard the modals by appending them back to document.body before removing console root!
          ['ps5-friends-modal', 'ps5-profile-modal', 'ps5-controller-modal'].forEach(id => {
            const el = document.getElementById(id);
            if (el) document.body.appendChild(el);
          });
          root.remove();
        }
        if (typeof window.launchCricketGame === 'function') {
          window.launchCricketGame();
        }
      } else if (gameId === 'football' || gameId === 'rematch' || gameId === 'lagori' || gameId === 'f1' || gameId === 'tennis' || gameId === 'wwe' || gameId === 'fps') {
        const code = roomCode || '';
        let url = `/f1/index.html?room=${code}`;
        if (gameId === 'football') url = `/football/index.html?room=${code}`;
        else if (gameId === 'rematch') url = `/rematch/index.html?game=rematch&room=${code}`;
        else if (gameId === 'lagori') url = `/rematch/index.html?game=lagori&room=${code}`;
        else if (gameId === 'tennis') url = `/tennis/index.html?room=${code}`;
        else if (gameId === 'wwe') url = `/wwe/index.html?room=${code}`;
        else if (gameId === 'fps') url = `/fps/index.html?room=${code}`;
        
        let iframe = document.getElementById('game-session-iframe');
        if (!iframe) {
          iframe = document.createElement('iframe');
          iframe.id = 'game-session-iframe';
          iframe.style.cssText = "position: fixed; inset: 0; width: 100vw; height: 100vh; border: none; z-index: 999999; background: #000;";
          iframe.setAttribute('allow', 'fullscreen');
          iframe.setAttribute('allowfullscreen', 'true');
          document.body.appendChild(iframe);
        }
        iframe.src = url;
        iframe.style.display = 'block';

        window.closeGameIframe = () => {
          iframe.style.display = 'none';
          iframe.src = 'about:blank';
          // Reload dashboard to cleanly free WebGL memory and restore state
          window.location.reload();
        };
      }
    }, 1200);
  };

  function launchActiveGame() {
    // Only launch if dashboard game shelf is visible
    const storeView = document.getElementById('ps5-store-view');
    if (storeView && storeView.style.display === 'flex') return;

    const meta = gamesMetadata[selectedGameIndex];
    if (!meta || !meta.unlocked) return;

    const code = window.roomCode || '';
    window.ps5LaunchGame(meta.id, code);
  }

  function setupInputListeners() {
    // Keypress events
    window.addEventListener('keydown', (e) => {
      if (!document.getElementById('ps5-console-root')) return;

      // Handle Escape/Backspace to close open modals (e.g. Controller Pairing)
      if (e.code === 'Escape' || e.code === 'Backspace') {
        const ctrlModal = document.getElementById('ps5-controller-modal');
        if (ctrlModal && ctrlModal.classList.contains('show')) {
          e.preventDefault();
          ctrlModal.classList.remove('show');
          if (window.sounds && typeof window.sounds.play === 'function') {
            window.sounds.play('back');
          }
          return;
        }
      }

      // Disable main dashboard navigation when any modal is open
      const profileModal = document.getElementById('ps5-profile-modal');
      const friendsModal = document.getElementById('ps5-friends-modal');
      const controllerModal = document.getElementById('ps5-controller-modal');
      const anyModalOpen = (profileModal && profileModal.classList.contains('show')) ||
                           (friendsModal && friendsModal.classList.contains('show')) ||
                           (controllerModal && controllerModal.classList.contains('show'));
      if (anyModalOpen) return;

      // Block console navigation if guest
      const isGuest = !window.currentUser || window.profileNeedsComplete;
      if (isGuest) {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'ArrowRight' || e.code === 'KeyD' || e.code === 'Enter' || e.code === 'Space') {
          return;
        }
      }

      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        handleInputNavigation(-1);
      }
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        handleInputNavigation(1);
      }
      else if (e.code === 'Enter' || e.code === 'Space') {
        launchActiveGame();
      }
      else if (e.code === 'KeyF') {
        if (typeof window.toggleFullscreen === 'function') {
          window.toggleFullscreen();
        }
      }
    });

    // Header Nav Tab switching
    const tabGames = document.getElementById('nav-item-games');
    const tabStore = document.getElementById('nav-item-store');
    const dashView = document.getElementById('ps5-dashboard-view');
    const storeView = document.getElementById('ps5-store-view');

    if (tabGames && tabStore && dashView && storeView) {
      tabGames.onclick = () => {
        if (!window.currentUser || window.profileNeedsComplete) return; // locked for guests
        tabGames.classList.add('active');
        tabStore.classList.remove('active');
        dashView.style.display = 'flex';
        storeView.style.display = 'none';
      };

      tabStore.onclick = () => {
        if (!window.currentUser || window.profileNeedsComplete) return; // locked for guests
        tabStore.classList.add('active');
        tabGames.classList.remove('active');
        dashView.style.display = 'none';
        storeView.style.display = 'flex';
        if (typeof window.syncPlaySphereProfileDisplay === 'function') {
          window.syncPlaySphereProfileDisplay(); // refresh store coins/pills
        }
      };
    }

    // Profile triggers
    const profTrigger = document.getElementById('ps5-profile-trigger');
    const profModal = document.getElementById('ps5-profile-modal');
    const profClose = document.getElementById('ps5-profile-close-btn');

    if (profTrigger && profModal) {
      profTrigger.onclick = () => {
        profModal.dataset.userOpened = '1';
        profModal.classList.add('show');
        if (typeof window.resetPlaySphereProfileView === 'function') {
          window.resetPlaySphereProfileView();
        }
        if (typeof window.syncPlaySphereProfileDisplay === 'function') {
          window.syncPlaySphereProfileDisplay();
        }
      };
    }

    if (profClose && profModal) {
      profClose.onclick = () => {
        if (!window.currentUser || window.profileNeedsComplete) return;
        delete profModal.dataset.userOpened;
        profModal.classList.remove('show');
      };
    }

    // Controller triggers
    const ctrlTrigger = document.getElementById('ps5-controller-trigger');
    const ctrlModal = document.getElementById('ps5-controller-modal');
    const ctrlClose = document.getElementById('ps5-controller-close-btn');

    if (ctrlTrigger && ctrlModal) {
      ctrlTrigger.onclick = () => {
        ctrlModal.classList.add('show');
      };
    }

    if (ctrlClose && ctrlModal) {
      ctrlClose.onclick = () => {
        ctrlModal.classList.remove('show');
      };
    }

    // Google Login/Logout action trigger
    const handleAuthAction = () => {
      const currentUser = window.currentUser;
      if (currentUser) {
        if (window.ui && window.ui.profileLogoutBtn) {
          window.ui.profileLogoutBtn.click();
        }
      } else {
        if (window.ui && window.ui.profileLoginBtn) {
          window.ui.profileLoginBtn.click();
        }
      }
    };

    const authBtn = document.getElementById('ps5-profile-auth-btn');
    if (authBtn) {
      authBtn.onclick = handleAuthAction;
    }

    // Click bindings for game cards
    const cards = document.querySelectorAll('.ps5-game-card');
    cards.forEach((c, idx) => {
      c.addEventListener('click', () => {
        if (idx === selectedGameIndex) {
          launchActiveGame();
        } else {
          selectedGameIndex = idx;
          selectGame(selectedGameIndex);
        }
      });
    });

    const playGameBtn = document.getElementById('ps5-play-game');
    if (playGameBtn) {
      playGameBtn.addEventListener('click', launchActiveGame);
    }

    // Poll Gamepad inputs
    setInterval(pollConsoleGamepad, 120);
  }

  let lastGamepadButtonState = false;
  let lastGamepadStickState = 0;
  let lastGamepadStickYState = 0;

  function pollConsoleGamepad() {
    if (!navigator.getGamepads) return;
    const gamepads = navigator.getGamepads();
    let gp = null;
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) {
        gp = gamepads[i];
        break;
      }
    }
    if (!gp || !document.getElementById('ps5-console-root')) return;

    // D-pad or Left Stick X
    const stickX = gp.axes[0] || 0;
    const dpadLeft = gp.buttons[14] && gp.buttons[14].pressed;
    const dpadRight = gp.buttons[15] && gp.buttons[15].pressed;

    let moveVal = 0;
    if (stickX < -0.45 || dpadLeft) moveVal = -1;
    if (stickX > 0.45 || dpadRight) moveVal = 1;

    if (moveVal !== 0 && lastGamepadStickState === 0) {
      handleInputNavigation(moveVal);
    }
    lastGamepadStickState = moveVal;

    // D-pad or Left Stick Y (Up/Down) to switch tabs
    const stickY = gp.axes[1] || 0;
    const dpadUp = gp.buttons[12] && gp.buttons[12].pressed;
    const dpadDown = gp.buttons[13] && gp.buttons[13].pressed;

    let yMoveVal = 0;
    if (stickY < -0.45 || dpadUp) yMoveVal = -1;
    if (stickY > 0.45 || dpadDown) yMoveVal = 1;

    if (yMoveVal !== 0 && lastGamepadStickYState === 0) {
      if (yMoveVal === -1) {
        const tabGames = document.getElementById('nav-item-games');
        if (tabGames) tabGames.click();
      } else {
        const tabStore = document.getElementById('nav-item-store');
        if (tabStore) tabStore.click();
      }
    }
    lastGamepadStickYState = yMoveVal;

    // Cross button (button 0)
    const crossPressed = gp.buttons[0] && gp.buttons[0].pressed;
    if (crossPressed && !lastGamepadButtonState) {
      launchActiveGame();
    }
    lastGamepadButtonState = crossPressed;
  }

  // Export functions to global scope
  window.initBackgroundParticles = initBackgroundParticles;
  window.resizeBgCanvas = resizeBgCanvas;
  window.startClock = startClock;
  window.setupInputListeners = setupInputListeners;
  window.launchActiveGame = launchActiveGame;

})();
