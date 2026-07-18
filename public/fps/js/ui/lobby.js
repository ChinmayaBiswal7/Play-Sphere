/* ==========================================================================
   DELHI DEFIANCE — LOBBY DASHBOARD CONTROLLER & 3D HOLOGRAM
   ========================================================================== */

class LobbyUIManager {
  constructor() {
    this.hologramScene    = null;
    this.hologramCamera   = null;
    this.hologramRenderer = null;
    this.hologramMesh     = null;
    this.particles        = null;
    this.hologramAnimId   = null;
  }

  init() {
    this.setupTabs();
    this.setupActions();
  }

  /* ── TAB SWITCHING ────────────────────────────── */
  setupTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    const views = {
      lobby:   document.getElementById('sub-view-lobby'),
      career:  document.getElementById('sub-view-career'),
      agents:  document.getElementById('sub-view-agents'),
      loadout: document.getElementById('sub-view-loadout'),
      store:   document.getElementById('sub-view-store'),
    };

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        if (window.SynthAudio) window.SynthAudio.playClick();

        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const key = tab.getAttribute('data-tab');
        Object.values(views).forEach(v => { if (v) v.style.display = 'none'; });
        if (views[key]) views[key].style.display = 'flex';

        window.FPSState.activeTab = key;
        if (key === 'agents') this.updateAgentsTabDetails('agni');
      });
    });

    // Agent catalog selector inside Agents tab
    const agentRosterBtns = document.querySelectorAll('.agent-select-btn');
    agentRosterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (window.SynthAudio) window.SynthAudio.playClick();
        agentRosterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.updateAgentsTabDetails(btn.getAttribute('data-agent'));
      });
    });
  }

  updateAgentsTabDetails(agentId) {
    window.FPSState.selectedAgentId = agentId;
    const nameEl = document.getElementById('agents-info-name');
    const roleEl = document.getElementById('agents-info-role');
    const bioEl  = document.getElementById('agents-info-bio');
    const abEl   = document.querySelector('.abilities-list');
    if (!nameEl) return;

    const agent = window.AGENT_REGISTRY[agentId] || window.AGENT_REGISTRY['agni'];
    nameEl.innerText = agent.name;
    roleEl.innerText = agent.role;
    
    if (agent.role === 'DUELIST') roleEl.style.color = 'var(--neon-red)';
    else if (agent.role === 'INITIATOR') roleEl.style.color = 'var(--neon-cyan)';
    else if (agent.role === 'CONTROLLER') roleEl.style.color = '#a855f7';
    else if (agent.role === 'SENTINEL') roleEl.style.color = '#eab308';

    bioEl.innerText = agent.passiveDesc;
    if (abEl) {
      abEl.innerHTML = `
        <div class="ability-card"><strong>[Q] ${agent.abilities.q.name}</strong><span>${agent.abilities.q.description}</span></div>
        <div class="ability-card"><strong>[E] ${agent.abilities.e.name}</strong><span>${agent.abilities.e.description}</span></div>
        <div class="ability-card"><strong>[X] ${agent.abilities.x.name}</strong><span>${agent.abilities.x.description}</span></div>`;
    }
    this.updateHologramAppearance(agentId);
  }

  /* ── ACTION BUTTONS ────────────────────────────── */
  setupActions() {
    // Buy skin
    document.querySelectorAll('.buy-skin-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cost = parseInt(btn.getAttribute('data-price'));
        const skin = btn.getAttribute('data-skin');
        if (window.FPSState.currentUser.coins >= cost) {
          window.FPSState.currentUser.coins -= cost;
          if (window.SynthAudio) window.SynthAudio.playHeadshot();
          btn.innerText = '✔ OWNED';
          btn.style.opacity = '0.5';
          btn.style.pointerEvents = 'none';
          this.syncLobbyProfile();
        } else {
          if (window.SynthAudio) window.SynthAudio.playClick();
        }
      });
    });

    // Skin selects
    const pSkin = document.getElementById('loadout-primary-skin');
    const sSkin = document.getElementById('loadout-secondary-skin');
    if (pSkin) pSkin.addEventListener('change', e => { window.FPSState.loadout.primarySkin = e.target.value; });
    if (sSkin) sSkin.addEventListener('change', e => { window.FPSState.loadout.secondarySkin = e.target.value; });

    // ── PLAY MATCH BUTTON → go to map select ──
    const playBtn = document.getElementById('btn-lobby-play');
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        if (window.SynthAudio) window.SynthAudio.playClick();
        document.getElementById('lobby-screen').style.display = 'none';
        document.getElementById('play-mode-screen').style.display = 'flex';
        window.FPSState.gameState = 'PLAY_SELECT';
      });
    }

    // BACK from map select
    const backBtn = document.getElementById('btn-play-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (window.SynthAudio) window.SynthAudio.playClick();
        document.getElementById('play-mode-screen').style.display = 'none';
        document.getElementById('lobby-screen').style.display = 'flex';
        window.FPSState.gameState = 'LOBBY';
      });
    }

    // CONTINUE from map select → agent select
    const continueBtn = document.getElementById('btn-play-continue');
    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        if (window.SynthAudio) window.SynthAudio.playClick();
        document.getElementById('play-mode-screen').style.display = 'none';
        document.getElementById('agent-select-screen').style.display = 'flex';
        window.FPSState.gameState = 'AGENT_SELECT';
        if (window.agentSelectUI) window.agentSelectUI.startCountdown();
      });
    }

    // Mode buttons
    const btnAI = document.getElementById('btn-mode-ai');
    if (btnAI) btnAI.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btnAI.classList.add('active');
      window.FPSState.gameMode = 'AI';
    });

    // ── MULTIPLAYER ACTIONS ──
    const btnHost = document.getElementById('btn-mp-host');
    const btnJoin = document.getElementById('btn-mp-join');
    const btnSubmitJoin = document.getElementById('btn-mp-submit-join');
    const inputContainer = document.getElementById('mp-join-input-container');
    const roomCodeInput = document.getElementById('mp-room-code-input');
    const btnLeaveLobby = document.getElementById('lobby-leave-button');
    const btnStartMatch = document.getElementById('lobby-start-button');

    if (btnHost) {
      btnHost.addEventListener('click', () => {
        if (window.SynthAudio) window.SynthAudio.playClick();
        const agent = window.FPSState.selectedAgentId || 'agni';
        const name = window.FPSState.currentUser.username || 'Gamer';
        if (window.FPSGameLoop && window.FPSGameLoop.multiplayer) {
          window.FPSGameLoop.multiplayer.createRoom(agent, name);
          document.getElementById('multiplayer-lobby-overlay').style.display = 'flex';
        }
      });
    }

    if (btnJoin) {
      btnJoin.addEventListener('click', () => {
        if (window.SynthAudio) window.SynthAudio.playClick();
        if (inputContainer) {
          inputContainer.style.display = inputContainer.style.display === 'none' ? 'flex' : 'none';
        }
      });
    }

    if (btnSubmitJoin) {
      btnSubmitJoin.addEventListener('click', () => {
        if (window.SynthAudio) window.SynthAudio.playClick();
        const code = roomCodeInput ? roomCodeInput.value.trim() : '';
        if (!code) {
          alert('Please enter a room code.');
          return;
        }
        const agent = window.FPSState.selectedAgentId || 'agni';
        const name = window.FPSState.currentUser.username || 'Gamer';
        if (window.FPSGameLoop && window.FPSGameLoop.multiplayer) {
          window.FPSGameLoop.multiplayer.joinRoom(code, agent, name);
          document.getElementById('multiplayer-lobby-overlay').style.display = 'flex';
        }
      });
    }

    if (btnLeaveLobby) {
      btnLeaveLobby.addEventListener('click', () => {
        if (window.SynthAudio) window.SynthAudio.playClick();
        location.reload();
      });
    }

    if (btnStartMatch) {
      btnStartMatch.addEventListener('click', () => {
        if (window.SynthAudio) window.SynthAudio.playClick();
        if (window.FPSGameLoop && window.FPSGameLoop.multiplayer) {
          window.FPSGameLoop.multiplayer.startMatch();
        }
      });
    }
  }

  /* ── PROFILE SYNC ────────────────────────────── */
  syncLobbyProfile() {
    const u = window.FPSState.currentUser;
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
    set('lobby-coins-val',    u.coins);
    set('lobby-premium-val',  u.premium);
    set('lobby-p1-username',  u.username);
    set('lobby-card-username', u.username);
    const avatarMap = { '1': '👤', '2': '🔥', '3': '🌀', '4': '💀' };
    const emoji = avatarMap[u.avatar] || '👤';
    set('lobby-p1-avatar-icon', emoji);
    set('lobby-card-banner',    emoji);
  }

  /* ── 3D HOLOGRAM ────────────────────────────── */
  initHologramScene() {
    if (typeof THREE === 'undefined') return;
    const container = document.getElementById('lobby-hologram-container');
    if (!container || this.hologramScene) return;

    const W = container.clientWidth  || window.innerWidth;
    const H = container.clientHeight || window.innerHeight;

    this.hologramScene = new THREE.Scene();

    this.hologramCamera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    this.hologramCamera.position.set(0, 0.5, 6);
    this.hologramCamera.lookAt(0, 0, 0);

    this.hologramRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.hologramRenderer.setSize(W, H);
    this.hologramRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.hologramRenderer.domElement);

    // Ambient + fill lights
    this.hologramScene.add(new THREE.AmbientLight(0xffffff, 0.3));
    const dir = new THREE.DirectionalLight(0x00d2ff, 1.2);
    dir.position.set(0, 3, 3);
    this.hologramScene.add(dir);

    // Agent wireframe icosahedron (main hologram)
    const geo = new THREE.IcosahedronGeometry(1.1, 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff3366, wireframe: true, transparent: true, opacity: 0.7 });
    this.hologramMesh = new THREE.Mesh(geo, mat);
    this.hologramScene.add(this.hologramMesh);

    // Inner solid glow ball
    const innerGeo = new THREE.SphereGeometry(0.65, 16, 16);
    const innerMat = new THREE.MeshBasicMaterial({ color: 0xff3366, transparent: true, opacity: 0.06 });
    this.hologramScene.add(new THREE.Mesh(innerGeo, innerMat));

    // Halo ring
    const ringGeo = new THREE.TorusGeometry(1.6, 0.02, 6, 80);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00d2ff, transparent: true, opacity: 0.4 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    this.hologramScene.add(ring);

    // Platform
    const platGeo = new THREE.CylinderGeometry(1.4, 1.6, 0.1, 48);
    const platMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.1, wireframe: true });
    const plat = new THREE.Mesh(platGeo, platMat);
    plat.position.y = -1.3;
    this.hologramScene.add(plat);

    // Floating particles (embers)
    const COUNT = 100;
    const pGeo  = new THREE.BufferGeometry();
    const pos   = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT * 3; i += 3) {
      pos[i]     = (Math.random() - 0.5) * 5;
      pos[i + 1] = (Math.random() - 0.5) * 4 - 0.5;
      pos[i + 2] = (Math.random() - 0.5) * 5;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pMat = new THREE.PointsMaterial({ color: 0xff3366, size: 0.06, transparent: true, opacity: 0.6 });
    this.particles = new THREE.Points(pGeo, pMat);
    this.hologramScene.add(this.particles);

    window.addEventListener('resize', () => this._resizeHologram());
    this._animateHologram();
  }

  updateHologramAppearance(agentId) {
    if (!this.hologramMesh) return;
    const agent = window.AGENT_REGISTRY[agentId] || window.AGENT_REGISTRY['agni'];
    let c = 0x00d2ff;
    if (agent.role === 'DUELIST') c = 0xff3366;
    else if (agent.role === 'INITIATOR') c = 0x00d2ff;
    else if (agent.role === 'CONTROLLER') c = 0xa855f7;
    else if (agent.role === 'SENTINEL') c = 0xeab308;

    this.hologramMesh.material.color.setHex(c);
    if (this.particles) this.particles.material.color.setHex(c);
  }

  _animateHologram() {
    this.hologramAnimId = requestAnimationFrame(() => this._animateHologram());
    const t = Date.now() * 0.001;
    if (this.hologramMesh) {
      this.hologramMesh.rotation.y = t * 0.25;
      this.hologramMesh.rotation.x = Math.sin(t * 0.7) * 0.12;
      this.hologramMesh.position.y = Math.sin(t * 1.8) * 0.12;
    }
    if (this.particles) {
      const arr = this.particles.geometry.attributes.position.array;
      for (let i = 1; i < arr.length; i += 3) {
        arr[i] += 0.006;
        if (arr[i] > 2.2) arr[i] = -1.5;
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
    }
    if (this.hologramRenderer && this.hologramScene && this.hologramCamera) {
      this.hologramRenderer.render(this.hologramScene, this.hologramCamera);
    }
  }

  _resizeHologram() {
    const c = document.getElementById('lobby-hologram-container');
    if (!c || !this.hologramRenderer) return;
    const W = c.clientWidth, H = c.clientHeight;
    this.hologramCamera.aspect = W / H;
    this.hologramCamera.updateProjectionMatrix();
    this.hologramRenderer.setSize(W, H);
  }
}

window.lobbyUI = new LobbyUIManager();
document.addEventListener('DOMContentLoaded', () => window.lobbyUI.init());
