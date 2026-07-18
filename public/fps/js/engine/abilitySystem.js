/* ==========================================================================
   DELHI DEFIANCE - AGENT ABILITIES & PARTICLE VFX SYSTEM
   ========================================================================== */

class AbilityManager {
  constructor(scene, camera, colliders, playerController) {
    this.scene = scene;
    this.camera = camera;
    this.colliders = colliders;
    this.player = playerController;

    // Ability stats & active state
    this.energy = 100;
    this.maxEnergy = 100;
    this.energyRegenRate = 8; // energy per second
    this.ultimatePoints = 7;   // start with 7 for instant fun!
    this.maxUltimatePoints = 7;

    this.cooldowns = { q: 0, e: 0, c: 0, x: 0 };
    this.cooldownMax = {
      agni: { q: 25, e: 18, c: 15, x: 7 }, // Q: Molten Wall, E: Fire Dash, C: Fireball, X: Inferno Storm
      vayu: { q: 20, e: 15, c: 22, x: 7 }  // Q: Air Pulse, E: Wind Burst, C: Cyclone, X: Vortex
    };

    this.energyCosts = {
      agni: { q: 30, e: 0, c: 25, x: 0 },
      vayu: { q: 35, e: 0, c: 30, x: 0 }
    };

    // Active visual effects & zones
    this.activeEffects = [];
    this.projectiles = [];

    this.setupListeners();
  }

  setupListeners() {
    window.addEventListener('keydown', (e) => {
      // Only cast if in gameplay mode
      if (window.FPSState.gameState !== 'GAMEPLAY') return;
      if (!this.player.isLocked) return;

      switch (e.code) {
        case 'KeyQ': this.castAbility('q'); break;
        case 'KeyE': 
          // If in plant/defuse range, E is reserved for Spike interaction
          const currentZone = window.FPSGameLoop?.spike?.map?.getPlantZone(this.player.position);
          const spikeMesh = window.FPSGameLoop?.spike?.spikeMesh;
          const distToSpike = spikeMesh ? this.player.position.distanceTo(spikeMesh.position) : 999;
          const inSpikeRange = currentZone || (spikeMesh && distToSpike < 3.5);
          
          if (!inSpikeRange) {
            this.castAbility('e');
          }
          break;
        case 'KeyC': this.castAbility('c'); break;
        case 'KeyX': this.castAbility('x'); break;
      }
    });
  }

  castAbility(key) {
    if (window.FPSState.currentUser.hp <= 0) return; // dead

    const agent = window.FPSState.selectedAgentId || 'agni';
    const cd = this.cooldowns[key];
    const cost = this.energyCosts[agent][key];
    const maxCd = this.cooldownMax[agent][key];

    // Check Cooldown
    if (cd > 0) {
      this.playError();
      return;
    }

    // Check Energy/Ult points
    if (key === 'x') {
      if (this.ultimatePoints < this.maxUltimatePoints) {
        this.playError();
        return;
      }
    } else {
      if (this.energy < cost) {
        this.playError();
        return;
      }
    }

    // Trigger casting
    let success = false;
    if (agent === 'agni') {
      success = this.triggerAgniAbility(key);
    } else {
      success = this.triggerVayuAbility(key);
    }

    if (success) {
      // Consume resources
      if (key === 'x') {
        this.ultimatePoints = 0;
      } else {
        this.energy -= cost;
      }
      this.cooldowns[key] = maxCd;
      this.updateHUD();
    }
  }

  playError() {
    if (window.SynthAudio) window.SynthAudio.playError();
    // Flash HUD indicator red briefly
    const alert = document.getElementById('hud-match-alert');
    if (alert) {
      alert.innerText = "ABILITY NOT READY / INSUFFICIENT ENERGY!";
      alert.style.display = 'block';
      alert.style.color = 'var(--neon-red)';
      setTimeout(() => { alert.style.display = 'none'; alert.style.color = ''; }, 1200);
    }
  }

