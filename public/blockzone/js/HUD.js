/**
 * BLOCK ZONE: HUD Manager — matches the new index.html structure
 */
class HUD {
  constructor() {
    this._alive   = document.getElementById('hud-alive');
    this._time    = document.getElementById('hud-match-time');
    this._kills   = document.getElementById('hud-kills');

    this._hpBar    = document.getElementById('hp-bar');
    this._hpNum    = document.getElementById('hp-num');
    this._shldBar  = document.getElementById('shield-bar');
    this._shldNum  = document.getElementById('shield-num');

    this._weaponName = document.getElementById('hud-weapon-name');
    this._ammo       = document.getElementById('hud-ammo');

    this._zoneWarn  = document.getElementById('hud-zone-warning');
    this._zoneTimer = document.getElementById('hud-zone-timer');

    this._killfeed  = document.getElementById('hud-killfeed');

    this._minimap  = document.getElementById('minimap-canvas');
    this._mmCtx    = this._minimap ? this._minimap.getContext('2d') : null;

    this._zoneFlash  = document.getElementById('zone-flash');
    this._parachuteHud = document.getElementById('parachute-hud');
    this._chuteText  = document.getElementById('chute-text');
    this._chuteAlt   = document.getElementById('chute-alt');
    this._lootPopup  = document.getElementById('loot-popup');
  }

  show() {
    const el = document.getElementById('hud-overlay');
    if (el) el.classList.remove('hidden');
    if (this._parachuteHud) this._parachuteHud.classList.add('hidden');
  }

  reset() {
    if (this._hpBar)   this._hpBar.style.width   = '100%';
    if (this._shldBar) this._shldBar.style.width  = '50%';
    if (this._hpNum)   this._hpNum.textContent    = '100';
    if (this._shldNum) this._shldNum.textContent  = '50';
    if (this._alive)   this._alive.textContent    = '20';
    if (this._kills)   this._kills.textContent    = '0';
    if (this._killfeed) this._killfeed.innerHTML  = '';
  }

  /** Main update — called every frame during PLAYING */
  update(data) {
    const { hp, maxHp, shield, maxShield, kills, alive, timeLeft, zoneTime, playerPos, safeZone } = data;

    // HP
    if (this._hpBar)   this._hpBar.style.width   = `${(hp / maxHp) * 100}%`;
    if (this._hpNum)   this._hpNum.textContent    = Math.ceil(hp);
    if (this._shldBar) this._shldBar.style.width  = `${(shield / maxShield) * 100}%`;
    if (this._shldNum) this._shldNum.textContent  = Math.ceil(shield);

    // Stats
    if (this._alive) this._alive.textContent = alive;
    if (this._kills) this._kills.textContent = kills;

    // Time
    if (this._time) {
      const m = Math.floor(timeLeft / 60);
      const s = Math.floor(timeLeft % 60).toString().padStart(2, '0');
      this._time.textContent = `${m}:${s}`;
    }

    // Zone warning
    if (zoneTime !== undefined && zoneTime < 30) {
      if (this._zoneWarn) this._zoneWarn.classList.remove('hidden');
      if (this._zoneTimer) this._zoneTimer.textContent = Math.ceil(zoneTime);
    } else {
      if (this._zoneWarn) this._zoneWarn.classList.add('hidden');
    }

    // Zone damage flash (outside zone)
    if (safeZone && playerPos) {
      const dist = Math.sqrt(
        (playerPos.x - safeZone.cx) ** 2 +
        (playerPos.z - safeZone.cz) ** 2
      );
      const outside = dist > safeZone.radius;
      if (this._zoneFlash) {
        if (outside) this._zoneFlash.classList.remove('hidden');
        else this._zoneFlash.classList.add('hidden');
      }
    }

    // Minimap
    this._drawMinimap(playerPos, safeZone, alive);
  }

  /** Update during parachute drop */
  updateParachute(altitude, chuteDeployed) {
    if (!this._parachuteHud) return;
    this._parachuteHud.classList.remove('hidden');
    if (this._chuteText) this._chuteText.textContent = chuteDeployed ? 'CHUTE OPEN' : 'FREE FALL';
    if (this._chuteAlt)  this._chuteAlt.textContent  = `${Math.max(0, Math.floor(altitude))}m`;
  }

  hideParachute() {
    if (this._parachuteHud) this._parachuteHud.classList.add('hidden');
  }

  _drawMinimap(playerPos, safeZone, alive) {
    if (!this._mmCtx || !playerPos) return;
    const ctx = this._mmCtx;
    const W = 180, H = 180;
    const WORLD = 500;
    const scale = W / WORLD;

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = 'rgba(10,20,40,0.9)';
    ctx.beginPath();
    ctx.arc(W/2, H/2, W/2, 0, Math.PI*2);
    ctx.fill();

    // Safe zone circle
    if (safeZone) {
      const cx = (safeZone.cx + WORLD/2) * scale;
      const cz = (safeZone.cz + WORLD/2) * scale;
      const r  = safeZone.radius * scale;
      ctx.beginPath();
      ctx.arc(cx, cz, r, 0, Math.PI*2);
      ctx.strokeStyle = 'rgba(59,130,246,0.85)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = 'rgba(59,130,246,0.06)';
      ctx.fill();
    }

    // Ground terrain tint (green patches)
    ctx.fillStyle = 'rgba(34,197,94,0.15)';
    ctx.beginPath();
    ctx.arc(W/2, H/2, W/2 * 0.92, 0, Math.PI*2);
    ctx.fill();

    // Village marker
    const vx = WORLD/2 * scale, vz = WORLD/2 * scale;
    ctx.fillStyle = 'rgba(251,191,36,0.7)';
    ctx.fillRect(vx - 3, vz - 3, 6, 6);

    // Player dot
    const px = (playerPos.x + WORLD/2) * scale;
    const pz = (playerPos.z + WORLD/2) * scale;
    ctx.beginPath();
    ctx.arc(px, pz, 5, 0, Math.PI*2);
    ctx.fillStyle = '#22c55e';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Circular clip mask
    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.arc(W/2, H/2, W/2, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  addKill(killerName, victimName, isPlayerKill = false) {
    if (!this._killfeed) return;

    const entry = document.createElement('div');
    entry.className = 'killfeed-entry';
    if (isPlayerKill) entry.style.borderColor = '#22c55e';
    entry.textContent = `${killerName} ⚔ ${victimName}`;
    this._killfeed.prepend(entry);

    setTimeout(() => entry.remove(), 5000);

    // Keep max 5
    while (this._killfeed.children.length > 5) {
      this._killfeed.lastChild.remove();
    }
  }

  showLootPickup(itemName) {
    if (!this._lootPopup) return;
    this._lootPopup.textContent = `+ ${itemName}`;
    this._lootPopup.classList.remove('hidden');
    clearTimeout(this._lootTimer);
    this._lootTimer = setTimeout(() => {
      if (this._lootPopup) this._lootPopup.classList.add('hidden');
    }, 2200);
  }

  setWeapon(name, ammoClip, ammoReserve) {
    if (this._weaponName) this._weaponName.textContent = name || 'FISTS';
    if (this._ammo) {
      this._ammo.textContent = ammoClip !== undefined
        ? `${ammoClip} / ${ammoReserve}`
        : '—';
    }
  }
}
