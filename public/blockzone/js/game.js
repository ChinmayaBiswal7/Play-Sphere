/**
 * BLOCK ZONE: Main Game Orchestrator & Loop
 */
class BlockZoneGame {
  constructor() {
    this.worldSize = 500;
    this.numBots = 19; // +1 player = 20 total
    this.isPlaying = false;
    this.isGameOver = false;

    this.scene = null;
    this.renderer = null;
    this.cameraRig = null;
    this.world = null;
    this.player = null;
    this.weaponSystem = null;
    this.lootSystem = null;
    this.safeZone = null;
    this.minimap = null;

    this.entities = [];
    this.bots = [];
    this.lastTime = 0;
    this.menuAngle = 0;

    this.init();
  }

  init() {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) return;

    // 1. Scene & Atmosphere
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x7dd3fc); // Bright Sky Blue
    this.scene.fog = new THREE.Fog(0x7dd3fc, 80, this.worldSize * 0.95);

    // 2. Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    this.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffaed, 0.95);
    sunLight.position.set(150, 250, 100);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 600;
    sunLight.shadow.camera.top = 220;
    sunLight.shadow.camera.bottom = -220;
    sunLight.shadow.camera.left = -220;
    sunLight.shadow.camera.right = 220;
    this.scene.add(sunLight);

    // 4. Game Systems
    this.world = new World(this.scene, this.worldSize);
    this.weaponSystem = new WeaponSystem(this.scene);
    this.lootSystem = new LootSystem(this.scene, this.worldSize);
    this.safeZone = new SafeZone(this.scene, this.worldSize);
    this.minimap = new Minimap(this.worldSize, 'minimap-canvas');

    // 5. Player & Camera
    this.player = new Player(this.scene);
    this.player.mesh.position.set(0, 0, 0); // Spawns at central village
    this.entities.push(this.player);

    this.cameraRig = new CameraRig(canvas);
    this.scene.add(this.cameraRig.yawObject);

    // 6. Spawn 19 AI Bots across map
    for (let i = 0; i < this.numBots; i++) {
      const rx = (Math.random() - 0.5) * this.worldSize * 0.75;
      const rz = (Math.random() - 0.5) * this.worldSize * 0.75;
      const bot = new BotAI(this.scene, new THREE.Vector3(rx, 0, rz), i);
      this.bots.push(bot);
      this.entities.push(bot);
    }

    // 7. Menu UI Listeners
    this.initMenuListeners();

    // 8. Start Loop
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.animate(t));
  }

  initMenuListeners() {
    const playBtn = document.getElementById('btn-play');
    const settingsBtn = document.getElementById('btn-settings');
    const settingsPanel = document.getElementById('settings-panel');
    const sensSlider = document.getElementById('sens-slider');
    const sensVal = document.getElementById('sens-val');
    const playAgainBtn = document.getElementById('btn-play-again');
    const vicPlayAgainBtn = document.getElementById('btn-vic-play-again');

    if (playBtn) {
      playBtn.addEventListener('click', () => {
        if (window.audioManager) window.audioManager.init();
        this.startMatch();
      });
    }

    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        if (settingsPanel) settingsPanel.classList.toggle('hidden');
      });
    }

    if (sensSlider) {
      sensSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (sensVal) sensVal.innerText = val.toFixed(1);
        if (this.cameraRig) this.cameraRig.setSensitivity(val);
      });
    }

    if (playAgainBtn) playAgainBtn.addEventListener('click', () => window.location.reload());
    if (vicPlayAgainBtn) vicPlayAgainBtn.addEventListener('click', () => window.location.reload());
  }

  startMatch() {
    const mainMenu = document.getElementById('main-menu');
    if (mainMenu) mainMenu.classList.add('hidden');

    if (window.hud) window.hud.showHUD();
    this.isPlaying = true;
    this.isGameOver = false;

    this.player.updateHUD();
    this.checkPlayerCount();

    // Request pointer lock
    const canvas = document.getElementById('game-canvas');
    if (canvas) canvas.requestPointerLock();
  }

  checkPlayerCount() {
    let aliveCount = 0;
    this.entities.forEach(ent => {
      if (ent.health > 0) aliveCount++;
    });

    if (window.hud) window.hud.updateAlive(aliveCount);

    // Win condition: Only 1 survivor and it is the human player
    if (aliveCount === 1 && this.player.health > 0 && !this.isGameOver) {
      this.isGameOver = true;
      this.isPlaying = false;
      setTimeout(() => {
        if (window.hud) window.hud.showVictoryScreen(this.player.kills || 0);
      }, 500);
    }
  }

  onPlayerDied(killerName) {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.isPlaying = false;

    let aliveCount = 0;
    this.entities.forEach(ent => {
      if (ent.health > 0) aliveCount++;
    });
    const placement = aliveCount + 1;

    setTimeout(() => {
      if (window.hud) window.hud.showDeathScreen(killerName, placement, this.player.kills || 0);
    }, 700);
  }

  animate(time) {
    requestAnimationFrame((t) => this.animate(t));

    const dt = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;

    if (this.isPlaying && !this.isGameOver) {
      // Update Player & Controls
      this.player.update(dt, this.cameraRig, this.world, this.weaponSystem);
      this.cameraRig.update(this.player);

      // Update AI Bots
      this.bots.forEach(bot => {
        bot.update(dt, this.entities, this.world, this.weaponSystem, this.safeZone);
      });

      // Update Systems
      this.weaponSystem.update(dt);
      this.lootSystem.update(dt, this.player);
      this.safeZone.update(dt, this.entities, this.player);
      this.minimap.update(this.player, this.bots, this.safeZone, this.lootSystem);
    } else if (!this.isPlaying) {
      // Menu Camera Flyover Orbit around Village
      this.menuAngle += dt * 0.15;
      const camX = Math.cos(this.menuAngle) * 55;
      const camZ = Math.sin(this.menuAngle) * 55;
      this.cameraRig.camera.position.set(camX, 24, camZ);
      this.cameraRig.camera.lookAt(0, 4, 0);
    }

    this.renderer.render(this.scene, this.cameraRig.camera);
  }
}

window.onload = () => {
  window.gameInstance = new BlockZoneGame();
};
