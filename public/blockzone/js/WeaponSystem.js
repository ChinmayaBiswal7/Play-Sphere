/**
 * BLOCK ZONE: Raycast Weapon System with Tracers & 5 Weapon Classes
 */
const WEAPON_CONFIGS = {
  PISTOL: {
    key: 'PISTOL',
    name: 'Pistol 9mm',
    damage: 22,
    fireRate: 0.35, // seconds between shots
    magSize: 12,
    reserveAmmo: 48,
    range: 150,
    spread: 0.015,
    pellets: 1,
    color: 0x94a3b8
  },
  SMG: {
    key: 'SMG',
    name: 'Tactical SMG',
    damage: 16,
    fireRate: 0.09,
    magSize: 30,
    reserveAmmo: 120,
    range: 100,
    spread: 0.04,
    pellets: 1,
    color: 0x38bdf8
  },
  ASSAULT: {
    key: 'ASSAULT',
    name: 'Assault Rifle',
    damage: 26,
    fireRate: 0.16,
    magSize: 30,
    reserveAmmo: 120,
    range: 220,
    spread: 0.02,
    pellets: 1,
    color: 0xfacc15
  },
  SHOTGUN: {
    key: 'SHOTGUN',
    name: 'Pump Shotgun',
    damage: 18, // per pellet (x6 = 108 max)
    fireRate: 0.85,
    magSize: 6,
    reserveAmmo: 24,
    range: 45,
    spread: 0.08,
    pellets: 6,
    color: 0xf97316
  },
  SNIPER: {
    key: 'SNIPER',
    name: 'Bolt Sniper',
    damage: 110,
    fireRate: 1.3,
    magSize: 5,
    reserveAmmo: 15,
    range: 400,
    spread: 0.002,
    pellets: 1,
    color: 0xa855f7
  }
};

class WeaponSystem {
  constructor(scene) {
    this.scene = scene;
    this.raycaster = new THREE.Raycaster();
    this.tracers = [];
    this.muzzleFlashes = [];
  }

  fire(shooter, originPos, forwardDir, weaponKey = 'ASSAULT') {
    const config = WEAPON_CONFIGS[weaponKey] || WEAPON_CONFIGS.ASSAULT;
    const now = performance.now() / 1000;

    if (shooter.lastFireTime && now - shooter.lastFireTime < config.fireRate) {
      return false; // Cooldown
    }
    if (shooter.isReloading) return false;
    if (shooter.ammo <= 0) {
      shooter.reload();
      return false;
    }

    shooter.lastFireTime = now;
    shooter.ammo--;

    // Audio
    if (window.audioManager) window.audioManager.playShot(weaponKey);

    // Muzzle flash point light
    this.createMuzzleFlash(originPos);

    // Fire pellets
    for (let p = 0; p < config.pellets; p++) {
      const spreadX = (Math.random() - 0.5) * config.spread;
      const spreadY = (Math.random() - 0.5) * config.spread;
      const spreadZ = (Math.random() - 0.5) * config.spread;

      const shootDir = forwardDir.clone().add(new THREE.Vector3(spreadX, spreadY, spreadZ)).normalize();
      this.raycastShot(shooter, originPos, shootDir, config);
    }

    return true;
  }

  raycastShot(shooter, origin, direction, config) {
    this.raycaster.set(origin, direction);
    this.raycaster.far = config.range;

    // Build target list from all active entities
    const targetMeshes = [];
    const meshToEntityMap = new Map();

    if (window.gameInstance && window.gameInstance.entities) {
      window.gameInstance.entities.forEach(ent => {
        if (ent !== shooter && ent.health > 0 && ent.mesh) {
          targetMeshes.push(ent.mesh);
          meshToEntityMap.set(ent.mesh, ent);
          // Also include child meshes (head, body)
          ent.mesh.traverse(child => {
            if (child.isMesh) {
              targetMeshes.push(child);
              meshToEntityMap.set(child, ent);
            }
          });
        }
      });
    }

    const intersects = this.raycaster.intersectObjects(targetMeshes, false);
    let hitPoint = origin.clone().add(direction.clone().multiplyScalar(config.range));

    if (intersects.length > 0) {
      const hit = intersects[0];
      hitPoint = hit.point;
      const targetEntity = meshToEntityMap.get(hit.object);

      if (targetEntity) {
        // Headshot detection (if hit mesh is head)
        const isHeadshot = hit.object.name === 'head';
        const finalDamage = isHeadshot ? config.damage * 1.75 : config.damage;
        targetEntity.takeDamage(finalDamage, shooter);

        if (shooter.isPlayer && window.audioManager) {
          window.audioManager.playHitMarker();
        }
      }
    }

    // Visual Tracer Line
    this.createTracer(origin, hitPoint, config.color);
  }

  createMuzzleFlash(pos) {
    const light = new THREE.PointLight(0xffaa00, 3, 10);
    light.position.copy(pos);
    this.scene.add(light);
    this.muzzleFlashes.push({ light, time: 0.05 });
  }

  createTracer(start, end, colorHex = 0xffff00) {
    const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
    const mat = new THREE.LineBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.9,
      linewidth: 2
    });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);
    this.tracers.push({ line, life: 0.12, initialLife: 0.12 });
  }

  update(dt) {
    // Update tracers
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      if (t.life <= 0) {
        this.scene.remove(t.line);
        t.line.geometry.dispose();
        t.line.material.dispose();
        this.tracers.splice(i, 1);
      } else {
        t.line.material.opacity = (t.life / t.initialLife) * 0.9;
      }
    }

    // Update muzzle flashes
    for (let i = this.muzzleFlashes.length - 1; i >= 0; i--) {
      const mf = this.muzzleFlashes[i];
      mf.time -= dt;
      if (mf.time <= 0) {
        this.scene.remove(mf.light);
        this.muzzleFlashes.splice(i, 1);
      }
    }
  }
}