  triggerAgniAbility(key) {
    if (key === 'q') {
      // 1. MOLTEN WALL (Vision Block + Damage)
      if (window.SynthAudio) window.SynthAudio.playAbilityFlame();

      const wallGeo = new THREE.BoxGeometry(16, 4, 0.85);
      const wallMat = new THREE.MeshStandardMaterial({
        color: 0xff3300,
        emissive: 0xff3300,
        emissiveIntensity: 1.5,
        roughness: 0.2,
        transparent: true,
        opacity: 0.92
      });
      const wallMesh = new THREE.Mesh(wallGeo, wallMat);

      // Position in front of camera
      const dir = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.player.yaw);
      const pos = this.player.position.clone().add(dir.multiplyScalar(4));
      pos.y = 1.5; // sit near floor level
      wallMesh.position.copy(pos);
      wallMesh.rotation.y = this.player.yaw;

      this.scene.add(wallMesh);
      
      this.activeEffects.push({
        type: 'molten_wall',
        mesh: wallMesh,
        duration: 6.0,
        age: 0,
        position: pos.clone(),
        radius: 8.0, // collision width
        update: (dt) => {
          // damage bots standing in range
          if (window.FPSGameLoop?.bots?.bots) {
            window.FPSGameLoop.bots.bots.forEach(b => {
              if (!b.isDead && b.mesh.position.distanceTo(pos) < 7.5) {
                b.hp -= 35 * dt; // DPS
                if (b.hp <= 0) window.registerBotHit(b.mesh, 0); // trigger elimination
              }
            });
          }
        }
      });
      return true;

    } else if (key === 'e') {
      // 2. FIRE DASH (Signature Burst)
      if (window.SynthAudio) window.SynthAudio.playAbilityDash();

      // Apply forward boost force
      const dir = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.player.yaw).normalize();
      this.player.position.add(dir.multiplyScalar(9.5)); // push instantly
      
      // Screen fov animation stretch
      const originalFov = this.camera.fov;
      this.camera.fov = 85;
      this.camera.updateProjectionMatrix();

      let fovTimer = 0;
      const fovAnim = {
        type: 'fov_restore',
        update: (dt) => {
          fovTimer += dt;
          if (fovTimer < 0.25) {
            this.camera.fov = 85 - (fovTimer / 0.25) * (85 - originalFov);
            this.camera.updateProjectionMatrix();
          } else {
            this.camera.fov = originalFov;
            this.camera.updateProjectionMatrix();
            return true; // remove
          }
        }
      };
      this.activeEffects.push(fovAnim);

