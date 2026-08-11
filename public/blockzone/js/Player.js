/**
 * BLOCK ZONE: Player — Blocky character model with correct ground detection
 */
class Player {
  constructor(scene) {
    this.scene = scene;
    this.mesh  = new THREE.Group();

    this.velocity    = new THREE.Vector3();
    this.isGrounded  = false;
    this.isJumping   = false;
    this.isSprinting = false;
    this.isCrouching = false;

    this.hp       = 100;
    this.shield   = 50;
    this.maxHp    = 100;
    this.maxShield = 50;
    this.kills    = 0;
    this.isDead   = false;

    this.moveSpeed   = 6.0;
    this.sprintMult  = 1.65;
    this.crouchMult  = 0.5;
    this.jumpForce   = 8.5;
    this.gravity     = -22;
    this.GROUND_Y    = 0;   // feet-on-ground Y for mesh origin

    this.keys = {};
    this._initInput();

    this._buildCharacter();
    // Start off-screen until drop
    this.mesh.position.set(0, -200, 0);
    this.scene.add(this.mesh);
  }

  /* ─── Character geometry ──────────────────────────────────────────── */
  _buildCharacter() {
    const skinColor  = 0xffd699;
    const bodyColor  = 0x2563eb; // Blue jacket
    const pantColor  = 0x374151; // Dark pants
    const bootColor  = 0x1c1917; // Dark boots

    const skin  = new THREE.MeshLambertMaterial({ color: skinColor });
    const body  = new THREE.MeshLambertMaterial({ color: bodyColor });
    const pants = new THREE.MeshLambertMaterial({ color: pantColor });
    const boots = new THREE.MeshLambertMaterial({ color: bootColor });

    // HEAD — top at y=2.38, center at y=1.98
    this.head = this._box(0.62, 0.72, 0.62, skin);
    this.head.position.set(0, 1.96, 0);

    // HELMET (decorative)
    const helmetMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    this.helmet = this._box(0.65, 0.28, 0.65, helmetMat);
    this.helmet.position.set(0, 2.26, 0);

    // TORSO — y center 1.25, extends 0.82–1.67
    this.torso = this._box(0.78, 0.85, 0.44, body);
    this.torso.position.set(0, 1.26, 0);

    // ARMS
    this.leftArm  = this._box(0.28, 0.75, 0.30, body);
    this.rightArm = this._box(0.28, 0.75, 0.30, body);
    this.leftArm.position.set(-0.55,  1.20, 0);
    this.rightArm.position.set( 0.55, 1.20, 0);

    // HANDS
    this.leftHand  = this._box(0.26, 0.22, 0.26, skin);
    this.rightHand = this._box(0.26, 0.22, 0.26, skin);
    this.leftHand.position.set(-0.55,  0.77, 0);
    this.rightHand.position.set( 0.55, 0.77, 0);

    // HIPS — y 0.72
    this.hips = this._box(0.72, 0.28, 0.40, pants);
    this.hips.position.set(0, 0.72, 0);

    // LEGS — each leg bottom at y=0, top at y=0.70
    this.leftLeg  = this._box(0.32, 0.72, 0.36, pants);
    this.rightLeg = this._box(0.32, 0.72, 0.36, pants);
    this.leftLeg.position.set(-0.20,  0.36, 0);
    this.rightLeg.position.set( 0.20, 0.36, 0);

    // BOOTS
    this.leftBoot  = this._box(0.34, 0.22, 0.40, boots);
    this.rightBoot = this._box(0.34, 0.22, 0.40, boots);
    this.leftBoot.position.set(-0.20,  0.11, 0.04);
    this.rightBoot.position.set( 0.20, 0.11, 0.04);

    // WEAPON (rifle stub)
    const gunMat = new THREE.MeshLambertMaterial({ color: 0x111827 });
    this.gun = this._box(0.14, 0.14, 0.72, gunMat);
    this.gun.position.set(0.55, 1.05, -0.30);

    [this.head, this.helmet, this.torso,
     this.leftArm, this.rightArm, this.leftHand, this.rightHand,
     this.hips, this.leftLeg, this.rightLeg,
     this.leftBoot, this.rightBoot, this.gun].forEach(m => this.mesh.add(m));

    // Name tag
    this.mesh.userData.isPlayer = true;
  }

  _box(w, h, d, mat) {
    return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  }

  /* ─── Input ─────────────────────────────────────────────────────────── */
  _initInput() {
    window.addEventListener('keydown', (e) => { this.keys[e.code] = true; });
    window.addEventListener('keyup',   (e) => { this.keys[e.code] = false; });
  }

