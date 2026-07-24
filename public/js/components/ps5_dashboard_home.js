/**
 * PlaySphere 5 — Dashboard Home Logic (v3 — buttons fixed, fullscreen, music)
 */
(function () {
  'use strict';

  /* ── GAME METADATA ── */
  const GAMES = [
    {
      id: 'lagori',
      title: 'Lagori 7 Stones 3D',
      pill: 'ESRB: E',
      rating: '⭐ 5.0 Rating',
      dev: 'DeepMind India Arcade',
      desc: 'Traditional Indian 3D street game! Throw the tennis ball to knock down the 7-stone stack, run to pick up scattered stones, and rebuild the tower at the center pedestal while dodging defender throws!'
    },
    {
      id: 'gullycricket',
      title: 'Gully Cricket 3D',
      pill: 'ESRB: E',
      rating: '⭐ 5.0 Rating',
      dev: 'DeepMind India Arcade',
      desc: 'Authentic Indian street cricket! Play in narrow asphalt gullies. Features One-Tippi catches for OUT, direct wall hits for 4s & 6s, taped tennis balls, and window-break penalties!'
    },
    {
      id: 'rematch',
      title: 'Rematch Football',
      pill: 'ESRB: E',
      rating: '⭐ 4.9 Rating',
      dev: 'DeepMind Arcade',
      desc: 'Fast-paced 3D arcade soccer with zero rules! Physics-based ball dynamics, dynamic goalkeeper diving, visual shot charging, sliding tackle dashes, and smart bot opponents.'
    },
    {
      id: 'football',
      title: 'Football Pro 2026',
      pill: 'ESRB: E',
      rating: '⭐ 4.8 Rating',
      dev: 'DeepMind Football',
      desc: 'Next-generation 3D physics-driven football simulation. Responsive pass/shoot dynamics, spectacular curve ball VFX, player running/kicking animations, and dual phone controller support.'
    },
    {
      id: 'cricket',
      title: 'Cricket Pro 2026',
      pill: 'ESRB: E',
      rating: '⭐ 4.9 Rating',
      dev: 'DeepMind Sports',
      desc: 'Next-generation 3D physics-driven cricket gameplay. Timing-based batting, circular catch dials, throw QTEs, and slow-motion 3rd umpire referrals.'
    },
    {
      id: 'f1',
      title: 'Apex Stars: Chibi F1',
      pill: 'ESRB: E',
      rating: '⭐ 4.9 Rating',
      dev: 'DeepMind Karting',
      desc: 'High-octane cartoon F1 kart racing! Choose your bobblehead driver, collect glowing power-up stars, drift around hairpins for speed boosts, and fire soda rockets to cross the line first!'
    },
    {
      id: 'tennis',
      title: 'Chibi Tennis Duel',
      pill: 'ESRB: E',
      rating: '⭐ 4.8 Rating',
      dev: 'DeepMind Tennis',
      desc: 'Local 2-player arcade tennis! Connect two phones as controllers, select your match points, and clash in high-octane 3D split-screen rallies!'
    },
    {
      id: 'wwe',
      title: 'WWE Chibi Rumble',
      pill: 'ESRB: T',
      rating: '⭐ 4.9 Rating',
      dev: 'DeepMind Wrestling',
      desc: 'Lightweight 2.5D wrestling battle! Punch, grapple, slam, throw your opponent into ropes for rebounds, and trigger cinematic finishers before pinning for the 1-2-3!'
    },
    {
      id: 'fps',
      title: 'Delhi Defiance',
      pill: 'ESRB: T',
      rating: '⭐ 4.9 Rating',
      dev: 'DeepMind Tactical',
      desc: '5v5 tactical first-person shooter! Choose Agni or Vayu, deploy unique abilities, eliminate enemy bots, and hold your line in the futuristic ruins of Rajdhani!'
    }
  ];

  let selectedIndex = 0;
  let cards = [];

  /* ── HELPERS ── */
  function openModal(id) {
    const el = document.getElementById(id);
    if (el) {
      el.style.display = '';
      el.classList.add('show');
    }
  }

  /* ── SELECT GAME ── */
  function selectGame(index) {
    selectedIndex = index;
    cards.forEach((c, i) => c.classList.toggle('selected', i === index));

    // Scroll into center
    const shelf = document.getElementById('ps5-shelf');
    const card  = cards[index];
    if (shelf && card) {
      const target = card.offsetLeft - shelf.offsetWidth / 2 + card.offsetWidth / 2;
      shelf.scrollTo({ left: target, behavior: 'smooth' });
    }

    // Animate details panel change
    const details = document.getElementById('ps5-details');
    if (details) details.classList.remove('visible');

    setTimeout(() => {
      const g = GAMES[index];
      const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      set('game-title',  g.title);
      set('game-desc',   g.desc);
      set('game-pill',   g.pill);
      set('game-rating', g.rating);
      set('game-dev',    g.dev);
      if (details) details.classList.add('visible');
    }, 150);

    if (window.sounds && typeof window.sounds.playNav === 'function') window.sounds.playNav();
  }

  /* ── LAUNCH GAME ── */
  window.ps5LaunchGame = function (gameId, roomCode) {
    if (window.ps5YtPlayer && window.ps5YtReady) {
      try { window.ps5YtPlayer.pauseVideo(); } catch (e) {}
    }

    const overlay = document.getElementById('ps5-launch');
    if (overlay) overlay.classList.add('active');
    if (window.sounds && typeof window.sounds.playLaunch === 'function') window.sounds.playLaunch();

    setTimeout(() => {
      const root = document.getElementById('ps5-console-root');

      if (gameId === 'cricket') {
        if (typeof window.animationFrameId !== 'undefined') cancelAnimationFrame(window.animationFrameId);
        if (typeof window.resizeBgCanvas === 'function') window.removeEventListener('resize', window.resizeBgCanvas);
        ['ps5-friends-modal', 'ps5-profile-modal', 'ps5-controller-modal'].forEach(id => {
          const el = document.getElementById(id);
          if (el) document.body.appendChild(el);
        });
        if (root) root.remove();
        if (typeof window.launchCricketGame === 'function') window.launchCricketGame();
        return;
      }

      const code = roomCode || '';
      const urls = {
        football:     `/football/index.html?room=${code}`,
        rematch:      `/rematch/index.html?game=rematch&room=${code}`,
        lagori:       `/rematch/index.html?game=lagori&room=${code}`,
        gullycricket: `/rematch/index.html?game=gullycricket&room=${code}`,
        f1:           `/f1/index.html?room=${code}`,
        tennis:       `/tennis/index.html?room=${code}`,
        wwe:          `/wwe/index.html?room=${code}`,
        fps:          `/fps/index.html?room=${code}`
      };
      const url = urls[gameId];
      if (!url) { if (overlay) overlay.classList.remove('active'); return; }

      let iframe = document.getElementById('game-session-iframe');
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'game-session-iframe';
        iframe.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;border:none;z-index:999999;background:#000;';
        iframe.setAttribute('allow', 'fullscreen');
        iframe.setAttribute('allowfullscreen', 'true');
        document.body.appendChild(iframe);
      }
      iframe.src = url;
      setTimeout(() => { if (overlay) overlay.classList.remove('active'); }, 1200);
    }, 1400);
  };

  /* ── FULLSCREEN TOGGLE ── */
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  /* ── CLOCK ── */
  function initClock() {
    const el = document.getElementById('ps5-clock-display');
    const tick = () => {
      const d  = new Date();
      let h    = d.getHours();
      const m  = String(d.getMinutes()).padStart(2, '0');
      const ap = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      if (el) el.textContent = `${h}:${m} ${ap}`;
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ── PARTICLE BACKGROUND ── */
  function initParticles() {
    const canvas = document.getElementById('ps5-bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.resizeBgCanvas = resize;
    window.addEventListener('resize', resize);

    const particles = Array.from({ length: 90 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.4 + 0.3,
      dx: (Math.random() - 0.5) * 0.25,
      dy: -(Math.random() * 0.35 + 0.05),
      alpha: Math.random() * 0.45 + 0.08
    }));

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(96,165,250,${p.alpha})`;
        ctx.fill();
        p.x += p.dx;
        p.y += p.dy;
        if (p.y < -5)              { p.y = canvas.height + 5; p.x = Math.random() * canvas.width; }
        if (p.x < -5)              p.x = canvas.width + 5;
        if (p.x > canvas.width + 5) p.x = -5;
      });
      window.animationFrameId = requestAnimationFrame(draw);
    }
    draw();
  }

  /* ── INIT ── */
  function init() {
    cards = Array.from(document.querySelectorAll('.psd-card'));

    // Card hover + click
    cards.forEach((card, idx) => {
      card.addEventListener('mouseenter', () => selectGame(idx));
      card.addEventListener('click', () => {
        selectGame(idx);
        window.ps5LaunchGame(card.dataset.game);
      });
    });

    // Keyboard navigation
    window.addEventListener('keydown', e => {
      // Fullscreen on F
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
        return;
      }

      // Skip if modal open or user typing
      if (document.querySelector('.ps5-profile-modal.show') ||
          document.activeElement.tagName === 'INPUT') return;

      if (e.key === 'ArrowRight' || e.key === 'd') {
        if (selectedIndex < GAMES.length - 1) selectGame(selectedIndex + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'a') {
        if (selectedIndex > 0) selectGame(selectedIndex - 1);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const card = cards[selectedIndex];
        if (card) window.ps5LaunchGame(card.dataset.game);
      }
    });

    // Play button
    const playBtn = document.getElementById('ps5-play-game');
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        const card = cards[selectedIndex];
        if (card) window.ps5LaunchGame(card.dataset.game);
      });
    }

    // ── CONTROLLER BUTTON ──
    // Opens the #ps5-controller-modal by adding 'show' class
    // The QR code / room code is populated by socket_manager.js
    const ctrlBtn = document.getElementById('btn-controller-pair');
    if (ctrlBtn) {
      ctrlBtn.addEventListener('click', () => {
        openModal('ps5-controller-modal');
      });
    }

    // ── PROFILE BUTTON ──
    // Opens the #ps5-profile-modal by adding 'show' class
    // Profile modal JS handles auth state / login / profile display
    const profBtn = document.getElementById('btn-profile');
    if (profBtn) {
      profBtn.addEventListener('click', () => {
        openModal('ps5-profile-modal');
        if (typeof window.syncPlaySphereProfileDisplay === 'function') {
          window.syncPlaySphereProfileDisplay();
        }
      });
    }

    // ── FRIENDS BUTTON ──
    // Uses window.friendsManager.openFriendsModal() from ps5_friends_modal.js
    const friendsBtn = document.getElementById('btn-friends');
    if (friendsBtn) {
      friendsBtn.addEventListener('click', () => {
        if (window.friendsManager && typeof window.friendsManager.openFriendsModal === 'function') {
          window.friendsManager.openFriendsModal();
        } else {
          // fallback — open the modal directly
          openModal('ps5-friends-modal');
        }
      });
    }

    // ── TABS ──
    document.querySelectorAll('.psd-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.psd-tab').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Initial state
    selectGame(0);
    initClock();
    initParticles();

    // Start YouTube music after first interaction (browser audio policy)
    const startMusic = () => {
      if (typeof window.ps5LoadYouTubeAPI === 'function') window.ps5LoadYouTubeAPI();
      window.removeEventListener('click', startMusic);
      window.removeEventListener('keydown', startMusic);
    };
    window.addEventListener('click', startMusic);
    window.addEventListener('keydown', startMusic);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
