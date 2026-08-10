/**
 * BLOCK ZONE: Player Controller & 3D Blocky Character Model
 */
class Player {
  constructor(scene) {
    this.scene = scene;
    this.isPlayer = true;
    this.name = 'Player';

    this.health = 100;
    this.maxHealth = 100;
    this.shield = 50;
    this.maxShield = 50;

    this.walkSpeed = 11;
    this.sprintSpeed = 18;
    this.velocity = new THREE.Vector3();
    this.isGrounded = true;

    this.currentWeapon = 'ASSAULT';
    this.ammo = WEAPON_CONFIGS.ASSAULT.magSize;
    this.reserveAmmo = WEAPON_CONFIGS.ASSAULT.reserveAmmo;
    this.isReloading = false;
    this.lastFireTime = 0;
    this.kills = 0;

    this.keys = {};
    this.mouseLeft = false;
    this.mouseRight = false;

    this.buildCharacterModel();
    this.initControls();
  }

  buildCharacterModel() {
    this.mesh = new THREE.Group();
    this.mesh.position.set(0, 1.2, 0);

    // Head (0.7 x 0.7 x 0.7)
    const headMat = new THREE.MeshLambertMaterial({ color: 0xffd1a4 });
    this.head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), headMat);
    this.head.name = 'head';
    this.head.position.y = 1.6;
    this.head.castShadow = true;
    this.mesh.add(this.head);

    // Hair / Helmet Cap
    const hairMat = new THREE.MeshLambertMaterial({ color: 0x1e3a8a });
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.25, 0.74), hairMat);
    hair.position.y = 0.28;
    this.head.add(hair);

    // Torso (Blue Jacket)
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x2563eb });
    this.body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.45), bodyMat);
    this.body.position.y = 0.85;
    this.body.castShadow = true;
    this.mesh.add(this.body);

    // Tactical Backpack
    const packMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.25), packMat);
    pack.position.set(0, 0, -0.32);
    this.body.add(pack);

    // Left Arm
    const armMat = new THREE.MeshLambertMaterial({ color: 0x2563eb });
    this.leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.8, 0.28), armMat);
    this.leftArm.position.set(-0.56, 0.85, 0);
    this.leftArm.castShadow = true;
    this.mesh.add(this.leftArm);

    // Right Arm (Holding Gun)
    this.rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.8, 0.28), armMat);
    this.rightArm.position.set(0.56, 0.85, 0);
    this.rightArm.castShadow = true;
    this.mesh.add(this.rightArm);

    // Held Weapon Mesh
    const gunMat = new THREE.MeshLambertMaterial({ color: 0x1f2937 });
    this.gunMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.7), gunMat);
    this.gunMesh.position.set(0, -0.3, 0.35);
    this.rightArm.add(this.gunMesh);

    // Left Leg
    const legMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    this.leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.85, 0.34), legMat);
    this.leftLeg.position.set(-0.22, 0, 0);
    this.leftLeg.castShadow = true;
    this.mesh.add(this.leftLeg);

    // Right Leg
    this.rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.85, 0.34), legMat);
    this.rightLeg.position.set(0.22, 0, 0);
    this.rightLeg.castShadow = true;
    this.mesh.add(this.rightLeg);

    this.scene.add(this.mesh);
  }

  initControls() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'KeyR') this.reload();
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouseLeft = true;
      if (e.button === 2) this.mouseRight = true;
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseLeft = false;
      if (e.button === 2) this.mouseRight = false;
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  equipWeapon(weaponKey) {
    if (!WEAPON_CONFIGS[weaponKey]) return;
    this.currentWeapon = weaponKey;
    this.ammo = WEAPON_CONFIGS[weaponKey].magSize;
    this.reserveAmmo = Math.max(this.reserveAmmo, WEAPON_CONFIGS[weaponKey].reserveAmmo);

    // Update gun color
    this.gunMesh.material.color.setHex(WEAPON_CONFIGS[weaponKey].color);
    this.updateHUD();
  }

  reload() {
    if (this.isReloading) return;
    const config = WEAPON_CONFIGS[this.currentWeapon];
    if (this.ammo >= config.magSize || this.reserveAmmo <= 0) return;

    this.isReloading = true;
    if (window.audioManager) window.audioManager.playReload();

    setTimeout(() => {
      const needed = config.magSize - this.ammo;
      const toLoad = Math.min(needed, this.reserveAmmo);
      this.ammo += toLoad;
      this.reserveAmmo -= toLoad;
      this.isReloading = false;
      this.updateHUD();
    }, 900);
  }

  takeDamage(amount, shooter, isStorm = false) {
    if (this.health <= 0) return;

    let remaining = amount;
    if (!isStorm && this.shield > 0) {
      if (this.shield >= remaining) {
        this.shield -= remaining;
        remaining = 0;
      } else {
        remaining -= this.shield;
        this.shield = 0;
      }
    }

    this.health = Math.max(0, this.health - remaining);
    this.updateHUD();

    // Damage visual flash
    const flashEl = document.getElementById('damage-flash');
    if (flashEl) {
      flashEl.classList.add('active');
      setTimeout(() => flashEl.classList.remove('active'), 120);
    }

    if (this.health <= 0) {
      this.die(shooter ? shooter.name : (isStorm ? 'The Storm' : 'Unknown'));
    }
  }

  die(killerName) {
    if (window.audioManager) window.audioManager.playEliminated();
    if (window.gameInstance) {
      window.gameInstance.onPlayerDied(killerName);
    }
  }

  updateHUD() {
    if (window.hud) {
      window.hud.updateHealth(this.health, this.maxHealth, this.shield, this.maxShield);
      window.hud.updateWeapon(WEAPON_CONFIGS[this.currentWeapon], this.ammo, this.reserveAmmo);
    }
  }

  update(dt, cameraRig, world, weaponSystem) {
    if (this.health <= 0) return;

    const isSprinting = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
    const currentSpeed = isSprinting ? this.sprintSpeed : this.walkSpeed;

    cameraRig.isAiming = this.mouseRight && cameraRig.isLocked;

    // Movement relative to camera yaw
    const yaw = cameraRig.yawObject.rotation.y;
    const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

    const moveDir = new THREE.Vector3();
    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveDir.add(forward);
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveDir.sub(forward);
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveDir.add(right);
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveDir.sub(right);

    const isMoving = moveDir.lengthSq() > 0.001;
    if (isMoving) {
      moveDir.normalize();

      const nextPos = this.mesh.position.clone().add(moveDir.clone().multiplyScalar(currentSpeed * dt));
      if (!world.checkCollision(nextPos, 0.75)) {
        this.mesh.position.x = nextPos.x;
        this.mesh.position.z = nextPos.z;
      }

      // Rotate character model smoothly toward movement or aim direction
      if (cameraRig.isAiming || this.mouseLeft) {
        this.mesh.rotation.y = yaw;
      } else {
        const targetAngle = Math.atan2(moveDir.x, moveDir.z);
        this.mesh.rotation.y = targetAngle;
      }
    } else if (cameraRig.isAiming || this.mouseLeft) {
      this.mesh.rotation.y = yaw;
    }

    // Jump & Gravity
    if (this.keys['Space'] && this.isGrounded) {
      this.velocity.y = 12.0;
      this.isGrounded = false;
    }

    this.velocity.y -= 28.0 * dt; // Gravity
    this.mesh.position.y += this.velocity.y * dt;

    if (this.mesh.position.y <= 0) {
      this.mesh.position.y = 0;
      this.velocity.y = 0;
      this.isGrounded = true;
    }

    // Walking Limb Animation
    const animSpeed = isSprinting ? 14 : 9;
    const time = performance.now() * 0.001 * animSpeed;
    if (isMoving && this.isGrounded) {
      this.leftLeg.rotation.x = Math.sin(time) * 0.6;
      this.rightLeg.rotation.x = -Math.sin(time) * 0.6;
      this.leftArm.rotation.x = -Math.sin(time) * 0.5;
      if (!cameraRig.isAiming && !this.mouseLeft) {
        this.rightArm.rotation.x = Math.sin(time) * 0.5;
      } else {
        this.rightArm.rotation.x = -0.6;
      }
    } else {
      this.leftLeg.rotation.x = THREE.MathUtils.lerp(this.leftLeg.rotation.x, 0, 0.2);
      this.rightLeg.rotation.x = THREE.MathUtils.lerp(this.rightLeg.rotation.x, 0, 0.2);
      this.leftArm.rotation.x = THREE.MathUtils.lerp(this.leftArm.rotation.x, 0, 0.2);
      if (!cameraRig.isAiming && !this.mouseLeft) {
        this.rightArm.rotation.x = THREE.MathUtils.lerp(this.rightArm.rotation.x, 0, 0.2);
      } else {
        this.rightArm.rotation.x = -0.6;
      }
    }

    // Firing Mechanism
    if (this.mouseLeft && cameraRig.isLocked) {
      const shootOrigin = cameraRig.getCameraPosition();
      const shootDir = cameraRig.getForwardDirection();
      weaponSystem.fire(this, shootOrigin, shootDir, this.currentWeapon);
      this.updateHUD();
    }
  }
}
