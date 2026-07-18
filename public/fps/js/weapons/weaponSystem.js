/* ==========================================================================
   DELHI DEFIANCE - 3D FIRST PERSON GUN MODEL & BULLET COLLISION SYSTEM
   ========================================================================== */

class FPSWeaponSystem {
  constructor(scene, camera, colliders) {
    this.scene = scene;
    this.camera = camera;
    this.colliders = colliders;

    this.gunGroup = null;
    this.muzzleFlash = null;
    
    // Weapon stats
    this.weaponsList = {
      vandal: { name: 'VANDAL RIFLE', maxAmmo: 25, currentAmmo: 25, damage: 35, fireRate: 0.12, reloadTime: 1.5, recoilPower: 0.08 },
      sheriff: { name: 'SHERIFF PISTOL', maxAmmo: 6, currentAmmo: 6, damage: 55, fireRate: 0.45, reloadTime: 1.2, recoilPower: 0.18 },
      operator: { name: 'OPERATOR SNIPER', maxAmmo: 5, currentAmmo: 5, damage: 150, fireRate: 1.5, reloadTime: 2.2, recoilPower: 0.35 }
    };
    
    this.activeWeapon = 'vandal';
    this.fireTimer = 0;
    this.reloadTimer = 0;
    this.isReloading = false;
    
    this.decals = [];
    this.tracers = [];

    this.build3DGunModel();
    this.setupMouseEvents();
  }

