/* ==========================================================================
   DELHI DEFIANCE - MAIN LOBBY DASHBOARD CONTROLLER & 3D HOLOGRAM
   ========================================================================== */

class LobbyUIManager {
  constructor() {
    this.hologramScene = null;
    this.hologramCamera = null;
    this.hologramRenderer = null;
    this.hologramMesh = null;
    this.particles = null;
    this.hologramAnimationId = null;
  }

  init() {
    this.setupTabs();
    this.setupActions();
  }

  setupTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    const views = document.querySelectorAll('.sub-view');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        window.SynthAudio.playClick();
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const targetViewId = `sub-view-${tab.getAttribute('data-tab')}`;
        views.forEach(v => v.classList.add('hidden'));
        document.getElementById(targetViewId).classList.remove('hidden');

        window.FPSState.activeTab = tab.getAttribute('data-tab');

        // Trigger custom UI updates depending on the tab
        if (window.FPSState.activeTab === 'agents') {
          this.updateAgentsTabDetails('agni');
        }
      });
    });

    // Agent catalog selector buttons
    const agentRosterBtns = document.querySelectorAll('.agent-select-btn');
    agentRosterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        window.SynthAudio.playClick();
        agentRosterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.updateAgentsTabDetails(btn.getAttribute('data-agent'));
      });
    });
  }

  updateAgentsTabDetails(agentId) {
    const nameLabel = document.getElementById('agents-info-name');
    const roleLabel = document.getElementById('agents-info-role');
    const bioLabel = document.getElementById('agents-info-bio');
    const abilitiesBox = document.querySelector('.abilities-list');

    if (agentId === 'agni') {
      nameLabel.innerText = "AGNI";
      roleLabel.innerText = "DUELIST";
      roleLabel.style.color = "var(--neon-red)";
      bioLabel.innerText = "Indian fire specialist. Commands thermal walls and charges aggressively into battle.";
      abilitiesBox.innerHTML = `
        <div class="ability-card"><strong>[Q] Molten Wall</strong><span>Raise a wall of fire that blocks sight and damages players passing through.</span></div>
        <div class="ability-card"><strong>[E] Fire Dash</strong><span>Instantly dash forward, gaining increased movement speed.</span></div>
        <div class="ability-card"><strong>[X] Inferno Storm</strong><span>Equip fiery projectiles that deal massive blast damage on impact.</span></div>
      `;
    } else {
      nameLabel.innerText = "VAYU";
      roleLabel.innerText = "INITIATOR";
      roleLabel.style.color = "var(--neon-cyan)";
      bioLabel.innerText = "Wind controller. Detects enemies with air pulses and disrupts sites with micro-cyclones.";
      abilitiesBox.innerHTML = `
        <div class="ability-card"><strong>[Q] Air Pulse</strong><span>Emit a sound wave that highlights enemy positions behind walls.</span></div>
        <div class="ability-card"><strong>[E] Wind Burst</strong><span>Release a blast of compressed air that knocks back opponents.</span></div>
        <div class="ability-card"><strong>[X] Cyclone Field</strong><span>Spawn a giant tornado zone that deafens and disorients defenders.</span></div>
      `;
    }

    // Swivel the hologram model color in the lobby background dynamically!
    this.updateHologramAppearance(agentId);
  }

  setupActions() {
    // Buy skin actions
    const buySkinBtns = document.querySelectorAll('.buy-skin-btn');
    buySkinBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const cost = parseInt(btn.getAttribute('data-price'));
        const skinKey = btn.getAttribute('data-skin');

        if (window.FPSState.currentUser.coins >= cost) {
          window.FPSState.currentUser.coins -= cost;
          window.SynthAudio.playHeadshot(); // satisfying unlock ding!
          btn.innerText = "OWNED";
          btn.style.opacity = "0.5";
          btn.style.pointerEvents = "none";
          this.syncLobbyProfile();
          
          // Add to selections options list
          const primarySkinSelect = document.getElementById('loadout-primary-skin');
          const optionText = skinKey === 'crimson' ? "Crimson Fire" : "Cyber Neon Blue";
          // Check if option already exists
          let exists = false;
          for (let i = 0; i < primarySkinSelect.options.length; i++) {
            if (primarySkinSelect.options[i].value === skinKey) exists = true;
          }
          if (!exists) {
            const opt = document.createElement('option');
            opt.value = skinKey;
            opt.innerText = optionText;
            primarySkinSelect.appendChild(opt);
          }
        } else {
          window.SynthAudio.playClick();
          alert("INSUFFICIENT COINS!");
        }
      });
    });

    // Sync skin selections
    document.getElementById('loadout-primary-skin').addEventListener('change', (e) => {
      window.FPSState.loadout.primarySkin = e.target.value;
      window.SynthAudio.playClick();
    });
    document.getElementById('loadout-secondary-skin').addEventListener('change', (e) => {
      window.FPSState.loadout.secondarySkin = e.target.value;
      window.SynthAudio.playClick();
    });

    // Play flow
    document.getElementById('btn-lobby-play').addEventListener('click', () => {
      window.SynthAudio.playClick();
      document.getElementById('lobby-screen').classList.add('hidden');
      document.getElementById('play-mode-screen').classList.remove('hidden');
      window.FPSState.gameState = window.STATES.PLAY_SELECT;
    });

    document.getElementById('btn-play-back').addEventListener('click', () => {
      window.SynthAudio.playClick();
      document.getElementById('play-mode-screen').classList.add('hidden');
      document.getElementById('lobby-screen').classList.remove('remove');
      document.getElementById('lobby-screen').classList.remove('hidden');
      window.FPSState.gameState = window.STATES.LOBBY;
    });

    document.getElementById('btn-play-continue').addEventListener('click', () => {
      window.SynthAudio.playClick();
      document.getElementById('play-mode-screen').classList.add('hidden');
      document.getElementById('agent-select-screen').classList.remove('hidden');
      window.FPSState.gameState = window.STATES.AGENT_SELECT;
      
      // Start the Agent Select screen timer
      if (window.agentSelectUI) {
        window.agentSelectUI.startCountdown();
      }
    });
  }

  syncLobbyProfile() {
    const user = window.FPSState.currentUser;
    document.getElementById('lobby-coins-val').innerText = user.coins;
    document.getElementById('lobby-premium-val').innerText = user.premium;
    document.getElementById('lobby-p1-username').innerText = user.username;
    document.getElementById('lobby-card-username').innerText = user.username;

    // Convert avatar index to emoji
    const avatars = { '1': '👤', '2': '🔥', '3': '🌀', '4': '💀' };
    const emoji = avatars[user.avatar] || '👤';
    document.getElementById('lobby-p1-avatar-icon').innerText = emoji;
    document.getElementById('lobby-card-banner').innerText = emoji;
  }

  // ── 3D LOBBY AGENT HOLOGRAM RENDERING ───────────────────────
  initHologramScene() {
    const container = document.getElementById('lobby-hologram-container');
    if (!container || this.hologramScene) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    this.hologramScene = new THREE.Scene();
    
    // Camera
    this.hologramCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.hologramCamera.position.set(0, 0.8, 5.5);
    this.hologramCamera.lookAt(0, 0.2, 0);

    // Renderer
    this.hologramRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.hologramRenderer.setSize(width, height);
    this.hologramRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.hologramRenderer.domElement);

    // Light sources
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.hologramScene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00d2ff, 0.8);
    dirLight.position.set(0, 3, 2);
    this.hologramScene.add(dirLight);

    // Hologram central body (Procedural mesh representing the Agent outline)
    const baseGeo = new THREE.IcosahedronGeometry(0.8, 2);
    const hologramMat = new THREE.MeshBasicMaterial({
      color: 0xff3366, // Agni default red
      wireframe: true,
      transparent: true,
      opacity: 0.75
    });
    this.hologramMesh = new THREE.Mesh(baseGeo, hologramMat);
    this.hologramMesh.position.set(0, 0.2, 0);
    this.hologramScene.add(this.hologramMesh);

    // Platform stand
    const standGeo = new THREE.CylinderGeometry(1.2, 1.4, 0.15, 32);
    const standMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.2,
      wireframe: true
    });
    const stand = new THREE.Mesh(standGeo, standMat);
    stand.position.set(0, -0.7, 0);
    this.hologramScene.add(stand);

    // Floating particles (Embers)
    const particleCount = 80;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 4;
      positions[i + 1] = (Math.random() - 0.5) * 3 - 0.2;
      positions[i + 2] = (Math.random() - 0.5) * 4;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const pMat = new THREE.PointsMaterial({
      color: 0xff3366,
      size: 0.05,
      transparent: true,
      opacity: 0.6
    });
    this.particles = new THREE.Points(particleGeo, pMat);
    this.hologramScene.add(this.particles);

    // Resize event
    window.addEventListener('resize', () => this.resizeHologram());

    // Loop
    this.animateHologram();
  }

  updateHologramAppearance(agentId) {
    if (!this.hologramMesh) return;
    const color = agentId === 'agni' ? 0xff3366 : 0x00d2ff;
    this.hologramMesh.material.color.setHex(color);
    if (this.particles) {
      this.particles.material.color.setHex(color);
    }
  }

  animateHologram() {
    this.hologramAnimationId = requestAnimationFrame(() => this.animateHologram());

    const time = Date.now() * 0.001;

    // Rotate Agent Mesh
    if (this.hologramMesh) {
      this.hologramMesh.rotation.y = time * 0.2;
      this.hologramMesh.rotation.x = Math.sin(time) * 0.1;
      // Slight vertical hover float
      this.hologramMesh.position.y = 0.2 + Math.sin(time * 2) * 0.08;
    }

    // Drift particles upward
    if (this.particles) {
      const positions = this.particles.geometry.attributes.position.array;
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] += 0.005;
        if (positions[i] > 1.8) {
          positions[i] = -0.7; // respawn at bottom
        }
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
    }

    if (this.hologramRenderer && this.hologramScene && this.hologramCamera) {
      this.hologramRenderer.render(this.hologramScene, this.hologramCamera);
    }
  }

  resizeHologram() {
    const container = document.getElementById('lobby-hologram-container');
    if (!container || !this.hologramRenderer) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    this.hologramCamera.aspect = w / h;
    this.hologramCamera.updateProjectionMatrix();
    this.hologramRenderer.setSize(w, h);
  }
}

window.lobbyUI = new LobbyUIManager();
document.addEventListener('DOMContentLoaded', () => {
  window.lobbyUI.init();
});
