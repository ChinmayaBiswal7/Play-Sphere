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
      id: 'gullycricket',
      title: 'Gully Cricket 3D',
      desc: 'Authentic Indian street cricket! Play 5v5 matches in narrow asphalt gullies. Features One-Tippi catches for OUT, direct wall hits for 4s & 6s, taped tennis balls, and window-break penalties!',
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
    }, 150);

    // Play Card Hover Sound Effect
    if (window.sounds && typeof window.sounds.playNav === 'function') {
      window.sounds.playNav();
    }
  }

  function initDashboard() {
    const cards = document.querySelectorAll('.ps5-game-card');
    cards.forEach((card, idx) => {
      card.addEventListener('mouseenter', () => {
        selectedGameIndex = idx;
        selectGame(selectedGameIndex);
      });
      card.addEventListener('click', () => {
        selectedGameIndex = idx;
        selectGame(selectedGameIndex);
        const gameId = card.getAttribute('data-game');
        window.ps5LaunchGame(gameId);
      });
    });

    // Keyboard Controller Navigation (Left / Right Arrows & Cross/Enter to Launch)
    window.addEventListener('keydown', (e) => {
      // If modal or search is open, do not hijack keys
      if (document.querySelector('.ps5-modal-overlay.active') || document.activeElement.tagName === 'INPUT') {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'd') {
        if (selectedGameIndex < gamesMetadata.length - 1) {
          selectedGameIndex++;
          selectGame(selectedGameIndex);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'a') {
        if (selectedGameIndex > 0) {
          selectedGameIndex--;
          selectGame(selectedGameIndex);
        }
      } else if (e.key === 'Enter' || e.key === ' ') {
        const activeCard = cards[selectedGameIndex];
        if (activeCard) {
          const gameId = activeCard.getAttribute('data-game');
          window.ps5LaunchGame(gameId);
        }
      }
    });

    // Play Game Button Click
    const playBtn = document.getElementById('ps5-play-game');
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        const activeCard = cards[selectedGameIndex];
        if (activeCard) {
          const gameId = activeCard.getAttribute('data-game');
          window.ps5LaunchGame(gameId);
        }
      });
    }

    // Pair Controller Button Handler
    const pairBtn = document.getElementById('btn-controller-pair');
    if (pairBtn) {
      pairBtn.addEventListener('click', () => {
        if (typeof window.ps5OpenControllerModal === 'function') {
          window.ps5OpenControllerModal();
        }
      });
    }

    // Profile Avatar Button Handler
    const profileBtn = document.getElementById('btn-profile');
    if (profileBtn) {
      profileBtn.addEventListener('click', () => {
        if (typeof window.ps5OpenProfileModal === 'function') {
          window.ps5OpenProfileModal();
        }
      });
    }

    // Initial select
    selectGame(0);
    initClock();
  }

  function initClock() {
    const timeEl = document.getElementById('ps5-clock-display');
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
          ['ps5-friends-modal', 'ps5-profile-modal', 'ps5-controller-modal'].forEach(id => {
            const el = document.getElementById(id);
            if (el) document.body.appendChild(el);
          });
          root.remove();
        }
        if (typeof window.launchCricketGame === 'function') {
          window.launchCricketGame();
        }
      } else if (gameId === 'football' || gameId === 'rematch' || gameId === 'lagori' || gameId === 'gullycricket' || gameId === 'f1' || gameId === 'tennis' || gameId === 'wwe' || gameId === 'fps') {
        const code = roomCode || '';
        let url = `/f1/index.html?room=${code}`;
        if (gameId === 'football') url = `/football/index.html?room=${code}`;
        else if (gameId === 'rematch') url = `/rematch/index.html?game=rematch&room=${code}`;
        else if (gameId === 'lagori') url = `/rematch/index.html?game=lagori&room=${code}`;
        else if (gameId === 'gullycricket') url = `/rematch/index.html?game=gullycricket&room=${code}`;
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

        setTimeout(() => {
          if (launchOverlay) launchOverlay.classList.remove('active');
        }, 1200);
      }
    }, 1400);
  };

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
  } else {
    initDashboard();
  }
})();
