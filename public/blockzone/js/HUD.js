/**
 * BLOCK ZONE: HUD & Screen Overlay Manager
 */
class HUDManager {
  constructor() {
    this.hudEl = document.getElementById('hud');
    this.minimapContainer = document.getElementById('minimap-container');

    this.hpEl = document.getElementById('hp');
    this.hpFill = document.getElementById('hp-fill');
    this.spEl = document.getElementById('sp');
    this.spFill = document.getElementById('sp-fill');

    this.weaponNameEl = document.getElementById('weapon-name');
    this.ammoClipEl = document.getElementById('ammo-clip');
    this.ammoReserveEl = document.getElementById('ammo-reserve');

    this.zoneWarningEl = document.getElementById('zone-warning');
    this.zoneTimerEl = document.getElementById('zone-timer');
    this.distToZoneEl = document.getElementById('dist-to-zone');

    this.aliveEl = document.getElementById('alive');
    this.killFeedEl = document.getElementById('kill-feed');

    this.interactPromptEl = document.getElementById('interact-prompt');
    this.interactNameEl = document.getElementById('interact-name');

    this.deathScreen = document.getElementById('death-screen');
    this.victoryScreen = document.getElementById('victory-screen');
  }

  showHUD() {
    if (this.hudEl) this.hudEl.classList.remove('hidden');
    if (this.minimapContainer) this.minimapContainer.classList.remove('hidden');
  }

  hideHUD() {
    if (this.hudEl) this.hudEl.classList.add('hidden');
    if (this.minimapContainer) this.minimapContainer.classList.add('hidden');
  }

  updateHealth(hp, maxHp, sp, maxSp) {
    if (this.hpEl) this.hpEl.innerText = Math.max(0, Math.floor(hp));
    if (this.hpFill) this.hpFill.style.width = `${Math.max(0, (hp / maxHp) * 100)}%`;

    if (this.spEl) this.spEl.innerText = Math.max(0, Math.floor(sp));
    if (this.spFill) this.spFill.style.width = `${Math.max(0, (sp / maxSp) * 100)}%`;
  }

  updateWeapon(weaponObj, clip, reserve) {
    if (!weaponObj) {
      if (this.weaponNameEl) this.weaponNameEl.innerText = 'UNARMED';
      if (this.ammoClipEl) this.ammoClipEl.innerText = '-';
      if (this.ammoReserveEl) this.ammoReserveEl.innerText = '-';
    } else {
      if (this.weaponNameEl) this.weaponNameEl.innerText = weaponObj.name;
      if (this.ammoClipEl) this.ammoClipEl.innerText = clip;
      if (this.ammoReserveEl) this.ammoReserveEl.innerText = reserve;
    }
  }

  updateZone(timerStr, isShrinking, distOutside) {
    if (this.zoneTimerEl) this.zoneTimerEl.innerText = timerStr;
    if (this.distToZoneEl) {
      this.distToZoneEl.innerText = distOutside > 0
        ? `${Math.floor(distOutside)}m Outside Safe Zone`
        : 'Inside Safe Zone';
    }

    if (this.zoneWarningEl) {
      if (isShrinking) {
        this.zoneWarningEl.style.color = '#ef4444';
        this.zoneWarningEl.innerText = `⚠ STORM SHRINKING — ${timerStr}`;
      } else {
        this.zoneWarningEl.style.color = '#fb923c';
        this.zoneWarningEl.innerText = `⚠ ZONE CLOSING IN ${timerStr}`;
      }
    }
  }

  updateAlive(count) {
    if (this.aliveEl) this.aliveEl.innerText = count;
  }

  showInteract(label) {
    if (this.interactPromptEl) {
      if (this.interactNameEl) this.interactNameEl.innerText = label;
      this.interactPromptEl.classList.remove('hidden');
    }
  }

  hideInteract() {
    if (this.interactPromptEl) this.interactPromptEl.classList.add('hidden');
  }

  addKill(killer, killed) {
    if (!this.killFeedEl) return;
    const item = document.createElement('div');
    item.className = 'kill-feed-item';
    item.innerText = `${killer} eliminated ${killed}`;
    this.killFeedEl.appendChild(item);

    setTimeout(() => {
      if (this.killFeedEl.contains(item)) {
        this.killFeedEl.removeChild(item);
      }
    }, 4500);
  }

  showDeathScreen(killerName, placement, kills) {
    this.hideHUD();
    document.exitPointerLock();

    const killerEl = document.getElementById('killer-name');
    const placeEl = document.getElementById('placement-val');
    const killsEl = document.getElementById('kills-val');

    if (killerEl) killerEl.innerText = killerName;
    if (placeEl) placeEl.innerText = `#${placement}`;
    if (killsEl) killsEl.innerText = kills;

    if (this.deathScreen) this.deathScreen.classList.remove('hidden');
  }

  showVictoryScreen(kills) {
    this.hideHUD();
    document.exitPointerLock();

    const vkillsEl = document.getElementById('v-kills-val');
    if (vkillsEl) vkillsEl.innerText = kills;

    if (this.victoryScreen) this.victoryScreen.classList.remove('hidden');
    if (window.audioManager) window.audioManager.playVictory();
  }
}

window.hud = new HUDManager();
