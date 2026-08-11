/**
 * BLOCK ZONE: Third-Person Camera — Explicit Yaw/Pitch angles (no Object3D rig bugs)
 */
class CameraRig {
  constructor(canvas) {
    this.canvas = canvas;
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 800);
    this.camera.position.set(0, 5, 10);

    // Explicit angle storage — no Three.js rotation objects
    this.yaw   = Math.PI;  // Face south initially
    this.pitch = 0.18;     // Slight downward look

    this.isLocked   = false;
    this.isAiming   = false;
    this.currentDist = 5.0;
    this.normalDist  = 5.0;
    this.aimDist     = 2.8;

    this.sensitivity = 0.0022;
    this._lookTarget = new THREE.Vector3();
    this._camTarget  = new THREE.Vector3();

    this._initEvents();
  }

  _initEvents() {
    // Pointer lock ONLY when actively playing
    this.canvas.addEventListener('click', () => {
      if (window.gameInstance && window.gameInstance.state === 'PLAYING') {
        this.canvas.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.canvas;
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isLocked) return;
      if (!window.gameInstance || window.gameInstance.state !== 'PLAYING') return;

      this.yaw   -= (e.movementX || 0) * this.sensitivity;
      this.pitch -= (e.movementY || 0) * this.sensitivity;
      // Clamp pitch: look up 25°, down 30°
      this.pitch = Math.max(-0.44, Math.min(0.52, this.pitch));
    });

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  setSensitivity(val) {
    this.sensitivity = 0.0022 * parseFloat(val);
  }

  /** Called every frame with player reference */
  update(player) {
    if (!player || !player.mesh) return;

    // Lerp camera distance (aim zoom)
    const targetDist = this.isAiming ? this.aimDist : this.normalDist;
    this.currentDist = THREE.MathUtils.lerp(this.currentDist, targetDist, 0.14);

    // FOV zoom
    const targetFOV = this.isAiming ? 44 : 70;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFOV, 0.14);
    this.camera.updateProjectionMatrix();

    const px = player.mesh.position.x;
    const py = player.mesh.position.y;
    const pz = player.mesh.position.z;

    // Camera sits BEHIND + ABOVE player by yaw angle
    //   yaw=0 → camera at +Z side, yaw=π → camera at -Z side
    const sinY = Math.sin(this.yaw);
    const cosY = Math.cos(this.yaw);

    const camX = px + sinY * this.currentDist;
    const camY = py + 2.0 + this.pitch * 2.5;
    const camZ = pz + cosY * this.currentDist;

    this._camTarget.set(camX, camY, camZ);
    this.camera.position.lerp(this._camTarget, 0.2);

    // Look at player upper body / shoulders
    this._lookTarget.set(px, py + 1.4, pz);
    this.camera.lookAt(this._lookTarget);
  }

  /** XZ plane movement direction (for WASD) */
  getForwardDir() {
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
  }

  getRightDir() {
    const f = this.getForwardDir();
    return new THREE.Vector3(f.z, 0, -f.x).normalize();
  }

  /** Full 3D direction (for shooting) */
  getAimDir() {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    return dir.normalize();
  }

  getCameraPosition() {
    return this.camera.position.clone();
  }

  /** Attach camera to a world-space position (used during drop phase) */
  setFreePosition(x, y, z, lookX, lookY, lookZ) {
    this.camera.position.set(x, y, z);
    this.camera.lookAt(new THREE.Vector3(lookX, lookY, lookZ));
  }
}
