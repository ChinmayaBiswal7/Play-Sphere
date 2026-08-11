/**
 * BLOCK ZONE: Transport Plane — flies across the map, player jumps out
 */
class DropPlane {
  constructor(scene) {
    this.scene  = scene;
    this.mesh   = this._buildMesh();
    this.scene.add(this.mesh);

    // Parachute mesh (shown during fall)
    this.chute = this._buildChute();
    this.chuteDeployed = false;

    // Flight path: start west, end east
    this.startPos = new THREE.Vector3(-350, 90, -20);
    this.endPos   = new THREE.Vector3( 350, 90,  -20);

    this.mesh.position.copy(this.startPos);
    this.progress = 0;      // 0→1 over flightDuration
    this.flightDuration = 28;  // seconds

    this.hasJumped = false;
    this.jumpProgress = 0;
    this.fallVelocity  = 0;
    this.playerOnBoard = true;

    // Drop shadow (circle on ground beneath)
    this._buildShadow();
  }

  _buildMesh() {
    const group = new THREE.Group();

    // Fuselage
    const fuse = new THREE.Mesh(
      new THREE.BoxGeometry(18, 5, 5),
      new THREE.MeshLambertMaterial({ color: 0x1e3a5f })
    );
    fuse.position.y = 0;
    group.add(fuse);

    // Wings
    const wing = new THREE.Mesh(
      new THREE.BoxGeometry(38, 1.2, 8),
      new THREE.MeshLambertMaterial({ color: 0x1e40af })
    );
    wing.position.y = -0.5;
    group.add(wing);

    // Tail fin vertical
    const tailV = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 5, 4),
      new THREE.MeshLambertMaterial({ color: 0x1e3a5f })
    );
    tailV.position.set(-7.5, 3.5, 0);
    group.add(tailV);

    // Tail fin horizontal
    const tailH = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1, 10),
      new THREE.MeshLambertMaterial({ color: 0x1e3a5f })
    );
    tailH.position.set(-7.5, 1.5, 0);
    group.add(tailH);

    // Nose glass
    const nose = new THREE.Mesh(
      new THREE.BoxGeometry(3, 3, 3),
      new THREE.MeshLambertMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.6 })
    );
    nose.position.set(10, 0.5, 0);
    group.add(nose);

    // Engine 1 & 2
    [-1, 1].forEach(side => {
      const eng = new THREE.Mesh(
        new THREE.BoxGeometry(6, 2.5, 2.5),
        new THREE.MeshLambertMaterial({ color: 0x374151 })
      );
      eng.position.set(0, -2.5, side * 10);
      group.add(eng);

      const exhaust = new THREE.Mesh(
        new THREE.BoxGeometry(2, 2, 2),
        new THREE.MeshLambertMaterial({ color: 0x6b7280 })
      );
      exhaust.position.set(-3.5, -2.5, side * 10);
      group.add(exhaust);
    });

    // Rotate so it faces the right direction (east = +X)
    group.rotation.y = Math.PI / 2;

    return group;
  }

  _buildChute() {
    const group = new THREE.Group();
    const dome = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 2.5, 3.5),
      new THREE.MeshLambertMaterial({ color: 0xef4444, transparent: true, opacity: 0.85 })
    );
    dome.position.y = 6;
    group.add(dome);

    // Strings
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const str = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 5.5, 0.06),
        new THREE.MeshLambertMaterial({ color: 0xfcd34d })
      );
      str.position.set(Math.sin(angle) * 1.2, 3.5, Math.cos(angle) * 1.2);
      group.add(str);
    }

    group.visible = false;
    this.scene.add(group);
    return group;
  }

  _buildShadow() {
    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(8, 8),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 })
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.05;
    this.scene.add(this.shadow);
  }

  update(dt) {
    this.progress += dt / this.flightDuration;
    if (this.progress > 1) this.progress = 1;

    // Move plane along path
    this.mesh.position.lerpVectors(this.startPos, this.endPos, this.progress);

    // Update shadow on ground
    this.shadow.position.x = this.mesh.position.x;
    this.shadow.position.z = this.mesh.position.z;
    const h = this.mesh.position.y;
    const opacity = Math.max(0, 0.3 - (h / 90) * 0.25);
    this.shadow.material.opacity = opacity;

    // Update chute position if deployed
    if (this.chuteDeployed && this.chute.visible) {
      this.chute.position.copy(this.mesh.position);
    }
  }

  /** Returns world position from which player should be spawned */
  getJumpPosition() {
    return this.mesh.position.clone();
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.scene.remove(this.chute);
    this.scene.remove(this.shadow);
  }
}
