class HUDManager {
  constructor() {
    this.hpEl = document.getElementById('hp');
    this.hpFill = document.getElementById('hp-fill');
    this.spEl = document.getElementById('sp');
    this.spFill = document.getElementById('sp-fill');
    
    this.weaponNameEl = document.getElementById('weapon-name');
    this.ammoEl = document.getElementById('ammo');
    
    this.zoneWarningEl = document.getElementById('zone-warning');
    this.zoneTimerEl = document.getElementById('zone-timer');
    this.distToZoneEl = document.getElementById('dist-to-zone');
    
    this.aliveEl = document.getElementById('alive');
    this.killFeedEl = document.getElementById('kill-feed');
    
    this.interactPromptEl = document.getElementById('interact-prompt');
    this.interactNameEl = document.getElementById('interact-name');
    
    this.dropHud = document.getElementById('drop-hud');
    this.altitudeValEl = document.getElementById('altitude-val');
    this.dropPromptEl = document.getElementById('drop-prompt');
  }
  
  updateHealth(hp, maxHp, sp, maxSp) {
    this.hpEl.innerText = Math.max(0, Math.floor(hp));
    this.hpFill.style.width = `${(hp / maxHp) * 100}%`;
    this.spEl.innerText = Math.max(0, Math.floor(sp));
    this.spFill.style.width = `${(sp / maxSp) * 100}%`;
  }
  
  updateWeapon(weaponObj, currentMag, reserve) {
    if (!weaponObj) {
      this.weaponNameEl.innerText = 'UNARMED';
      this.ammoEl.innerText = '- / -';
    } else {
      this.weaponNameEl.innerText = weaponObj.name;
      this.ammoEl.innerText = `${currentMag} / ${reserve}`;
    }
  }
  
  updateZone(timerStr, isShrinking, distance) {
    this.zoneTimerEl.innerText = timerStr;
    this.distToZoneEl.innerText = distance > 0 ? `${Math.floor(distance)}m away` : 'Inside Zone';
    if (isShrinking) {
      this.zoneWarningEl.classList.remove('hidden');
    } else {
      this.zoneWarningEl.classList.add('hidden');
    }
  }
  
  updateAlive(count) {
    this.aliveEl.innerText = count;
  }
  
  showInteract(itemName) {
    if (itemName) {
      this.interactNameEl.innerText = itemName;
      this.interactPromptEl.classList.remove('hidden');
    } else {
      this.interactPromptEl.classList.add('hidden');
    }
  }
  
  addKill(killer, killed) {
    const el = document.createElement('div');
    el.className = 'kill-feed-item';
    el.innerText = `${killer} eliminated ${killed}`;
    this.killFeedEl.appendChild(el);
    setTimeout(() => {
      if (this.killFeedEl.contains(el)) this.killFeedEl.removeChild(el);
    }, 4000);
  }
  
  showDropPhase(altitude, parachuting) {
    this.dropHud.classList.remove('hidden');
    this.altitudeValEl.innerText = Math.floor(altitude);
    if (parachuting) {
      this.dropPromptEl.innerText = 'PARACHUTE DEPLOYED';
    } else {
      this.dropPromptEl.innerText = 'PREPARE TO JUMP — SPACE to deploy';
    }
  }
  
  hideDropPhase() {
    this.dropHud.classList.add('hidden');
  }
  
  showDeathScreen(killer, placement, kills) {
    document.getElementById('death-screen').classList.remove('hidden');
    document.getElementById('killer').innerText = killer;
    document.getElementById('placement').innerText = `#${placement}`;
    document.getElementById('kills').innerText = kills;
    document.getElementById('hud').classList.add('hidden');
    document.exitPointerLock();
  }
  
  showVictoryScreen(kills) {
    document.getElementById('victory-screen').classList.remove('hidden');
    document.getElementById('v-kills').innerText = kills;
    document.getElementById('hud').classList.add('hidden');
    document.exitPointerLock();
  }
}
window.hud = new HUDManager();
