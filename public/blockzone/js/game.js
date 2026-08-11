/**
 * BLOCK ZONE: Battle Royale — Main Game Orchestrator
 * States: MENU | DROP | PARACHUTE | PLAYING | DEAD | WIN
 * All classes loaded via <script> tags in index.html
 */

class BlockZoneGame {
  constructor() {
    // ── Canvas & Renderer ────────────────────────────────────────────────
    this.canvas   = document.getElementById('game-canvas');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x87ceeb);

    // ── Scene ────────────────────────────────────────────────────────────
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.0025);

    // ── Lighting ─────────────────────────────────────────────────────────
    this._setupLighting();

    // ── State ────────────────────────────────────────────────────────────
    this.state = 'MENU';  // MENU | DROP | PARACHUTE | PLAYING | DEAD | WIN
    this.clock = new THREE.Clock();
    this.matchTime    = 0;
    this.maxTime      = 300; // 5 minutes
    this.totalPlayers = 20;
    this.aliveCount   = 20;

    // ── Systems ──────────────────────────────────────────────────────────
    this.camera   = new CameraRig(this.canvas);
    this.world    = new World(this.scene);
    this.player   = new Player(this.scene);
    this.hud      = new HUD();
    this.bots     = [];
    this.plane    = null;

    // ── Parachute state ──────────────────────────────────────────────────
    this._dropStartY   = 90;  // height player jumps from
    this._parachuteY   = 40;  // below this: chute deploys
    this._fallSpeed    = 0;
    this._chuteSpeed   = 12;  // slow descent with chute

    // ── Safe zone ────────────────────────────────────────────────────────
    this.safeZone = new SafeZone(this.scene);
    this.loot     = new LootSystem(this.scene);

    window.gameInstance = this;
    window.hud = this.hud; // BotAI uses window.hud.addKill()
    window.addEventListener('resize', () => this._onResize());

    // ── Start render loop ────────────────────────────────────────────────
    this._animate();

    // ── Wire up menu buttons ─────────────────────────────────────────────
    this._initMenuButtons();
    this._showScreen('home-screen');
  }

  _setupLighting() {
    const ambient = new THREE.AmbientLight(0xfff4e0, 0.55);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfffde7, 1.1);
    sun.position.set(80, 120, 60);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near   = 1;
    sun.shadow.camera.far    = 500;
    sun.shadow.camera.left   = -250;
    sun.shadow.camera.right  = 250;
    sun.shadow.camera.top    = 250;
    sun.shadow.camera.bottom = -250;
    sun.shadow.bias = -0.0004;
    this.scene.add(sun);

    // Soft fill light
    const fill = new THREE.HemisphereLight(0x87ceeb, 0x3a7d44, 0.42);
    this.scene.add(fill);
  }

  // ── MENU ─────────────────────────────────────────────────────────────────
  _initMenuButtons() {
    const startBtn = document.getElementById('btn-solo');
    if (startBtn) startBtn.addEventListener('click', () => this.startDrop());

    const quitBtn = document.getElementById('btn-quit');
    if (quitBtn) quitBtn.addEventListener('click', () => this._backToMenu());

    // Sensitivity slider
    const sensSlider = document.getElementById('sens-slider');
    if (sensSlider) sensSlider.addEventListener('input', (e) => {
      this.camera.setSensitivity(parseFloat(e.target.value));
      const label = document.getElementById('sens-value');
      if (label) label.textContent = parseFloat(e.target.value).toFixed(1) + 'x';
    });
  }

  _showScreen(id) {
    ['home-screen', 'drop-screen', 'hud-overlay', 'death-screen', 'win-screen'].forEach(s => {
      const el = document.getElementById(s);
      if (el) el.classList.add('hidden');
    });
    const target = document.getElementById(id);
    if (target) target.classList.remove('hidden');
  }

  _backToMenu() {
    this.state = 'MENU';
    document.exitPointerLock();
    this._showScreen('home-screen');
    this._cleanupMatch();
  }

  _cleanupMatch() {
    if (this.plane) {
      this.plane.dispose();
      this.plane = null;
    }
    this.bots.forEach(b => { if (b.mesh) this.scene.remove(b.mesh); });
    this.bots = [];
    this.player.respawn(0, -200, 0);
    this.matchTime  = 0;
    this.aliveCount = 20;
    this.safeZone.reset();
    this.loot.clear();
    this.hud.reset();
  }

  // ── DROP PHASE ───────────────────────────────────────────────────────────
  startDrop() {
    this._cleanupMatch();
    this.state = 'DROP';

    // Show the drop screen with instructions
    this._showScreen('drop-screen');

    // Create the plane
    this.plane = new DropPlane(this.scene);

    // Spawn bots into the scene
    this._spawnBots();

    // Scatter loot on the map
    this.loot.scatter(this.world);

    // Listen for jump key
    this._jumpHandler = (e) => {
      if ((e.code === 'Space' || e.code === 'KeyF') && this.state === 'DROP') {
        this._jump();
      }
    };
    window.addEventListener('keydown', this._jumpHandler);

    // Auto-jump if player waits too long (when plane almost exits map)
    this._autoJumpTimer = setTimeout(() => {
      if (this.state === 'DROP') this._jump();
    }, 24000);
  }

  _jump() {
    if (this.state !== 'DROP') return;
    this.state = 'PARACHUTE';

    window.removeEventListener('keydown', this._jumpHandler);
    clearTimeout(this._autoJumpTimer);

    const jumpPos = this.plane.getJumpPosition();

    // Place player at drop height
    this.player.mesh.position.set(jumpPos.x, this._dropStartY, jumpPos.z);
    this.player.velocity.set(0, 0, 0);
    this._fallSpeed = -2;

    // Show HUD and hide drop screen
    this._showScreen('hud-overlay');

    // Camera free aim during parachute
    this.camera.yaw = Math.PI; // face south
  }

  // ── PARACHUTE UPDATE ─────────────────────────────────────────────────────
  _updateParachute(dt) {
    const pos = this.player.mesh.position;

    if (pos.y > this._parachuteY) {
      // Free fall
      this._fallSpeed -= 18 * dt;
    } else {
      // Chute deployed — slow down
      this._fallSpeed = THREE.MathUtils.lerp(this._fallSpeed, -this._chuteSpeed, 0.08);
    }

    pos.y += this._fallSpeed * dt;

    // Slight forward drift (toward map center)
    const dx = -pos.x * 0.015 * dt;
    const dz = -pos.z * 0.015 * dt;
    pos.x += dx;
    pos.z += dz;

    // Camera follows player from behind during drop
    this.camera.update(this.player);

    // Land check
    const groundY = this.world.getGroundY(pos.x, pos.z);
    if (pos.y <= groundY) {
      pos.y = groundY;
      this._landPlayer();
    }
  }

  _landPlayer() {
    this.state = 'PLAYING';
    this.player.isGrounded = true;
    this.player.velocity.set(0, 0, 0);

    // Request pointer lock for mouse-look
    setTimeout(() => {
      this.canvas.requestPointerLock();
    }, 400);

    // Remove plane
    if (this.plane) {
      this.plane.dispose();
      this.plane = null;
    }

    this.hud.show();
    this.safeZone.start();
    console.log('[BlockZone] Player landed. Game PLAYING!');
  }

  // ── BOT SPAWNING ─────────────────────────────────────────────────────────
  _spawnBots() {
    const positions = [
      [80, -80], [-80, 80], [120, 40], [-120, -40],
      [40, 120], [-40, -120], [90, 90], [-90, -90],
      [150, -60], [-150, 60], [60, -140], [-60, 140],
      [170, 10], [-170, -10], [0, -170], [130, 130],
      [-130, -130], [100, -120], [-100, 120], [0, 0]
    ];

    positions.forEach((pos, i) => {
      try {
        const spawnPos = new THREE.Vector3(pos[0], 0, pos[1]);
        const bot = new BotAI(this.scene, spawnPos, i);
        this.bots.push(bot);
      } catch (err) {
        console.warn('Bot spawn error', err);
      }
    });
  }

  // ── GAME OVER ────────────────────────────────────────────────────────────
  _handlePlayerDeath() {
    this.state = 'DEAD';
    document.exitPointerLock();
    this._showScreen('death-screen');

    const el = document.getElementById('death-kills');
    if (el) el.textContent = this.player.kills;
    const pl = document.getElementById('death-place');
    if (pl) pl.textContent = `#${this.aliveCount}`;
  }

  _handleVictory() {
    this.state = 'WIN';
    document.exitPointerLock();
    this._showScreen('win-screen');
  }

  // ── MAIN LOOP ────────────────────────────────────────────────────────────
  _animate() {
    requestAnimationFrame(() => this._animate());

    const dt = Math.min(this.clock.getDelta(), 0.08);

    switch (this.state) {
      case 'MENU':
        this._updateMenuCamera(dt);
        break;

      case 'DROP':
        if (this.plane) this.plane.update(dt);
        this._updateDropCamera(dt);
        break;

      case 'PARACHUTE':
        this._updateParachute(dt);
        break;

      case 'PLAYING':
        this._updatePlaying(dt);
        break;
    }

    this.renderer.render(this.scene, this.camera.camera);
  }

  _updateMenuCamera(dt) {
    if (!this._menuAngle) this._menuAngle = 0;
    this._menuAngle += dt * 0.06;
    const r = 80;
    this.camera.camera.position.set(
      Math.sin(this._menuAngle) * r,
      35,
      Math.cos(this._menuAngle) * r
    );
    this.camera.camera.lookAt(new THREE.Vector3(0, 5, 0));
  }

  _updateDropCamera(dt) {
    if (!this.plane) return;
    // Camera sits slightly behind and above the plane
    const pp = this.plane.mesh.position;
    this.camera.camera.position.set(pp.x - 10, pp.y + 8, pp.z + 30);
    this.camera.camera.lookAt(new THREE.Vector3(pp.x + 20, pp.y - 5, pp.z));
  }

  _updatePlaying(dt) {
    this.matchTime += dt;

    // Player movement
    this.player.update(dt, this.camera, (x, z) => this.world.getGroundY(x, z));

    // Camera follow
    this.camera.update(this.player);

    // Bots
    const allEntities = [this.player, ...this.bots];
    this.bots.forEach(bot => {
      try {
        if (bot && bot.update) bot.update(dt, allEntities, this.world, null, this.safeZone);
      } catch (e) {}
    });

    // Safe zone damage
    const inZone = this.safeZone.update(dt, [], this.player);
    if (!inZone) {
      this.player.takeDamage(8 * dt);
    }

    // Loot pickup
    this.loot.checkPickup(this.player);

    // Check deaths
    this.bots = this.bots.filter(bot => {
      if (!bot || bot.state === 'DEAD' || bot.health <= 0) {
        this.aliveCount = Math.max(1, this.aliveCount - 1);
        return false;
      }
      return true;
    });

    // Win condition
    if (this.bots.length === 0 && this.state === 'PLAYING') {
      this._handleVictory();
      return;
    }

    // Player death
    if (this.player.isDead && this.state === 'PLAYING') {
      this._handlePlayerDeath();
      return;
    }

    // Time limit
    if (this.matchTime >= this.maxTime && this.state === 'PLAYING') {
      if (this.aliveCount <= 1) this._handleVictory();
      else this._handlePlayerDeath();
      return;
    }

    // HUD update
    this.hud.update({
      hp:        this.player.hp,
      maxHp:     this.player.maxHp,
      shield:    this.player.shield,
      maxShield: this.player.maxShield,
      kills:     this.player.kills,
      alive:     this.aliveCount,
      timeLeft:  Math.max(0, this.maxTime - this.matchTime),
      zoneTime:  this.safeZone.getTimeToShrink(),
      playerPos: this.player.getPosition(),
      safeZone:  this.safeZone.getInfo()
    });
  }

  _onResize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.camera.updateProjectionMatrix();
  }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  new BlockZoneGame();
});
