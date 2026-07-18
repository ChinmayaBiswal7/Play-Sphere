/* ==========================================================================
   DELHI DEFIANCE - 3D FIRST PERSON PLAYER CONTROLLER & COLLISIONS
   ========================================================================== */

class PlayerFPSController {
  constructor(camera, domElement, colliders) {
    this.camera = camera;
    this.domElement = domElement;
    this.colliders = colliders;

    // Movement states
    this.position = new THREE.Vector3(0, 1.6, 60); // Spawns near South Attacker Spawn
    this.velocity = new THREE.Vector3();
    this.speed = 10;
    this.crouchSpeed = 5;
    this.walkSpeed = 4.5;
    this.height = 1.8;
    this.eyeHeight = 1.65;
    
    // Jump states
    this.isGrounded = true;
    this.gravity = -24;
    this.jumpForce = 8.5;

    // Camera rotations
    this.pitch = 0;
    this.yaw = 0;

    // Input checks
    this.keys = { w: false, a: false, s: false, d: false, Shift: false, Space: false, ctrl: false, e: false };
    
    this.isLocked = false;
    this.playerRadius = 1.0; // Collision bounding cylinder radius

    this.setupPointerLock();
    this.setupKeyboardListeners();
  }

  setupPointerLock() {
    const overlay = document.getElementById('pointerlock-overlay');
    
    overlay.addEventListener('click', () => {
      this.domElement.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement === this.domElement) {
        overlay.style.display = 'none';
        this.isLocked = true;
      } else {
        overlay.style.display = 'flex';
        this.isLocked = false;
        // Pause match if gameplay is active
        if (window.FPSState.gameState === 'GAMEPLAY' || window.FPSState.gameState === (window.STATES && window.STATES.GAMEPLAY)) {
          document.getElementById('pause-overlay').style.display = 'flex';
          window.FPSState.isPauseActive = true;
        }
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isLocked) return;

      const sens = window.FPSState.settings.mouseSensitivity;
      this.yaw -= e.movementX * sens;
      this.pitch -= e.movementY * sens;

      // Lock vertical pitch boundaries (-85deg to +85deg)
      this.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.pitch));

