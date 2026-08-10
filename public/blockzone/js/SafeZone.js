/**
 * BLOCK ZONE: Shrinking Storm Safe Zone System
 */
const ZONE_PHASES = [
  { radius: 220, waitTime: 45, shrinkTime: 30, dps: 2 },
  { radius: 150, waitTime: 35, shrinkTime: 25, dps: 3 },
  { radius: 90,  waitTime: 30, shrinkTime: 20, dps: 5 },
  { radius: 50,  waitTime: 25, shrinkTime: 18, dps: 8 },
  { radius: 25,  waitTime: 20, shrinkTime: 15, dps: 12 },
  { radius: 8,   waitTime: 15, shrinkTime: 12, dps: 20 }
];

class SafeZone {
  constructor(scene, worldSize = 500) {
    this.scene = scene;
    this.worldSize = worldSize;

    this.center = new THREE.Vector3(0, 0, 0);
    this.currentRadius = worldSize * 0.48; // starts covering entire map

    this.currentPhaseIndex = 0;
    this.phaseConfig = ZONE_PHASES[0];

    this.nextCenter = this.getRandomSubCenter(this.center, this.currentRadius, this.phaseConfig.radius);
    this.nextRadius = this.phaseConfig.radius;

    this.state = 'WAITING'; // 'WAITING' | 'SHRINKING'
    this.phaseTimer = this.phaseConfig.waitTime;

    this.initVisuals();
  }

  initVisuals() {
    // Large Glowing Blue Cylinder Energy Wall
    const cylGeo = new THREE.CylinderGeometry(1, 1, 60, 48, 1, true);
    const cylMat = new THREE.MeshBasicMaterial({
      color: 0x00d2ff,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.stormMesh = new THREE.Mesh(cylGeo, cylMat);
    this.stormMesh.position.set(this.center.x, 30, this.center.z);
    this.stormMesh.scale.set(this.currentRadius, 1, this.currentRadius);
    this.scene.add(this.stormMesh);
  }

  getRandomSubCenter(currentC, currentR, nextR) {
    const maxOffset = Math.max(0, currentR - nextR * 1.1);
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * maxOffset * 0.75;
    return new THREE.Vector3(
      currentC.x + Math.cos(angle) * dist,
      0,
      currentC.z + Math.sin(angle) * dist
    );
  }

  update(dt, entities, player) {
    this.phaseTimer -= dt;
    const isShrinking = this.state === 'SHRINKING';

    if (this.state === 'WAITING') {
      if (this.phaseTimer <= 0) {
        this.state = 'SHRINKING';
        this.phaseTimer = this.phaseConfig.shrinkTime;
        this.shrinkStartRadius = this.currentRadius;
        this.shrinkStartCenter = this.center.clone();
      }
    } else if (this.state === 'SHRINKING') {
      const progress = 1 - Math.max(0, this.phaseTimer / this.phaseConfig.shrinkTime);

      this.currentRadius = THREE.MathUtils.lerp(this.shrinkStartRadius, this.nextRadius, progress);
      this.center.lerpVectors(this.shrinkStartCenter, this.nextCenter, progress);

      if (this.phaseTimer <= 0) {
        this.currentRadius = this.nextRadius;
        this.center.copy(this.nextCenter);

        // Advance to next phase
        this.currentPhaseIndex++;
        if (this.currentPhaseIndex < ZONE_PHASES.length) {
          this.phaseConfig = ZONE_PHASES[this.currentPhaseIndex];
          this.state = 'WAITING';
          this.phaseTimer = this.phaseConfig.waitTime;
          this.nextCenter = this.getRandomSubCenter(this.center, this.currentRadius, this.phaseConfig.radius);
          this.nextRadius = this.phaseConfig.radius;
        } else {
          this.state = 'FINAL';
          this.phaseTimer = 999;
        }
      }
    }

    // Update 3D Storm Mesh
    this.stormMesh.position.set(this.center.x, 30, this.center.z);
    this.stormMesh.scale.set(this.currentRadius, 1, this.currentRadius);
    this.stormMesh.material.opacity = 0.2 + Math.sin(performance.now() * 0.003) * 0.05;

    // Apply Storm Damage to all living entities outside
    const dps = this.phaseConfig.dps;
    entities.forEach(ent => {
      if (ent.health > 0 && ent.mesh) {
        const distToCenter = new THREE.Vector2(ent.mesh.position.x, ent.mesh.position.z)
          .distanceTo(new THREE.Vector2(this.center.x, this.center.z));
        
        if (distToCenter > this.currentRadius) {
          ent.takeDamage(dps * dt, null, true); // true = storm damage
        }
      }
    });

    // Update HUD
    if (window.hud && player && player.mesh) {
      const m = Math.floor(Math.max(0, this.phaseTimer) / 60);
      const s = String(Math.floor(Math.max(0, this.phaseTimer) % 60)).padStart(2, '0');
      const timerStr = `${m}:${s}`;

      const pDist = new THREE.Vector2(player.mesh.position.x, player.mesh.position.z)
        .distanceTo(new THREE.Vector2(this.center.x, this.center.z));
      const distOutside = Math.max(0, pDist - this.currentRadius);

      window.hud.updateZone(timerStr, isShrinking, distOutside);
    }
  }
}