  /* ─── Update ─────────────────────────────────────────────────────────── */
  update(dt, cameraRig, worldGround) {
    if (this.isDead) return;

    const forward = cameraRig.getForwardDir();
    const right   = cameraRig.getRightDir();

    // ── Movement input ──
    const moveDir = new THREE.Vector3();
    if (this.keys['KeyW'] || this.keys['ArrowUp'])    moveDir.add(forward.clone().negate());
    if (this.keys['KeyS'] || this.keys['ArrowDown'])  moveDir.add(forward);
    if (this.keys['KeyA'] || this.keys['ArrowLeft'])  moveDir.add(right.clone().negate());
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveDir.add(right);

    const isMoving = moveDir.lengthSq() > 0;

    this.isSprinting = isMoving && (this.keys['ShiftLeft'] || this.keys['ShiftRight']);
    this.isCrouching = this.keys['KeyC'] || this.keys['ControlLeft'];

    let speed = this.moveSpeed;
    if (this.isSprinting) speed *= this.sprintMult;
    if (this.isCrouching) speed *= this.crouchMult;

    if (isMoving) {
      moveDir.normalize().multiplyScalar(speed);
      this.velocity.x = moveDir.x;
      this.velocity.z = moveDir.z;

      // Rotate character to face movement direction
      const targetYaw = Math.atan2(moveDir.x, moveDir.z);
      this.mesh.rotation.y = THREE.MathUtils.lerp(
        this.mesh.rotation.y, targetYaw, 0.22
      );
    } else {
      // Damping
      this.velocity.x *= 0.72;
      this.velocity.z *= 0.72;
    }

    // ── Jump ──
    if ((this.keys['Space'] || this.keys['KeyF']) && this.isGrounded) {
      this.velocity.y = this.jumpForce;
      this.isGrounded  = false;
      this.isJumping   = true;
    }

    // ── Gravity ──
    this.velocity.y += this.gravity * dt;

    // ── Move ──
    this.mesh.position.x += this.velocity.x * dt;
    this.mesh.position.y += this.velocity.y * dt;
    this.mesh.position.z += this.velocity.z * dt;

    // ── Ground collision ──
    const groundY = worldGround ? worldGround(this.mesh.position.x, this.mesh.position.z) : 0;
    if (this.mesh.position.y <= groundY) {
      this.mesh.position.y = groundY;
      this.velocity.y = 0;
      this.isGrounded = true;
      this.isJumping  = false;
    }

    // ── Map boundary clamp ──
    const LIMIT = 240;
    this.mesh.position.x = Math.max(-LIMIT, Math.min(LIMIT, this.mesh.position.x));
    this.mesh.position.z = Math.max(-LIMIT, Math.min(LIMIT, this.mesh.position.z));

    // ── Animate limbs ──
    this._animateLegs(isMoving, dt);

    // ── Crouching squish ──
    const crouchScale = this.isCrouching ? 0.7 : 1.0;
    this.mesh.scale.y = THREE.MathUtils.lerp(this.mesh.scale.y, crouchScale, 0.15);
  }

  _animateLegs(isMoving, dt) {
    if (!this._legTimer) this._legTimer = 0;
    if (isMoving) {
      this._legTimer += dt * (this.isSprinting ? 9 : 5.5);
    } else {
      this._legTimer = THREE.MathUtils.lerp(this._legTimer, 0, 0.1);
    }
    const swing = Math.sin(this._legTimer) * 0.38;
    if (this.leftLeg)  this.leftLeg.rotation.x  =  swing;
    if (this.rightLeg) this.rightLeg.rotation.x  = -swing;
    if (this.leftArm)  this.leftArm.rotation.x   = -swing * 0.5;
    if (this.rightArm) this.rightArm.rotation.x  =  swing * 0.5;
  }

  takeDamage(amount) {
    if (this.isDead) return;
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, amount);
      this.shield -= absorbed;
      amount -= absorbed;
    }
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) {
      this.isDead = true;
      this.mesh.rotation.z = Math.PI / 2;
    }
  }

  respawn(x, y, z) {
    this.mesh.position.set(x, y, z);
    this.mesh.rotation.set(0, 0, 0);
    this.mesh.scale.set(1, 1, 1);
    this.velocity.set(0, 0, 0);
    this.hp     = this.maxHp;
    this.shield = this.maxShield;
    this.isDead = false;
    this.isGrounded = false;
  }

  getPosition() { return this.mesh.position.clone(); }
}