  build3DGunModel() {
    this.gunGroup = new THREE.Group();

    // 1. Core Gun Frame
    const frameGeo = new THREE.BoxGeometry(0.12, 0.12, 0.45);
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x22252c, metalness: 0.9, roughness: 0.2 });
    const frame = new THREE.Mesh(frameGeo, metalMat);
    this.gunGroup.add(frame);

    // 2. Barrel Tube
    const barrelGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.4, 8);
    const barrel = new THREE.Mesh(barrelGeo, metalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -0.35);
    this.gunGroup.add(barrel);

    // 3. Cyber neon glowing ammo clip details
    const clipGeo = new THREE.BoxGeometry(0.06, 0.15, 0.08);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x00d2ff }); // Blue neon energy clip
    const clip = new THREE.Mesh(clipGeo, glowMat);
    clip.position.set(0, -0.09, -0.05);
    this.gunGroup.add(clip);

    // 4. Muzzle flash sprite (hidden by default)
    const flashGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.9 });
    this.muzzleFlash = new THREE.Mesh(flashGeo, flashMat);
    this.muzzleFlash.position.set(0, 0.02, -0.55);
    this.muzzleFlash.visible = false;
    this.gunGroup.add(this.muzzleFlash);

    // Position gun at bottom right relative to first person camera
    this.gunGroup.position.set(0.24, -0.22, -0.45);
    this.camera.add(this.gunGroup);
  }

  setupMouseEvents() {
    window.addEventListener('mousedown', (e) => {
      if (window.FPSState.gameState !== 'GAMEPLAY') return;
      if (!document.pointerLockElement) return;
      if (e.button === 0) { // Left click
        this.triggerShoot();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyR') {
        this.triggerReload();
      }
    });
  }

  triggerShoot() {
    if (this.isReloading) return;
    const w = this.weaponsList[this.activeWeapon];
    if (w.currentAmmo <= 0) {
      this.triggerReload();
      return;
    }

    if (this.fireTimer > 0) return;

    // 1. Consume bullet
    w.currentAmmo--;
    this.fireTimer = w.fireRate;
    document.getElementById('hud-ammo-val').innerText = w.currentAmmo;

    // Play synthesized sound
    window.SynthAudio.playShoot(this.activeWeapon);

    // 2. Animate Gun Recoil
    this.gunGroup.position.z += w.recoilPower;
    this.gunGroup.position.y += w.recoilPower * 0.4;

    // 3. Toggle muzzle flash
    this.muzzleFlash.visible = true;
    setTimeout(() => { this.muzzleFlash.visible = false; }, 40);

    // 4. Raycast combat hits (decals & tracers)
    this.fireBulletRay();
  }

  fireBulletRay() {
    const raycaster = new THREE.Raycaster();
    
    // Shoot direction is straight center of screen
    const centerPoint = new THREE.Vector2(0, 0); 
    raycaster.setFromCamera(centerPoint, this.camera);

    // Emit shoot packet to multiplayer room
    const camPos = this.camera.position.clone();
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);

    if (window.FPSGameLoop?.multiplayer?.isMultiplayer) {
      window.FPSGameLoop.multiplayer.emitShoot(camPos, camDir, this.activeWeapon);
    }

    const intersects = raycaster.intersectObjects(this.colliders, true);
    
    // Default endpoint if no walls are hit
    let hitPoint = new THREE.Vector3();
    this.camera.getWorldDirection(hitPoint);
    hitPoint.multiplyScalar(80).add(this.camera.position);

    let wallDistance = 9999;

    if (intersects.length > 0) {
      const hit = intersects[0];
      hitPoint.copy(hit.point);
      wallDistance = hit.distance;

      // Spawn bullet hole decal on wall
      this.spawnDecal(hit.point, hit.face.normal);

      // Check if we hit an AI combat bot capsule (only in singleplayer)
      if (!(window.FPSGameLoop?.multiplayer?.isMultiplayer)) {
        if (hit.object.parent && hit.object.parent.isBot) {
          hit.object.parent.registerHit(this.weaponsList[this.activeWeapon].damage);
        }
      }
    }

    // Check hit on multiplayer opponent (if closer than wall intersection)
    if (window.FPSGameLoop?.multiplayer?.isMultiplayer && window.FPSGameLoop.multiplayer.opponentMesh) {
      const oppIntersects = raycaster.intersectObject(window.FPSGameLoop.multiplayer.opponentMesh, true);
      if (oppIntersects.length > 0 && oppIntersects[0].distance < wallDistance) {
        const hitObj = oppIntersects[0].object;
        let damage = this.weaponsList[this.activeWeapon].damage;
        let zone = 'body';

        if (hitObj.isHead) {
          damage *= 3.0; // Headshot deal 3x damage!
          zone = 'head';
          if (window.SynthAudio) window.SynthAudio.playHeadshot();
        } else {
          if (window.SynthAudio) window.SynthAudio.playHitMarker();
        }

        window.FPSGameLoop.multiplayer.emitHit(damage, zone);
      }
    }

    // Spawn transient tracer line
    this.createTracer(hitPoint);
  }

  spawnDecal(point, normal) {
    const decalGeo = new THREE.CircleGeometry(0.04, 8);
    const decalMat = new THREE.MeshBasicMaterial({ color: 0x111827, side: THREE.DoubleSide });
    const decal = new THREE.Mesh(decalGeo, decalMat);
    
    // Offset slightly out of wall plane to prevent z-fighting
    decal.position.copy(point).add(normal.clone().multiplyScalar(0.01));
    decal.lookAt(point.clone().add(normal));

    this.scene.add(decal);
    this.decals.push(decal);

    // Caps decals count to keep performance high
    if (this.decals.length > 40) {
      const oldest = this.decals.shift();
      this.scene.remove(oldest);
    }
  }

  createTracer(targetPos) {
    // Gun muzzle world coordinates
    const muzzlePos = new THREE.Vector3();
    this.muzzleFlash.getWorldPosition(muzzlePos);

    const points = [muzzlePos, targetPos];
    const tracerGeo = new THREE.BufferGeometry().setFromPoints(points);
    const tracerMat = new THREE.LineBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.9 });
    const tracer = new THREE.Line(tracerGeo, tracerMat);

    this.scene.add(tracer);
    this.tracers.push({ mesh: tracer, life: 0.1 });
  }

  triggerReload() {
    if (this.isReloading) return;
    const w = this.weaponsList[this.activeWeapon];
    if (w.currentAmmo === w.maxAmmo) return;

    this.isReloading = true;
    this.reloadTimer = w.reloadTime;

    // Drop gun down out of screen during reload
    this.gunGroup.position.y = -0.6;
    window.SynthAudio.playClick(); // reload audio cue
  }

  update(dt) {
    // 1. Timers tick
    if (this.fireTimer > 0) this.fireTimer -= dt;

    if (this.isReloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.isReloading = false;
        const w = this.weaponsList[this.activeWeapon];
        w.currentAmmo = w.maxAmmo;
        document.getElementById('hud-ammo-val').innerText = w.currentAmmo;
        
        // Return gun to baseline view
        this.gunGroup.position.set(0.24, -0.22, -0.45);
      }
    }

    // 2. Animate gun recovery recoil back to baseline position
    if (!this.isReloading && this.gunGroup.position.z > -0.45) {
      this.gunGroup.position.z -= 0.6 * dt;
      this.gunGroup.position.y -= 0.2 * dt;
      
      // clamp to base
      if (this.gunGroup.position.z < -0.45) this.gunGroup.position.z = -0.45;
      if (this.gunGroup.position.y < -0.22) this.gunGroup.position.y = -0.22;
    }

    // 3. Fade and clean tracers
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      t.mesh.material.opacity = t.life / 0.1;
      if (t.life <= 0) {
        this.scene.remove(t.mesh);
        this.tracers.splice(i, 1);
      }
    }
  }

  syncActiveSkin() {
    const skin = window.FPSState.loadout.primarySkin;
    // Set neon light clip colors dynamically!
    const clipMesh = this.gunGroup.children[2];
    if (skin === 'neon') {
      clipMesh.material.color.setHex(0x00d2ff);
    } else if (skin === 'crimson') {
      clipMesh.material.color.setHex(0xff3366);
    } else {
      clipMesh.material.color.setHex(0xffaa00);
    }
  }
}

window.FPSWeaponSystem = FPSWeaponSystem;