      // Dash fire particle trails
      const dashPlat = new THREE.Mesh(
        new THREE.RingGeometry(0.1, 1.8, 16),
        new THREE.MeshBasicMaterial({ color: 0xffaa00, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
      );
      dashPlat.position.copy(this.player.position).y = -0.4;
      dashPlat.rotation.x = Math.PI / 2;
      this.scene.add(dashPlat);
      this.activeEffects.push({
        mesh: dashPlat,
        duration: 0.6,
        age: 0,
        update: (dt) => {
          dashPlat.scale.addScalar(dt * 0.5);
          dashPlat.material.opacity = 0.7 * (1.0 - (dashPlat.scale.x / 1.5));
        }
      });
      return true;

    } else if (key === 'c') {
      // 3. MOLTEN FIREBALL (Ability 2 Projectile)
      if (window.SynthAudio) window.SynthAudio.playAbilityFlame();

      const ballGeo = new THREE.SphereGeometry(0.3, 12, 12);
      const ballMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
      const ball = new THREE.Mesh(ballGeo, ballMat);

      // Spawn at camera sight
      ball.position.copy(this.player.position);
      ball.position.y += 0.2;
      
      const dir = new THREE.Vector3();
      this.camera.getWorldDirection(dir);

      this.scene.add(ball);

      this.projectiles.push({
        mesh: ball,
        dir: dir.clone().normalize(),
        speed: 38.0,
        age: 0,
        maxAge: 3.0,
        update: (dt) => {
          ball.position.add(dir.clone().multiplyScalar(38.0 * dt));
          
          // Collision check on bots
          if (window.FPSGameLoop?.bots?.bots) {
            for (let b of window.FPSGameLoop.bots.bots) {
              if (!b.isDead && ball.position.distanceTo(b.mesh.position) < 2.0) {
                this.explodeFireball(ball.position);
                return true; // remove
              }
            }
          }
          // Collision check on walls
          for (let col of this.colliders) {
            const box = new THREE.Box3().setFromObject(col);
            if (box.containsPoint(ball.position)) {
              this.explodeFireball(ball.position);
              return true;
            }
          }
          return false;
        }
      });
      return true;

    } else if (key === 'x') {
      // 4. INFERNO ULTIMATE
      if (window.SynthAudio) window.SynthAudio.playUltReady();
      
      // Fire 3 fireballs in rapid sequence!
      let count = 0;
      const interval = setInterval(() => {
        if (count >= 3 || window.FPSState.currentUser.hp <= 0) {
          clearInterval(interval);
          return;
        }
        
        if (window.SynthAudio) window.SynthAudio.playShoot('sniper');
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 12), new THREE.MeshBasicMaterial({ color: 0xff3300 }));
        ball.position.copy(this.player.position).y += 0.2;
        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);
        this.scene.add(ball);

        this.projectiles.push({
          mesh: ball,
          dir: dir.clone().normalize(),
          speed: 45.0,
          age: 0,
          maxAge: 3.0,
          update: (dt) => {
            ball.position.add(dir.clone().multiplyScalar(45.0 * dt));
            for (let b of window.FPSGameLoop.bots.bots) {
              if (!b.isDead && ball.position.distanceTo(b.mesh.position) < 2.5) {
                this.explodeFireball(ball.position, true); // Ult explosion
                return true;
              }
            }
            return false;
          }
        });

        count++;
      }, 200);

      return true;
    }
    return false;
  }

  explodeFireball(pos, isUlt = false) {
    if (window.SynthAudio) window.SynthAudio.playShoot('sniper');

    // Create explosion dome sphere
    const expGeo = new THREE.SphereGeometry(isUlt ? 6.0 : 3.5, 16, 16);
    const expMat = new THREE.MeshStandardMaterial({
      color: isUlt ? 0xff3300 : 0xffaa00,
      emissive: isUlt ? 0xff3300 : 0xffaa00,
      emissiveIntensity: 1.2,
      roughness: 0.1,
      transparent: true,
      opacity: 0.45
    });
    const expMesh = new THREE.Mesh(expGeo, expMat);
    expMesh.position.copy(pos);
    this.scene.add(expMesh);

    // Apply area damage to bots
    const radius = isUlt ? 6.0 : 3.5;
    const damage = isUlt ? 120 : 60;
    if (window.FPSGameLoop?.bots?.bots) {
      window.FPSGameLoop.bots.bots.forEach(b => {
        if (!b.isDead) {
          const dist = b.mesh.position.distanceTo(pos);
          if (dist < radius) {
            b.hp -= damage * (1.0 - (dist / radius)); // damage dropoff
            if (b.hp <= 0) window.registerBotHit(b.mesh, 0);
          }
        }
      });
    }

    // Animate scale fadeout
    this.activeEffects.push({
      mesh: expMesh,
      duration: 0.4,
      age: 0,
      update: (dt) => {
        expMesh.scale.addScalar(dt * 2.0);
        expMesh.material.opacity = 0.8 * (1.0 - (expMesh.scale.x / 2.0));
      }
    });
  }

  triggerVayuAbility(key) {
    if (key === 'q') {
      // 1. AIR PULSE (Intel Scanner)
      if (window.SynthAudio) window.SynthAudio.playAbilityPulse();

      const pulseRing = new THREE.Mesh(
        new THREE.RingGeometry(0.1, 1.0, 32),
        new THREE.MeshBasicMaterial({ color: 0x00d2ff, side: THREE.DoubleSide, transparent: true, opacity: 0.35 })
      );
      pulseRing.position.copy(this.player.position).y = -0.4;
      pulseRing.rotation.x = Math.PI / 2;
      this.scene.add(pulseRing);

      this.activeEffects.push({
        mesh: pulseRing,
        duration: 1.5,
        age: 0,
        update: (dt) => {
          pulseRing.scale.addScalar(dt * 30.0);
          pulseRing.material.opacity = 0.35 * (1.0 - (pulseRing.scale.x / 45.0));
          
          // Highlight scanned bots
          const currentRadius = pulseRing.scale.x;
          if (window.FPSGameLoop?.bots?.bots) {
            window.FPSGameLoop.bots.bots.forEach(b => {
              if (!b.isDead && b.mesh.position.distanceTo(pulseRing.position) < currentRadius) {
                // Glow their outline red/cyan briefly
                b.mesh.children.forEach(c => {
                  if (c.material) c.material.color.setHex(0x00d2ff);
                });
                setTimeout(() => {
                  if (!b.isDead) {
                    b.mesh.children.forEach(c => {
                      if (c.material) c.material.color.setHex(0xef4444); // back to red outline
                    });
                  }
                }, 5000);
              }
            });
          }
        }
      });
      return true;

    } else if (key === 'e') {
      // 2. WIND BURST (Knockback Blast)
      if (window.SynthAudio) window.SynthAudio.playAbilityWind();

      const blastGeo = new THREE.CylinderGeometry(0.1, 3.5, 12, 16);
      const blastMat = new THREE.MeshBasicMaterial({ color: 0x00d2ff, transparent: true, opacity: 0.15 });
      const blast = new THREE.Mesh(blastGeo, blastMat);
      
      const dir = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.player.yaw).normalize();
      blast.position.copy(this.player.position).add(dir.clone().multiplyScalar(6));
      blast.rotation.y = this.player.yaw;
      blast.rotation.x = Math.PI / 2;
      this.scene.add(blast);

      // Knock back and damage bots in path
      if (window.FPSGameLoop?.bots?.bots) {
        window.FPSGameLoop.bots.bots.forEach(b => {
          if (!b.isDead && b.mesh.position.distanceTo(blast.position) < 8.5) {
            // Push bot backward
            const pushDir = b.mesh.position.clone().sub(this.player.position).normalize();
            b.mesh.position.add(pushDir.multiplyScalar(7.0));
            b.hp -= 25;
            if (b.hp <= 0) window.registerBotHit(b.mesh, 0);
          }
        });
      }

      this.activeEffects.push({
        mesh: blast,
        duration: 0.35,
        age: 0,
        update: (dt) => {
          blast.scale.x += dt * 3.0;
          blast.material.opacity = 0.3 * (1.0 - (blast.scale.x / 2.0));
        }
      });
      return true;

    } else if (key === 'c') {
      // 3. CYCLONE FIELD (Tornado slow/damage zone)
      if (window.SynthAudio) window.SynthAudio.playAbilityCyclone();

      // Spawn target cyclone on floor in front of player
      const dir = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.player.yaw).normalize();
      const pos = this.player.position.clone().add(dir.multiplyScalar(12));
      pos.y = 0.5;

      const cyGeo = new THREE.CylinderGeometry(4.0, 4.0, 5.0, 16, 1, true);
      const cyMat = new THREE.MeshBasicMaterial({ color: 0x00d2ff, transparent: true, opacity: 0.22 });
      const cyclone = new THREE.Mesh(cyGeo, cyMat);
      cyclone.position.copy(pos);
      this.scene.add(cyclone);

      this.activeEffects.push({
        mesh: cyclone,
        duration: 5.0,
        age: 0,
        update: (dt) => {
          cyclone.rotation.y += dt * 5.0; // spin!
          
          // Pull bots in and damage them
          if (window.FPSGameLoop?.bots?.bots) {
            window.FPSGameLoop.bots.bots.forEach(b => {
              if (!b.isDead && b.mesh.position.distanceTo(pos) < 5.0) {
                // pull toward center
                const pull = pos.clone().sub(b.mesh.position).normalize();
                b.mesh.position.add(pull.multiplyScalar(dt * 3.0));
                b.hp -= 15 * dt;
                if (b.hp <= 0) window.registerBotHit(b.mesh, 0);
              }
            });
          }
        }
      });
      return true;

    } else if (key === 'x') {
      // 4. CYCLONE VORTEX ULTIMATE (Giant storm sweeps field)
      if (window.SynthAudio) window.SynthAudio.playAbilityCyclone();

      const vorGeo = new THREE.CylinderGeometry(8.0, 8.0, 10.0, 24, 1, true);
      const vorMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28 });
      const vortex = new THREE.Mesh(vorGeo, vorMat);
      
      const dir = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.player.yaw).normalize();
      vortex.position.copy(this.player.position).add(dir.clone().multiplyScalar(4));
      vortex.position.y = 2.0;
      this.scene.add(vortex);

      this.activeEffects.push({
        mesh: vortex,
        duration: 6.0,
        age: 0,
        update: (dt) => {
          vortex.rotation.y -= dt * 6.5;
          // move vortex forward
          vortex.position.add(dir.clone().multiplyScalar(dt * 12.0));

          // pull and shred bots
          if (window.FPSGameLoop?.bots?.bots) {
            window.FPSGameLoop.bots.bots.forEach(b => {
              if (!b.isDead && b.mesh.position.distanceTo(vortex.position) < 9.5) {
                const pull = vortex.position.clone().sub(b.mesh.position).normalize();
                b.mesh.position.add(pull.multiplyScalar(dt * 8.0));
                b.hp -= 65 * dt;
                if (b.hp <= 0) window.registerBotHit(b.mesh, 0);
              }
            });
          }
        }
      });
      return true;
    }
    return false;
  }

  update(dt) {
    // 1. Regenerate Energy
    if (this.energy < this.maxEnergy) {
      this.energy = Math.min(this.maxEnergy, this.energy + this.energyRegenRate * dt);
    }

    // 2. Tick Cooldowns
    for (let k in this.cooldowns) {
      if (this.cooldowns[k] > 0) {
        this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);
      }
    }

    // 3. Update active meshes and animations
    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const fx = this.activeEffects[i];
      if (fx.update) {
        const remove = fx.update(dt);
        if (fx.duration) {
          fx.age += dt;
          if (fx.age >= fx.duration) {
            if (fx.mesh) this.scene.remove(fx.mesh);
            this.activeEffects.splice(i, 1);
            continue;
          }
        }
        if (remove) {
          if (fx.mesh) this.scene.remove(fx.mesh);
          this.activeEffects.splice(i, 1);
        }
      }
    }

    // 4. Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      const remove = proj.update(dt);
      proj.age += dt;
      if (remove || proj.age >= proj.maxAge) {
        if (proj.mesh) this.scene.remove(proj.mesh);
        this.projectiles.splice(i, 1);
      }
    }

    this.updateHUD();
  }

  updateHUD() {
    // Set energy value text
    const energyVal = document.getElementById('hud-energy-val');
    if (energyVal) energyVal.innerText = Math.floor(this.energy);

    // Update CD overlays
    const keys = ['q', 'e', 'c', 'x'];
    const agent = window.FPSState.selectedAgentId || 'agni';

    keys.forEach(k => {
      const cdEl = document.getElementById(`hud-ab-${k}-cd`);
      const widget = document.getElementById(`hud-ab-${k}`);
      if (!cdEl || !widget) return;

      const cd = this.cooldowns[k];
      if (cd > 0) {
        cdEl.style.display = 'flex';
        cdEl.innerText = Math.ceil(cd) + 's';
        widget.style.opacity = '0.4';
      } else {
        // Check if has enough energy
        const cost = this.energyCosts[agent][k];
        if (k !== 'x' && this.energy < cost) {
          widget.style.opacity = '0.3';
          cdEl.style.display = 'none';
        } else if (k === 'x' && this.ultimatePoints < this.maxUltimatePoints) {
          widget.style.opacity = '0.3';
          cdEl.style.display = 'flex';
          cdEl.innerText = `${this.ultimatePoints}/${this.maxUltimatePoints}`;
        } else {
          widget.style.opacity = '1.0';
          cdEl.style.display = 'none';
        }
      }
    });
  }

  reset() {
    this.energy = 100;
    this.ultimatePoints = 7;
    for (let k in this.cooldowns) this.cooldowns[k] = 0;
    
    // Clear meshes
    this.activeEffects.forEach(fx => { if (fx.mesh) this.scene.remove(fx.mesh); });
    this.projectiles.forEach(p => { if (p.mesh) this.scene.remove(p.mesh); });
    this.activeEffects = [];
    this.projectiles = [];
    
    this.updateHUD();
  }
}

window.AbilityManager = AbilityManager;
