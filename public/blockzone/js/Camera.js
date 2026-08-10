/**
 * BLOCK ZONE: Third-Person Follow Camera Rig with Pointer Lock & Aim Zoom
 */
class CameraRig {
  constructor(domElement) {
    this.domElement = domElement;
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    this.yawObject = new THREE.Object3D();
    this.pitchObject = new THREE.Object3D();
    
    this.yawObject.add(this.pitchObject);
    this.pitchObject.add(this.camera);

    // Default 3rd Person offsets
    this.normalOffset = new THREE.Vector3(0.6, 2.2, 4.5);
    this.aimOffset = new THREE.Vector3(0.5, 1.8, 2.2);
    this.currentOffset = this.normalOffset.clone();

    this.camera.position.copy(this.currentOffset);

    this.mouseSensitivity = 0.0022;
    this.isLocked = false;
    this.isAiming = false;

    this.initEvents();
  }

  initEvents() {
    this.domElement.addEventListener('click', () => {
      if (!this.isLocked && window.gameInstance && window.gameInstance.isPlaying) {
        this.domElement.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.domElement;
    });

    document.addEventListener('mousemove', (e) => this.onMouseMove(e));

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    });
  }

  onMouseMove(e) {
    if (!this.isLocked) return;

    const mx = e.movementX || 0;
    const my = e.movementY || 0;

    this.yawObject.rotation.y -= mx * this.mouseSensitivity;
    this.pitchObject.rotation.x -= my * this.mouseSensitivity;

    // Clamp pitch
    const maxPitch = Math.PI / 3; // 60 deg
    this.pitchObject.rotation.x = Math.max(-maxPitch, Math.min(maxPitch, this.pitchObject.rotation.x));
  }

  setSensitivity(val) {
    this.mouseSensitivity = 0.0022 * val;
  }

  update(player) {
    if (!player || !player.mesh) return;

    // Follow player position smoothly
    this.yawObject.position.copy(player.mesh.position);

    // Aim Zoom interpolation
    const targetOffset = this.isAiming ? this.aimOffset : this.normalOffset;
    this.currentOffset.lerp(targetOffset, 0.15);
    this.camera.position.copy(this.currentOffset);

    // Dynamic FOV
    const targetFOV = this.isAiming ? 48 : 70;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFOV, 0.15);
    this.camera.updateProjectionMatrix();
  }

  getForwardDirection() {
    const dir = new THREE.Vector3(0, 0, -1);
    dir.applyQuaternion(this.pitchObject.quaternion);
    dir.applyQuaternion(this.yawObject.quaternion);
    return dir.normalize();
  }

  getCameraPosition() {
    const pos = new THREE.Vector3();
    this.camera.getWorldPosition(pos);
    return pos;
  }
}
