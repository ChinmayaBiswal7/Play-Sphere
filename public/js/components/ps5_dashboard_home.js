/**
 * PlaySphere 5 — Dashboard Home Logic (v4 — Hero Layout)
 */
(function () {
  'use strict';

  /* ── GAME METADATA ── */
  const GAMES = [
    {
      id: 'blockzone',
      img: '/battleroyale_card.jpg',
      title: 'Block Zone: Battle Royale',
      pill: 'ESRB: T', rating: '⭐ 5.0 Rating', dev: 'DeepMind Survival Studios',
      desc: '20-player mini Battle Royale on a compact blocky island! Drop from the sky, loot houses and forests, fight 19 AI bots, and stay inside the shrinking blue zone. Last one alive wins!'
    },
    {
      id: 'lagori',
      img: '/lagori_card.png',
      title: 'Lagori 7 Stones 3D',
      pill: 'ESRB: E', rating: '⭐ 5.0 Rating', dev: 'DeepMind India Arcade',
      desc: 'Traditional Indian 3D street game! Throw the tennis ball to knock down the 7-stone stack, run to pick up scattered stones, and rebuild the tower at the center pedestal while dodging defender throws!'
    },
    {
      id: 'kurukshetra',
      img: '/kurukshetra_card.jpg',
      title: 'Kurukshetra: Gods Battle',
      pill: 'ESRB: E10+', rating: '⭐ 5.0 Rating', dev: 'DeepMind Mythology Studios',
      desc: 'Indian, Greek & Egyptian gods clash on the legendary Mahabharata battlefield! Real-time card battles, Karma Orb system, Dharma Surge comebacks, 35+ divine cards, online PvP & AI modes!'
    },
    {
      id: 'gullycricket',
      img: '/gully_cricket_card.png',
      title: 'Gully Cricket 3D',
      pill: 'ESRB: E', rating: '⭐ 5.0 Rating', dev: 'DeepMind India Arcade',
      desc: 'Authentic Indian street cricket! Play in narrow asphalt gullies. Features One-Tippi catches for OUT, direct wall hits for 4s & 6s, taped tennis balls, and window-break penalties!'
    },
    {
      id: 'rematch',
      img: '/rematch_card.png',
      title: 'Rematch Football',
      pill: 'ESRB: E', rating: '⭐ 4.9 Rating', dev: 'DeepMind Arcade',
      desc: 'Fast-paced 3D arcade soccer with zero rules! Physics-based ball dynamics, dynamic goalkeeper diving, visual shot charging, sliding tackle dashes, and smart bot opponents.'
    },
    {
      id: 'football',
      img: '/football_card.png',
      title: 'Football Pro 2026',
      pill: 'ESRB: E', rating: '⭐ 4.8 Rating', dev: 'DeepMind Football',
      desc: 'Next-generation 3D physics-driven football. Responsive pass/shoot dynamics, spectacular curve ball VFX, player running/kicking animations, and dual phone controller support.'
    },
    {
      id: 'cricket',
      img: '/cricket_card.png',
      title: 'Cricket Pro 2026',
      pill: 'ESRB: E', rating: '⭐ 4.9 Rating', dev: 'DeepMind Sports',
      desc: 'Next-generation 3D physics-driven cricket gameplay. Timing-based batting, circular catch dials, throw QTEs, and slow-motion 3rd umpire referrals.'
    },
    {
      id: 'f1',
      img: '/f1_card.svg',
      title: 'Apex Stars: Chibi F1',
      pill: 'ESRB: E', rating: '⭐ 4.9 Rating', dev: 'DeepMind Karting',
      desc: 'High-octane cartoon F1 kart racing! Choose your bobblehead driver, collect glowing power-up stars, drift around hairpins for speed boosts, and fire soda rockets to cross the line!'
    },
    {
      id: 'tennis',
      img: '/tennis_card.png',
      title: 'Chibi Tennis Duel',
      pill: 'ESRB: E', rating: '⭐ 4.8 Rating', dev: 'DeepMind Tennis',
      desc: 'Local 2-player arcade tennis! Connect two phones as controllers, select your match points, and clash in high-octane 3D split-screen rallies!'
    },
    {
      id: 'wwe',
      img: '/wwe_card.svg',
      title: 'WWE Chibi Rumble',
      pill: 'ESRB: T', rating: '⭐ 4.9 Rating', dev: 'DeepMind Wrestling',
      desc: 'Lightweight 2.5D wrestling battle! Punch, grapple, slam, throw your opponent into ropes for rebounds, and trigger cinematic finishers before pinning for the 1-2-3!'
    },
    {
      id: 'fps',
      img: '/fps_card.png',
      title: 'Delhi Defiance',
      pill: 'ESRB: T', rating: '⭐ 4.9 Rating', dev: 'DeepMind Tactical',
      desc: '5v5 tactical first-person shooter! Choose Agni or Vayu, deploy unique abilities, eliminate enemy bots, and hold your line in the futuristic ruins of Rajdhani!'
    }
  ];

  let selectedIndex = 0;
  let cards = [];
  let navLocked = false; // debounce for keyboard nav

  /* ── OPEN MODAL ── */
  function openModal(id) {
    const el = document.getElementById(id);
    if (el) { el.style.display = ''; el.classList.add('show'); }
  }

  /* ── SELECT GAME ── */
  function selectGame(index) {
    selectedIndex = index;
    cards.forEach((c, i) => c.classList.toggle('selected', i === index));

    // Center card in shelf
    const shelf = document.getElementById('ps5-shelf');
    const card  = cards[index];
    if (shelf && card) {
      shelf.scrollTo({ left: card.offsetLeft - shelf.offsetWidth / 2 + card.offsetWidth / 2, behavior: 'smooth' });
    }

    // Update hero background (blurred game art)
    const heroBg = document.getElementById('psd-hero-bg');
    if (heroBg) {
      heroBg.style.backgroundImage = `url('${GAMES[index].img}')`;
    }

    // Update Steam-like clear key art banner image
    const heroBanner = document.getElementById('psd-hero-banner');
    if (heroBanner) {
      heroBanner.style.backgroundImage = `url('${GAMES[index].img}')`;
    }

    // Animate hero content
    const content = document.getElementById('ps5-details');
    if (content) content.classList.remove('visible');

    setTimeout(() => {
      const g = GAMES[index];
      const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      set('game-title',  g.title);
      set('game-desc',   g.desc);
      set('game-pill',   g.pill);
      set('game-rating', g.rating);
      set('game-dev',    g.dev);
      if (content) content.classList.add('visible');
    }, 160);

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
        ['ps5-friends-modal','ps5-profile-modal','ps5-controller-modal'].forEach(id => {
          const el = document.getElementById(id);
          if (el) document.body.appendChild(el);
        });
        if (root) root.remove();
        if (typeof window.launchCricketGame === 'function') window.launchCricketGame();
        return;
      }
      const code = roomCode || '';
      const urls = {
        blockzone:    `/blockzone/index.html`,
        football:     `/football/index.html?room=${code}`,
        rematch:      `/rematch/index.html?game=rematch&room=${code}`,
        lagori:       `/rematch/index.html?game=lagori&room=${code}`,
        gullycricket: `/rematch/index.html?game=gullycricket&room=${code}`,
        f1:           `/f1/index.html?room=${code}`,
        tennis:       `/tennis/index.html?room=${code}`,
        wwe:          `/wwe/index.html?room=${code}`,
        fps:          `/fps/index.html?room=${code}`,
        kurukshetra:  `/kurukshetra/index.html?room=${code}`
      };
      const url = urls[gameId];
      if (!url) { if (overlay) overlay.classList.remove('active'); return; }
      let iframe = document.getElementById('game-session-iframe');
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'game-session-iframe';
        iframe.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;border:none;z-index:999999;background:#000;';
        iframe.setAttribute('allow','fullscreen');
        document.body.appendChild(iframe);
      }
      iframe.src = url;
      setTimeout(() => { if (overlay) overlay.classList.remove('active'); }, 1200);
    }, 1400);
  };

  /* ── FULLSCREEN ── */
  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  }

  /* ── CLOCK ── */
  function initClock() {
    const tick = () => {
      try {
        const el = document.getElementById('ps5-clock-display');
        if (!el) return;
        const d = new Date();
        let h = d.getHours();
        const m = String(d.getMinutes()).padStart(2,'0');
        const ap = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        el.textContent = `${h}:${m} ${ap}`;
      } catch(e) {}
    };
    tick();
    setInterval(tick, 1000);
  }
  // Also expose globally so ps5_boot.js can call window.startClock()
  window.startClock = initClock;

  /* ── PARTICLES ── */
  function initParticles() {
    const canvas = document.getElementById('ps5-bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    resize();
    window.resizeBgCanvas = resize;
    window.addEventListener('resize', resize);
    const pts = Array.from({ length: 70 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.3 + 0.3,
      dx: (Math.random() - 0.5) * 0.22,
      dy: -(Math.random() * 0.3 + 0.05),
      a: Math.random() * 0.4 + 0.08
    }));
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(96,165,250,${p.a})`; ctx.fill();
        p.x += p.dx; p.y += p.dy;
        if (p.y < -5) { p.y = canvas.height + 5; p.x = Math.random() * canvas.width; }
        if (p.x < -5) p.x = canvas.width + 5;
        if (p.x > canvas.width + 5) p.x = -5;
      });
      window.animationFrameId = requestAnimationFrame(draw);
    }
    draw();
  }

  /* ── INIT ── */
  function init() {
    // Pre-cache all game card images immediately
    GAMES.forEach(g => {
      const img = new Image();
      img.src = g.img;
    });

    cards = Array.from(document.querySelectorAll('.psd-card'));

    cards.forEach((card, idx) => {
      card.addEventListener('mouseenter', () => selectGame(idx));
      card.addEventListener('click', () => { selectGame(idx); window.ps5LaunchGame(card.dataset.game); });
    });

    // Keyboard nav — debounced to prevent double-skip
    window.addEventListener('keydown', e => {
      if (e.key === 'f' || e.key === 'F') { toggleFullscreen(); return; }
      if (document.querySelector('.ps5-profile-modal.show') || document.activeElement.tagName === 'INPUT') return;

      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'ArrowLeft' || e.key === 'a') {
        if (navLocked) return; // block rapid repeats
        navLocked = true;
        setTimeout(() => { navLocked = false; }, 220);

        if ((e.key === 'ArrowRight' || e.key === 'd') && selectedIndex < cards.length - 1) {
          selectGame(selectedIndex + 1);
        } else if ((e.key === 'ArrowLeft' || e.key === 'a') && selectedIndex > 0) {
          selectGame(selectedIndex - 1);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        // Always read game ID directly from the selected card element — never from GAMES array index
        const card = cards[selectedIndex];
        if (card && card.dataset.game) window.ps5LaunchGame(card.dataset.game);
      }
    });

    // Play button
    const playBtn = document.getElementById('ps5-play-game');
    if (playBtn) playBtn.addEventListener('click', () => { const c = cards[selectedIndex]; if (c) window.ps5LaunchGame(c.dataset.game); });

    // Controller button
    const ctrlBtn = document.getElementById('btn-controller-pair');
    if (ctrlBtn) ctrlBtn.addEventListener('click', () => openModal('ps5-controller-modal'));

    // Profile button
    const profBtn = document.getElementById('btn-profile');
    if (profBtn) profBtn.addEventListener('click', () => {
      openModal('ps5-profile-modal');
      if (typeof window.syncPlaySphereProfileDisplay === 'function') window.syncPlaySphereProfileDisplay();
    });

    // Friends button
    const friendsBtn = document.getElementById('btn-friends');
    if (friendsBtn) friendsBtn.addEventListener('click', () => {
      if (window.friendsManager && typeof window.friendsManager.openFriendsModal === 'function') {
        window.friendsManager.openFriendsModal();
      } else {
        openModal('ps5-friends-modal');
      }
    });

    // Search button & modal logic
    const searchBtn = document.getElementById('btn-search');
    const searchModal = document.getElementById('ps5-search-modal');
    const searchCloseBtn = document.getElementById('ps5-search-close-btn');
    const searchInput = document.getElementById('ps5-game-search-input');
    const searchClear = document.getElementById('ps5-game-search-clear');
    const searchResultsGrid = document.getElementById('ps5-search-results-grid');
    const filterPills = document.querySelectorAll('.ps5-filter-pill');

    let currentSearchGenre = 'all';

    const GENRE_MAP = {
      blockzone: ['battle-royale', 'action', 'arcade'],
      lagori: ['arcade', 'sports', 'action'],
      kurukshetra: ['action', 'pvp', 'arcade'],
      gullycricket: ['sports', 'arcade'],
      rematch: ['sports', 'arcade', 'pvp'],
      football: ['sports', 'pvp'],
      cricket: ['sports', 'pvp'],
      f1: ['arcade', 'sports'],
      tennis: ['sports', 'arcade', 'pvp'],
      wwe: ['action', 'arcade', 'pvp'],
      fps: ['action', 'pvp']
    };

    function renderSearchResults(filterText = '', genre = 'all') {
      if (!searchResultsGrid) return;
      searchResultsGrid.innerHTML = '';
      const q = filterText.trim().toLowerCase();

      const matched = GAMES.filter(g => {
        const matchesQuery = !q || g.title.toLowerCase().includes(q) || g.desc.toLowerCase().includes(q) || g.dev.toLowerCase().includes(q);
        const matchesGenre = genre === 'all' || (GENRE_MAP[g.id] && GENRE_MAP[g.id].includes(genre));
        return matchesQuery && matchesGenre;
      });

      if (matched.length === 0) {
        searchResultsGrid.innerHTML = `<div class="ps5-search-no-results">No games found matching "${filterText}". Try another search!</div>`;
        return;
      }

      matched.forEach(g => {
        const item = document.createElement('div');
        item.className = 'ps5-search-result-item';
        item.innerHTML = `
          <img class="ps5-sri-thumb" src="${g.img}" alt="${g.title}">
          <div class="ps5-sri-body">
            <div class="ps5-sri-title">${g.title}</div>
            <div class="ps5-sri-dev">${g.dev}</div>
            <div class="ps5-sri-footer">
              <span class="ps5-sri-pill">${g.pill}</span>
              <button class="ps5-sri-launch-btn">PLAY</button>
            </div>
          </div>
        `;
        item.onclick = () => {
          if (searchModal) { searchModal.classList.remove('show'); searchModal.style.display = 'none'; }
          window.ps5LaunchGame(g.id);
        };
        searchResultsGrid.appendChild(item);
      });
    }

    if (searchBtn) {
      searchBtn.addEventListener('click', () => {
        openModal('ps5-search-modal');
        if (searchInput) {
          searchInput.value = '';
          setTimeout(() => searchInput.focus(), 100);
        }
        currentSearchGenre = 'all';
        filterPills.forEach(p => p.classList.toggle('active', p.dataset.genre === 'all'));
        renderSearchResults('', 'all');
      });
    }

    if (searchCloseBtn) {
      searchCloseBtn.addEventListener('click', () => {
        if (searchModal) { searchModal.classList.remove('show'); searchModal.style.display = 'none'; }
      });
    }

    if (searchModal) {
      searchModal.addEventListener('click', (e) => {
        if (e.target === searchModal) {
          searchModal.classList.remove('show');
          searchModal.style.display = 'none';
        }
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const val = e.target.value;
        if (searchClear) searchClear.style.display = val ? 'block' : 'none';
        renderSearchResults(val, currentSearchGenre);
      });
    }

    if (searchClear) {
      searchClear.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        searchClear.style.display = 'none';
        renderSearchResults('', currentSearchGenre);
        searchInput.focus();
      });
    }

    filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        filterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentSearchGenre = pill.dataset.genre || 'all';
        renderSearchResults(searchInput ? searchInput.value : '', currentSearchGenre);
      });
    });

    // Settings button & overlay logic
    const settingsBtn = document.getElementById('btn-settings');
    const settingsScreen = document.getElementById('settings-screen');
    const settingsBackBtn = document.getElementById('settings-back-btn');
    const settingsSaveBtn = document.getElementById('menu-btn-save-settings');

    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        if (settingsScreen) {
          settingsScreen.classList.remove('hidden');
          // Load settings values from localStorage if available
          const savedVol = localStorage.getItem('playsphere_master_vol');
          if (savedVol !== null) {
            const volSlider = document.getElementById('menu-setting-vol-master');
            const volVal = document.getElementById('menu-setting-vol-master-val');
            if (volSlider) volSlider.value = savedVol;
            if (volVal) volVal.textContent = Math.round(parseFloat(savedVol) * 100) + '%';
          }
        }
      });
    }

    if (settingsBackBtn) {
      settingsBackBtn.addEventListener('click', () => {
        if (settingsScreen) settingsScreen.classList.add('hidden');
      });
    }

    if (settingsSaveBtn) {
      settingsSaveBtn.addEventListener('click', () => {
        const volSlider = document.getElementById('menu-setting-vol-master');
        if (volSlider) localStorage.setItem('playsphere_master_vol', volSlider.value);
        if (settingsScreen) settingsScreen.classList.add('hidden');
      });
    }

    // Tabs
    document.querySelectorAll('.psd-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.psd-tab').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    selectGame(0);
    initClock();
    initParticles();

    // Music starts on first user click only (removed keydown to avoid nav interference)
    const startMusic = () => {
      if (typeof window.ps5LoadYouTubeAPI === 'function') window.ps5LoadYouTubeAPI();
      window.removeEventListener('click', startMusic);
    };
    window.addEventListener('click', startMusic);
  }

  function safeInit() {
    try { init(); } catch(e) { console.error('[PS5Dashboard] init error:', e); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', safeInit);
  else safeInit();

  // Fallback: re-run selectGame + clock 500ms after page load in case of race conditions
  window.addEventListener('load', () => {
    setTimeout(() => {
      try {
        const el = document.getElementById('ps5-clock-display');
        if (el && (el.textContent === '00:00 AM' || el.textContent === '')) initClock();
        if (cards && cards.length > 0) selectGame(selectedIndex);
      } catch(e) {}
    }, 500);
  });

})();
