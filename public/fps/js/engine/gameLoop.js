/* ==========================================================================
   DELHI DEFIANCE - MAIN 3D TACTICAL GAME ENGINE & CLOCK LOOP
   ========================================================================== */

class GameLoopManager {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    
    // Engine Subsystems
    this.player = null;
    this.weapons = null;
    this.bots = null;
    this.spike = null;
    this.abilities = null;
    this.multiplayer = null;
    
    this.clock = new THREE.Clock();
    this.animationId = null;
    this.isMatchRunning = false;
  }

  initEngine() {
    const canvas = document.getElementById('fps-canvas');
    if (!canvas || this.scene) return;

    const w = window.innerWidth;
    const h = window.innerHeight;

    // 1. Core ThreeJS Setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a); // dark slate sky
    this.scene.fog = new THREE.FogExp2(0x0f172a, 0.015);

    this.camera = new THREE.PerspectiveCamera(65, w / h, 0.1, 1000);
    this.scene.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;

    // 2. Build Rajdhani 3D Arena
    window.RajdhaniMap.build(this.scene);

    // 3. Initialize Controller & Subsystems
    this.player = new window.PlayerFPSController(this.camera, canvas, window.RajdhaniMap.colliders);
    this.weapons = new window.FPSWeaponSystem(this.scene, this.camera, window.RajdhaniMap.colliders);
    this.bots = new window.BotSystem(this.scene, window.RajdhaniMap.colliders, this.camera.position);
    this.spike = new window.SpikeSystem(this.scene, window.RajdhaniMap);
    this.abilities = new window.AbilityManager(this.scene, this.camera, window.RajdhaniMap.colliders, this.player);
    if (this.multiplayer) {
      this.multiplayer.bindSceneAndPlayer(this.scene, this.camera, this.player);
    }

    if (window.MiniMapRenderer) {
      window.MiniMapRenderer.init();
    }

    // Resize listener
    window.addEventListener('resize', () => this.resizeViewport());

    // Pause listeners
    document.getElementById('btn-pause-resume').addEventListener('click', () => {
      if (window.SynthAudio) window.SynthAudio.playClick();
      document.getElementById('pause-overlay').style.display = 'none';
      canvas.requestPointerLock();
      window.FPSState.isPauseActive = false;
    });

    document.getElementById('btn-pause-exit').addEventListener('click', () => {
      window.SynthAudio.playClick();
      this.exitMatchToLobby();
    });

    // Game Over listeners
    document.getElementById('btn-gameover-rematch').addEventListener('click', () => {
      if (window.SynthAudio) window.SynthAudio.playClick();
      document.getElementById('game-over-screen').style.display = 'none';
      this.startMatch();
    });

    document.getElementById('btn-gameover-exit').addEventListener('click', () => {
      if (window.SynthAudio) window.SynthAudio.playClick();
      document.getElementById('game-over-screen').style.display = 'none';
      this.exitMatchToLobby();
    });
  }

  startMatch() {
    this.initEngine();
    
    this.isMatchRunning = true;
    this.clock.getDelta(); // reset delta

    // Reset player health/armor
    window.FPSState.currentUser.hp = 100;
    window.FPSState.currentUser.armor = 50;
    document.getElementById('hud-hp-val').innerText = '100';
    document.getElementById('hud-armor-val').innerText = '50';

    // Sync weapon ammo HUD
    this.weapons.activeWeapon = 'vandal';
    const activeAmmo = this.weapons.weaponsList.vandal.maxAmmo;
    this.weapons.weaponsList.vandal.currentAmmo = activeAmmo;
    document.getElementById('hud-ammo-val').innerText = activeAmmo;
    document.getElementById('hud-weapon-name').innerText = 'VANDAL RIFLE';

    // Synchronize primary loadout skin colors
    this.weapons.syncActiveSkin();

    // Reset plant systems
    this.spike.reset();

    // Spawn bots (only if it is not a multiplayer match)
    if (!(this.multiplayer && this.multiplayer.isMultiplayer)) {
      this.bots.spawnBots();
    }

    // Reset abilities
    if (this.abilities) {
      this.abilities.reset();
    }

    // Position player (Host spawns South, Guest spawns North)
    if (this.multiplayer && this.multiplayer.isMultiplayer) {
      if (this.multiplayer.players[0].socketId === this.multiplayer.socket.id) {
        this.player.position.set(0, 1.3, 52); // Attack Spawn
      } else {
        this.player.position.set(0, 1.3, -52); // Defend Spawn
      }
      this.multiplayer.spawnOpponentModel();
    } else {
      this.player.position.set(0, 1.3, 52);
    }
    this.player.yaw = 0;
    this.player.pitch = 0;

    // Show pointer lock overlay
    const overlay = document.getElementById('pointerlock-overlay');
    if (overlay) overlay.style.display = 'flex';

    // Run tick loop
    cancelAnimationFrame(this.animationId);
    this.tick();
  }

  tick() {
    if (!this.isMatchRunning) return;
    this.animationId = requestAnimationFrame(() => this.tick());

    const dt = Math.min(0.033, this.clock.getDelta());

    if (!window.FPSState.isPauseActive) {
      // Update camera positioning inputs
      this.player.update(dt);

      // Update gun recoil and ammo checks
      this.weapons.update(dt);

      // Update bots movements (only in singleplayer)
      if (!(this.multiplayer && this.multiplayer.isMultiplayer)) {
        this.bots.update(dt, this.player.position);
      }

      // Update Spike plant zones
      this.spike.update(dt, this.player);

      // Update active abilities and VFX
      if (this.abilities) {
        this.abilities.update(dt);
      }

      // Update multiplayer system updates (replication & interpolation)
      if (this.multiplayer) {
        this.multiplayer.update(dt);
      }

      // Flickering fire torches oscillation
      if (window.RajdhaniMap && window.RajdhaniMap.updateTorches) {
        window.RajdhaniMap.updateTorches(dt);
      }

      // Update Minimap Renderer
      if (window.MiniMapRenderer && this.player) {
        window.MiniMapRenderer.update(this.player.position.x, this.player.position.z, this.player.yaw);
      }

      // Update round Timer HUD
      this.updateRoundTimerHUD();
    }

    // Render WebGL Viewport
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  updateRoundTimerHUD() {
    if (this.spike.isPlanted) {
      // Display spike timer instead of regular clock
      const secs = Math.ceil(this.spike.spikeTimer);
      document.getElementById('hud-timer-val').innerText = `DET: ${secs}s`;
      document.getElementById('hud-timer-val').style.color = "var(--neon-red)";
    } else {
      document.getElementById('hud-timer-val').innerText = "1:45";
      document.getElementById('hud-timer-val').style.color = "#fff";
    }
  }

  triggerMatchEnd(victory = true) {
    this.isMatchRunning = false;
    document.exitPointerLock();

    // Hide viewport UI
    document.getElementById('arena-container').style.display = 'none';
    
    // Setup game over dashboard card stats
    const title = document.getElementById('game-over-result-title');
    const score = document.getElementById('game-over-result-score');
    
    if (victory) {
      title.innerText = "VICTORY";
      title.style.color = "var(--neon-cyan)";
      score.innerText = "13 - 8";
      window.FPSState.matchData.scores.attackers = 13;
      window.FPSState.matchData.scores.defenders = 8;
    } else {
      title.innerText = "DEFEAT";
      title.style.color = "var(--neon-red)";
      score.innerText = "8 - 13";
      window.FPSState.matchData.scores.attackers = 8;
      window.FPSState.matchData.scores.defenders = 13;
    }

    document.getElementById('game-over-screen').style.display = 'flex';
    window.FPSState.gameState = 'GAME_OVER';
  }

  exitMatchToLobby() {
    if (this.multiplayer && this.multiplayer.isMultiplayer) {
      location.reload();
      return;
    }
    this.isMatchRunning = false;
    document.exitPointerLock();

    // Hide gameplay overlays
    document.getElementById('arena-container').style.display  = 'none';
    document.getElementById('pause-overlay').style.display    = 'none';
    document.getElementById('game-over-screen').style.display = 'none';

    // Show lobby screen
    document.getElementById('lobby-screen').style.display = 'flex';
    window.FPSState.gameState = 'LOBBY';

    // Refresh lobby currencies and career logs
    if (window.lobbyUI) {
      window.lobbyUI.syncLobbyProfile();
    }
  }

  resetRound() {
    // Reset local player health
    window.FPSState.currentUser.hp = 100;
    window.FPSState.currentUser.armor = 50;
    const hpEl = document.getElementById('hud-hp-val');
    const armEl = document.getElementById('hud-armor-val');
    if (hpEl) hpEl.innerText = '100';
    if (armEl) armEl.innerText = '50';

    // Position player (Host spawns South, Guest spawns North)
    if (this.multiplayer && this.multiplayer.isMultiplayer) {
      if (this.multiplayer.players[0].socketId === this.multiplayer.socket.id) {
        this.player.position.set(0, 1.3, 52); // Attack Spawn
      } else {
        this.player.position.set(0, 1.3, -52); // Defend Spawn
      }
    } else {
      this.player.position.set(0, 1.3, 52);
    }
    this.player.yaw = 0;
    this.player.pitch = 0;

    // Refill ammo
    this.weapons.activeWeapon = 'vandal';
    const activeAmmo = this.weapons.weaponsList.vandal.maxAmmo;
    this.weapons.weaponsList.vandal.currentAmmo = activeAmmo;
    const ammoEl = document.getElementById('hud-ammo-val');
    if (ammoEl) ammoEl.innerText = activeAmmo;
  }

  resizeViewport() {
    if (!this.renderer) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
}

window.FPSGameLoop = new GameLoopManager();
if (window.MultiplayerManager) {
  window.FPSGameLoop.multiplayer = new window.MultiplayerManager();
  window.FPSGameLoop.multiplayer.init();
}
