/* ==========================================================================
   DELHI DEFIANCE - 3D SPIKE PLANT & DEFUSE SYSTEM & DETONATION GLOBE
   ========================================================================== */

class SpikeSystem {
  constructor(scene, map) {
    this.scene = scene;
    this.map = map;

    this.spikeMesh = null;
    this.explosionSphere = null;
    this.isPlanted = false;
    
    // Timers
    this.plantProgress = 0;
    this.defuseProgress = 0;
    this.spikeTimer = 45; // 45s detonate window
    this.beepInterval = 1.0;
    this.beepTimer = 0;
  }

  reset() {
    if (this.spikeMesh) {
      this.scene.remove(this.spikeMesh);
      this.spikeMesh = null;
    }
    if (this.explosionSphere) {
      this.scene.remove(this.explosionSphere);
      this.explosionSphere = null;
    }
    this.isPlanted = false;
    this.plantProgress = 0;
    this.defuseProgress = 0;
    this.spikeTimer = 45;
    this.beepInterval = 1.0;
    this.beepTimer = 0;
    
    window.FPSState.matchData.isSpikePlanted = false;
    window.FPSState.matchData.spikeState = 'idle';
    document.getElementById('hud-match-alert').style.display = 'none';
    document.getElementById('hud-interact-prompt').style.display = 'none';
  }

  update(dt, playerController) {
    const playerPos = playerController.position;
    const currentZone = this.map.getPlantZone(playerPos);
    const hudPrompt = document.getElementById('hud-interact-prompt');

    // 1. Handling Plant Logic
    if (currentZone && !this.isPlanted && window.FPSState.matchData.spikeState !== 'exploded') {
      hudPrompt.style.display = 'block';
      hudPrompt.innerText = `HOLD [E] TO PLANT SPIKE AT SITE ${currentZone}`;

      if (playerController.keys.e) {
        window.FPSState.matchData.spikeState = 'planting';
        this.plantProgress += dt;
        
        // Play tick sound
        if (Math.floor(this.plantProgress * 10) % 4 === 0) {
          window.SynthAudio.playClick();
        }

        // Show planting progress percentage in prompt
        const pct = Math.floor((this.plantProgress / 4.0) * 100);
        hudPrompt.innerText = `PLANTING SPIKE... ${pct}%`;

        if (this.plantProgress >= 4.0) { // 4 seconds to plant
          this.plantSpike(playerPos.clone(), currentZone);
        }
      } else {
        this.plantProgress = 0;
      }
    } else if (this.isPlanted && window.FPSState.matchData.spikeState === 'planted') {
      // 2. Handling Defuse Logic (If player approaches planted spike and holds E)
      const distToSpike = playerPos.distanceTo(this.spikeMesh.position);
      if (distToSpike < 3.5) {
        hudPrompt.style.display = 'block';
        hudPrompt.innerText = "HOLD [E] TO DEFUSE SPIKE";

        if (playerController.keys.e) {
          window.FPSState.matchData.spikeState = 'defusing';
          this.defuseProgress += dt;
          
          if (Math.floor(this.defuseProgress * 10) % 4 === 0) {
            window.SynthAudio.playClick();
          }

          const pct = Math.floor((this.defuseProgress / 7.0) * 100);
          hudPrompt.innerText = `DEFUSING SPIKE... ${pct}%`;

          if (this.defuseProgress >= 7.0) { // 7 seconds to defuse
            this.defuseSpike();
          }
        } else {
          this.defuseProgress = 0;
        }
      } else {
        hudPrompt.style.display = 'none';
        this.defuseProgress = 0;
      }

      // 3. Spike Beep Clock Ticking
      this.spikeTimer -= dt;
      this.beepTimer += dt;

      // Accelerate beep intervals as time runs down
      if (this.spikeTimer < 10) {
        this.beepInterval = 0.15;
      } else if (this.spikeTimer < 20) {
        this.beepInterval = 0.35;
      } else if (this.spikeTimer < 32) {
        this.beepInterval = 0.65;
      } else {
        this.beepInterval = 1.0;
      }

      if (this.beepTimer >= this.beepInterval) {
        this.beepTimer = 0;
        const rateMult = 1.0 / this.beepInterval;
        window.SynthAudio.playSpikeTick(rateMult);
        
        // Flash alert HUD
        const alertBox = document.getElementById('hud-match-alert');
        alertBox.style.display = (alertBox.style.display === 'none') ? 'block' : 'none';
      }

      // Detonate!
      if (this.spikeTimer <= 0) {
        this.detonateSpike();
      }
    } else {
      hudPrompt.style.display = 'none';
      this.plantProgress = 0;
      this.defuseProgress = 0;
    }

    // 4. Animate expanding explosion wireframe dome
    if (window.FPSState.matchData.spikeState === 'exploded' && this.explosionSphere) {
      this.explosionSphere.scale.addScalar(40 * dt);
      
      // Damage player if caught inside
      const scale = this.explosionSphere.scale.x;
      if (scale < 60 && playerPos.distanceTo(this.spikeMesh.position) < scale) {
        window.FPSState.currentUser.hp = 0;
        document.getElementById('hud-hp-val').innerText = '0';
        if (window.FPSGameLoop) {
          window.FPSGameLoop.triggerMatchEnd(false); // Defeat
        }
      }
    }
  }

  plantSpike(pos, zoneName) {
    this.isPlanted = true;
    this.plantProgress = 0;
    
    window.FPSState.matchData.isSpikePlanted = true;
    window.FPSState.matchData.spikeState = 'planted';

    // Spawn 3D Spike object
    this.spikeMesh = new THREE.Group();
    this.spikeMesh.position.copy(pos);
    this.spikeMesh.position.y = -0.5; // sit on floor

    // Sandstone cylinder base
    const baseGeo = new THREE.CylinderGeometry(0.3, 0.4, 0.6, 8);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    this.spikeMesh.add(base);

    // Glowing core
    const coreGeo = new THREE.BoxGeometry(0.12, 0.4, 0.12);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 0.4;
    this.spikeMesh.add(core);

    this.scene.add(this.spikeMesh);

    // Display Alert
    const alertBox = document.getElementById('hud-match-alert');
    alertBox.innerText = `SPIKE PLANTED AT SITE ${zoneName}`;
    alertBox.style.display = 'block';

    window.SynthAudio.playSplashChime(); // epic trigger sound!
  }

  defuseSpike() {
    window.FPSState.matchData.spikeState = 'defused';
    this.isPlanted = false;
    
    // Play headshot ding to signify defusal
    window.SynthAudio.playHeadshot();
    
    const alertBox = document.getElementById('hud-match-alert');
    alertBox.innerText = "SPIKE DEFUSED!";
    alertBox.style.display = 'block';

    if (window.FPSGameLoop) {
      window.FPSGameLoop.triggerMatchEnd(true); // Victory
    }
  }

  detonateSpike() {
    window.FPSState.matchData.spikeState = 'exploded';
    this.isPlanted = false;

    // Hide alerts
    document.getElementById('hud-match-alert').style.display = 'none';

    // Play explosion gunshot blast
    window.SynthAudio.playShoot('sniper');

    // Spawn expanding dark wireframe dome
    const sphereGeo = new THREE.SphereGeometry(1, 16, 16);
    const sphereMat = new THREE.MeshBasicMaterial({ color: 0x090d16, wireframe: true });
    this.explosionSphere = new THREE.Mesh(sphereGeo, sphereMat);
    this.explosionSphere.position.copy(this.spikeMesh.position);
    this.scene.add(this.explosionSphere);
  }
}

window.SpikeSystem = SpikeSystem;