      // Apply pitch/yaw to camera rotation
      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.set(this.pitch, this.yaw, 0);
    });
  }

  setupKeyboardListeners() {
    window.addEventListener('keydown', (e) => {
      if (!this.isLocked) return;

      // Prevent browser scrolling while playing
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      switch(e.code) {
        case 'KeyW': this.keys.w = true; break;
        case 'KeyS': this.keys.s = true; break;
        case 'KeyA': this.keys.a = true; break;
        case 'KeyD': this.keys.d = true; break;
        case 'ShiftLeft':
        case 'ShiftRight': this.keys.Shift = true; break;
        case 'ControlLeft':
        case 'ControlRight':
        case 'KeyC': this.keys.ctrl = true; break;
        case 'Space': this.keys.Space = true; break;
        case 'KeyE': this.keys.e = true; break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch(e.code) {
        case 'KeyW': this.keys.w = false; break;
        case 'KeyS': this.keys.s = false; break;
        case 'KeyA': this.keys.a = false; break;
        case 'KeyD': this.keys.d = false; break;
        case 'ShiftLeft':
        case 'ShiftRight': this.keys.Shift = false; break;
        case 'ControlLeft':
        case 'ControlRight':
        case 'KeyC': this.keys.ctrl = false; break;
        case 'Space': this.keys.Space = false; break;
        case 'KeyE': this.keys.e = false; break;
      }
    });
  }

  update(dt) {
    if (!this.isLocked) return;

    // 1. Smooth Crouch Eye Height transition
    const targetEyeHeight = this.keys.ctrl ? 0.95 : 1.65;
    this.eyeHeight += (targetEyeHeight - this.eyeHeight) * 15 * dt;

    // 2. Horizontal movement inputs
    let moveSpeed = this.speed;
    if (this.keys.Shift) moveSpeed = this.walkSpeed;
    if (this.keys.ctrl) moveSpeed = this.crouchSpeed;

    const forwardVec = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    const rightVec = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

    const moveDirection = new THREE.Vector3();
    if (this.keys.w) moveDirection.add(forwardVec);
    if (this.keys.s) moveDirection.add(forwardVec.clone().negate());
    if (this.keys.a) moveDirection.add(rightVec.clone().negate());
    if (this.keys.d) moveDirection.add(rightVec);

    moveDirection.normalize().multiplyScalar(moveSpeed);

    // 3. Horizontal collision check (sliding along walls)
    const targetPos = this.position.clone().add(moveDirection.clone().multiplyScalar(dt));
    const finalPos = this.checkCollisions(this.position, targetPos);
    this.position.x = finalPos.x;
    this.position.z = finalPos.z;

    // 4. Find highest floor height underneath the player's updated horizontal position
    const radius = this.playerRadius;
    let floorHeight = -0.5; // ground default

    for (let i = 0; i < this.colliders.length; i++) {
      const obstacle = this.colliders[i];
      // Skip triggers or non-solid collision volumes
      if (obstacle.material && obstacle.material.visible === false && obstacle.name === "trigger") continue;

      const box = new THREE.Box3().setFromObject(obstacle);
      
      const overlapX = (this.position.x - radius < box.max.x) && (this.position.x + radius > box.min.x);
      const overlapZ = (this.position.z - radius < box.max.z) && (this.position.z + radius > box.min.z);
      
      if (overlapX && overlapZ) {
        const feetY = this.position.y - this.eyeHeight;
        // Step height limit: player can step up to 0.45m high obstacles
        if (feetY >= box.max.y - 0.45 && box.max.y > floorHeight) {
          floorHeight = box.max.y;
        }
      }
    }

    const groundLevel = floorHeight + this.eyeHeight;

    // 5. Vertical physics (gravity and jump)
    if (!this.isGrounded) {
      this.velocity.y += this.gravity * dt;
    }

    if (this.keys.Space && this.isGrounded) {
      this.velocity.y = this.jumpForce;
      this.isGrounded = false;
    }

    // Apply vertical travel
    this.position.y += this.velocity.y * dt;

    // Snapping and landing checks
    if (this.position.y <= groundLevel) {
      this.position.y = groundLevel;
      this.velocity.y = 0;
      this.isGrounded = true;
    } else {
      // If player is standing on a platform, snap to changing heights (like stairs/ramps)
      if (this.isGrounded && Math.abs(this.position.y - groundLevel) < 0.45) {
        this.position.y = groundLevel;
        this.velocity.y = 0;
      } else {
        this.isGrounded = false;
      }
    }

    // Apply coordinates to camera node
    this.camera.position.copy(this.position);
  }

  checkCollisions(current, target) {
    const nextX = new THREE.Vector3(target.x, current.y, current.z);
    const nextZ = new THREE.Vector3(current.x, current.y, target.z);
    
    let collideX = false;
    let collideZ = false;

    const radius = this.playerRadius;

    for (let i = 0; i < this.colliders.length; i++) {
      const obstacle = this.colliders[i];
      const box = new THREE.Box3().setFromObject(obstacle);

      // Check X coordinate path - raise min Y by 0.45 so small steps don't block horizontally!
      const checkXBox = new THREE.Box3(
        new THREE.Vector3(nextX.x - radius, nextX.y - 1.5 + 0.45, nextX.z - radius),
        new THREE.Vector3(nextX.x + radius, nextX.y + 0.5, nextX.z + radius)
      );
      if (checkXBox.intersectsBox(box)) {
        if (box.max.y > nextX.y - 1.5 + 0.45) {
          collideX = true;
        }
      }

      // Check Z coordinate path
      const checkZBox = new THREE.Box3(
        new THREE.Vector3(nextZ.x - radius, nextZ.y - 1.5 + 0.45, nextZ.z - radius),
        new THREE.Vector3(nextZ.x + radius, nextZ.y + 0.5, nextZ.z + radius)
      );
      if (checkZBox.intersectsBox(box)) {
        if (box.max.y > nextZ.y - 1.5 + 0.45) {
          collideZ = true;
        }
      }
    }

    const result = target.clone();
    if (collideX) result.x = current.x; // slide along Z
    if (collideZ) result.z = current.z; // slide along X

    return result;
  }
}

window.PlayerFPSController = PlayerFPSController;
